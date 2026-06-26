import asyncio
import gc
import hashlib
import io
import os
import random
import re
import subprocess
import tempfile
import time
import unicodedata
import zipfile
from contextlib import asynccontextmanager, suppress
from pathlib import Path

import soundfile as sf
import torch
import numpy as np
from fastapi import FastAPI, HTTPException
from fastapi.responses import Response
from pydantic import BaseModel, Field
from qwen_tts import Qwen3TTSModel
from transformers import StoppingCriteria, StoppingCriteriaList


MODEL_IDS = {
    "design": os.getenv(
        "TTS_DESIGN_MODEL_ID", "Qwen/Qwen3-TTS-12Hz-1.7B-VoiceDesign"
    ),
    "custom": os.getenv(
        "TTS_CUSTOM_MODEL_ID", "Qwen/Qwen3-TTS-12Hz-0.6B-CustomVoice"
    ),
    "base": os.getenv("TTS_BASE_MODEL_ID", "Qwen/Qwen3-TTS-12Hz-0.6B-Base"),
}
DEFAULT_MODE = os.getenv("TTS_DEFAULT_MODE", "design").lower()
DEVICE = os.getenv("TTS_DEVICE", "auto").lower()
POWER_PROFILE = os.getenv("TTS_POWER_PROFILE", "balanced").lower()
if POWER_PROFILE not in {"performance", "balanced", "eco"}:
    POWER_PROFILE = "balanced"
PROFILE_DEFAULTS = {
    "performance": {"chunk": 260, "pause": 80, "resume": 75, "abort": 84, "cooldown": 0},
    "balanced": {"chunk": 90, "pause": 72, "resume": 65, "abort": 78, "cooldown": 5},
    "eco": {"chunk": 50, "pause": 69, "resume": 62, "abort": 74, "cooldown": 7},
}[POWER_PROFILE]
MAX_CHUNK_CHARACTERS = int(os.getenv("TTS_CHUNK_CHARACTERS", str(PROFILE_DEFAULTS["chunk"])))
GPU_PAUSE_TEMPERATURE = int(os.getenv("TTS_GPU_PAUSE_TEMP", str(PROFILE_DEFAULTS["pause"])))
GPU_RESUME_TEMPERATURE = int(os.getenv("TTS_GPU_RESUME_TEMP", str(PROFILE_DEFAULTS["resume"])))
GPU_ABORT_TEMPERATURE = int(os.getenv("TTS_GPU_ABORT_TEMP", str(PROFILE_DEFAULTS["abort"])))
GPU_COOLDOWN_SECONDS = float(os.getenv("TTS_GPU_COOLDOWN_SECONDS", str(PROFILE_DEFAULTS["cooldown"])))
LANGUAGES = {
    "Auto",
    "French",
    "English",
    "Spanish",
    "German",
    "Italian",
    "Portuguese",
}
CUSTOM_SPEAKERS = {
    "Vivian",
    "Serena",
    "Uncle_Fu",
    "Dylan",
    "Eric",
    "Ryan",
    "Aiden",
    "Ono_Anna",
    "Sohee",
}
VOICE_REFERENCE_TEXTS = {
    "French": "Je parle clairement, avec une voix régulière, pour raconter cette histoire.",
    "English": "I speak clearly, with a steady voice, to tell this story.",
    "Spanish": "Hablo claramente, con una voz estable, para contar esta historia.",
    "German": "Ich spreche klar und mit ruhiger Stimme, um diese Geschichte zu erzählen.",
    "Italian": "Parlo chiaramente, con una voce regolare, per raccontare questa storia.",
    "Portuguese": "Falo claramente, com uma voz estável, para contar esta história.",
}


class SpeechRequest(BaseModel):
    text: str = Field(min_length=1, max_length=4096)
    voice_description: str = Field(default="", max_length=1000)
    language: str = "French"
    mode: str = "design"
    speaker: str | None = None
    job_id: str | None = Field(default=None, max_length=80)


class DialogueRequest(BaseModel):
    elements: list[str] = Field(min_length=1, max_length=50)
    voice_a_description: str = Field(default="", max_length=1000)
    voice_b_description: str = Field(default="", max_length=1000)
    language: str = "French"
    pause_ms: int = Field(default=350, ge=0, le=2000)
    mode: str = "design"
    speaker_a: str | None = None
    speaker_b: str | None = None
    job_id: str | None = Field(default=None, max_length=80)
    split_pairs: bool = False


class BatchFileRequest(BaseModel):
    name: str = Field(min_length=1, max_length=180)
    text: str = Field(min_length=1, max_length=4096)


class BatchRequest(BaseModel):
    files: list[BatchFileRequest] = Field(min_length=1, max_length=30)
    voice_description: str = Field(default="", max_length=1000)
    language: str = "French"
    mode: str = "design"
    speaker: str | None = None
    job_id: str | None = Field(default=None, max_length=80)


class Engine:
    model = None
    device = "cpu"
    mode = None
    model_id = None
    lock = asyncio.Lock()
    gpu = {"available": False}
    thermal_stop = False
    progress = {
        "job_id": None,
        "stage": "idle",
        "percent": 0,
        "current": 0,
        "total": 0,
        "message": "En attente",
    }


engine = Engine()


class ThermalProtectionError(RuntimeError):
    pass


class ThermalStoppingCriteria(StoppingCriteria):
    def __call__(self, input_ids, scores, **kwargs) -> bool:
        return engine.thermal_stop


def update_progress(
    job_id: str | None,
    stage: str,
    percent: int,
    message: str,
    current: int = 0,
    total: int = 0,
):
    engine.progress = {
        "job_id": job_id,
        "stage": stage,
        "percent": max(0, min(100, int(percent))),
        "current": current,
        "total": total,
        "message": message,
    }


