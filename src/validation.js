export function validateSpeechRequest(body, config) {
  const text = typeof body?.text === "string" ? body.text.trim() : "";
  const voiceDescription =
    typeof body?.voiceDescription === "string"
      ? body.voiceDescription.trim()
      : "";
  const language =
    typeof body?.language === "string" ? body.language.trim() : config.defaultLanguage;
  const mode = typeof body?.mode === "string" ? body.mode.trim() : config.defaultMode;
  const speaker = typeof body?.speaker === "string" ? body.speaker.trim() : "";
  const jobId = typeof body?.jobId === "string" ? body.jobId.trim() : "";
  const errors = [];
  if (!text) errors.push("Le champ « text » est obligatoire.");
  if (text.length > config.maxCharacters) {
    errors.push(`Le texte ne peut pas dépasser ${config.maxCharacters} caractères.`);
  }
  if (voiceDescription.length > 1000) {
    errors.push("La description de voix ne peut pas dépasser 1000 caractères.");
  }
  if (!config.languages.includes(language)) {
    errors.push(`Langue inconnue. Valeurs acceptées : ${config.languages.join(", ")}.`);
  }
  if (!config.modes.some((item) => item.id === mode)) {
    errors.push("Mode TTS inconnu.");
  }
  if (mode === "design" && !voiceDescription) {
    errors.push("La description de voix est obligatoire en mode VoiceDesign.");
  }
  if (mode === "custom" && !config.customSpeakers.some((item) => item.id === speaker)) {
    errors.push("Le timbre CustomVoice sélectionné est inconnu.");
  }
  if (jobId && !/^[a-zA-Z0-9_-]{1,80}$/.test(jobId)) {
    errors.push("L'identifiant de progression est invalide.");
  }

  return {
    errors,
    value: { text, voiceDescription, language, mode, speaker, jobId },
  };
}

export function validateBatchRequest(body, config) {
  const rawFiles = Array.isArray(body?.files) ? body.files : [];
  const files = rawFiles.map((file) => ({
    name: typeof file?.name === "string" ? file.name.trim() : "",
    text: typeof file?.text === "string" ? file.text.trim() : "",
  }));
  const voiceDescription =
    typeof body?.voiceDescription === "string"
      ? body.voiceDescription.trim()
      : "";
  const language =
    typeof body?.language === "string" ? body.language.trim() : config.defaultLanguage;
  const mode = typeof body?.mode === "string" ? body.mode.trim() : config.defaultMode;
  const speaker = typeof body?.speaker === "string" ? body.speaker.trim() : "";
  const jobId = typeof body?.jobId === "string" ? body.jobId.trim() : "";
  const errors = [];

  if (!Array.isArray(body?.files)) {
    errors.push("Le champ « files » doit être un tableau de fichiers.");
  } else if (files.length < 1 || files.length > 30) {
    errors.push("Le lot doit contenir entre 1 et 30 fichiers.");
  }
  if (files.some((file) => !file.name || !file.text)) {
    errors.push("Chaque fichier doit avoir un nom et un texte non vide.");
  }
  if (files.some((file) => file.text.length > config.maxCharacters)) {
    errors.push(`Chaque fichier est limité à ${config.maxCharacters} caractères.`);
  }
  if (files.reduce((total, file) => total + file.text.length, 0) > 60000) {
    errors.push("Le lot ne peut pas dépasser 60 000 caractères au total.");
  }
  if (voiceDescription.length > 1000) {
    errors.push("La description de voix ne peut pas dépasser 1000 caractères.");
  }
  if (!config.languages.includes(language)) {
    errors.push(`Langue inconnue. Valeurs acceptées : ${config.languages.join(", ")}.`);
  }
  if (!config.modes.some((item) => item.id === mode)) {
    errors.push("Mode TTS inconnu.");
  }
  if (mode === "design" && !voiceDescription) {
    errors.push("La description de voix est obligatoire en mode VoiceDesign.");
  }
  if (mode === "custom" && !config.customSpeakers.some((item) => item.id === speaker)) {
    errors.push("Le timbre CustomVoice sélectionné est inconnu.");
  }
  if (jobId && !/^[a-zA-Z0-9_-]{1,80}$/.test(jobId)) {
    errors.push("L'identifiant de progression est invalide.");
  }

  return {
    errors,
    value: { files, voiceDescription, language, mode, speaker, jobId },
  };
}

