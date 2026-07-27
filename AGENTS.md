# Instructions Codex pour Voice Forge

Après toute modification de l'application, ne pas oublier de mettre à jour le portable.

Modifications concernées :

- `public/`
- `src/`
- `inference/`
- `src-tauri/`
- `package.json` ou `package-lock.json`
- fichiers Docker utilisés par l'exécutable portable

Checklist obligatoire avant de dire que c'est terminé :

1. Lancer `npm test`.
2. Lancer `npm run portable:update`.
3. Vérifier que `dist/VoiceForge-Portable/VoiceForge.exe` a une date récente.
4. Si `dist/VoiceForge-Portable/USE_DOCKER` existe, vérifier que l'image Docker `voice-forge` a bien été reconstruite.

Ne jamais annoncer que l'exécutable est à jour si `npm run portable:update` n'a pas réussi.