def read_gpu_stats() -> dict:
    try:
        completed = subprocess.run(
            [
                "nvidia-smi",
                "--query-gpu=temperature.gpu,memory.used,memory.total,utilization.gpu,power.draw",
                "--format=csv,noheader,nounits",
            ],
            capture_output=True,
            text=True,
            timeout=5,
            check=True,
        )
        values = [value.strip() for value in completed.stdout.splitlines()[0].split(",")]
        temperature, memory_used, memory_total, utilization, power = map(float, values)
        return {
            "available": True,
            "temperature": round(temperature),
            "memory_used_mb": round(memory_used),
            "memory_total_mb": round(memory_total),
            "utilization": round(utilization),
            "power_watts": round(power, 1),
            "pause_temperature": GPU_PAUSE_TEMPERATURE,
            "resume_temperature": GPU_RESUME_TEMPERATURE,
            "abort_temperature": GPU_ABORT_TEMPERATURE,
        }
    except Exception:
        return {"available": False}


async def monitor_gpu():
    while True:
        engine.gpu = await asyncio.to_thread(read_gpu_stats)
        temperature = engine.gpu.get("temperature", 0)
        if temperature >= GPU_ABORT_TEMPERATURE:
            engine.thermal_stop = True
        await asyncio.sleep(2)


def wait_for_safe_temperature(job_id: str | None):
    current_stats = read_gpu_stats()
    if current_stats.get("available"):
        engine.gpu = current_stats
    if not engine.gpu.get("available"):
        return
    temperature = engine.gpu.get("temperature", 0)
    if temperature >= GPU_ABORT_TEMPERATURE:
        engine.thermal_stop = True
        raise ThermalProtectionError(
            f"Génération interrompue à {temperature} °C pour protéger le GPU."
        )
    must_cool = temperature >= GPU_PAUSE_TEMPERATURE or (
        POWER_PROFILE in {"balanced", "eco"} and temperature > GPU_RESUME_TEMPERATURE
    )
    while must_cool:
        previous = engine.progress
        update_progress(
            job_id,
            "cooling",
            previous.get("percent", 0),
            f"Pause thermique : GPU à {temperature} °C, reprise sous {GPU_RESUME_TEMPERATURE} °C",
            previous.get("current", 0),
            previous.get("total", 0),
        )
        time.sleep(3)
        current_stats = read_gpu_stats()
        if current_stats.get("available"):
            engine.gpu = current_stats
        elif not engine.gpu.get("available"):
            return
        temperature = engine.gpu.get("temperature", 0)
        if temperature >= GPU_ABORT_TEMPERATURE:
            engine.thermal_stop = True
            raise ThermalProtectionError(
                f"Génération interrompue à {temperature} °C pour protéger le GPU."
            )
        if temperature <= GPU_RESUME_TEMPERATURE:
            break


def cool_down_between_segments(job_id: str | None):
    if GPU_COOLDOWN_SECONDS <= 0:
        return
    deadline = time.monotonic() + 60
    while True:
        current_stats = read_gpu_stats()
        if current_stats.get("available"):
            engine.gpu = current_stats
        elif not engine.gpu.get("available"):
            return
        temperature = engine.gpu.get("temperature", 0)
        if temperature >= GPU_ABORT_TEMPERATURE:
            engine.thermal_stop = True
            raise ThermalProtectionError(
                f"Génération interrompue à {temperature} °C pour protéger le GPU."
            )
        previous = engine.progress
        if temperature > GPU_RESUME_TEMPERATURE:
            update_progress(
                job_id,
                "cooling",
                previous.get("percent", 0),
                f"Mode équilibré : refroidissement du GPU ({temperature} °C)",
                previous.get("current", 0),
                previous.get("total", 0),
            )
        if temperature <= GPU_RESUME_TEMPERATURE or time.monotonic() >= deadline:
            break
        time.sleep(GPU_COOLDOWN_SECONDS)
    time.sleep(GPU_COOLDOWN_SECONDS)


def normalized_words(value: str) -> str:
    value = unicodedata.normalize("NFKD", value.lower())
    return "".join(character for character in value if not unicodedata.combining(character))