export function validateScoreSpeechRequest(body, config) {
  const rawLines = Array.isArray(body?.lines) ? body.lines : [];
  const lines = rawLines.map((line) => ({
    text: typeof line?.text === "string" ? line.text.trim() : "",
    startMs: Number.isInteger(line?.startMs) ? line.startMs : -1,
    durationMs: Number.isInteger(line?.durationMs) ? line.durationMs : null,
  }));
  const voiceDescription =
    typeof body?.voiceDescription === "string"
      ? body.voiceDescription.trim()
      : "";
  const language =
    typeof body?.language === "string" ? body.language.trim() : config.defaultLanguage;
  const mode = typeof body?.mode === "string" ? body.mode.trim() : config.defaultMode;
  const speaker = typeof body?.speaker === "string" ? body.speaker.trim() : "";
  const jobId = typeof body?.jobId === "string" ? body.jobId.trim() : "";
  const songDurationMs = Number.isInteger(body?.songDurationMs) ? body.songDurationMs : null;
  const errors = [];

  if (!Array.isArray(body?.lines)) {
    errors.push("Le champ « lines » doit être un tableau de paroles horodatées.");
  } else if (lines.length < 1 || lines.length > 120) {
    errors.push("La partition doit contenir entre 1 et 120 lignes vocales.");
  }
  if (lines.some((line) => !line.text || line.startMs < 0 || line.startMs > 30 * 60 * 1000)) {
    errors.push("Chaque ligne doit avoir un texte et un début valide.");
  }
  if (lines.some((line) => line.durationMs !== null && (line.durationMs < 100 || line.durationMs > 10 * 60 * 1000))) {
    errors.push("Chaque intervalle doit durer entre 100 ms et 10 minutes.");
  }
  if (songDurationMs !== null && (songDurationMs < 100 || songDurationMs > 30 * 60 * 1000)) {
    errors.push("La durÃ©e du morceau doit Ãªtre comprise entre 100 ms et 30 minutes.");
  }
  if (lines.some((line) => line.text.length > 1000)) {
    errors.push("Une ligne vocale ne peut pas dépasser 1000 caractères.");
  }
  if (lines.reduce((total, line) => total + line.text.length, 0) > 30000) {
    errors.push("Le texte de partition ne peut pas dépasser 30 000 caractères au total.");
  }
  if (voiceDescription.length > 1000) {
    errors.push("La description de voix ne peut pas dépasser 1000 caractères.");
  }
  if (!config.languages.includes(language)) {
    errors.push(`Langue inconnue. Valeurs acceptées : ${config.languages.join(", ")}.`);
  }
  if (!config.modes.some((item) => item.id === mode)) {
    errors.push("Mode TTS inconnu.");
  }
  if (mode === "design" && !voiceDescription) {
    errors.push("La description de voix est obligatoire en mode VoiceDesign.");
  }
  if (mode === "custom" && !config.customSpeakers.some((item) => item.id === speaker)) {
    errors.push("Le timbre CustomVoice sélectionné est inconnu.");
  }
  if (jobId && !/^[a-zA-Z0-9_-]{1,80}$/.test(jobId)) {
    errors.push("L'identifiant de progression est invalide.");
  }

  return {
    errors,
    value: { lines, songDurationMs, voiceDescription, language, mode, speaker, jobId },
  };
}

export function validateDialogueRequest(body, config) {
  const rawElements = Array.isArray(body?.elements) ? body.elements : [];
  const elements = rawElements.map((value) =>
    typeof value === "string" ? value.trim() : ""
  );
  const voiceADescription =
    typeof body?.voiceADescription === "string" ? body.voiceADescription.trim() : "";
  const voiceBDescription =
    typeof body?.voiceBDescription === "string" ? body.voiceBDescription.trim() : "";
  const language =
    typeof body?.language === "string" ? body.language.trim() : config.defaultLanguage;
  const pauseMs = Number.isInteger(body?.pauseMs) ? body.pauseMs : 350;
  const mode = typeof body?.mode === "string" ? body.mode.trim() : config.defaultMode;
  const speakerA = typeof body?.speakerA === "string" ? body.speakerA.trim() : "";
  const speakerB = typeof body?.speakerB === "string" ? body.speakerB.trim() : "";
  const jobId = typeof body?.jobId === "string" ? body.jobId.trim() : "";
  const splitPairs = body?.splitPairs === true;
  const errors = [];

  if (!Array.isArray(body?.elements)) {
    errors.push("Le champ « elements » doit être un tableau de textes.");
  } else if (elements.length < 1 || elements.length > 50) {
    errors.push("Le dialogue doit contenir entre 1 et 50 répliques.");
  }
  if (elements.some((value) => !value)) {
    errors.push("Chaque réplique doit être une chaîne de caractères non vide.");
  }
  if (elements.some((value) => value.length > 1000)) {
    errors.push("Une réplique ne peut pas dépasser 1000 caractères.");
  }
  if (elements.reduce((total, value) => total + value.length, 0) > 20000) {
    errors.push("Le dialogue ne peut pas dépasser 20 000 caractères au total.");
  }
  if (mode === "design" && (!voiceADescription || !voiceBDescription)) {
    errors.push("Deux descriptions de voix sont obligatoires.");
  }
  if (voiceADescription.length > 1000 || voiceBDescription.length > 1000) {
    errors.push("Une description de voix ne peut pas dépasser 1000 caractères.");
  }
  if (!config.languages.includes(language)) {
    errors.push(`Langue inconnue. Valeurs acceptées : ${config.languages.join(", ")}.`);
  }
  if (pauseMs < 0 || pauseMs > 2000) {
    errors.push("La pause doit être comprise entre 0 et 2000 ms.");
  }
  if (!config.modes.some((item) => item.id === mode)) {
    errors.push("Mode TTS inconnu.");
  }
  if (mode === "custom") {
    const validSpeakers = new Set(config.customSpeakers.map((item) => item.id));
    if (!validSpeakers.has(speakerA) || !validSpeakers.has(speakerB)) {
      errors.push("Les deux timbres CustomVoice doivent être valides.");
    }
  }
  if (jobId && !/^[a-zA-Z0-9_-]{1,80}$/.test(jobId)) {
    errors.push("L'identifiant de progression est invalide.");
  }

  return {
    errors,
    value: {
      elements,
      voiceADescription,
      voiceBDescription,
      language,
      pauseMs,
      mode,
      speakerA,
      speakerB,
      jobId,
      splitPairs,
    },
  };
}
