import json
import os
from pathlib import Path

from huggingface_hub import snapshot_download


MODELS = {
    "Qwen/Qwen3-TTS-12Hz-0.6B-CustomVoice": "custom-voice-0.6b",
    "Qwen/Qwen3-TTS-12Hz-1.7B-VoiceDesign": "voice-design-1.7b",
    "Qwen/Qwen3-TTS-12Hz-0.6B-Base": "base-voice-clone-0.6b",
}


def main():
    model_root = Path(os.environ["HF_HOME"]).resolve()
    model_root.mkdir(parents=True, exist_ok=True)
    snapshots = {}
    repositories = model_root / "repositories"
    repositories.mkdir(parents=True, exist_ok=True)
    for model_id, directory_name in MODELS.items():
        target = repositories / directory_name
        if (target / "config.json").is_file() and list(target.glob("*.safetensors")):
            print(f"Déjà présent : {model_id}", flush=True)
            snapshots[model_id] = f"repositories/{directory_name}"
            continue
        print(f"Téléchargement hors ligne : {model_id}", flush=True)
        snapshot_download(
            repo_id=model_id,
            local_dir=target,
            max_workers=2,
        )
        snapshots[model_id] = f"repositories/{directory_name}"

    (model_root / "offline-models.json").write_text(
        json.dumps(snapshots, ensure_ascii=False, indent=2),
        encoding="utf-8",
    )
    print("Tous les modèles sont présents dans le paquet portable.", flush=True)


if __name__ == "__main__":
    main()