def voice_direction(description: str) -> str:
    words = normalized_words(description)
    directions = []

    if any(word in words for word in ("death metal", "death-metal", "growl death")):
        directions.append(
            "Perform an intelligible death-metal vocal growl: extremely deep, guttural, "
            "powerful and resonant, while articulating every supplied word clearly. "
            "Do not replace lyrics with nonverbal roaring or breathing."
        )
    elif any(word in words for word in ("black metal", "black-metal", "shriek")):
        directions.append(
            "Perform an intelligible black-metal vocal shriek: high, icy, harsh, raspy "
            "and sinister, with every supplied word clearly pronounced. "
            "Do not replace lyrics with nonverbal screaming, whispering or breathing."
        )
    elif any(word in words for word in ("demon", "diable", "infernal")):
        directions.append(
            "Use an extremely deep adult male bass voice: very low fundamental pitch, "
            "massive chest resonance, ominous and inhuman, slow and threatening. "
            "Do not use a normal narrator pitch."
        )
    elif any(word in words for word in ("troll", "ogre", "orc")):
        directions.append(
            "Use a huge low-pitched male creature voice, rough, guttural, heavy, "
            "clumsy and theatrical, with strong chest resonance."
        )
    elif any(word in words for word in ("spectre", "spectral", "fantome", "ghost")):
        directions.append(
            "Use an airy, distant, ghostly whisper with an uncanny floating tone."
        )
    elif any(word in words for word in ("vieillard", "magicien", "vieux mage", "wizard")):
        directions.append(
            "Use a very old male wizard voice: deep but frail, wise, breathy, slightly "
            "trembling, slow and ancient, with long deliberate pauses."
        )
    elif any(word in words for word in ("chevre", "goat")):
        directions.append(
            "Create an intelligible talking goat voice: high-pitched, nasal, comical, "
            "with a natural wavering bleat-like vocal quality while clearly speaking every word."
        )
    elif any(word in words for word in ("gobelin", "goblin")):
        directions.append(
            "Use a tiny sneaky goblin voice: very high, scratchy, nervous, fast and mischievous."
        )
    elif any(word in words for word in ("geant", "giant")):
        directions.append(
            "Use a colossal giant male voice: extremely low bass, huge chest resonance, "
            "very slow, heavy and physically powerful."
        )
    elif any(word in words for word in ("fee", "fairy")):
        directions.append(
            "Use a tiny magical fairy voice: feminine, very high, light, crystalline, "
            "bright, joyful and quick."
        )
    elif any(word in words for word in ("sorciere", "witch")):
        directions.append(
            "Use an old witch voice: feminine, raspy, nasal, eerie, calculating and theatrical."
        )
    elif any(word in words for word in ("robot", "androide", "android")):
        directions.append(
            "Use a cold metallic robot voice with precise timing, flat emotion and mechanical rhythm."
        )
    elif any(word in words for word in ("pirate", "corsaire", "captain")):
        directions.append(
            "Use an old pirate captain voice: low male, weathered, gravelly, commanding and adventurous."
        )
    elif any(word in words for word in ("extraterrestre", "alien")):
        directions.append(
            "Use an intelligent alien voice: clearly understandable but uncanny, vibrating, "
            "unstable in pitch and unmistakably non-human."
        )

    directions.append(description.strip())
    directions.append(
        "Begin immediately with the first word. Speak only the supplied text. "
        "Do not sigh, breathe aloud, hum, add, remove, translate, or rephrase words."
    )
    return " ".join(directions)


def audio_effects(description: str) -> list[str]:
    words = normalized_words(description)
    pitch = 0
    tempo = 1.0
    bass = 0
    treble = 0
    reverb = 0
    echo = False
    tremolo = 0
    overdrive = 0

    if any(word in words for word in ("death metal", "death-metal", "growl death")):
        pitch, tempo, bass, reverb = -180, 0.96, 5, 18
    elif any(word in words for word in ("black metal", "black-metal", "shriek")):
        pitch, tempo, treble, reverb = 120, 1.02, 3, 30
    elif any(word in words for word in ("demon", "diable", "infernal")):
        pitch, tempo, bass, reverb = -500, 0.90, 7, 28
    elif any(word in words for word in ("troll", "ogre", "orc")):
        pitch, tempo, bass = -320, 0.92, 5
    elif any(word in words for word in ("spectre", "spectral", "fantome", "ghost")):
        pitch, reverb, echo = 100, 72, True
    elif any(word in words for word in ("vieillard", "magicien", "vieux mage", "wizard")):
        pitch, tempo, bass, reverb, tremolo = -220, 0.88, 3, 32, 8
    elif any(word in words for word in ("chevre", "goat")):
        pitch, tempo, treble, tremolo = 320, 1.03, 3, 22
    elif any(word in words for word in ("gobelin", "goblin")):
        pitch, tempo, treble = 380, 1.12, 4
    elif any(word in words for word in ("geant", "giant")):
        pitch, tempo, bass, reverb = -650, 0.80, 8, 32
    elif any(word in words for word in ("fee", "fairy")):
        pitch, tempo, treble, reverb = 430, 1.06, 4, 45
    elif any(word in words for word in ("sorciere", "witch")):
        pitch, tempo, treble, reverb = 140, 0.94, 2, 38
    elif any(word in words for word in ("robot", "androide", "android")):
        pitch, tempo, overdrive = -70, 0.97, 6
    elif any(word in words for word in ("pirate", "corsaire", "captain")):
        pitch, tempo, bass = -180, 0.96, 3
    elif any(word in words for word in ("extraterrestre", "alien")):
        pitch, reverb, echo, tremolo = 180, 52, True, 28

    if any(word in words for word in ("tres grave", "extremement grave", "very deep")):
        pitch = min(pitch, -450)
        bass = max(bass, 6)
    elif any(word in words for word in ("grave", "profonde", "deep", "low-pitched")):
        pitch = min(pitch, -280)
        bass = max(bass, 4)

    if any(word in words for word in ("aigue", "aiguë", "high-pitched")):
        pitch = max(pitch, 280)
    if any(word in words for word in ("tres lent", "very slow")):
        tempo = min(tempo, 0.82)
    elif any(word in words for word in ("lent", "lente", "slow")):
        tempo = min(tempo, 0.90)
    if any(word in words for word in ("rapide", "vite", "fast")):
        tempo = max(tempo, 1.14)
    if any(word in words for word in ("echo", "echo", "lointain", "distant")):
        echo = True
    if any(word in words for word in ("reverberation", "reverb", "grotte", "caverne", "grande salle")):
        reverb = max(reverb, 58)

    effects = []
    if pitch or bass or treble or tempo != 1.0 or reverb or echo or tremolo or overdrive:
        effects.extend(["gain", "-4"])
    if pitch:
        effects.extend(["pitch", str(pitch)])
    if tempo != 1.0:
        effects.extend(["tempo", "-s", f"{tempo:.2f}"])
    if bass:
        effects.extend(["bass", f"+{bass}", "110"])
    if treble:
        effects.extend(["treble", f"+{treble}", "3000"])
    if overdrive:
        effects.extend(["overdrive", str(overdrive), "15"])
    if tremolo:
        effects.extend(["tremolo", "5.2", str(tremolo)])
    if reverb:
        effects.extend(["reverb", str(reverb), "45", "100", "60", "8", "-3"])
    if echo:
        effects.extend(["echo", "0.82", "0.55", "420", "0.28", "760", "0.16"])
    if effects:
        effects.extend(["norm", "-1"])
    return effects


