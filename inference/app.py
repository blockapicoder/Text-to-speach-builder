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


class TimedLine(BaseModel):
    text: str = Field(min_length=1, max_length=1000)
    start_ms: int = Field(ge=0, le=30 * 60 * 1000)
    duration_ms: int | None = Field(default=None, ge=100, le=10 * 60 * 1000)


class ScoreSpeechRequest(BaseModel):
    lines: list[TimedLine] = Field(min_length=1, max_length=120)
    song_duration_ms: int | None = Field(default=None, ge=100, le=30 * 60 * 1000)
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


class ModelMemoryError(RuntimeError):
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


def parse_gpu_number(value: str) -> float | None:
    try:
        normalized = value.strip().replace("W", "").replace("%", "")
        if normalized.upper() in {"", "N/A", "NA", "[N/A]"}:
            return None
        return float(normalized)
    except Exception:
        return None


def round_gpu_value(value: float | None, digits: int = 0):
    if value is None:
        return None
    return round(value, digits) if digits else round(value)


def gpu_temperature(stats: dict) -> int | float | None:
    temperature = stats.get("temperature")
    return temperature if isinstance(temperature, (int, float)) else None


def read_torch_cuda_stats() -> dict:
    if DEVICE == "cpu" or not torch.cuda.is_available():
        return {"available": False, "source": "none", "stats_available": False}

    device_index = 0
    device_text = str(engine.device or "")
    if device_text.startswith("cuda:"):
        with suppress(Exception):
            device_index = int(device_text.split(":", 1)[1])

    memory_used_mb = None
    memory_total_mb = None
    device_name = None
    with suppress(Exception):
        properties = torch.cuda.get_device_properties(device_index)
        memory_total_mb = round(properties.total_memory / 1024 / 1024)
        device_name = properties.name
    with suppress(Exception):
        free_bytes, total_bytes = torch.cuda.mem_get_info(device_index)
        memory_used_mb = round((total_bytes - free_bytes) / 1024 / 1024)
        memory_total_mb = round(total_bytes / 1024 / 1024)
    if memory_used_mb is None:
        with suppress(Exception):
            memory_used_mb = round(
                max(
                    torch.cuda.memory_allocated(device_index),
                    torch.cuda.memory_reserved(device_index),
                )
                / 1024
                / 1024
            )

    return {
        "available": True,
        "temperature": None,
        "memory_used_mb": memory_used_mb,
        "memory_total_mb": memory_total_mb,
        "utilization": None,
        "power_watts": None,
        "pause_temperature": GPU_PAUSE_TEMPERATURE,
        "resume_temperature": GPU_RESUME_TEMPERATURE,
        "abort_temperature": GPU_ABORT_TEMPERATURE,
        "source": "torch",
        "stats_available": False,
        "device_name": device_name,
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
        first_line = completed.stdout.strip().splitlines()[0]
        values = [value.strip() for value in first_line.split(",")]
        temperature = parse_gpu_number(values[0]) if len(values) > 0 else None
        memory_used = parse_gpu_number(values[1]) if len(values) > 1 else None
        memory_total = parse_gpu_number(values[2]) if len(values) > 2 else None
        utilization = parse_gpu_number(values[3]) if len(values) > 3 else None
        power = parse_gpu_number(values[4]) if len(values) > 4 else None
        if temperature is None and memory_total is None:
            return read_torch_cuda_stats()
        return {
            "available": True,
            "temperature": round_gpu_value(temperature),
            "memory_used_mb": round_gpu_value(memory_used),
            "memory_total_mb": round_gpu_value(memory_total),
            "utilization": round_gpu_value(utilization),
            "power_watts": round_gpu_value(power, 1),
            "pause_temperature": GPU_PAUSE_TEMPERATURE,
            "resume_temperature": GPU_RESUME_TEMPERATURE,
            "abort_temperature": GPU_ABORT_TEMPERATURE,
            "source": "nvidia-smi",
            "stats_available": temperature is not None,
        }
    except Exception:
        return read_torch_cuda_stats()


async def monitor_gpu():
    while True:
        engine.gpu = await asyncio.to_thread(read_gpu_stats)
        temperature = gpu_temperature(engine.gpu)
        if temperature is not None and temperature >= GPU_ABORT_TEMPERATURE:
            engine.thermal_stop = True
        await asyncio.sleep(2)


def wait_for_safe_temperature(job_id: str | None):
    current_stats = read_gpu_stats()
    if current_stats.get("available"):
        engine.gpu = current_stats
    if not engine.gpu.get("available"):
        return
    temperature = gpu_temperature(engine.gpu)
    if temperature is None:
        return
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
        temperature = gpu_temperature(engine.gpu)
        if temperature is None:
            return
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
        temperature = gpu_temperature(engine.gpu)
        if temperature is None:
            return
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


def audible_content_bounds_samples(waveform, sample_rate: int) -> tuple[int, int]:
    """Retourne les bornes utiles du contenu vocal, en ignorant les queues faibles."""
    audio = np.asarray(waveform, dtype=np.float32)
    if audio.ndim > 1:
        audio = np.mean(audio, axis=1)
    if not audio.size:
        return (0, 0)

    absolute = np.abs(np.nan_to_num(audio, nan=0.0, posinf=0.0, neginf=0.0))
    peak = float(np.max(absolute)) if absolute.size else 0.0
    if peak <= 0.0001:
        return (0, 0)

    # Le test de découpe doit répondre à la question "est-ce que des mots sont
    # coupés ?", pas "est-ce qu'il reste une queue de souffle/réverbe ?".
    # Un seuil un peu plus ferme évite donc de peindre en rouge une mesure où la
    # phrase est entièrement audible mais où le WAV finit par une traîne faible.
    window = max(1, round(sample_rate * 0.03))
    hop = max(1, round(sample_rate * 0.01))
    threshold = max(0.006, peak * 0.045)
    first_start: int | None = None
    last_end = 0
    for start in range(0, len(absolute), hop):
        chunk = absolute[start : start + window]
        if not chunk.size:
            continue
        rms = float(np.sqrt(np.mean(np.square(chunk))))
        if rms >= threshold:
            if first_start is None:
                first_start = start
            last_end = min(len(absolute), start + len(chunk))
    if first_start is None:
        return (0, 0)
    pad = round(sample_rate * 0.04)
    return (max(0, first_start - pad), min(len(absolute), last_end + pad))


def audible_content_end_sample(waveform, sample_rate: int) -> int:
    """Retourne la fin du contenu vocal utile."""
    return audible_content_bounds_samples(waveform, sample_rate)[1]


def trim_score_leading_silence(waveform, sample_rate: int):
    """Aligne la phrase au début de mesure sans manger l'attaque de la voix."""
    start, _end = audible_content_bounds_samples(waveform, sample_rate)
    keep_pad = round(sample_rate * 0.035)
    trim_threshold = round(sample_rate * 0.09)
    if start <= trim_threshold:
        return waveform
    trim_at = max(0, start - keep_pad)
    return waveform[trim_at:].copy()


def audio_diagnostic_headers(audio: bytes) -> dict[str, str]:
    try:
        waveform, sample_rate = decode_wav_bytes(audio)
        start, end = audible_content_bounds_samples(waveform, sample_rate)
        duration_ms = round(len(waveform) / sample_rate * 1000)
        audible_duration_ms = round(max(0, end - start) / sample_rate * 1000)
        audible_end_ms = round(end / sample_rate * 1000)
        return {
            "X-TTS-Audio-Duration-Ms": str(duration_ms),
            "X-TTS-Audible-Duration-Ms": str(audible_duration_ms),
            "X-TTS-Audible-End-Ms": str(audible_end_ms),
        }
    except Exception:
        return {}


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
    try:
        engine.model = Qwen3TTSModel.from_pretrained(
            model_id,
            **model_options,
        )
    except Exception as error:
        unload_model()
        message = str(error).lower()
        if (
            "1455" in message
            or "paging file" in message
            or "fichier de pagination" in message
            or "out of memory" in message
            or "memory" in message
        ):
            detail = (
                "Mémoire Windows/GPU insuffisante pour charger ce modèle. "
                "Utilisez CustomVoice 0.6B, fermez les applications lourdes ou augmentez le fichier de pagination Windows."
            )
            update_progress(job_id, "error", engine.progress["percent"], detail)
            raise ModelMemoryError(detail) from error
        raise
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
    temperature = gpu_temperature(engine.gpu)
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
        temperature = gpu_temperature(engine.gpu) or GPU_ABORT_TEMPERATURE
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


def decode_wav_bytes(audio: bytes) -> tuple[np.ndarray, int]:
    data, sample_rate = sf.read(io.BytesIO(audio), dtype="float32", always_2d=False)
    if data.ndim > 1:
        data = np.mean(data, axis=1)
    return sanitize_waveform(data), sample_rate


def synthesize_score_speech(payload: ScoreSpeechRequest) -> tuple[bytes, list[dict[str, int]]]:
    rendered = []
    truncated_lines: list[dict[str, int]] = []
    voice_cache: dict[tuple[str, str, str, str, str], tuple[np.ndarray, int]] = {}
    total = len(payload.lines)
    for index, line in enumerate(payload.lines, start=1):
        update_progress(
            payload.job_id,
            "score",
            5 + round((index - 1) / total * 86),
            f"Ligne slam {index}/{total}",
            index,
            total,
        )
        cache_key = (
            line.text.strip(),
            payload.voice_description.strip(),
            payload.language,
            payload.mode,
            payload.speaker or "",
        )
        cached = voice_cache.get(cache_key)
        if cached is None:
            load_model(payload.mode, payload.job_id)
            speech_payload = SpeechRequest(
                text=line.text,
                voice_description=payload.voice_description,
                language=payload.language,
                mode=payload.mode,
                speaker=payload.speaker,
                job_id=payload.job_id,
            )
            audio = synthesize(speech_payload)
            waveform, sample_rate = decode_wav_bytes(audio)
            voice_cache[cache_key] = (waveform.copy(), sample_rate)
        else:
            waveform, sample_rate = cached
            waveform = waveform.copy()
        if line.duration_ms:
            waveform = trim_score_leading_silence(waveform, sample_rate)
            max_samples = round(line.duration_ms / 1000 * sample_rate)
            if len(waveform) > max_samples:
                generated_ms = round(len(waveform) / sample_rate * 1000)
                audible_start, audible_end = audible_content_bounds_samples(waveform, sample_rate)
                audible_ms = round(max(0, audible_end - audible_start) / sample_rate * 1000)
                tolerance_samples = round(sample_rate * 0.28)
                if audible_end > max_samples + tolerance_samples:
                    truncated_lines.append(
                        {
                            "index": index,
                            "start_ms": line.start_ms,
                            "duration_ms": line.duration_ms,
                            "generated_ms": generated_ms,
                            "audible_ms": audible_ms,
                        }
                    )
                waveform = waveform[:max_samples].copy()
                fade_samples = min(len(waveform), round(sample_rate * 0.025))
                if fade_samples > 0:
                    waveform[-fade_samples:] *= np.linspace(1, 0, fade_samples, dtype=np.float32)
        rendered.append((line.start_ms, line.duration_ms, waveform, sample_rate))
        if index < total:
            cool_down_between_segments(payload.job_id)

    target_rate = rendered[0][3]
    total_samples = 1
    if payload.song_duration_ms:
        total_samples = max(total_samples, round(payload.song_duration_ms / 1000 * target_rate))
    for start_ms, duration_ms, waveform, sample_rate in rendered:
        if sample_rate != target_rate:
            raise RuntimeError("Les segments vocaux n'ont pas le mÃªme taux d'Ã©chantillonnage.")
        start_sample = round(start_ms / 1000 * target_rate)
        reserved_samples = round(duration_ms / 1000 * target_rate) if duration_ms else len(waveform)
        total_samples = max(total_samples, start_sample + max(len(waveform), reserved_samples) + round(target_rate * 0.5))

    mix = np.zeros(total_samples, dtype=np.float32)
    for start_ms, _duration_ms, waveform, _sample_rate in rendered:
        start_sample = round(start_ms / 1000 * target_rate)
        end_sample = start_sample + len(waveform)
        mix[start_sample:end_sample] += waveform.astype(np.float32)

    peak = float(np.max(np.abs(mix))) if len(mix) else 0
    if peak > 0.98:
        mix = mix / peak * 0.98
    return encode_waveform(mix, target_rate), truncated_lines


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
                **audio_diagnostic_headers(audio),
            },
        )
    except torch.cuda.OutOfMemoryError as error:
        update_progress(payload.job_id, "error", engine.progress["percent"], "Mémoire GPU insuffisante")
        torch.cuda.empty_cache()
        raise HTTPException(
            status_code=507,
            detail="Mémoire GPU insuffisante. Utilisez le profil CPU.",
        ) from error
    except ModelMemoryError as error:
        update_progress(payload.job_id, "error", engine.progress["percent"], str(error))
        raise HTTPException(status_code=507, detail=str(error)) from error
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
    except ModelMemoryError as error:
        update_progress(payload.job_id, "error", engine.progress["percent"], str(error))
        raise HTTPException(status_code=507, detail=str(error)) from error
    except ThermalProtectionError as error:
        update_progress(payload.job_id, "error", engine.progress["percent"], str(error))
        raise HTTPException(status_code=503, detail=str(error)) from error
    except Exception as error:
        update_progress(payload.job_id, "error", engine.progress["percent"], "La gÃ©nÃ©ration du lot a Ã©chouÃ©")
        print(f"Erreur de lot: {error}", flush=True)
        raise HTTPException(status_code=500, detail="La gÃ©nÃ©ration du lot a Ã©chouÃ©.") from error


