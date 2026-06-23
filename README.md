# Voice Forge — TTS local open source

Voice Forge transforme un texte et une description libre de voix en fichier audio, sans API propriétaire et sans envoyer le contenu à un service distant.

Deux moteurs sont disponibles dans l'interface : **Qwen3-TTS VoiceDesign 1.7B** pour créer librement des personnages, et **Qwen3-TTS CustomVoice 0.6B** pour utiliser neuf timbres officiels avec beaucoup moins de mémoire. Ils prennent en charge le français et neuf autres langues.

## Version Windows portable et totalement hors ligne

La distribution portable ne demande aucune installation et n'utilise pas Docker. Elle contient `VoiceForge.exe`, Node.js, Python 3.11, PyTorch CUDA, SoX et trois modèles Qwen : CustomVoice, VoiceDesign et Base pour verrouiller les voix longues par clonage.

```text
dist/VoiceForge-Portable/
├─ VoiceForge.exe
├─ app/
├─ models/
├─ runtime/
└─ logs/
```

Pour l'utiliser, double-cliquer sur `VoiceForge.exe`. Il faut conserver tout le dossier : les modèles sont trop volumineux pour être incorporés proprement dans l'unique fichier EXE. La distribution actuelle fait environ 13 Go.

Le fonctionnement est forcé hors ligne avec `HF_HUB_OFFLINE=1` et `TRANSFORMERS_OFFLINE=1`. Le pilote NVIDIA et Microsoft Edge WebView2 restent des composants Windows requis. Aucun runtime Python, Node.js ou Docker système n'est nécessaire.

Pour reconstruire le dossier portable depuis les sources sur une machine connectée :

```powershell
powershell -ExecutionPolicy Bypass -File .\scripts\build-portable.ps1
```

La construction télécharge les dépendances et les poids une seule fois. Le dossier produit peut ensuite être copié et exécuté sur une machine hors ligne compatible NVIDIA.

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

Le premier démarrage peut prendre plusieurs minutes : Docker construit les images puis télécharge le modèle VoiceDesign. Le modèle CustomVoice 0.6B est téléchargé lors de sa première sélection. Les poids restent ensuite dans un volume local et ne sont pas téléchargés à nouveau.

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

### Progression et protection thermique

L'interface affiche la progression de chaque génération (chargement du modèle, segments, assemblage) ainsi que la température, la VRAM, l'utilisation et la puissance du GPU. Le statut brut est disponible avec :

```powershell
Invoke-RestMethod http://localhost:3000/api/status
```

Le profil **Équilibré** est actif par défaut. Il démarre avec CustomVoice 0.6B, utilise des segments courts de 70 caractères et exige un retour à **65 °C** avant chaque calcul vocal. Il marque cinq secondes de refroidissement entre les segments, affiche l'état thermique dès **72 °C** et interrompt la synthèse à **78 °C**. Des micro-fondus de 6 ms et une limitation anti-saturation sont appliqués lors de l'assemblage pour éviter les clics et grésillements aux raccords.

```text
TTS_POWER_PROFILE=balanced
TTS_CHUNK_CHARACTERS=90
TTS_GPU_PAUSE_TEMP=72
TTS_GPU_RESUME_TEMP=65
TTS_GPU_ABORT_TEMP=78
TTS_GPU_COOLDOWN_SECONDS=5
```

Cette protection réduit le risque pendant les calculs, mais ne remplace pas un refroidissement correct. Après une extinction thermique, laissez refroidir la machine, nettoyez les entrées d'air et les ventilateurs, et évitez de relancer une longue synthèse tant que les températures au repos restent anormalement hautes.

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
| Qwen3-TTS VoiceDesign 1.7B et CustomVoice 0.6B | Génération vocale locale | Apache 2.0 |
| PyTorch, Transformers, FastAPI | Inférence locale | Open source |
| Node.js et Express | API publique et interface | Open source |
| Code Voice Forge | Intégration | MIT |

Les poids sont téléchargés une seule fois depuis Hugging Face lors du premier démarrage, puis conservés dans le volume Docker `qwen-models`. Aucun texte ni audio n'est envoyé à une API après l'installation.

Sources officielles : [Qwen3-TTS](https://github.com/QwenLM/Qwen3-TTS) et [modèle VoiceDesign](https://huggingface.co/Qwen/Qwen3-TTS-12Hz-1.7B-VoiceDesign).

## Deux modes de génération

- **VoiceDesign 1.7B** : comprend une description libre de voix et alimente les personnages Démon, Troll, Magicien, Chèvre, etc. C'est le mode le plus expressif, mais il remplit presque entièrement une RTX 2060 6 Go.
- **CustomVoice 0.6B** : propose les neuf timbres officiels Vivian, Serena, Uncle Fu, Dylan, Eric, Ryan, Aiden, Ono Anna et Sohee. Il consomme nettement moins de VRAM et convient mieux aux textes et dialogues longs.

Pour un texte VoiceDesign découpé en plusieurs segments, Voice Forge crée d'abord le premier segment avec VoiceDesign, extrait son empreinte vocale avec **Qwen3-TTS Base 0.6B**, puis réutilise cette même empreinte pour tous les segments suivants. Seule l'empreinte du locuteur est transmise : le texte et les codes audio de référence ne sont pas réinjectés, ce qui évite de répéter un mot au début de chaque segment. Le modèle Base est chargé uniquement lorsque ce verrouillage est nécessaire. Sur GPU NVIDIA, il fonctionne en FP32 natif afin d'éviter les crépitements de l'INT8 et l'instabilité numérique observée en FP16 sur les cartes Turing.

Un point, un point d'exclamation, un point d'interrogation ou des points de suspension forcent toujours un nouveau segment. Entre deux phrases, Voice Forge crée une pause naturelle de 90 ms avec des bords adoucis. Lorsqu'une phrase trop longue doit malgré tout être coupée sur un espace, les morceaux sont raccordés par un fondu croisé de 40 ms. La pause configurée dans l'écran Dialogue ne s'applique qu'entre les répliques.

CustomVoice 0.6B et Base 0.6B fonctionnent en FP32 natif sur le GPU. VoiceDesign 1.7B utilise le FP16. Chaque sortie, y compris un texte court constitué d'un seul segment, est normalisée à -1 dB.

Un seul modèle est conservé en VRAM. Lors d'un changement de mode, le serveur décharge le modèle courant puis charge le nouveau ; cette transition peut prendre quelques dizaines de secondes. Les textes longs sont automatiquement découpés en segments de 260 caractères puis réassemblés en un WAV unique pour limiter les pointes de mémoire.

La génération utilise une graine stable par défaut. Elle est calculée depuis la description VoiceDesign ou le timbre CustomVoice, puis réappliquée à chaque segment. Aucun paramètre de température ou d'échantillonnage n'est imposé : Qwen3-TTS utilise ses réglages natifs. Cette configuration permet de tester la stabilité de la graine sans modifier le comportement normal du modèle.

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
- `GET /api/status` : progression courante, température, VRAM, charge et puissance GPU.
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

docker compose -f docker-compose.yml -f docker-compose.gpu.yml up


docker compose -f docker-compose.yml -f docker-compose.gpu.yml up --build --force-recreate