def process_audio(wav_bytes: bytes, description: str) -> bytes:
    effects = audio_effects(description)
    if not effects:
        return wav_bytes

    with tempfile.TemporaryDirectory(prefix="voice-forge-") as directory:
        source = Path(directory) / "source.wav"
        result = Path(directory) / "result.wav"
        source.write_bytes(wav_bytes)
        command = ["sox", str(source), str(result), *effects]
        completed = subprocess.run(command, capture_output=True, text=True)
        if completed.returncode != 0:
            print(f"Traitement SoX ignoré: {completed.stderr}", flush=True)
            return wav_bytes
        return result.read_bytes()


def sanitize_waveform(waveform):
    audio = np.asarray(waveform, dtype=np.float32)
    invalid_samples = int(np.count_nonzero(~np.isfinite(audio)))
    if invalid_samples:
        print(f"Audio : correction de {invalid_samples} échantillon(s) invalide(s).", flush=True)
    audio = np.nan_to_num(audio, nan=0.0, posinf=0.0, neginf=0.0)
    peak = float(np.max(np.abs(audio))) if audio.size else 0.0
    if peak > 0.98:
        print(f"Audio : limitation anti-saturation du pic {peak:.3f}.", flush=True)
        audio = audio * (0.98 / peak)
    return audio


