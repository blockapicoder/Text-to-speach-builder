# Voice Forge — TTS local open source

Voice Forge transforme un texte et une description libre de voix en fichier audio, sans API propriétaire et sans envoyer le contenu à un service distant.

Le moteur est **Qwen3-TTS VoiceDesign 1.7B** : il comprend des consignes comme « démon ancien et grave », « troll comique », « voix spectrale avec écho » ou « narrateur chaleureux ». Il prend nativement en charge le français et neuf autres langues.

## Lancer le projet

### Prérequis

- Windows 10/11, Linux ou macOS.
- [Docker Desktop](https://www.docker.com/products/docker-desktop/) démarré.
- Environ 10 Go d'espace disque libre pour les images et les poids du modèle.
- Pour le mode GPU : une carte NVIDIA, des pilotes récents et la prise en charge GPU dans Docker.

Aucune clé API, installation Python ou installation Node.js n'est nécessaire pour l'utilisation normale.

### 1. Ouvrir PowerShell dans le projet

```powershell
cd C:\openai-codex\text-to-speech
```

### 2. Démarrer avec le GPU NVIDIA — recommandé

```powershell
docker compose -f docker-compose.yml -f docker-compose.gpu.yml up --build
```

Le premier démarrage peut prendre plusieurs minutes : Docker construit les images puis télécharge environ 4,3 Go de poids Qwen3-TTS. Les poids restent ensuite dans un volume local et ne sont pas téléchargés à nouveau.

Lorsque le terminal affiche `Moteur Qwen3-TTS prêt`, ouvrir :

[http://localhost:3000](http://localhost:3000)

### Alternative sans GPU

```powershell
docker compose up --build
```

Le mode CPU fonctionne sans carte NVIDIA, mais la génération vocale est nettement plus lente.

### Démarrages suivants

Les images étant déjà construites, `--build` n'est plus nécessaire :

```powershell
docker compose -f docker-compose.yml -f docker-compose.gpu.yml up
```

Ajoutez `-d` pour lancer le projet en arrière-plan :

```powershell
docker compose -f docker-compose.yml -f docker-compose.gpu.yml up -d
```

### Vérifier l'état

```powershell
docker compose -f docker-compose.yml -f docker-compose.gpu.yml ps
docker compose -f docker-compose.yml -f docker-compose.gpu.yml logs -f
```

Les services `tts-engine` et `voice-forge` doivent être démarrés. Le moteur est opérationnel lorsque `tts-engine` est indiqué comme `healthy`.

Une vérification HTTP est également possible :

```powershell
Invoke-RestMethod http://localhost:3000/api/health
```

### Arrêter le projet

```powershell
docker compose -f docker-compose.yml -f docker-compose.gpu.yml down
```

Cette commande arrête les conteneurs sans supprimer le modèle téléchargé. Pour supprimer également les poids et récupérer l'espace disque :

```powershell
docker compose -f docker-compose.yml -f docker-compose.gpu.yml down -v
```

### Problèmes courants

- **`docker daemon is not running`** : démarrer Docker Desktop et attendre qu'il soit prêt.
- **Port 3000 déjà utilisé** : arrêter l'autre application utilisant ce port, puis relancer Compose.
- **Mémoire GPU insuffisante** : arrêter le profil GPU avec `down`, puis utiliser `docker compose up` en mode CPU.
- **La première génération est lente** : attendre que le statut de l'interface indique « Moteur local opérationnel ».
- **Consulter une erreur du moteur** : exécuter `docker compose logs --tail 100 tts-engine`.

## Composants et licences

| Composant | Rôle | Licence |
| --- | --- | --- |
| Qwen3-TTS VoiceDesign et ses poids | Génération vocale locale | Apache 2.0 |
| PyTorch, Transformers, FastAPI | Inférence locale | Open source |
| Node.js et Express | API publique et interface | Open source |
| Code Voice Forge | Intégration | MIT |

Les poids sont téléchargés une seule fois depuis Hugging Face lors du premier démarrage, puis conservés dans le volume Docker `qwen-models`. Aucun texte ni audio n'est envoyé à une API après l'installation.

Sources officielles : [Qwen3-TTS](https://github.com/QwenLM/Qwen3-TTS) et [modèle VoiceDesign](https://huggingface.co/Qwen/Qwen3-TTS-12Hz-1.7B-VoiceDesign).

## API

### `POST /api/speech`

```json
{
  "text": "Qui ose entrer dans mon royaume ?",
  "voiceDescription": "Une voix de démon très grave, ancienne et menaçante. Débit lent et théâtral.",
  "language": "French"
}
```

La réponse contient directement un fichier WAV (`audio/wav`) lisible par les navigateurs.

```js
const response = await fetch("http://localhost:3000/api/speech", {
  method: "POST",
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify({
    text: "Qui ose entrer dans mon royaume ?",
    voiceDescription: "Démon très grave, ancien et menaçant",
    language: "French"
  })
});

if (!response.ok) throw new Error((await response.json()).error);

const audio = new Audio(URL.createObjectURL(await response.blob()));
await audio.play();
```

### Routes complémentaires

- `GET /api/health` : disponibilité du moteur local.
- `GET /api/config` : langues, styles rapides et limite de caractères.
- `POST /api/dialogue` : génère et assemble un dialogue alternant deux voix.
- Le moteur FastAPI est uniquement exposé sur la boucle locale `127.0.0.1:8001`.

## Dialogues à deux voix

L'onglet **Dialogue JSON** accepte un fichier respectant cette interface :

```ts
interface Dialogue {
  elements: string[];
}
```

Exemple :

```json
{
  "elements": [
    "Première réplique avec la voix A.",
    "Deuxième réplique avec la voix B.",
    "Retour à la voix A."
  ]
}
```

Les index pairs (`0`, `2`, `4`…) utilisent la première voix et les index impairs (`1`, `3`, `5`…) la deuxième. L'interface permet de choisir la durée des silences, d'écouter le résultat puis de l'enregistrer dans un unique fichier WAV. Un fichier prêt à tester est fourni dans `examples/dialogue.json`.

## Développement de l'interface

Le moteur peut rester dans Docker tandis que Node tourne directement sous Windows :

```powershell
docker compose up tts-engine
npm install
npm run dev
```

La valeur par défaut de `QWEN_TTS_URL` est `http://127.0.0.1:8001`.

## Tests

```powershell
npm test
docker compose config
docker compose -f docker-compose.yml -f docker-compose.gpu.yml config
```

Les tests Node utilisent un faux moteur audio et ne téléchargent pas le modèle.

## Limites pratiques

- VoiceDesign est un modèle de 1,7 milliard de paramètres : privilégiez un GPU récent avec assez de mémoire.
- La RTX 2060 peut nécessiter le profil CPU si le modèle dépasse sa VRAM disponible.
- Le moteur traite une génération à la fois pour éviter les dépassements mémoire.
- Le modèle peut créer une impression d'environnement ou d'écho depuis la consigne, mais il ne garantit pas des paramètres DSP mesurables au milliseconde près.
- Conservez l'indication visible précisant que la voix est générée par IA.
