import asyncio
import io
import os
import subprocess
import tempfile
import unicodedata
from contextlib import asynccontextmanager
from pathlib import Path

import soundfile as sf
import torch
import numpy as np
from fastapi import FastAPI, HTTPException
from fastapi.responses import Response
from pydantic import BaseModel, Field
from qwen_tts import Qwen3TTSModel


MODEL_ID = os.getenv(
    "TTS_MODEL_ID", "Qwen/Qwen3-TTS-12Hz-1.7B-VoiceDesign"
)
DEVICE = os.getenv("TTS_DEVICE", "auto").lower()
LANGUAGES = {
    "Auto",
    "French",
    "English",
    "Spanish",
    "German",
    "Italian",
    "Portuguese",
}


class SpeechRequest(BaseModel):
    text: str = Field(min_length=1, max_length=4096)
    voice_description: str = Field(min_length=1, max_length=1000)
    language: str = "French"


class DialogueRequest(BaseModel):
    elements: list[str] = Field(min_length=1, max_length=50)
    voice_a_description: str = Field(min_length=1, max_length=1000)
    voice_b_description: str = Field(min_length=1, max_length=1000)
    language: str = "French"
    pause_ms: int = Field(default=350, ge=0, le=2000)


class Engine:
    model = None
    device = "cpu"
    lock = asyncio.Lock()


engine = Engine()


def normalized_words(value: str) -> str:
    value = unicodedata.normalize("NFKD", value.lower())
    return "".join(character for character in value if not unicodedata.combining(character))


def voice_direction(description: str) -> str:
    words = normalized_words(description)
    directions = []

    if any(word in words for word in ("demon", "diable", "infernal")):
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
        "Speak only the supplied text. Do not add, remove, translate, or rephrase words."
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

    if any(word in words for word in ("demon", "diable", "infernal")):
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


def load_model():
    requested = DEVICE
    use_cuda = torch.cuda.is_available() and requested != "cpu"
    engine.device = "cuda:0" if use_cuda else "cpu"
    dtype = torch.float16 if use_cuda else torch.float32

    print(f"Chargement de {MODEL_ID} sur {engine.device}…", flush=True)
    engine.model = Qwen3TTSModel.from_pretrained(
        MODEL_ID,
        device_map=engine.device,
        dtype=dtype,
        attn_implementation="sdpa",
    )
    print("Moteur Qwen3-TTS prêt.", flush=True)


@asynccontextmanager
async def lifespan(_app: FastAPI):
    await asyncio.to_thread(load_model)
    yield
    engine.model = None
    if torch.cuda.is_available():
        torch.cuda.empty_cache()


app = FastAPI(
    title="Voice Forge — moteur Qwen3-TTS local",
    version="1.0.0",
    lifespan=lifespan,
)


@app.get("/health")
def health():
    return {
        "ready": engine.model is not None,
        "model": MODEL_ID,
        "device": engine.device,
        "open_source": True,
    }


def synthesize(payload: SpeechRequest) -> bytes:
    language = payload.language if payload.language in LANGUAGES else "Auto"
    instruction = voice_direction(payload.voice_description)

    with torch.inference_mode():
        waveforms, sample_rate = engine.model.generate_voice_design(
            text=payload.text.strip(),
            language=language,
            instruct=instruction,
        )

    output = io.BytesIO()
    sf.write(output, waveforms[0], sample_rate, format="WAV", subtype="PCM_16")
    return process_audio(output.getvalue(), payload.voice_description)


def synthesize_dialogue(payload: DialogueRequest) -> bytes:
    segments = []
    for index, text in enumerate(payload.elements):
        description = (
            payload.voice_a_description if index % 2 == 0 else payload.voice_b_description
        )
        segments.append(
            synthesize(
                SpeechRequest(
                    text=text,
                    voice_description=description,
                    language=payload.language,
                )
            )
        )

    with tempfile.TemporaryDirectory(prefix="voice-forge-dialogue-") as directory:
        directory_path = Path(directory)
        first_info = sf.info(io.BytesIO(segments[0]))
        silence_path = directory_path / "silence.wav"
        silence_frames = int(first_info.samplerate * payload.pause_ms / 1000)
        silence = np.zeros((silence_frames, first_info.channels), dtype=np.float32)
        if first_info.channels == 1:
            silence = silence[:, 0]
        sf.write(silence_path, silence, first_info.samplerate, subtype="PCM_16")

        inputs = []
        for index, segment in enumerate(segments):
            segment_path = directory_path / f"line-{index:03d}.wav"
            segment_path.write_bytes(segment)
            inputs.append(str(segment_path))
            if index < len(segments) - 1 and payload.pause_ms:
                inputs.append(str(silence_path))

        result_path = directory_path / "dialogue.wav"
        completed = subprocess.run(
            ["sox", *inputs, str(result_path), "norm", "-1"],
            capture_output=True,
            text=True,
        )
        if completed.returncode != 0:
            raise RuntimeError(f"Assemblage SoX impossible: {completed.stderr}")
        return result_path.read_bytes()


@app.post("/speech")
async def speech(payload: SpeechRequest):
    if engine.model is None:
        raise HTTPException(status_code=503, detail="Le modèle local se charge encore.")

    try:
        async with engine.lock:
            audio = await asyncio.to_thread(synthesize, payload)
        return Response(
            content=audio,
            media_type="audio/wav",
            headers={"Cache-Control": "no-store", "X-TTS-Model": MODEL_ID},
        )
    except torch.cuda.OutOfMemoryError as error:
        torch.cuda.empty_cache()
        raise HTTPException(
            status_code=507,
            detail="Mémoire GPU insuffisante. Utilisez le profil CPU.",
        ) from error
    except Exception as error:
        print(f"Erreur de synthèse: {error}", flush=True)
        raise HTTPException(status_code=500, detail="La synthèse locale a échoué.") from error


@app.post("/dialogue")
async def dialogue(payload: DialogueRequest):
    if engine.model is None:
        raise HTTPException(status_code=503, detail="Le modèle local se charge encore.")

    if any(not element.strip() for element in payload.elements):
        raise HTTPException(status_code=400, detail="Les répliques ne peuvent pas être vides.")
    if sum(len(element) for element in payload.elements) > 20000:
        raise HTTPException(status_code=400, detail="Le dialogue est trop long.")

    try:
        async with engine.lock:
            audio = await asyncio.to_thread(synthesize_dialogue, payload)
        return Response(
            content=audio,
            media_type="audio/wav",
            headers={
                "Cache-Control": "no-store",
                "X-TTS-Model": MODEL_ID,
                "X-Dialogue-Lines": str(len(payload.elements)),
            },
        )
    except torch.cuda.OutOfMemoryError as error:
        torch.cuda.empty_cache()
        raise HTTPException(
            status_code=507,
            detail="Mémoire GPU insuffisante. Utilisez le profil CPU.",
        ) from error
    except Exception as error:
        print(f"Erreur de dialogue: {error}", flush=True)
        raise HTTPException(status_code=500, detail="La génération du dialogue a échoué.") from error