def smooth_wav_edges(wav_bytes: bytes, fade_ms: int = 6) -> bytes:
    audio, sample_rate = sf.read(io.BytesIO(wav_bytes), dtype="float32", always_2d=True)
    fade_frames = min(int(sample_rate * fade_ms / 1000), len(audio) // 2)
    if fade_frames <= 1:
        return wav_bytes
    fade = np.linspace(0.0, 1.0, fade_frames, dtype=np.float32)[:, None]
    audio[:fade_frames] *= fade
    audio[-fade_frames:] *= fade[::-1]
    output = io.BytesIO()
    sf.write(output, audio, sample_rate, format="WAV", subtype="PCM_16")
    return output.getvalue()


def unload_model():
    unloaded_model = engine.model_id
    if engine.model is not None:
        print(f"Déchargement du modèle {engine.model_id}…", flush=True)
        engine.model = None
        engine.mode = None
        engine.model_id = None
    gc.collect()
    if torch.cuda.is_available():
        torch.cuda.empty_cache()
        with suppress(Exception):
            torch.cuda.ipc_collect()
    return unloaded_model


def load_model(mode: str = DEFAULT_MODE, job_id: str | None = None):
    if mode not in MODEL_IDS:
        raise ValueError(f"Mode TTS inconnu: {mode}")
    if engine.model is not None and engine.mode == mode:
        return

    update_progress(job_id, "loading_model", 3, "Changement du modèle vocal…")
    unload_model()
    requested = DEVICE
    use_cuda = torch.cuda.is_available() and requested != "cpu"
    engine.device = "cuda:0" if use_cuda else "cpu"
    # VoiceDesign reste en FP16. Les deux modèles 0.6B utilisent le FP32 natif :
    # l'INT8 produisait un son faible/dégradé et le FP16 sous-flue dans
    # l'échantillonnage sur Turing (CUDA TensorCompare).
    dtype = torch.float16 if use_cuda and mode == "design" else torch.float32
    model_id = MODEL_IDS[mode]
    model_options = {
        "device_map": engine.device,
        "dtype": dtype,
        "attn_implementation": "sdpa",
    }
    print(f"Chargement de {model_id} sur {engine.device}…", flush=True)
    update_progress(job_id, "loading_model", 5, f"Chargement de {model_id.split('/')[-1]}…")
    engine.model = Qwen3TTSModel.from_pretrained(
        model_id,
        **model_options,
    )
    engine.mode = mode
    engine.model_id = model_id
    update_progress(job_id, "loading_model", 10, "Modèle vocal prêt")
    print(f"Moteur Qwen3-TTS prêt en mode {mode}.", flush=True)


@asynccontextmanager
async def lifespan(_app: FastAPI):
    monitor_task = asyncio.create_task(monitor_gpu())

    async def initial_load():
        async with engine.lock:
            await asyncio.to_thread(wait_for_safe_temperature, None)
            await asyncio.to_thread(load_model, DEFAULT_MODE)

    load_task = asyncio.create_task(initial_load())
    try:
        yield
    finally:
        monitor_task.cancel()
        with suppress(asyncio.CancelledError):
            await monitor_task
        if not load_task.done():
            await load_task
        unload_model()


app = FastAPI(
    title="Voice Forge — moteur Qwen3-TTS local",
    version="1.0.0",
    lifespan=lifespan,
)


@app.get("/health")
def health():
    return {
        "ready": engine.model is not None,
        "model": engine.model_id,
        "mode": engine.mode,
        "available_modes": MODEL_IDS,
        "device": engine.device,
        "open_source": True,
    }


@app.get("/status")
def status():
    temperature = engine.gpu.get("temperature")
    if temperature is None:
        thermal_state = "unavailable"
    elif temperature >= GPU_ABORT_TEMPERATURE:
        thermal_state = "critical"
    elif temperature >= GPU_PAUSE_TEMPERATURE:
        thermal_state = "cooling"
    elif temperature >= GPU_RESUME_TEMPERATURE:
        thermal_state = "warm"
    else:
        thermal_state = "normal"
    return {
        "ready": engine.model is not None,
        "model": engine.model_id,
        "mode": engine.mode,
        "device": engine.device,
        "gpu": engine.gpu,
        "thermal_state": thermal_state,
        "power_profile": POWER_PROFILE,
        "progress": engine.progress,
    }


@app.post("/unload")
async def unload():
    async with engine.lock:
        before = await asyncio.to_thread(read_gpu_stats)
        unloaded_model = await asyncio.to_thread(unload_model)
        await asyncio.sleep(0.5)
        after = await asyncio.to_thread(read_gpu_stats)
        if after.get("available"):
            engine.gpu = after
        update_progress(None, "idle", 0, "Modèles déchargés · prêt à recharger")

    memory_before = before.get("memory_used_mb")
    memory_after = after.get("memory_used_mb")
    freed_mb = (
        max(0, memory_before - memory_after)
        if isinstance(memory_before, int) and isinstance(memory_after, int)
        else None
    )
    return {
        "ok": True,
        "unloaded_model": unloaded_model,
        "freed_mb": freed_mb,
        "gpu": after,
        "message": "Modèle déchargé. Il sera rechargé automatiquement à la prochaine génération.",
    }


def split_text(text: str, limit: int = MAX_CHUNK_CHARACTERS) -> list[str]:
    text = re.sub(r"\s+", " ", text.strip())
    chunks = []
    # Une ponctuation terminale force toujours un nouveau segment. Ainsi,
    # l'utilisateur peut maîtriser le découpage en ajoutant simplement un point.
    sentences = [part for part in re.split(r"(?<=[.!?…])\s+", text) if part]

    for sentence in sentences:
        # Une petite tolérance évite de créer un fragment orphelin pour une
        # phrase de 95 caractères avec une cible de 90.
        hard_limit = max(limit, round(limit * 4 / 3))
        remaining = sentence
        while len(remaining) > hard_limit:
            part_count = max(2, (len(remaining) + limit - 1) // limit)
            ideal = len(remaining) / part_count

            punctuation_boundaries = [
                match.start() + 1
                for match in re.finditer(r"[,:;—–](?=\s)", remaining)
                if limit * 0.45 <= match.start() + 1 <= hard_limit
            ]
            word_boundaries = [
                match.start()
                for match in re.finditer(r"\s+", remaining)
                if limit * 0.45 <= match.start() <= hard_limit
            ]
            candidates = punctuation_boundaries or word_boundaries
            if not candidates:
                # Un mot exceptionnellement long reste entier.
                next_space = remaining.find(" ", hard_limit)
                split_at = len(remaining) if next_space < 0 else next_space
            else:
                split_at = min(candidates, key=lambda position: abs(position - ideal))

            chunks.append(remaining[:split_at].strip())
            remaining = remaining[split_at:].strip()
        if remaining:
            chunks.append(remaining)
    return chunks


def stable_voice_seed(payload: SpeechRequest) -> int:
    identity = "|".join(
        [
            "voice-forge-stable-v1",
            payload.mode,
            payload.language,
            payload.speaker or "",
            normalized_words(payload.voice_description),
        ]
    )
    return int.from_bytes(hashlib.sha256(identity.encode("utf-8")).digest()[:4], "big")


def apply_stable_seed(payload: SpeechRequest) -> int:
    seed = stable_voice_seed(payload)
    random.seed(seed)
    np.random.seed(seed)
    torch.manual_seed(seed)
    if torch.cuda.is_available():
        torch.cuda.manual_seed_all(seed)
    return seed


def concatenate_wavs(segments: list[bytes], pause_ms: int, prefix: str) -> bytes:
    if len(segments) == 1:
        return segments[0]

    with tempfile.TemporaryDirectory(prefix="voice-forge-dialogue-") as directory:
        directory_path = Path(directory)
        first_info = sf.info(io.BytesIO(segments[0]))
        silence_path = directory_path / "silence.wav"
        silence_frames = int(first_info.samplerate * pause_ms / 1000)
        silence = np.zeros((silence_frames, first_info.channels), dtype=np.float32)
        if first_info.channels == 1:
            silence = silence[:, 0]
        sf.write(silence_path, silence, first_info.samplerate, subtype="PCM_16")

        inputs = []
        for index, segment in enumerate(segments):
            segment_path = directory_path / f"line-{index:03d}.wav"
            segment_path.write_bytes(smooth_wav_edges(segment))
            inputs.append(str(segment_path))
            if index < len(segments) - 1 and pause_ms:
                inputs.append(str(silence_path))

        result_path = directory_path / f"{prefix}.wav"
        completed = subprocess.run(
            ["sox", *inputs, str(result_path), "norm", "-1"],
            capture_output=True,
            text=True,
        )
        if completed.returncode != 0:
            raise RuntimeError(f"Assemblage SoX impossible: {completed.stderr}")
        return result_path.read_bytes()


def concatenate_speech_chunks(
    segments: list[bytes],
    chunk_texts: list[str] | None = None,
    crossfade_ms: int = 40,
    sentence_pause_ms: int = 90,
) -> bytes:
    """Assemble les morceaux d'une même prise sans silence artificiel."""
    if chunk_texts is not None and len(chunk_texts) != len(segments):
        raise ValueError("Le nombre de textes et de segments audio doit correspondre.")
    decoded = []
    sample_rate = None
    channels = None
    for segment in segments:
        audio, rate = sf.read(io.BytesIO(segment), dtype="float32", always_2d=True)
        if sample_rate is None:
            sample_rate, channels = rate, audio.shape[1]
        elif rate != sample_rate or audio.shape[1] != channels:
            raise RuntimeError("Formats audio incompatibles pendant l'assemblage.")
        decoded.append(audio)

    joined = decoded[0]
    requested_frames = int(sample_rate * crossfade_ms / 1000)
    for index, following in enumerate(decoded[1:], start=1):
        previous_text = chunk_texts[index - 1].rstrip() if chunk_texts else ""
        sentence_boundary = bool(re.search(r"[.!?…][\"'»)]*$", previous_text))
        if sentence_boundary:
            edge_frames = min(int(sample_rate * 8 / 1000), len(joined) // 4, len(following) // 4)
            following = following.copy()
            if edge_frames > 1:
                edge = np.linspace(0.0, 1.0, edge_frames, dtype=np.float32)[:, None]
                joined[-edge_frames:] *= edge[::-1]
                following[:edge_frames] *= edge
            silence = np.zeros(
                (int(sample_rate * sentence_pause_ms / 1000), channels), dtype=np.float32
            )
            joined = np.concatenate([joined, silence, following], axis=0)
            continue

        fade_frames = min(requested_frames, len(joined) // 4, len(following) // 4)
        if fade_frames <= 1:
            joined = np.concatenate([joined, following], axis=0)
            continue
        phase = np.linspace(0.0, np.pi / 2, fade_frames, dtype=np.float32)[:, None]
        transition = joined[-fade_frames:] * np.cos(phase) + following[:fade_frames] * np.sin(phase)
        joined = np.concatenate(
            [joined[:-fade_frames], transition, following[fade_frames:]], axis=0
        )

    joined = sanitize_waveform(joined)
    peak = float(np.max(np.abs(joined))) if joined.size else 0.0
    target_peak = 10 ** (-1 / 20)
    if peak > 0:
        joined = joined * (target_peak / peak)
    output = io.BytesIO()
    sf.write(
        output,
        joined[:, 0] if channels == 1 else joined,
        sample_rate,
        format="WAV",
        subtype="PCM_16",
    )
    return output.getvalue()


def generate_chunk_waveform(payload: SpeechRequest, text: str, voice_clone_prompt=None):
    language = payload.language if payload.language in LANGUAGES else "Auto"
    # Une marge généreuse empêche les voix lentes d'être coupées avant
    # leurs derniers mots. Le modèle s'arrête toujours naturellement sur EOS
    # et le critère thermique reste prioritaire.
    max_new_tokens = max(96, min(512, int(len(text) * 2.2)))
    print(
        f"Segment vocal : {len(text)} caractères, budget maximal {max_new_tokens} tokens.",
        flush=True,
    )
    seed = apply_stable_seed(payload)
    print(f"Voix stable : seed={seed}, paramètres Qwen natifs.", flush=True)

    with torch.inference_mode():
        if voice_clone_prompt is not None:
            waveforms, sample_rate = engine.model.generate_voice_clone(
                text=text,
                language=language,
                voice_clone_prompt=voice_clone_prompt,
                max_new_tokens=max_new_tokens,
                stopping_criteria=StoppingCriteriaList([ThermalStoppingCriteria()]),
            )
        elif payload.mode == "custom":
            if payload.speaker not in CUSTOM_SPEAKERS:
                raise ValueError("Timbre CustomVoice inconnu.")
            waveforms, sample_rate = engine.model.generate_custom_voice(
                text=text,
                language=language,
                speaker=payload.speaker,
                max_new_tokens=max_new_tokens,
                stopping_criteria=StoppingCriteriaList([ThermalStoppingCriteria()]),
            )
        else:
            waveforms, sample_rate = engine.model.generate_voice_design(
                text=text,
                language=language,
                instruct=voice_direction(payload.voice_description),
                max_new_tokens=max_new_tokens,
                stopping_criteria=StoppingCriteriaList([ThermalStoppingCriteria()]),
            )

    if engine.thermal_stop:
        temperature = engine.gpu.get("temperature", GPU_ABORT_TEMPERATURE)
        raise ThermalProtectionError(
            f"Génération interrompue à {temperature} °C pour protéger le GPU."
        )
    return np.asarray(waveforms[0]), sample_rate


def encode_waveform(waveform, sample_rate: int, description: str = "") -> bytes:
    output = io.BytesIO()
    sf.write(output, sanitize_waveform(waveform), sample_rate, format="WAV", subtype="PCM_16")
    wav_bytes = output.getvalue()
    return process_audio(wav_bytes, description) if description else wav_bytes


def safe_wav_filename(name: str, fallback: str) -> str:
    stem = Path(name).stem or fallback
    stem = unicodedata.normalize("NFKD", stem)
    stem = "".join(character for character in stem if not unicodedata.combining(character))
    stem = re.sub(r"[^a-zA-Z0-9._ -]+", "-", stem).strip(" .-_")
    return f"{(stem or fallback)[:80]}.wav"


def synthesize_chunk(payload: SpeechRequest, text: str, voice_clone_prompt=None) -> bytes:
    waveform, sample_rate = generate_chunk_waveform(payload, text, voice_clone_prompt)
    description = payload.voice_description if payload.mode == "design" else ""
    return encode_waveform(waveform, sample_rate, description)


def synthesize(payload: SpeechRequest) -> bytes:
    chunks = split_text(payload.text)
    print(
        f"Synthèse {payload.mode}: {len(payload.text)} caractères, {len(chunks)} segment(s).",
        flush=True,
    )
    segments = []
    start_index = 0
    voice_clone_prompt = None

    if payload.mode == "design" and len(chunks) > 1:
        wait_for_safe_temperature(payload.job_id)
        update_progress(
            payload.job_id,
            "voice_reference",
            12,
            "Création de l'empreinte vocale du personnage…",
            1,
            len(chunks),
        )
        reference_text = VOICE_REFERENCE_TEXTS.get(
            payload.language, VOICE_REFERENCE_TEXTS["French"]
        )
        reference_waveform, reference_rate = generate_chunk_waveform(payload, reference_text)
        cool_down_between_segments(payload.job_id)
        wait_for_safe_temperature(payload.job_id)
        load_model("base", payload.job_id)
        update_progress(
            payload.job_id,
            "voice_clone",
            20,
            "Voix verrouillée pour tous les segments du texte…",
            0,
            len(chunks),
        )
        voice_clone_prompt = engine.model.create_voice_clone_prompt(
            ref_audio=(reference_waveform, reference_rate),
            # L'empreinte seule conserve l'identité de la voix sans réinjecter
            # les codes et le texte de référence au début de chaque segment.
            # Le mode ICL laissait parfois le dernier mot de la référence.
            ref_text=None,
            x_vector_only_mode=True,
        )
        # La référence technique n'est jamais incluse dans le WAV final.
        # Chaque mot de l'utilisateur, y compris le premier segment, passe par
        # le même moteur Base et la même empreinte vocale.
        start_index = 0

    for index in range(start_index, len(chunks)):
        chunk = chunks[index]
        wait_for_safe_temperature(payload.job_id)
        percent = 12 + round(index / len(chunks) * 78)
        update_progress(
            payload.job_id,
            "generating",
            percent,
            f"Synthèse du segment {index + 1} sur {len(chunks)}",
            index + 1,
            len(chunks),
        )
        segments.append(synthesize_chunk(payload, chunk, voice_clone_prompt))
        if index < len(chunks) - 1:
            cool_down_between_segments(payload.job_id)
    update_progress(payload.job_id, "assembling", 92, "Assemblage et normalisation de l'audio…")
    return concatenate_speech_chunks(segments, chunks)


def synthesize_dialogue(payload: DialogueRequest) -> bytes:
    prepared = [(index, text, split_text(text)) for index, text in enumerate(payload.elements)]
    total_chunks = sum(len(chunks) for _, _, chunks in prepared)
    completed_chunks = 0
    rendered_lines = []
    for index, text, chunks in prepared:
        even = index % 2 == 0
        line_payload = SpeechRequest(
            text=text,
            voice_description=(
                payload.voice_a_description if even else payload.voice_b_description
            ),
            language=payload.language,
            mode=payload.mode,
            speaker=payload.speaker_a if even else payload.speaker_b,
            job_id=payload.job_id,
        )
        line_segments = []
        for chunk in chunks:
            wait_for_safe_temperature(payload.job_id)
            update_progress(
                payload.job_id,
                "generating",
                12 + round(completed_chunks / total_chunks * 78),
                f"Réplique {index + 1}/{len(payload.elements)} · segment {completed_chunks + 1}/{total_chunks}",
                completed_chunks + 1,
                total_chunks,
            )
            line_segments.append(synthesize_chunk(line_payload, chunk))
            completed_chunks += 1
            if completed_chunks < total_chunks:
                cool_down_between_segments(payload.job_id)
        rendered_lines.append(concatenate_speech_chunks(line_segments, chunks))
    update_progress(payload.job_id, "assembling", 92, "Assemblage du dialogue…")
    if not payload.split_pairs:
        return concatenate_wavs(rendered_lines, payload.pause_ms, "dialogue")

    archive = io.BytesIO()
    with zipfile.ZipFile(archive, "w", compression=zipfile.ZIP_DEFLATED) as output:
        for pair_index, start in enumerate(range(0, len(rendered_lines), 2), start=1):
            pair_lines = rendered_lines[start : start + 2]
            pair_audio = concatenate_wavs(
                pair_lines, payload.pause_ms, f"echange-{pair_index:03d}"
            )
            first_line = start + 1
            last_line = start + len(pair_lines)
            output.writestr(
                f"echange-{pair_index:03d}-repliques-{first_line:03d}-{last_line:03d}.wav",
                pair_audio,
            )
    return archive.getvalue()


def synthesize_batch(payload: BatchRequest) -> bytes:
    archive = io.BytesIO()
    used_names = set()
    total = len(payload.files)
    with zipfile.ZipFile(archive, "w", compression=zipfile.ZIP_DEFLATED) as output:
        for index, item in enumerate(payload.files, start=1):
            update_progress(
                payload.job_id,
                "batch",
                5 + round((index - 1) / total * 90),
                f"Fichier {index}/{total} : {item.name}",
                index,
                total,
            )
            # Le pipeline VoiceDesign long peut basculer temporairement sur le modèle Base
            # pour stabiliser l'identité vocale. On recharge donc le mode demandé au début
            # de chaque fichier pour éviter qu'un fichier suivant hérite du mauvais moteur.
            load_model(payload.mode, payload.job_id)
            speech_payload = SpeechRequest(
                text=item.text,
                voice_description=payload.voice_description,
                language=payload.language,
                mode=payload.mode,
                speaker=payload.speaker,
                job_id=payload.job_id,
            )
            audio = synthesize(speech_payload)
            filename = safe_wav_filename(item.name, f"fichier-{index:03d}")
            if filename.lower() in used_names:
                filename = safe_wav_filename(f"{Path(filename).stem}-{index:03d}", f"fichier-{index:03d}")
            used_names.add(filename.lower())
            output.writestr(filename, audio)
            if index < total:
                cool_down_between_segments(payload.job_id)
    return archive.getvalue()


@app.post("/speech")
async def speech(payload: SpeechRequest):
    try:
        async with engine.lock:
            engine.thermal_stop = False
            update_progress(payload.job_id, "queued", 1, "Préparation de la synthèse…")
            await asyncio.to_thread(wait_for_safe_temperature, payload.job_id)
            await asyncio.to_thread(load_model, payload.mode, payload.job_id)
            audio = await asyncio.to_thread(synthesize, payload)
            update_progress(payload.job_id, "done", 100, "Voix prête")
        return Response(
            content=audio,
            media_type="audio/wav",
            headers={
                "Cache-Control": "no-store",
                "X-TTS-Model": engine.model_id,
                "X-TTS-Mode": engine.mode,
            },
        )
    except torch.cuda.OutOfMemoryError as error:
        update_progress(payload.job_id, "error", engine.progress["percent"], "Mémoire GPU insuffisante")
        torch.cuda.empty_cache()
        raise HTTPException(
            status_code=507,
            detail="Mémoire GPU insuffisante. Utilisez le profil CPU.",
        ) from error
    except ThermalProtectionError as error:
        update_progress(payload.job_id, "error", engine.progress["percent"], str(error))
        raise HTTPException(status_code=503, detail=str(error)) from error
    except Exception as error:
        update_progress(payload.job_id, "error", engine.progress["percent"], "La synthèse locale a échoué")
        print(f"Erreur de synthèse: {error}", flush=True)
        raise HTTPException(status_code=500, detail="La synthèse locale a échoué.") from error


@app.post("/batch")
async def batch(payload: BatchRequest):
    if any(not item.text.strip() for item in payload.files):
        raise HTTPException(status_code=400, detail="Les fichiers ne peuvent pas Ãªtre vides.")
    if sum(len(item.text) for item in payload.files) > 60000:
        raise HTTPException(status_code=400, detail="Le lot est trop long.")

    try:
        async with engine.lock:
            engine.thermal_stop = False
            update_progress(payload.job_id, "queued", 1, "PrÃ©paration du lot de fichiersâ€¦")
            await asyncio.to_thread(wait_for_safe_temperature, payload.job_id)
            await asyncio.to_thread(load_model, payload.mode, payload.job_id)
            archive = await asyncio.to_thread(synthesize_batch, payload)
            update_progress(payload.job_id, "done", 100, "Lot prÃªt")
        return Response(
            content=archive,
            media_type="application/zip",
            headers={
                "Cache-Control": "no-store",
                "X-TTS-Model": engine.model_id,
                "X-TTS-Mode": engine.mode,
                "X-Batch-Files": str(len(payload.files)),
            },
        )
    except torch.cuda.OutOfMemoryError as error:
        update_progress(payload.job_id, "error", engine.progress["percent"], "MÃ©moire GPU insuffisante")
        torch.cuda.empty_cache()
        raise HTTPException(
            status_code=507,
            detail="MÃ©moire GPU insuffisante. RÃ©duisez le lot ou utilisez un mode plus lÃ©ger.",
        ) from error
    except ThermalProtectionError as error:
        update_progress(payload.job_id, "error", engine.progress["percent"], str(error))
        raise HTTPException(status_code=503, detail=str(error)) from error
    except Exception as error:
        update_progress(payload.job_id, "error", engine.progress["percent"], "La gÃ©nÃ©ration du lot a Ã©chouÃ©")
        print(f"Erreur de lot: {error}", flush=True)
        raise HTTPException(status_code=500, detail="La gÃ©nÃ©ration du lot a Ã©chouÃ©.") from error


@app.post("/dialogue")
async def dialogue(payload: DialogueRequest):
    if any(not element.strip() for element in payload.elements):
        raise HTTPException(status_code=400, detail="Les répliques ne peuvent pas être vides.")
    if sum(len(element) for element in payload.elements) > 20000:
        raise HTTPException(status_code=400, detail="Le dialogue est trop long.")

    try:
        async with engine.lock:
            engine.thermal_stop = False
            update_progress(payload.job_id, "queued", 1, "Préparation du dialogue…")
            await asyncio.to_thread(wait_for_safe_temperature, payload.job_id)
            await asyncio.to_thread(load_model, payload.mode, payload.job_id)
            audio = await asyncio.to_thread(synthesize_dialogue, payload)
            update_progress(payload.job_id, "done", 100, "Dialogue prêt")
        file_count = (len(payload.elements) + 1) // 2 if payload.split_pairs else 1
        return Response(
            content=audio,
            media_type="application/zip" if payload.split_pairs else "audio/wav",
            headers={
                "Cache-Control": "no-store",
                "X-TTS-Model": engine.model_id,
                "X-TTS-Mode": engine.mode,
                "X-Dialogue-Lines": str(len(payload.elements)),
                "X-Dialogue-Files": str(file_count),
            },
        )
    except torch.cuda.OutOfMemoryError as error:
        update_progress(payload.job_id, "error", engine.progress["percent"], "Mémoire GPU insuffisante")
        torch.cuda.empty_cache()
        raise HTTPException(
            status_code=507,
            detail="Mémoire GPU insuffisante. Utilisez le profil CPU.",
        ) from error
    except ThermalProtectionError as error:
        update_progress(payload.job_id, "error", engine.progress["percent"], str(error))
        raise HTTPException(status_code=503, detail=str(error)) from error
    except Exception as error:
        update_progress(payload.job_id, "error", engine.progress["percent"], "La génération du dialogue a échoué")
        print(f"Erreur de dialogue: {error}", flush=True)
        raise HTTPException(status_code=500, detail="La génération du dialogue a échoué.") from error
