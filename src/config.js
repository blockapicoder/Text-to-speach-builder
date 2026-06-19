const LANGUAGES = ["Auto", "French", "English", "Spanish", "German", "Italian", "Portuguese"];

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
  return {
    port: integerFromEnv(env.PORT, 3000),
    engineUrl: (env.QWEN_TTS_URL?.trim() || "http://127.0.0.1:8001").replace(/\/$/, ""),
    model: "Qwen3-TTS-12Hz-1.7B-VoiceDesign",
    defaultLanguage: "French",
    maxCharacters: integerFromEnv(env.TTS_MAX_CHARACTERS, 4096),
    languages: LANGUAGES,
    presets: PRESETS,
  };
}
