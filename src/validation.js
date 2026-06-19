export function validateSpeechRequest(body, config) {
  const text = typeof body?.text === "string" ? body.text.trim() : "";
  const voiceDescription =
    typeof body?.voiceDescription === "string"
      ? body.voiceDescription.trim()
      : "";
  const language =
    typeof body?.language === "string" ? body.language.trim() : config.defaultLanguage;

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

  return {
    errors,
    value: { text, voiceDescription, language },
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
  if (!voiceADescription || !voiceBDescription) {
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

  return {
    errors,
    value: {
      elements,
      voiceADescription,
      voiceBDescription,
      language,
      pauseMs,
    },
  };
}
