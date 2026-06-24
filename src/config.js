const LANGUAGES = ["Auto", "French", "English", "Spanish", "German", "Italian", "Portuguese"];

const MODES = [
  {
    id: "design",
    name: "VoiceDesign 1.7B",
    description: "Création libre de personnages et contrôle naturel de la voix.",
    model: "Qwen3-TTS-12Hz-1.7B-VoiceDesign",
  },
  {
    id: "custom",
    name: "CustomVoice 0.6B",
    description: "Mode léger avec neuf timbres officiels fixes.",
    model: "Qwen3-TTS-12Hz-0.6B-CustomVoice",
  },
];

const CUSTOM_SPEAKERS = [
  { id: "Vivian", name: "Vivian", icon: "◇", description: "Jeune voix féminine lumineuse et légèrement vive.", nativeLanguage: "Chinese" },
  { id: "Serena", name: "Serena", icon: "♡", description: "Jeune voix féminine chaleureuse et douce.", nativeLanguage: "Chinese" },
  { id: "Uncle_Fu", name: "Uncle Fu", icon: "◆", description: "Voix masculine mûre, basse et moelleuse.", nativeLanguage: "Chinese" },
  { id: "Dylan", name: "Dylan", icon: "○", description: "Jeune voix masculine claire et naturelle.", nativeLanguage: "Chinese" },
  { id: "Eric", name: "Eric", icon: "△", description: "Voix masculine vive, brillante et légèrement rauque.", nativeLanguage: "Chinese" },
  { id: "Ryan", name: "Ryan", icon: "▰", description: "Voix masculine dynamique avec un rythme marqué.", nativeLanguage: "English" },
  { id: "Aiden", name: "Aiden", icon: "☀", description: "Voix masculine claire, ensoleillée et équilibrée.", nativeLanguage: "English" },
  { id: "Ono_Anna", name: "Ono Anna", icon: "✿", description: "Voix féminine joueuse, légère et agile.", nativeLanguage: "Japanese" },
  { id: "Sohee", name: "Sohee", icon: "◈", description: "Voix féminine chaleureuse et riche en émotion.", nativeLanguage: "Korean" },
];

const PRESETS = [
  {
    id: "demon",
    name: "Demon",
    icon: "♆",
    description:
      "Une voix masculine de démon extrêmement grave et inhumaine, avec une hauteur très basse et une forte résonance de poitrine. Débit lent, massif et menaçant, légère réverbération de caverne.",
    language: "French",
  },
  {
    id: "troll",
    name: "Troll",
    icon: "♜",
    description:
      "Un troll gigantesque à la voix masculine très basse, rocailleuse et gutturale. Débit lourd et lent, rire contenu et énergie théâtrale.",
    language: "French",
  },
  {
    id: "death-metal",
    name: "Death metal",
    icon: "♫",
    description:
      "Une voix death metal masculine très grave, gutturale et massive, avec un growl profond et une forte résonance de poitrine. Chaque mot reste clairement articulé, sans rugissement non verbal ni saturation excessive.",
    language: "French",
  },
  {
    id: "black-metal",
    name: "Black metal",
    icon: "✢",
    description:
      "Une voix black metal aiguë, glaciale, râpeuse et agressive, proche d'un shriek perçant. Diction intelligible, énergie sombre et réverbération froide, sans cri non verbal ni distorsion excessive.",
    language: "French",
  },
  {
    id: "spectre",
    name: "Spectre",
    icon: "◌",
    description:
      "Une présence spectrale lointaine, douce et inquiétante, presque chuchotée, avec beaucoup d'écho et de réverbération dans une grande salle vide.",
    language: "French",
  },
  {
    id: "narrator",
    name: "Narrateur",
    icon: "✦",
    description:
      "Narrateur français chaleureux et assuré, diction claire, rythme posé, ton documentaire haut de gamme.",
    language: "French",
  },
  {
    id: "wizard",
    name: "Vieux magicien",
    icon: "✧",
    description:
      "Un très vieux magicien à la voix masculine profonde, fragile et pleine de sagesse. Souffle légèrement tremblant, débit lent, longues pauses et réverbération discrète d'une tour ancienne.",
    language: "French",
  },
  {
    id: "goat",
    name: "Chèvre parlante",
    icon: "♑",
    description:
      "Une chèvre qui parle de façon parfaitement intelligible, avec une voix aiguë, nasale et comique. Timbre animal chevrotant, petites vibrations et énergie malicieuse.",
    language: "French",
  },
  {
    id: "goblin",
    name: "Gobelin",
    icon: "♟",
    description:
      "Un petit gobelin sournois à la voix très aiguë, grinçante et nerveuse. Il parle vite, ricane intérieurement et accentue les consonnes.",
    language: "French",
  },
  {
    id: "giant",
    name: "Géant",
    icon: "⬟",
    description:
      "Un géant colossal à la voix masculine extrêmement grave et lente. Résonance de poitrine massive, puissance physique écrasante et léger grondement de montagne.",
    language: "French",
  },
  {
    id: "fairy",
    name: "Fée",
    icon: "❋",
    description:
      "Une petite fée lumineuse à la voix féminine très aiguë, légère et cristalline. Débit vif, humeur joyeuse et douce réverbération magique.",
    language: "French",
  },
  {
    id: "witch",
    name: "Sorcière",
    icon: "☾",
    description:
      "Une vieille sorcière inquiétante à la voix féminine rauque, nasale et légèrement aiguë. Débit calculé, rire contenu et réverbération de cabane sombre.",
    language: "French",
  },
  {
    id: "robot",
    name: "Robot",
    icon: "⌬",
    description:
      "Un robot ancien à la voix métallique, froide et parfaitement régulière. Peu d'émotion, rythme mécanique et légère distorsion électronique.",
    language: "French",
  },
  {
    id: "pirate",
    name: "Pirate",
    icon: "⚓",
    description:
      "Un vieux capitaine pirate à la voix masculine grave, éraillée et autoritaire. Ton aventureux, rythme théâtral et rire prêt à éclater.",
    language: "French",
  },
  {
    id: "alien",
    name: "Extraterrestre",
    icon: "◉",
    description:
      "Un extraterrestre intelligent à la voix étrange, vibrante et non humaine. Hauteur instable, résonance aérienne et écho d'un immense vaisseau vide.",
    language: "French",
  },
];

function integerFromEnv(value, fallback) {
  const parsed = Number.parseInt(value ?? "", 10);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : fallback;
}

export function getConfig(env = process.env) {
  const requestedMode = typeof env.TTS_DEFAULT_MODE === "string"
    ? env.TTS_DEFAULT_MODE.trim().toLowerCase()
    : "design";
  return {
    port: integerFromEnv(env.PORT, 3000),
    engineUrl: (env.QWEN_TTS_URL?.trim() || "http://127.0.0.1:8001").replace(/\/$/, ""),
    model: "Qwen3-TTS-12Hz-1.7B-VoiceDesign",
    defaultMode: MODES.some((mode) => mode.id === requestedMode) ? requestedMode : "design",
    defaultLanguage: "French",
    maxCharacters: integerFromEnv(env.TTS_MAX_CHARACTERS, 4096),
    languages: LANGUAGES,
    modes: MODES,
    presets: PRESETS,
    customSpeakers: CUSTOM_SPEAKERS,
  };
}