@app.post("/score-speech")
async def score_speech(payload: ScoreSpeechRequest):
    if any(not line.text.strip() for line in payload.lines):
        raise HTTPException(status_code=400, detail="Les lignes ne peuvent pas Ãªtre vides.")
    if sum(len(line.text) for line in payload.lines) > 30000:
        raise HTTPException(status_code=400, detail="Le texte de partition est trop long.")
    try:
        async with engine.lock:
            engine.thermal_stop = False
            update_progress(payload.job_id, "queued", 1, "PrÃ©paration de la voix sur partitionâ€¦")
            await asyncio.to_thread(wait_for_safe_temperature, payload.job_id)
            await asyncio.to_thread(load_model, payload.mode, payload.job_id)
            audio, truncated_lines = await asyncio.to_thread(synthesize_score_speech, payload)
            truncated_count = len(truncated_lines)
            done_message = "Voix sur partition prête"
            if truncated_count:
                done_message = f"{done_message} · {truncated_count} ligne(s) tronquée(s)"
            update_progress(payload.job_id, "done", 100, done_message)
        return Response(
            content=audio,
            media_type="audio/wav",
            headers={
                "Cache-Control": "no-store",
                "X-TTS-Model": engine.model_id,
                "X-TTS-Mode": engine.mode,
                "X-Score-Lines": str(len(payload.lines)),
                "X-Score-Duration-Ms": str(payload.song_duration_ms or ""),
                "X-Score-Truncated-Count": str(truncated_count),
                "X-Score-Truncated-Lines": ",".join(str(item["index"]) for item in truncated_lines),
            },
        )
    except torch.cuda.OutOfMemoryError as error:
        update_progress(payload.job_id, "error", engine.progress["percent"], "MÃ©moire GPU insuffisante")
        torch.cuda.empty_cache()
        raise HTTPException(
            status_code=507,
            detail="MÃ©moire GPU insuffisante. RÃ©duisez le nombre de lignes ou utilisez CustomVoice.",
        ) from error
    except ModelMemoryError as error:
        update_progress(payload.job_id, "error", engine.progress["percent"], str(error))
        raise HTTPException(status_code=507, detail=str(error)) from error
    except ThermalProtectionError as error:
        update_progress(payload.job_id, "error", engine.progress["percent"], str(error))
        raise HTTPException(status_code=503, detail=str(error)) from error
    except Exception as error:
        update_progress(payload.job_id, "error", engine.progress["percent"], "La voix sur partition a Ã©chouÃ©")
        print(f"Erreur voix partition: {error}", flush=True)
        raise HTTPException(status_code=500, detail=f"La voix sur partition a Ã©chouÃ©: {error}") from error


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
    except ModelMemoryError as error:
        update_progress(payload.job_id, "error", engine.progress["percent"], str(error))
        raise HTTPException(status_code=507, detail=str(error)) from error
    except ThermalProtectionError as error:
        update_progress(payload.job_id, "error", engine.progress["percent"], str(error))
        raise HTTPException(status_code=503, detail=str(error)) from error
    except Exception as error:
        update_progress(payload.job_id, "error", engine.progress["percent"], "La génération du dialogue a échoué")
        print(f"Erreur de dialogue: {error}", flush=True)
        raise HTTPException(status_code=500, detail="La génération du dialogue a échoué.") from error
