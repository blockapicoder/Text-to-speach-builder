const elements = {
  form: document.querySelector("#speechForm"),
  text: document.querySelector("#speechText"),
  batchFiles: document.querySelector("#batchFiles"),
  batchFileDrop: document.querySelector("#batchFileDrop"),
  batchFileDropTitle: document.querySelector("#batchFileDropTitle"),
  batchPreview: document.querySelector("#batchPreview"),
  description: document.querySelector("#voiceDescription"),
  language: document.querySelector("#speechLanguage"),
  characterCount: document.querySelector("#characterCount"),
  presets: document.querySelector("#presets"),
  button: document.querySelector("#generateButton"),
  buttonLabel: document.querySelector(".button-label"),
  status: document.querySelector("#serverStatus"),
  idle: document.querySelector("#resultIdle"),
  ready: document.querySelector("#resultReady"),
  player: document.querySelector("#audioPlayer"),
  download: document.querySelector("#downloadButton"),
  reset: document.querySelector("#resetButton"),
  meta: document.querySelector("#generationMeta"),
  waveform: document.querySelector("#waveform"),
  toast: document.querySelector("#toast"),
  model: document.querySelector("#modelName"),
  modeTabs: document.querySelectorAll(".mode-tab"),
  voiceStudio: document.querySelector("#voiceStudio"),
  dialogueStudio: document.querySelector("#dialogueStudio"),
  scoreStudio: document.querySelector("#scoreStudio"),
  dialogueForm: document.querySelector("#dialogueForm"),
  dialogueFile: document.querySelector("#dialogueFile"),
  fileDrop: document.querySelector("#fileDrop"),
  fileDropTitle: document.querySelector("#fileDropTitle"),
  dialogueVoiceA: document.querySelector("#dialogueVoiceA"),
  dialogueVoiceB: document.querySelector("#dialogueVoiceB"),
  dialogueLanguage: document.querySelector("#dialogueLanguage"),
  dialoguePause: document.querySelector("#dialoguePause"),
  dialogueOutput: document.querySelector("#dialogueOutput"),
  dialoguePreview: document.querySelector("#dialoguePreview"),
  dialogueCount: document.querySelector("#dialogueCount"),
  dialogueButton: document.querySelector("#generateDialogueButton"),
  dialogueButtonLabel: document.querySelector(".dialogue-button-label"),
  dialogueIdle: document.querySelector("#dialogueResultIdle"),
  dialogueReady: document.querySelector("#dialogueResultReady"),
  dialoguePlayer: document.querySelector("#dialogueAudioPlayer"),
  dialogueWaveform: document.querySelector("#dialogueWaveform"),
  dialogueMeta: document.querySelector("#dialogueGenerationMeta"),
  saveDialogue: document.querySelector("#saveDialogueButton"),
  resetDialogue: document.querySelector("#resetDialogueButton"),
  scoreForm: document.querySelector("#scoreForm"),
  scoreFile: document.querySelector("#scoreFile"),
  scoreFileDrop: document.querySelector("#scoreFileDrop"),
  scoreFileDropTitle: document.querySelector("#scoreFileDropTitle"),
  scoreTrack: document.querySelector("#scoreTrack"),
  scoreLanguage: document.querySelector("#scoreLanguage"),
  scoreVoice: document.querySelector("#scoreVoice"),
  scoreLeadInBeats: document.querySelector("#scoreLeadInBeats"),
  scoreLeadInFour: document.querySelector("#scoreLeadInFourButton"),
  scoreLeadInStatus: document.querySelector("#scoreLeadInStatus"),
  scoreBulkText: document.querySelector("#scoreBulkText"),
  scoreAutoFill: document.querySelector("#scoreAutoFillButton"),
  scoreLyricsFile: document.querySelector("#scoreLyricsFile"),
  scoreImportLyrics: document.querySelector("#scoreImportLyricsButton"),
  scoreSaveLyrics: document.querySelector("#saveScoreLyricsButton"),
  scoreTab: document.querySelector("#scoreTab"),
  scoreMeta: document.querySelector("#scoreMeta"),
  scoreCursorStatus: document.querySelector("#scoreCursorStatus"),
  scoreLyricsGrid: document.querySelector("#scoreLyricsGrid"),
  scoreLineCount: document.querySelector("#scoreLineCount"),
  scoreCopyLyrics: document.querySelector("#scoreCopyLyricsButton"),
  scorePasteLyrics: document.querySelector("#scorePasteLyricsButton"),
  scoreClearLyricsSelection: document.querySelector("#scoreClearLyricsSelectionButton"),
  scoreClipboardStatus: document.querySelector("#scoreClipboardStatus"),
  scoreButton: document.querySelector("#generateScoreButton"),
  scoreButtonLabel: document.querySelector(".score-button-label"),
  scoreIdle: document.querySelector("#scoreResultIdle"),
  scoreReady: document.querySelector("#scoreResultReady"),
  scorePlayer: document.querySelector("#scoreAudioPlayer"),
  scoreWaveform: document.querySelector("#scoreWaveform"),
  scoreMetaOutput: document.querySelector("#scoreGenerationMeta"),
  saveScore: document.querySelector("#saveScoreButton"),
  resetScore: document.querySelector("#resetScoreButton"),
  modelOptions: document.querySelectorAll(".model-option"),
  designVoiceControls: document.querySelector("#designVoiceControls"),
  customVoiceControls: document.querySelector("#customVoiceControls"),
  customSpeakers: document.querySelector("#customSpeakers"),
  gpuMonitor: document.querySelector("#gpuMonitor"),
  gpuProfile: document.querySelector("#gpuProfile"),
  gpuTemperature: document.querySelector("#gpuTemperature"),
  gpuMemory: document.querySelector("#gpuMemory"),
  unloadModels: document.querySelector("#unloadModelsButton"),
  speechProgress: document.querySelector("#speechProgress"),
  speechProgressMessage: document.querySelector("#speechProgressMessage"),
  speechProgressPercent: document.querySelector("#speechProgressPercent"),
  speechProgressBar: document.querySelector("#speechProgressBar"),
  speechProgressDetail: document.querySelector("#speechProgressDetail"),
  dialogueProgress: document.querySelector("#dialogueProgress"),
  dialogueProgressMessage: document.querySelector("#dialogueProgressMessage"),
  dialogueProgressPercent: document.querySelector("#dialogueProgressPercent"),
  dialogueProgressBar: document.querySelector("#dialogueProgressBar"),
  dialogueProgressDetail: document.querySelector("#dialogueProgressDetail"),
  scoreProgress: document.querySelector("#scoreProgress"),
  scoreProgressMessage: document.querySelector("#scoreProgressMessage"),
  scoreProgressPercent: document.querySelector("#scoreProgressPercent"),
  scoreProgressBar: document.querySelector("#scoreProgressBar"),
  scoreProgressDetail: document.querySelector("#scoreProgressDetail"),
};

const FALLBACK_CONFIG = {
  model: "Qwen3-TTS-12Hz-1.7B-VoiceDesign",
  defaultMode: "custom",
  defaultLanguage: "French",
  maxCharacters: 4096,
  languages: ["Auto", "French", "English", "Spanish", "German", "Italian", "Portuguese"],
  modes: [
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
  ],
  presets: [
    {
      id: "demon",
      name: "Démon",
      icon: "♆",
      description: "Une voix masculine de démon extrêmement grave et inhumaine, avec une hauteur très basse et une forte résonance de poitrine. Débit lent, massif et menaçant, légère réverbération de caverne.",
      language: "French",
    },
    {
      id: "troll",
      name: "Troll",
      icon: "♜",
      description: "Un troll gigantesque à la voix masculine très basse, rocailleuse et gutturale. Débit lourd et lent, rire contenu et énergie théâtrale.",
      language: "French",
    },
    {
      id: "death-metal",
      name: "Death metal",
      icon: "♬",
      description: "Une voix death metal masculine très grave, gutturale et massive, avec un growl profond et une forte résonance de poitrine. Chaque mot reste clairement articulé, sans rugissement non verbal ni saturation excessive.",
      language: "French",
    },
    {
      id: "black-metal",
      name: "Black metal",
      icon: "✢",
      description: "Une voix black metal aiguë, glaciale, râpeuse et agressive, proche d'un shriek perçant. Diction intelligible, énergie sombre et réverbération froide, sans cri non verbal ni distorsion excessive.",
      language: "French",
    },
    {
      id: "spectre",
      name: "Spectre",
      icon: "◎",
      description: "Une présence spectrale lointaine, douce et inquiétante, presque chuchotée, avec beaucoup d'écho et de réverbération dans une grande salle vide.",
      language: "French",
    },
    {
      id: "narrator",
      name: "Narrateur",
      icon: "✦",
      description: "Narrateur français chaleureux et assuré, diction claire, rythme posé, ton documentaire haut de gamme.",
      language: "French",
    },
    {
      id: "wizard",
      name: "Vieux magicien",
      icon: "✧",
      description: "Un très vieux magicien à la voix masculine profonde, fragile et pleine de sagesse. Souffle légèrement tremblant, débit lent, longues pauses et réverbération discrète d'une tour ancienne.",
      language: "French",
    },
    {
      id: "goat",
      name: "Chèvre parlante",
      icon: "♑",
      description: "Une chèvre qui parle de façon parfaitement intelligible, avec une voix aiguë, nasale et comique. Timbre animal chevrotant, petites vibrations et énergie malicieuse.",
      language: "French",
    },
    {
      id: "goblin",
      name: "Gobelin",
      icon: "♟",
      description: "Un petit gobelin sournois à la voix très aiguë, grinçante et nerveuse. Il parle vite, ricane intérieurement et accentue les consonnes.",
      language: "French",
    },
    {
      id: "giant",
      name: "Géant",
      icon: "⬟",
      description: "Un géant colossal à la voix masculine extrêmement grave et lente. Résonance de poitrine massive, puissance physique écrasante et léger grondement de montagne.",
      language: "French",
    },
    {
      id: "fairy",
      name: "Fée",
      icon: "❋",
      description: "Une petite fée lumineuse à la voix féminine très aiguë, légère et cristalline. Débit vif, humeur joyeuse et douce réverbération magique.",
      language: "French",
    },
    {
      id: "witch",
      name: "Sorcière",
      icon: "☾",
      description: "Une vieille sorcière inquiétante à la voix féminine rauque, nasale et légèrement aiguë. Débit calculé, rire contenu et réverbération de cabane sombre.",
      language: "French",
    },
    {
      id: "robot",
      name: "Robot",
      icon: "⌬",
      description: "Un robot ancien à la voix métallique, froide et parfaitement régulière. Peu d'émotion, rythme mécanique et légère distorsion électronique.",
      language: "French",
    },
    {
      id: "pirate",
      name: "Pirate",
      icon: "⚓",
      description: "Un vieux capitaine pirate à la voix masculine grave, éraillée et autoritaire. Ton aventureux, rythme théâtral et rire prêt à éclater.",
      language: "French",
    },
    {
      id: "alien",
      name: "Extraterrestre",
      icon: "◉",
      description: "Un extraterrestre intelligent à la voix étrange, vibrante et non humaine. Hauteur instable, résonance aérienne et écho d'un immense vaisseau vide.",
      language: "French",
    },
  ],
  customSpeakers: [
    { id: "Vivian", name: "Vivian", icon: "◇", description: "Jeune voix féminine lumineuse et légèrement vive.", nativeLanguage: "Chinese" },
    { id: "Serena", name: "Serena", icon: "♡", description: "Jeune voix féminine chaleureuse et douce.", nativeLanguage: "Chinese" },
    { id: "Uncle_Fu", name: "Uncle Fu", icon: "◆", description: "Voix masculine mûre, basse et moelleuse.", nativeLanguage: "Chinese" },
    { id: "Dylan", name: "Dylan", icon: "○", description: "Jeune voix masculine claire et naturelle.", nativeLanguage: "Chinese" },
    { id: "Eric", name: "Eric", icon: "△", description: "Voix masculine vive, brillante et légèrement rauque.", nativeLanguage: "Chinese" },
    { id: "Ryan", name: "Ryan", icon: "▰", description: "Voix masculine dynamique avec un rythme marqué.", nativeLanguage: "English" },
    { id: "Aiden", name: "Aiden", icon: "☀", description: "Voix masculine claire, ensoleillée et équilibrée.", nativeLanguage: "English" },
    { id: "Ono_Anna", name: "Ono Anna", icon: "✿", description: "Voix féminine joueuse, légère et agile.", nativeLanguage: "Japanese" },
    { id: "Sohee", name: "Sohee", icon: "◈", description: "Voix féminine chaleureuse et riche en émotion.", nativeLanguage: "Korean" },
  ],
};

let currentAudioUrl = null;
let currentAudioExtension = "wav";
let currentAudioDownloadName = null;
let currentDialogueAudioUrl = null;
let currentScoreAudioUrl = null;
let currentScoreAudioIsObjectUrl = false;
let currentScoreAudioExtension = "mp3";
let batchFiles = [];
let dialogueElements = [];
let dialogueFileName = "dialogue";
let currentDialogueExtension = "wav";
let speechTtsMode = "design";
let dialogueTtsMode = "design";
let scoreTtsMode = "design";
let selectedCustomSpeaker = "Ryan";
let activeSpeechJob = null;
let activeDialogueJob = null;
let activeScoreJob = null;
let statusRequestRunning = false;
let latestGpuStatus = null;
let scoreApi = null;
let scoreData = null;
let scoreSlots = [];
let scorePoints = [];
let scoreMeasures = [];
let scorePlaybackOccurrences = new Map();
let scoreSongDurationMs = 0;
let scoreLyrics = new Map();
let scoreTruncatedSlotIds = new Set();
let scoreMeasureTests = new Map();
let scoreVoiceTakes = new Map();
let scoreLyricsClipboard = [];
let scoreClipboardSelection = new Set();
let lastScoreClipboardSlotId = null;
let scoreTestingSlotId = null;
let scoreFileName = "partition";
let activeScoreStartMs = null;
let scoreCursorMarker = null;
let scoreSelectionOverlays = [];
let scoreSelectionStart = null;
let scoreSelectionFrame = null;
let scoreResizeObserver = null;
let scoreResizeTimer = null;
let scoreRepeatGroupIds = new WeakMap();
let scoreRepeatGroupCounter = 0;
let configuration = FALLBACK_CONFIG;
const SCORE_TAKE_FADE_IN_MS = 8;
const SCORE_TAKE_FADE_OUT_MS = 35;
const SCORE_TAKE_CUT_TOLERANCE_MS = 90;

function showToast(message) {
  elements.toast.textContent = message;
  elements.toast.classList.add("visible");
  window.clearTimeout(showToast.timeout);
  showToast.timeout = window.setTimeout(() => elements.toast.classList.remove("visible"), 4200);
}

function readableFetchError(error) {
  const message = error?.message || String(error || "");
  if (/failed to fetch|fetch failed|networkerror/i.test(message)) {
    return "Serveur local indisponible. Relance complètement VoiceForge.exe. En version Docker, vérifie que les conteneurs voice-forge et tts-engine sont démarrés.";
  }
  return message;
}

function isFetchConnectionError(error) {
  const message = error?.message || String(error || "");
  return /failed to fetch|fetch failed|networkerror|network request failed/i.test(message);
}

function audioExtensionFromContentType(contentType, fallback = "wav") {
  const value = String(contentType || "").toLowerCase();
  if (value.includes("mpeg") || value.includes("mp3")) return "mp3";
  if (value.includes("wav") || value.includes("wave")) return "wav";
  if (value.includes("zip")) return "zip";
  return fallback;
}

function wait(ms) {
  return new Promise((resolve) => window.setTimeout(resolve, ms));
}

function setStatus(online, configured) {
  elements.status.className = `server-status ${online && configured ? "online" : "offline"}`;
  elements.status.querySelector("span:last-child").textContent = !online
    ? "Serveur indisponible"
    : configured
      ? "Moteur local opérationnel"
      : "Moteur local arrêté";
}

function createJobId(prefix) {
  const token = globalThis.crypto?.randomUUID?.().replaceAll("-", "")
    || `${Date.now()}${Math.random().toString(16).slice(2)}`;
  return `${prefix}_${token}`;
}

function progressElements(kind) {
  if (kind === "speech") {
    return {
      idle: elements.idle,
      container: elements.speechProgress,
      message: elements.speechProgressMessage,
      percent: elements.speechProgressPercent,
      bar: elements.speechProgressBar,
      detail: elements.speechProgressDetail,
    };
  }
  if (kind === "score") {
    return {
      idle: elements.scoreIdle,
      container: elements.scoreProgress,
      message: elements.scoreProgressMessage,
      percent: elements.scoreProgressPercent,
      bar: elements.scoreProgressBar,
      detail: elements.scoreProgressDetail,
    };
  }
  return {
    idle: elements.dialogueIdle,
    container: elements.dialogueProgress,
    message: elements.dialogueProgressMessage,
    percent: elements.dialogueProgressPercent,
    bar: elements.dialogueProgressBar,
    detail: elements.dialogueProgressDetail,
  };
}

function isFiniteNumber(value) {
  return typeof value === "number" && Number.isFinite(value);
}

function gpuFromStatus(statusOrGpu = {}) {
  const gpu = statusOrGpu?.gpu || statusOrGpu || {};
  const device = String(statusOrGpu?.device || "").toLowerCase();
  if (gpu?.available) return gpu;
  if (device.includes("cuda")) {
    return {
      ...gpu,
      available: true,
      temperature: null,
      utilization: null,
      power_watts: null,
      stats_available: false,
      source: gpu?.source || "cuda-device",
    };
  }
  return null;
}

function formatVram(gpu) {
  if (!isFiniteNumber(gpu?.memory_used_mb) || !isFiniteNumber(gpu?.memory_total_mb)) {
    return "";
  }
  return `VRAM ${gpu.memory_used_mb}/${gpu.memory_total_mb} Mo`;
}

function formatProgressGpu(statusOrGpu = {}) {
  const gpu = gpuFromStatus(statusOrGpu) || latestGpuStatus;
  if (!gpu?.available) return "GPU en attente";
  if (isFiniteNumber(gpu.temperature)) {
    const utilization = isFiniteNumber(gpu.utilization) ? `${gpu.utilization} %` : "activité --";
    return `GPU ${gpu.temperature} °C · ${utilization}`;
  }
  const vram = formatVram(gpu);
  return vram ? `CUDA actif · ${vram}` : "CUDA actif · stats GPU indisponibles";
}

function renderProgress(kind, progress, statusOrGpu = {}) {
  const view = progressElements(kind);
  const percent = Math.max(0, Math.min(100, Number(progress?.percent) || 0));
  view.idle.hidden = false;
  view.idle.classList.add("generating");
  view.container.hidden = false;
  view.container.classList.toggle("cooling", progress?.stage === "cooling");
  view.container.classList.toggle("error", progress?.stage === "error");
  view.message.textContent = progress?.message || "Préparation…";
  view.percent.textContent = `${Math.round(percent)} %`;
  view.bar.style.width = `${percent}%`;
  view.container.querySelector(".progress-track").setAttribute("aria-valuenow", String(Math.round(percent)));
  const segment = progress?.total ? `Segment ${progress.current}/${progress.total}` : "Traitement local";
  const thermal = formatProgressGpu(statusOrGpu);
  view.detail.textContent = `${segment} · ${thermal}`;
}

function hideProgress(kind) {
  const view = progressElements(kind);
  view.idle.classList.remove("generating");
  view.container.hidden = true;
  view.container.classList.remove("cooling", "error");
}

function renderGpu(status) {
  const gpu = gpuFromStatus(status);
  const state = status?.thermal_state || "offline";
  const profileLabels = { performance: "PERFORMANCE", balanced: "ÉQUILIBRÉ", eco: "ÉCO" };
  elements.gpuProfile.textContent = `GPU · ${profileLabels[status?.power_profile] || "ÉQUILIBRÉ"}`;
  if (!gpu?.available) {
    latestGpuStatus = null;
    elements.gpuMonitor.className = "gpu-monitor offline";
    elements.gpuTemperature.textContent = "-- °C";
    elements.gpuMemory.textContent = "VRAM indisponible";
    return;
  }
  latestGpuStatus = gpu;
  const stateClass = state === "unavailable" && !isFiniteNumber(gpu.temperature) ? "normal" : state;
  elements.gpuMonitor.className = `gpu-monitor ${stateClass}`;
  elements.gpuTemperature.textContent = isFiniteNumber(gpu.temperature) ? `${gpu.temperature} °C` : "CUDA actif";
  const vram = formatVram(gpu) || "VRAM active";
  const power = isFiniteNumber(gpu.power_watts) ? ` · ${gpu.power_watts} W` : "";
  const stats = gpu.stats_available === false ? " · stats partielles" : "";
  elements.gpuMemory.textContent = `${vram}${power}${stats}`;
}

async function pollStatus() {
  if (statusRequestRunning) return;
  statusRequestRunning = true;
  try {
    const response = await fetch("/api/status", { cache: "no-store" });
    const status = await response.json();
    renderGpu(status);
    setStatus(response.ok, Boolean(status.ready));
    const progress = status.progress || {};
    if (activeSpeechJob && progress.job_id === activeSpeechJob) {
      renderProgress("speech", progress, status);
    }
    if (activeDialogueJob && progress.job_id === activeDialogueJob) {
      renderProgress("dialogue", progress, status);
    }
    if (activeScoreJob && progress.job_id === activeScoreJob) {
      renderProgress("score", progress, status);
    }
  } catch {
    renderGpu(null);
    setStatus(false, false);
  } finally {
    statusRequestRunning = false;
  }
}

function updateCounter() {
  const length = elements.text.value.length;
  elements.characterCount.textContent = `${length} / ${configuration.maxCharacters}`;
  elements.characterCount.style.color = length > configuration.maxCharacters * 0.9 ? "#ff6b35" : "";
}

function createWaveform(container = elements.waveform) {
  container.replaceChildren();
  for (let index = 0; index < 52; index += 1) {
    const bar = document.createElement("i");
    const height = 14 + Math.abs(Math.sin(index * 0.52) * 46) + Math.random() * 20;
    bar.style.height = `${height}%`;
    bar.style.animationDelay = `${(index % 9) * 60}ms`;
    container.append(bar);
  }
}

function appendOptions(select, values, selectedValue, labelForValue = (value) => value) {
  select.replaceChildren();
  for (const value of values) {
    const option = document.createElement("option");
    option.value = typeof value === "string" ? value : value.id;
    option.textContent = labelForValue(value);
    option.selected = option.value === selectedValue;
    select.append(option);
  }
}

function dialogueChoices(mode) {
  return mode === "custom" ? configuration.customSpeakers : configuration.presets;
}

function voiceModeForId(id) {
  if ((configuration.customSpeakers || []).some((item) => item.id === id)) return "custom";
  if ((configuration.presets || []).some((item) => item.id === id)) return "design";
  return null;
}

function findVoiceChoice(id, mode) {
  return dialogueChoices(mode).find((item) => item.id === id);
}

function preferredVoiceId(ids, choices) {
  for (const id of ids.filter(Boolean)) {
    if ((choices || []).some((item) => item.id === id)) return id;
  }
  return choices?.[0]?.id || "";
}

function appendModeVoiceOptions(select, mode, selectedValue, fallbacks = []) {
  const choices = dialogueChoices(mode);
  const currentValue = select.value;
  const resolvedValue = choices.some((item) => item.id === selectedValue)
    ? selectedValue
    : choices.some((item) => item.id === currentValue)
      ? currentValue
      : preferredVoiceId(fallbacks, choices);

  appendOptions(select, choices, resolvedValue, (item) => `${item.icon}  ${item.name}`);
  select.value = resolvedValue;
}

function refreshDialogueVoiceOptions(mode) {
  const defaultA = mode === "custom"
    ? preferredVoiceId(["Ryan", selectedCustomSpeaker], configuration.customSpeakers)
    : preferredVoiceId(["wizard", "demon"], configuration.presets);
  const defaultB = mode === "custom"
    ? preferredVoiceId(["Serena", "Vivian"], configuration.customSpeakers)
    : preferredVoiceId(["goat", "troll"], configuration.presets);
  appendModeVoiceOptions(elements.dialogueVoiceA, mode, defaultA, [defaultA, "wizard", "demon", selectedCustomSpeaker, "Ryan"]);
  appendModeVoiceOptions(elements.dialogueVoiceB, mode, defaultB, [defaultB, "goat", "troll", "Serena"]);
}

function refreshScoreVoiceOptions(mode) {
  const defaultValue = mode === "custom"
    ? preferredVoiceId([selectedCustomSpeaker, "Ryan"], configuration.customSpeakers)
    : preferredVoiceId(["black-metal", "death-metal", "wizard"], configuration.presets);
  appendModeVoiceOptions(elements.scoreVoice, mode, defaultValue, [defaultValue, "black-metal", "death-metal", "wizard", selectedCustomSpeaker]);
}

function setTtsMode(target, mode) {
  for (const button of elements.modelOptions) {
    if (button.dataset.target === target) {
      button.classList.toggle("active", button.dataset.ttsMode === mode);
    }
  }

  if (target === "speech") {
    speechTtsMode = mode;
    elements.designVoiceControls.hidden = mode !== "design";
    elements.customVoiceControls.hidden = mode !== "custom";
    elements.designVoiceControls.classList.remove("inactive-voice-family");
    elements.customVoiceControls.classList.remove("inactive-voice-family");
  } else if (target === "dialogue") {
    dialogueTtsMode = mode;
    refreshDialogueVoiceOptions(mode);
  } else if (target === "score") {
    scoreTtsMode = mode;
    refreshScoreVoiceOptions(mode);
    clearScoreVoiceTests();
  }
  const selectedMode = configuration.modes?.find((item) => item.id === mode);
  if (selectedMode) elements.model.textContent = selectedMode.model.toUpperCase();
}

function normalizeConfig(config = {}) {
  return {
    ...FALLBACK_CONFIG,
    ...config,
    languages: config.languages?.length ? config.languages : FALLBACK_CONFIG.languages,
    modes: config.modes?.length ? config.modes : FALLBACK_CONFIG.modes,
    presets: config.presets?.length ? config.presets : FALLBACK_CONFIG.presets,
    customSpeakers: config.customSpeakers?.length ? config.customSpeakers : FALLBACK_CONFIG.customSpeakers,
  };
}

function renderConfig(config) {
  configuration = normalizeConfig(config);
  config = configuration;
  elements.text.maxLength = config.maxCharacters;
  const languageLabel = (language) => language === "Auto" ? "Détection automatique" : language;
  appendOptions(elements.language, config.languages, config.defaultLanguage, languageLabel);
  appendOptions(elements.dialogueLanguage, config.languages, config.defaultLanguage, languageLabel);
  appendOptions(elements.scoreLanguage, config.languages, config.defaultLanguage, languageLabel);
  const presetLabel = (preset) => `${preset.icon}  ${preset.name}`;
  refreshDialogueVoiceOptions(dialogueTtsMode);
  refreshScoreVoiceOptions(scoreTtsMode);

  elements.presets.replaceChildren();
  for (const preset of config.presets) {
    const button = document.createElement("button");
    button.type = "button";
    button.className = "preset";
    button.dataset.preset = preset.id;
    button.innerHTML = `<span class="preset-icon">${preset.icon}</span><span>${preset.name}</span>`;
    button.addEventListener("click", () => {
      setTtsMode("speech", "design");
      elements.description.value = preset.description;
      elements.language.value = preset.language;
      document.querySelectorAll(".preset").forEach((item) => item.classList.remove("active"));
      button.classList.add("active");
    });
    elements.presets.append(button);
  }

  const customDirectionButton = document.createElement("button");
  customDirectionButton.type = "button";
  customDirectionButton.className = "preset custom-direction-preset";
  customDirectionButton.dataset.preset = "custom";
  customDirectionButton.title = "Rédiger une nouvelle direction de voix";
  customDirectionButton.innerHTML = '<span class="preset-icon">✎</span><span>Custom · texte libre</span>';
  customDirectionButton.addEventListener("click", () => {
    setTtsMode("speech", "design");
    document.querySelectorAll(".preset").forEach((item) => item.classList.remove("active"));
    customDirectionButton.classList.add("active");
    elements.description.value = "";
    elements.description.placeholder = "Décrivez votre nouvelle voix : âge, hauteur, timbre, rythme, accent, émotion et ambiance…";
    elements.description.focus();
  });
  elements.presets.append(customDirectionButton);

  elements.customSpeakers.replaceChildren();
  for (const speaker of config.customSpeakers) {
    const button = document.createElement("button");
    button.type = "button";
    button.className = `speaker-card ${speaker.id === selectedCustomSpeaker ? "active" : ""}`;
    button.dataset.speaker = speaker.id;
    const icon = document.createElement("span");
    icon.className = "speaker-icon";
    icon.textContent = speaker.icon;
    const name = document.createElement("strong");
    name.textContent = speaker.name;
    const description = document.createElement("small");
    description.textContent = speaker.description;
    button.append(icon, name, description);
    button.addEventListener("click", () => {
      setTtsMode("speech", "custom");
      selectedCustomSpeaker = speaker.id;
      elements.customSpeakers.querySelectorAll(".speaker-card").forEach((item) => {
        item.classList.toggle("active", item.dataset.speaker === speaker.id);
      });
    });
    elements.customSpeakers.append(button);
  }

  elements.model.textContent = config.model.toUpperCase();
  setTtsMode("speech", config.defaultMode || "custom");
  setTtsMode("dialogue", config.defaultMode || "custom");
  setTtsMode("score", config.defaultMode || "custom");
  updateCounter();
}

async function initialize() {
  createWaveform();
  createWaveform(elements.dialogueWaveform);
  createWaveform(elements.scoreWaveform);

  renderConfig(FALLBACK_CONFIG);

  try {
    const configResponse = await fetch("/api/config", { cache: "no-store" });
    if (configResponse.ok) {
      renderConfig(await configResponse.json());
    }
  } catch {
    showToast("Catalogue de voix local chargé. Le serveur vocal n'est pas encore prêt.");
  }

  try {
    const healthResponse = await fetch("/api/health", { cache: "no-store" });
    if (!healthResponse.ok) throw new Error("Serveur indisponible");
    const health = await healthResponse.json();
    setStatus(true, health.configured);
  } catch {
    setStatus(false, false);
  }
  await pollStatus();
  window.setInterval(pollStatus, 2000);
}

function switchMode(mode) {
  const dialogueMode = mode === "dialogue";
  const scoreMode = mode === "score";
  document.body.dataset.activeMode = mode;
  elements.voiceStudio.hidden = dialogueMode || scoreMode;
  elements.dialogueStudio.hidden = !dialogueMode;
  elements.scoreStudio.hidden = !scoreMode;
  for (const tab of elements.modeTabs) {
    const active = tab.dataset.mode === mode;
    tab.classList.toggle("active", active);
    tab.setAttribute("aria-selected", String(active));
  }
}

function modeFromLocation() {
  const page = window.location.pathname.split("/").pop()?.toLowerCase();
  if (page === "dialogue.html") return "dialogue";
  if (page === "partition.html") return "score";
  return "voice";
}

function resetDialogueResult() {
  elements.dialoguePlayer.pause();
  elements.dialoguePlayer.removeAttribute("src");
  if (currentDialogueAudioUrl) URL.revokeObjectURL(currentDialogueAudioUrl);
  currentDialogueAudioUrl = null;
  currentDialogueExtension = "wav";
  elements.dialoguePlayer.hidden = false;
  elements.dialogueWaveform.hidden = false;
  elements.saveDialogue.textContent = "Enregistrer le dialogue";
  elements.dialogueReady.hidden = true;
  elements.dialogueIdle.hidden = false;
  hideProgress("dialogue");
}

function resetScoreResult() {
  elements.scorePlayer.pause();
  elements.scorePlayer.removeAttribute("src");
  if (currentScoreAudioUrl && currentScoreAudioIsObjectUrl) URL.revokeObjectURL(currentScoreAudioUrl);
  currentScoreAudioUrl = null;
  currentScoreAudioIsObjectUrl = false;
  currentScoreAudioExtension = "mp3";
  elements.saveScore.textContent = "Enregistrer la voix sur partition";
  elements.scoreReady.hidden = true;
  elements.scoreIdle.hidden = false;
  hideProgress("score");
}

function resetScoreCursor() {
  activeScoreStartMs = null;
  scoreSelectionStart = null;
  elements.scoreCursorStatus.textContent = "Curseur vocal : aucune mesure";
  removeScoreSelectionVisuals();
}

function formatTime(ms) {
  const totalSeconds = Math.max(0, Math.round(ms / 1000));
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = String(totalSeconds % 60).padStart(2, "0");
  return `${minutes}:${seconds}`;
}

function formatShortDuration(ms) {
  if (!Number.isFinite(ms)) return "?";
  return `${(Math.max(0, ms) / 1000).toFixed(2)}s`;
}

function selectedScoreVoice() {
  return findVoiceChoice(elements.scoreVoice.value, scoreTtsMode);
}

function repeatRegionId(masterBar) {
  const group = masterBar?.repeatGroup || null;
  if (!group) return `linear-${masterBar?.index ?? 0}`;
  if (!scoreRepeatGroupIds.has(group)) {
    scoreRepeatGroupCounter += 1;
    scoreRepeatGroupIds.set(group, scoreRepeatGroupCounter);
  }
  return `repeat-${scoreRepeatGroupIds.get(group)}-alt-${masterBar?.alternateEndings || 0}`;
}

function nearestScorePoint(startMs) {
  if (!scorePoints.length) return null;
  return scorePoints.reduce((best, point) =>
    Math.abs(point.startMs - startMs) < Math.abs(best.startMs - startMs) ? point : best
  );
}

function nearestScoreSlot(startMs) {
  if (!scoreSlots.length) return null;
  return scoreSlots.reduce((best, slot) =>
    Math.abs(slot.startMs - startMs) < Math.abs(best.startMs - startMs) ? slot : best
  );
}

function scorePointFromBeat(beat) {
  if (!beat) return null;
  const startMs = beatStartMs(beat, scoreData);
  return nearestScorePoint(startMs);
}

function scoreMeasureFromBeat(beat) {
  if (!beat) return null;
  const bar = beat.voice?.bar || beat.bar || beat.parentBar || null;
  const barIndex = Number(bar?.index ?? beat.masterBar?.index);
  if (Number.isFinite(barIndex)) {
    const regionId = repeatRegionId(bar?.masterBar ?? beat.masterBar);
    return scoreMeasures.find((measure) => measure.bar === barIndex + 1 && measure.regionId === regionId) ||
      scoreMeasures.find((measure) => measure.bar === barIndex + 1) ||
      null;
  }
  const startMs = beatStartMs(beat, scoreData);
  return scoreMeasures.find((measure) => startMs >= measure.startMs && startMs < measure.endMs) ||
    scoreMeasures.reduce((best, measure) =>
      !best || Math.abs(startMs - measure.startMs) < Math.abs(startMs - best.startMs) ? measure : best,
    null);
}

function measureForPoint(point) {
  if (!point) return null;
  return scoreMeasures.find((measure) => measure.bar === point.bar && measure.regionId === point.regionId) ||
    scoreMeasures.find((measure) => point.startMs >= measure.startMs && point.startMs < measure.endMs) ||
    scoreMeasures.reduce((best, measure) =>
      !best || Math.abs(point.startMs - measure.startMs) < Math.abs(point.startMs - best.startMs) ? measure : best,
    null);
}

function focusScoreSlot(slot) {
  if (!slot) return;
  activeScoreStartMs = slot.startMs;
  elements.scoreCursorStatus.textContent = `Mesure active : M${slot.startBar} · ${formatTime(slot.startMs)}-${formatTime(slot.endMs)}`;
  renderScoreLyricsGrid();
  const input = elements.scoreLyricsGrid.querySelector(`[data-slot-id="${slot.id}"] textarea`);
  input?.focus();
  input?.scrollIntoView({ behavior: "smooth", block: "center" });
  scheduleScoreSelectionVisuals();
}

function removeScoreSelectionVisuals() {
  scoreCursorMarker?.remove();
  scoreCursorMarker = null;
  for (const overlay of scoreSelectionOverlays) overlay.remove();
  scoreSelectionOverlays = [];
}

function firstBounds(bounds) {
  return Array.isArray(bounds) ? bounds[0] : bounds;
}

function numericBoundsRect(bounds) {
  if (!bounds || typeof bounds !== "object") return null;
  const x = Number(bounds.x);
  const y = Number(bounds.y);
  const w = Number(bounds.w ?? bounds.width);
  const h = Number(bounds.h ?? bounds.height);
  if (![x, y, w, h].every(Number.isFinite) || w <= 0 || h <= 0) return null;
  return { x, y, w, h };
}

function dedupeRects(rects) {
  const seen = new Set();
  return rects.filter((rect) => {
    const key = `${Math.round(rect.x)}:${Math.round(rect.y)}:${Math.round(rect.w)}:${Math.round(rect.h)}`;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

function collectNoteRects(node, rects = [], seen = new WeakSet()) {
  if (!node || typeof node !== "object") return rects;
  if (seen.has(node)) return rects;
  seen.add(node);

  const direct = numericBoundsRect(node.noteHeadBounds || node.noteBounds);
  if (direct) rects.push(direct);

  if (Array.isArray(node)) {
    for (const item of node) collectNoteRects(item, rects, seen);
    return rects;
  }

  if (node instanceof Map) {
    for (const value of node.values()) collectNoteRects(value, rects, seen);
    return rects;
  }

  const skipKeys = new Set([
    "note",
    "beat",
    "bar",
    "voice",
    "staff",
    "track",
    "score",
    "renderer",
    "scoreRenderer",
    "settings",
    "canvas",
    "previousBar",
    "nextBar",
    "masterBar",
    "repeatGroup",
  ]);

  for (const [key, value] of Object.entries(node)) {
    if (!value || skipKeys.has(key)) continue;
    const lower = key.toLowerCase();
    if (Array.isArray(value) || value instanceof Map || lower.includes("bounds") || lower.includes("note")) {
      collectNoteRects(value, rects, seen);
    }
  }
  return rects;
}

function scorePointNoteRects(point) {
  const lookup = scoreApi?.renderer?.boundsLookup;
  if (!lookup || !point?.beatRef) return [];
  const rects = [];

  try {
    collectNoteRects(lookup.findBeat?.(point.beatRef), rects);
  } catch {
    // Some alphaTab builds expose partial bounds only. Fallbacks below keep selection usable.
  }

  for (const note of point.beatRef.notes || []) {
    for (const fn of ["findNote", "findNoteBounds"]) {
      if (typeof lookup[fn] !== "function") continue;
      try {
        collectNoteRects(lookup[fn](note), rects);
      } catch {
        // Optional alphaTab helper, safe to ignore when unavailable.
      }
    }
  }

  return dedupeRects(rects);
}

function scorePointVisual(point) {
  const lookup = scoreApi?.renderer?.boundsLookup;
  if (!lookup?.findBeat || !point?.beatRef) return null;
  const beatBounds = firstBounds(lookup.findBeat(point.beatRef));
  if (!beatBounds) return null;
  const masterBounds = beatBounds.barBounds?.masterBarBounds;
  const line = masterBounds?.lineAlignedBounds || masterBounds?.realBounds || beatBounds.barBounds?.realBounds || beatBounds.realBounds;
  if (!line) return null;
  const x = Number(beatBounds.onNotesX ?? beatBounds.realBounds?.x ?? beatBounds.visualBounds?.x ?? line.x);
  const lineX = Number(line.x ?? beatBounds.barBounds?.realBounds?.x ?? 0);
  const lineW = Number(line.w ?? line.width ?? beatBounds.barBounds?.realBounds?.w ?? beatBounds.barBounds?.realBounds?.width ?? 0);
  const top = Number(line.y ?? 0);
  const height = Math.max(24, Number(line.h ?? beatBounds.realBounds?.h ?? 90));
  return {
    x,
    y: top,
    h: height,
    lineX: Number.isFinite(lineX) ? lineX : 0,
    lineRight: Number.isFinite(lineW) && lineW > 0 && Number.isFinite(lineX) ? lineX + lineW : null,
    lineKey: `${Math.round(top)}:${Math.round(height)}`,
  };
}

function scoreSurfaceOffset() {
  const surface = elements.scoreTab.querySelector(".at-surface");
  if (!surface) return { x: 0, y: 0 };
  const tabRect = elements.scoreTab.getBoundingClientRect();
  const surfaceRect = surface.getBoundingClientRect();
  return {
    x: surfaceRect.left - tabRect.left + elements.scoreTab.scrollLeft,
    y: surfaceRect.top - tabRect.top + elements.scoreTab.scrollTop,
  };
}

function scorePointBarVisual(point) {
  const lookup = scoreApi?.renderer?.boundsLookup;
  if (!lookup?.findBeat || !point?.beatRef) return null;
  const beatBounds = firstBounds(lookup.findBeat(point.beatRef));
  const barBounds = beatBounds?.barBounds;
  const barRect = barBounds?.realBounds || barBounds?.visualBounds || barBounds?.bounds;
  if (!barRect) return null;
  const rawX = Number(barRect.x ?? 0);
  const rawY = Number(barRect.y ?? 0);
  const rawWidth = Number(barRect.w ?? barRect.width ?? 0);
  const rawHeight = Number(barRect.h ?? barRect.height ?? 90);
  if (!Number.isFinite(rawX) || !Number.isFinite(rawWidth) || rawWidth <= 0) return null;
  const insetX = Math.min(8, Math.max(3, rawWidth * 0.025));
  const insetY = Math.min(5, Math.max(2, rawHeight * 0.025));
  return {
    x: rawX + insetX,
    y: rawY + insetY,
    w: Math.max(2, rawWidth - (insetX * 2)),
    h: Math.max(28, rawHeight - (insetY * 2)),
    lineKey: `${Math.round(rawY)}:${Math.round(rawHeight)}:${Math.round(rawX)}:${Math.round(rawWidth)}`,
  };
}

function unionRects(rects) {
  if (!rects.length) return null;
  const left = Math.min(...rects.map((rect) => rect.x));
  const top = Math.min(...rects.map((rect) => rect.y));
  const right = Math.max(...rects.map((rect) => rect.x + rect.w));
  const bottom = Math.max(...rects.map((rect) => rect.y + rect.h));
  return { x: left, y: top, w: right - left, h: bottom - top };
}

function verticalOverlapRatio(a, b) {
  const overlap = Math.max(0, Math.min(a.y + a.h, b.y + b.h) - Math.max(a.y, b.y));
  return overlap / Math.max(1, Math.min(a.h, b.h));
}

function scoreMasterBarBounds(masterBarIndex) {
  const lookup = scoreApi?.renderer?.boundsLookup;
  if (!lookup || !Number.isFinite(masterBarIndex)) return null;
  return lookup.findMasterBarByIndex?.(masterBarIndex) ||
    lookup.findMasterBar?.({ index: masterBarIndex }) ||
    null;
}

function scoreMeasureRawRect(masterBarIndex) {
  const masterBounds = scoreMasterBarBounds(masterBarIndex);
  if (!masterBounds) return null;
  const lineRect = numericBoundsRect(masterBounds.lineAlignedBounds);
  const barRects = (masterBounds.bars || [])
    .map((bar) => numericBoundsRect(bar.realBounds || bar.visualBounds || bar.bounds))
    .filter(Boolean);
  return lineRect ||
    unionRects(barRects) ||
    numericBoundsRect(masterBounds.realBounds || masterBounds.visualBounds);
}

function scoreMeasureRowNeighbors(masterBarIndex, rect) {
  const row = scoreMeasures
    .map((measure) => {
      const index = Number(measure.masterBarIndex ?? measure.startBar - 1);
      const measureRect = scoreMeasureRawRect(index);
      return measureRect ? { index, rect: measureRect } : null;
    })
    .filter((item) => item && verticalOverlapRatio(rect, item.rect) > 0.45)
    .sort((a, b) => (a.rect.x + a.rect.w / 2) - (b.rect.x + b.rect.w / 2));
  if (!row.some((item) => item.index === masterBarIndex)) {
    row.push({ index: masterBarIndex, rect });
    row.sort((a, b) => (a.rect.x + a.rect.w / 2) - (b.rect.x + b.rect.w / 2));
  }
  const currentIndex = row.findIndex((item) => item.index === masterBarIndex);
  return {
    previous: currentIndex > 0 ? row[currentIndex - 1].rect : null,
    next: currentIndex >= 0 && currentIndex < row.length - 1 ? row[currentIndex + 1].rect : null,
  };
}

function scoreMeasureVisual(slot) {
  const masterBarIndex = Number(slot.masterBarIndex ?? slot.startBar - 1);
  const rect = scoreMeasureRawRect(masterBarIndex);
  if (!rect) return null;

  let left = rect.x;
  let right = rect.x + rect.w;
  const { previous, next } = scoreMeasureRowNeighbors(masterBarIndex, rect);
  if (previous && previous.x < rect.x) {
    const previousRight = previous.x + previous.w;
    if (previousRight > left) left = (previousRight + left) / 2;
  }
  if (next && next.x > rect.x) {
    if (next.x < right) right = (right + next.x) / 2;
  }
  if (right <= left) return null;

  const width = right - left;
  const insetX = Math.min(4, Math.max(1, width * 0.012));
  const insetY = Math.min(4, Math.max(1.5, rect.h * 0.012));
  return {
    x: left + insetX,
    y: rect.y + insetY,
    w: Math.max(2, width - (insetX * 2)),
    h: Math.max(28, rect.h - (insetY * 2)),
  };
}

function appendScoreOverlay(className, left, top, width, height, options = {}) {
  const minWidth = options.minWidth ?? 2;
  const minHeight = options.minHeight ?? 24;
  const overlay = document.createElement("div");
  overlay.className = className;
  overlay.style.left = `${Math.max(0, left)}px`;
  overlay.style.top = `${Math.max(0, top)}px`;
  overlay.style.width = `${Math.max(minWidth, width)}px`;
  overlay.style.height = `${Math.max(minHeight, height)}px`;
  elements.scoreTab.append(overlay);
  scoreSelectionOverlays.push(overlay);
  return overlay;
}

function scoreZoneClass(slot) {
  const classes = ["score-zone-rectangle"];
  if (activeScoreStartMs === slot.startMs) classes.push("active");
  return classes.join(" ");
}

function scrollScoreTabToSlot(slot, behavior = "smooth") {
  const visual = scoreMeasureVisual(slot) || scorePointBarVisual(slot);
  if (!visual || !elements.scoreTab) return;
  const targetLeft = Math.max(0, visual.x - ((elements.scoreTab.clientWidth - visual.w) / 2));
  const targetTop = Math.max(0, visual.y - ((elements.scoreTab.clientHeight - visual.h) / 2));
  elements.scoreTab.scrollTo({
    left: targetLeft,
    top: targetTop,
    behavior,
  });
}

function drawScorePointMarker(point, className = "score-cursor-marker") {
  const visual = scorePointVisual(point);
  if (!visual) return null;
  return appendScoreOverlay(className, visual.x - 1, visual.y, 2, visual.h);
}

function drawScorePointOutlines(point, className) {
  const noteRects = scorePointNoteRects(point);
  if (noteRects.length) {
    for (const rect of noteRects) {
      appendScoreOverlay(className, rect.x - 4, rect.y - 4, rect.w + 8, rect.h + 8, {
        minWidth: 12,
        minHeight: 12,
      });
    }
    return;
  }

  const visual = scorePointVisual(point);
  if (!visual) return;
  const height = Math.min(52, Math.max(22, visual.h * 0.34));
  appendScoreOverlay(`${className} fallback`, visual.x - 9, visual.y + (visual.h - height) / 2, 18, height, {
    minWidth: 18,
    minHeight: 18,
  });
}

function drawScoreInterval(slot) {
  const measureVisual = scoreMeasureVisual(slot);
  if (measureVisual) {
    appendScoreOverlay(
      scoreZoneClass(slot),
      measureVisual.x,
      measureVisual.y,
      measureVisual.w,
      measureVisual.h,
      { minWidth: 2, minHeight: 28 }
    );
    return;
  }
  const directBarVisual = scorePointBarVisual(slot);
  if (directBarVisual) {
    appendScoreOverlay(
      scoreZoneClass(slot),
      directBarVisual.x,
      directBarVisual.y,
      directBarVisual.w,
      directBarVisual.h,
      { minWidth: 2, minHeight: 28 }
    );
    return;
  }
  const measurePoints = scorePoints.filter((point) => point.regionId === slot.regionId && point.bar === slot.startBar);
  const barVisuals = measurePoints.map(scorePointBarVisual).filter(Boolean);
  const uniqueBars = new Map(barVisuals.map((visual) => [visual.lineKey, visual]));
  if (uniqueBars.size) {
    for (const visual of uniqueBars.values()) {
      appendScoreOverlay(
        scoreZoneClass(slot),
        visual.x,
        visual.y + 2,
        visual.w,
        Math.max(28, visual.h - 4),
        { minWidth: 2, minHeight: 28 }
      );
    }
    return;
  }
  const startPoint = nearestScorePoint(slot.startMs);
  const endPoint = nearestScorePoint(slot.endMs);
  if (!startPoint || !endPoint) return;
  const visualPoints = scorePoints.filter((point) =>
    point.regionId === slot.regionId &&
    point.startMs >= slot.startMs &&
    point.startMs < slot.endMs
  );
  const visuals = (visualPoints.length ? visualPoints : [startPoint, endPoint])
    .map((point) => ({ point, visual: scorePointVisual(point) }))
    .filter((item) => item.visual)
    .map(({ point, visual }) => ({
      ...visual,
      isStart: point.startMs === slot.startMs,
      isEnd: point.startMs === slot.endMs,
    }))
    .filter(Boolean);
  if (visuals.length) {
    const grouped = new Map();
    for (const visual of visuals) {
      const entry = grouped.get(visual.lineKey) || {
        y: visual.y,
        h: visual.h,
        lineX: visual.lineX,
        lineRight: visual.lineRight,
        hasStart: false,
        hasEnd: false,
        xs: [],
      };
      entry.xs.push(visual.x);
      entry.hasStart ||= visual.isStart;
      entry.hasEnd ||= visual.isEnd;
      if (Number.isFinite(visual.lineX)) entry.lineX = Math.min(entry.lineX, visual.lineX);
      if (Number.isFinite(visual.lineRight)) entry.lineRight = Math.max(entry.lineRight ?? visual.lineRight, visual.lineRight);
      grouped.set(visual.lineKey, entry);
    }

    for (const entry of grouped.values()) {
      const minX = Math.min(...entry.xs);
      const maxX = Math.max(...entry.xs);
      const left = minX;
      const right = maxX;
      appendScoreOverlay(
        scoreZoneClass(slot),
        left,
        entry.y + 2,
        Math.max(2, right - left),
        Math.max(28, entry.h - 4),
        { minWidth: 2, minHeight: 28 }
      );
    }
  }
}

function renderScoreSelectionVisuals() {
  removeScoreSelectionVisuals();
  for (const slot of scoreSlots) drawScoreInterval(slot);
  if (scoreSelectionStart) {
    scoreCursorMarker = drawScorePointMarker(scoreSelectionStart, "score-cursor-marker pending");
    const visual = scorePointVisual(scoreSelectionStart);
    if (visual) {
      appendScoreOverlay("score-zone-rectangle pending", visual.x - 7, visual.y + 2, 14, Math.max(28, visual.h - 4), {
        minWidth: 14,
        minHeight: 28,
      });
    }
  }
}

function scheduleScoreSelectionVisuals() {
  if (scoreSelectionFrame) window.cancelAnimationFrame(scoreSelectionFrame);
  scoreSelectionFrame = window.requestAnimationFrame(() => {
    scoreSelectionFrame = null;
    renderScoreSelectionVisuals();
  });
}

function scheduleScoreResizeRender() {
  if (!scoreData || !scoreApi) {
    scheduleScoreSelectionVisuals();
    return;
  }
  window.clearTimeout(scoreResizeTimer);
  scoreResizeTimer = window.setTimeout(() => {
    scoreResizeTimer = null;
    try {
      scoreApi.triggerResize?.();
    } catch {
      try {
        scoreApi.renderer?.resizeRender?.();
      } catch {
        // Resize rendering is optional; the selection overlay can still be refreshed.
      }
    }
    scheduleScoreSelectionVisuals();
  }, 90);
}

function setupScoreResizeObserver() {
  if (scoreResizeObserver || !elements.scoreTab) return;
  if ("ResizeObserver" in window) {
    scoreResizeObserver = new ResizeObserver(scheduleScoreResizeRender);
    scoreResizeObserver.observe(elements.scoreTab);
  }
  window.addEventListener("resize", scheduleScoreResizeRender);
}

function describePoint(point) {
  return `M${point.bar} · ${formatTime(point.startMs)}`;
}

function handleScoreIntervalPoint(point) {
  const measure = measureForPoint(point);
  if (!measure) {
    showToast("Impossible d'identifier la mesure cliquée.");
    return;
  }

  scoreSelectionStart = null;
  const existingMeasureSlot = scoreSlots.find((slot) => slot.id === measure.id || slot.startBar === measure.startBar);
  const measureSlot = existingMeasureSlot || { ...measure, text: scoreLyrics.get(measure.startMs) || "" };
  if (!existingMeasureSlot) scoreSlots.push(measureSlot);
  scoreSlots.sort((a, b) => a.startMs - b.startMs || a.endMs - b.endMs);
  focusScoreSlot(measureSlot);
}

function beatFromScoreClick(event) {
  const lookup = scoreApi?.renderer?.boundsLookup;
  if (!lookup?.getBeatAtPos) return null;
  const rect = elements.scoreTab.getBoundingClientRect();
  const offset = scoreSurfaceOffset();
  const x = event.clientX - rect.left + elements.scoreTab.scrollLeft - offset.x;
  const y = event.clientY - rect.top + elements.scoreTab.scrollTop - offset.y;
  try {
    return lookup.getBeatAtPos(x, y);
  } catch {
    return null;
  }
}

function nearestScoreSlotFromClick(event) {
  const lookup = scoreApi?.renderer?.boundsLookup;
  if (!lookup?.findBeat || !scorePoints.length) return null;
  const rect = elements.scoreTab.getBoundingClientRect();
  const offset = scoreSurfaceOffset();
  const x = event.clientX - rect.left + elements.scoreTab.scrollLeft - offset.x;
  const y = event.clientY - rect.top + elements.scoreTab.scrollTop - offset.y;
  let best = null;
  for (const point of scorePoints) {
    const bounds = lookup.findBeat(point.beatRef);
    if (!bounds) continue;
    const bx = Number(bounds.onNotesX ?? bounds.realBounds?.x ?? bounds.visualBounds?.x ?? 0);
    const by = Number(bounds.realBounds?.y ?? bounds.visualBounds?.y ?? 0);
    const distance = Math.hypot(x - bx, (y - by) * 0.35);
    if (!best || distance < best.distance) best = { point, distance };
  }
  return best?.point || null;
}

function handleScoreTabClick(event) {
  if (!scoreMeasures.length) return;
  const beat = beatFromScoreClick(event);
  const point = scoreMeasureFromBeat(beat) || scorePointFromBeat(beat) || nearestScoreSlotFromClick(event) || nearestScorePoint(activeScoreStartMs ?? 0);
  if (point) handleScoreIntervalPoint(point);
}

function beatStartMs(beat, score) {
  if (Number.isFinite(beat?.timer)) return Math.max(0, Math.round(beat.timer));
  const bpm = Number(score?.tempo) || 120;
  const quarterTicks = 960;
  const ticks = Number(beat?.absolutePlaybackStart ?? beat?.playbackStart ?? 0);
  return Math.max(0, Math.round((ticks / quarterTicks) * (60000 / bpm)));
}

function ticksToMs(ticks, score) {
  const bpm = Number(score?.tempo) || 120;
  return Math.max(0, Math.round((Number(ticks) / 960) * (60000 / bpm)));
}

function measureDurationMs(bar, score) {
  const calculatedTicks = Number(
    bar?.calculateDuration?.(true) ??
    bar?.masterBar?.calculateDuration?.(true) ??
    bar?.calculateDuration?.() ??
    bar?.masterBar?.calculateDuration?.() ??
    0
  );
  if (Number.isFinite(calculatedTicks) && calculatedTicks > 0) return ticksToMs(calculatedTicks, score);
  const bpm = Number(score?.tempo) || 120;
  const numerator = Number(bar?.masterBar?.timeSignatureNumerator) || 4;
  const denominator = Number(bar?.masterBar?.timeSignatureDenominator) || 4;
  return Math.max(250, Math.round(numerator * (4 / denominator) * (60000 / bpm)));
}

function measureStartMs(bar, score, fallbackStartMs) {
  const masterStartTicks = Number(bar?.masterBar?.start);
  if (Number.isFinite(masterStartTicks) && masterStartTicks >= 0) return ticksToMs(masterStartTicks, score);
  const starts = [];
  for (const voice of bar?.voices || []) {
    for (const beat of voice.beats || []) {
      if (!beat.isEmpty) starts.push(beatStartMs(beat, score));
    }
  }
  return starts.length ? Math.min(...starts) : fallbackStartMs;
}

function masterBarDurationMs(masterBar, score) {
  const calculatedTicks = Number(masterBar?.calculateDuration?.(true) ?? masterBar?.calculateDuration?.() ?? 0);
  if (Number.isFinite(calculatedTicks) && calculatedTicks > 0) return ticksToMs(calculatedTicks, score);
  const bpm = Number(score?.tempo) || 120;
  const numerator = Number(masterBar?.timeSignatureNumerator) || 4;
  const denominator = Number(masterBar?.timeSignatureDenominator) || 4;
  return Math.max(250, Math.round(numerator * (4 / denominator) * (60000 / bpm)));
}

function midiTempoFromEvent(event) {
  return Number(event?.beatsPerMinute ?? event?.tempo ?? event?.bpm);
}

function extractMidiTempoEvents(midiFile, score) {
  const tempoEvents = (midiFile?.events || [])
    .filter((event) => event?.type === 81 || event?.metaStatus === 81 || Number.isFinite(Number(event?.beatsPerMinute)))
    .map((event) => ({
      tick: Number(event?.tick ?? 0),
      tempo: midiTempoFromEvent(event),
    }))
    .filter((event) => Number.isFinite(event.tick) && event.tick >= 0 && Number.isFinite(event.tempo) && event.tempo > 0)
    .sort((a, b) => a.tick - b.tick);
  const initialTempo = Number(score?.tempo) || 120;
  if (!tempoEvents.length || tempoEvents[0].tick > 0) {
    tempoEvents.unshift({ tick: 0, tempo: initialTempo });
  }
  return tempoEvents;
}

function createMidiTickToMs(tempoEvents, division, score) {
  const ticksPerQuarter = Number(division) || 960;
  const events = tempoEvents.length ? tempoEvents : [{ tick: 0, tempo: Number(score?.tempo) || 120 }];
  return (tick) => {
    const targetTick = Math.max(0, Number(tick) || 0);
    let elapsedMs = 0;
    let currentTick = 0;
    let currentTempo = Number(score?.tempo) || 120;

    for (const event of events) {
      if (event.tick <= currentTick) {
        currentTempo = event.tempo;
        continue;
      }
      if (event.tick >= targetTick) break;
      elapsedMs += ((event.tick - currentTick) / ticksPerQuarter) * (60000 / currentTempo);
      currentTick = event.tick;
      currentTempo = event.tempo;
    }

    elapsedMs += ((targetTick - currentTick) / ticksPerQuarter) * (60000 / currentTempo);
    return Math.max(0, Math.round(elapsedMs));
  };
}

function fallbackScorePlaybackTimeline(score) {
  const occurrences = new Map();
  const masterBars = score?.masterBars || [];
  if (!masterBars.length) return { occurrences, durationMs: 0, source: "fallback" };

  let barIndex = 0;
  let playbackMs = 0;
  let repeatStartIndex = 0;
  const repeatPassesByEndBar = new Map();
  const occurrencesByBar = new Map();
  let safety = masterBars.length * 12 + 120;

  while (barIndex < masterBars.length && safety > 0) {
    safety -= 1;
    const masterBar = masterBars[barIndex];
    const masterBarIndex = Number(masterBar?.index ?? barIndex);
    const durationMs = masterBarDurationMs(masterBar, score);
    const occurrence = (occurrencesByBar.get(masterBarIndex) || 0) + 1;

    occurrencesByBar.set(masterBarIndex, occurrence);
    if (!occurrences.has(masterBarIndex)) occurrences.set(masterBarIndex, []);
    occurrences.get(masterBarIndex).push({
      masterBarIndex,
      occurrence,
      startMs: Math.round(playbackMs),
      endMs: Math.round(playbackMs + durationMs),
      durationMs,
    });

    playbackMs += durationMs;
    if (masterBar?.isRepeatStart) repeatStartIndex = barIndex;

    const repeatCount = Math.max(0, Number(masterBar?.repeatCount) || 0);
    if (masterBar?.isRepeatEnd && repeatCount > 1) {
      const completedPasses = repeatPassesByEndBar.get(masterBarIndex) || 1;
      if (completedPasses < repeatCount) {
        repeatPassesByEndBar.set(masterBarIndex, completedPasses + 1);
        barIndex = repeatStartIndex;
        continue;
      }
    }

    barIndex += 1;
  }

  return { occurrences, durationMs: Math.round(playbackMs), source: "fallback" };
}

function alphaTabScorePlaybackTimeline(score) {
  const midiTools = globalThis.alphaTab?.midi;
  if (!midiTools?.MidiFile || !midiTools?.AlphaSynthMidiFileHandler || !midiTools?.MidiFileGenerator) {
    throw new Error("Timeline MIDI AlphaTab indisponible.");
  }

  const midiFile = new midiTools.MidiFile();
  const handler = new midiTools.AlphaSynthMidiFileHandler(midiFile);
  const settings = scoreApi?.settings || (globalThis.alphaTab?.Settings ? new globalThis.alphaTab.Settings() : null);
  const generator = new midiTools.MidiFileGenerator(score, settings, handler);
  generator.generate();

  const tempoEvents = extractMidiTempoEvents(midiFile, score);
  const tickToMs = createMidiTickToMs(tempoEvents, midiFile.division, score);
  const occurrences = new Map();
  const occurrenceCounts = new Map();
  let durationMs = 0;

  for (const lookup of generator.tickLookup?.masterBars || []) {
    const masterBarIndex = Number(lookup?.masterBar?.index);
    const startTick = Number(lookup?.start);
    const endTick = Number(lookup?.end);
    if (!Number.isFinite(masterBarIndex) || !Number.isFinite(startTick) || !Number.isFinite(endTick)) continue;

    const startMs = tickToMs(startTick);
    const endMs = Math.max(startMs + 1, tickToMs(endTick));
    const occurrence = (occurrenceCounts.get(masterBarIndex) || 0) + 1;
    occurrenceCounts.set(masterBarIndex, occurrence);
    if (!occurrences.has(masterBarIndex)) occurrences.set(masterBarIndex, []);
    occurrences.get(masterBarIndex).push({
      masterBarIndex,
      occurrence,
      startMs,
      endMs,
      durationMs: Math.max(1, endMs - startMs),
    });
    durationMs = Math.max(durationMs, endMs);
  }

  const eventTicks = (midiFile.events || [])
    .map((event) => Number(event?.tick))
    .filter((tick) => Number.isFinite(tick) && tick >= 0);
  if (eventTicks.length) durationMs = Math.max(durationMs, tickToMs(Math.max(...eventTicks)));
  if (!occurrences.size) throw new Error("Timeline MIDI vide.");
  return { occurrences, durationMs, source: "alphatab-midi" };
}

function buildScorePlaybackTimeline(score) {
  try {
    return alphaTabScorePlaybackTimeline(score);
  } catch (error) {
    console.warn("Calcul MIDI exact impossible, utilisation du calcul de secours.", error);
    return fallbackScorePlaybackTimeline(score);
  }
}

function occurrencesForScoreSlot(slot) {
  const masterBarIndex = Number(slot?.masterBarIndex);
  const occurrences = scorePlaybackOccurrences.get(masterBarIndex) || [];
  if (occurrences.length) return occurrences;
  return [{
    masterBarIndex,
    occurrence: 1,
    startMs: slot.startMs,
    endMs: slot.endMs,
    durationMs: slot.durationMs,
  }];
}

function linesForScoreSlot(slot) {
  const text = slot?.text?.trim();
  if (!text) return [];
  return occurrencesForScoreSlot(slot).map((occurrence) => ({
    text,
    startMs: occurrence.startMs,
    durationMs: occurrence.durationMs,
    slotId: slot.id,
    startBar: slot.startBar,
  }));
}

function scoreTrackIndex() {
  return Number(elements.scoreTrack.value) || 0;
}

function scoreTempoBpm() {
  const bpm = Number(scoreData?.tempo);
  return Number.isFinite(bpm) && bpm > 0 ? bpm : 120;
}

function scoreLeadInBeats() {
  const value = Number(elements.scoreLeadInBeats?.value || 0);
  if (!Number.isFinite(value) || value < 0) return 0;
  return Math.min(64, value);
}

function scoreLeadInDelayMs() {
  return Math.round(scoreLeadInBeats() * 60000 / scoreTempoBpm());
}

function updateScoreLeadInStatus() {
  if (!elements.scoreLeadInStatus) return;
  const beats = scoreLeadInBeats();
  const delayMs = scoreLeadInDelayMs();
  const beatLabel = Number.isInteger(beats) ? String(beats) : beats.toFixed(2);
  elements.scoreLeadInStatus.textContent = `${beatLabel} temps · ${formatShortDuration(delayMs)} · tempo ${Math.round(scoreTempoBpm())}`;
}

function scoreLinesWithLeadIn(lines) {
  const delayMs = scoreLeadInDelayMs();
  if (!delayMs) return lines;
  return lines.map((line) => ({
    ...line,
    startMs: line.startMs + delayMs,
  }));
}

function scoreProjectSlot(slot) {
  return {
    id: slot.id,
    measure: slot.startBar,
    startBar: slot.startBar,
    endBar: slot.endBar,
    masterBarIndex: Number(slot.masterBarIndex),
    regionId: slot.regionId,
    startMs: slot.startMs,
    endMs: slot.endMs,
    durationMs: slot.durationMs,
    text: slot.text || "",
    occurrences: occurrencesForScoreSlot(slot).map((occurrence) => ({
      masterBarIndex: Number(occurrence.masterBarIndex),
      occurrence: Number(occurrence.occurrence) || 1,
      startMs: occurrence.startMs,
      endMs: occurrence.endMs,
      durationMs: occurrence.durationMs,
    })),
  };
}

function createScoreLyricsProject() {
  const trackIndex = scoreTrackIndex();
  const track = scoreData?.tracks?.[trackIndex];
  const voice = selectedScoreVoice();
  return {
    type: "voice-forge-score-lyrics",
    version: 1,
    exportedAt: new Date().toISOString(),
    score: {
      fileName: `${scoreFileName}.gp`,
      title: scoreData?.title || scoreFileName,
      artist: scoreData?.artist || "",
      trackIndex,
      trackName: track?.name || "",
      songDurationMs: scoreSongDurationMs || null,
    },
    timing: {
      leadInBeats: scoreLeadInBeats(),
      leadInMs: scoreLeadInDelayMs(),
      tempoBpm: scoreTempoBpm(),
    },
    voice: {
      mode: scoreTtsMode,
      id: voice?.id || elements.scoreVoice.value || "",
      name: voice?.name || elements.scoreVoice.value || "",
      language: elements.scoreLanguage.value,
    },
    slots: scoreSlots.map(scoreProjectSlot),
  };
}

function downloadJson(data, filename) {
  const blob = new Blob([`${JSON.stringify(data, null, 2)}\n`], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  link.click();
  window.setTimeout(() => URL.revokeObjectURL(url), 1000);
}

function saveScoreLyricsProject() {
  if (!scoreData || !scoreSlots.length) {
    showToast("Charge une partition et sélectionne au moins une mesure.");
    return;
  }
  const project = createScoreLyricsProject();
  downloadJson(project, `${scoreFileName}-paroles-position.json`);
  showToast(`${project.slots.length} mesure${project.slots.length > 1 ? "s" : ""} sauvegardée${project.slots.length > 1 ? "s" : ""}.`);
}

function normalizeImportedScoreSlots(data) {
  if (!data || typeof data !== "object") return [];
  if (Array.isArray(data.slots)) return data.slots;
  if (Array.isArray(data.lyrics)) return data.lyrics;
  if (Array.isArray(data.elements)) return data.elements;
  return [];
}

function importedSlotText(item) {
  if (typeof item?.text === "string") return item.text;
  if (typeof item?.lyrics === "string") return item.lyrics;
  if (typeof item === "string") return item;
  return "";
}

function findScoreMeasureForImport(item) {
  const masterBarIndex = Number(item?.masterBarIndex);
  if (Number.isFinite(masterBarIndex)) {
    const byMasterBar = scoreMeasures.find((measure) => Number(measure.masterBarIndex) === masterBarIndex);
    if (byMasterBar) return byMasterBar;
  }

  const measureNumber = Number(item?.startBar ?? item?.measure ?? item?.bar);
  if (Number.isFinite(measureNumber)) {
    const byMeasure = scoreMeasures.find((measure) => Number(measure.startBar) === measureNumber);
    if (byMeasure) return byMeasure;
  }

  const startMs = Number(item?.startMs);
  if (Number.isFinite(startMs)) {
    return scoreMeasures.find((measure) => Math.abs(Number(measure.startMs) - startMs) <= 40) || null;
  }

  return null;
}

function applyImportedScoreSettings(project) {
  const mode = project?.voice?.mode;
  if (typeof mode === "string" && configuration.modes.some((item) => item.id === mode)) {
    setTtsMode("score", mode);
  }
  const language = project?.voice?.language;
  if (typeof language === "string" && configuration.languages.includes(language)) {
    elements.scoreLanguage.value = language;
  }
  const voiceId = project?.voice?.id;
  if (typeof voiceId === "string" && findVoiceChoice(voiceId, scoreTtsMode)) {
    elements.scoreVoice.value = voiceId;
  }
  const leadInBeats = Number(project?.timing?.leadInBeats ?? project?.score?.leadInBeats);
  if (elements.scoreLeadInBeats && Number.isFinite(leadInBeats) && leadInBeats >= 0) {
    elements.scoreLeadInBeats.value = String(Math.min(64, leadInBeats));
    updateScoreLeadInStatus();
  }
}

function applyImportedScoreTrack(project) {
  const importedTrackIndex = Number(project?.score?.trackIndex);
  if (!Number.isFinite(importedTrackIndex) || !scoreData?.tracks?.[importedTrackIndex]) return;
  if (scoreTrackIndex() === importedTrackIndex) return;
  elements.scoreTrack.value = String(importedTrackIndex);
  if (scoreApi) scoreApi.renderTracks([scoreData.tracks[importedTrackIndex]]);
  refreshScoreSlots();
}

async function loadScoreLyricsFile(file) {
  if (!file) return;
  try {
    if (!scoreData || !scoreMeasures.length) {
      throw new Error("Charge d'abord la partition Guitar Pro correspondante.");
    }
    const project = JSON.parse(await file.text());
    const importedSlots = normalizeImportedScoreSlots(project);
    if (!importedSlots.length) {
      throw new Error("Le fichier ne contient aucune parole positionnée.");
    }

    applyImportedScoreSettings(project);
    applyImportedScoreTrack(project);

    const nextSlots = [];
    const seen = new Set();
    let restored = 0;
    for (const item of importedSlots) {
      const measure = findScoreMeasureForImport(item);
      if (!measure || seen.has(measure.id)) continue;
      const text = importedSlotText(item);
      nextSlots.push({ ...measure, text });
      seen.add(measure.id);
      restored += 1;
    }
    if (!nextSlots.length) {
      throw new Error("Aucune mesure du fichier ne correspond à la partition chargée.");
    }

    scoreSlots = nextSlots.sort((a, b) => a.startMs - b.startMs || a.startBar - b.startBar);
    scoreLyrics = new Map();
    scoreMeasureTests = new Map();
    scoreVoiceTakes = new Map();
    scoreTruncatedSlotIds = new Set();
    clearScoreClipboardSelection(true);
    for (const slot of scoreSlots) {
      if (slot.text.trim()) scoreLyrics.set(slot.startMs, slot.text.trim());
    }
    activeScoreStartMs = scoreSlots[0]?.startMs ?? null;
    renderScoreLyricsGrid();
    scheduleScoreSelectionVisuals();
    if (scoreSlots[0]) scrollScoreTabToSlot(scoreSlots[0], "auto");
    showToast(`${restored} mesure${restored > 1 ? "s" : ""} importée${restored > 1 ? "s" : ""}.`);
  } catch (error) {
    showToast(error?.message || "Impossible d'importer les paroles.");
  } finally {
    elements.scoreLyricsFile.value = "";
  }
}

function scoreTruncatedIndexesFromResponse(response) {
  return String(response?.headers?.get("x-score-truncated-lines") || "")
    .split(",")
    .map((value) => Number.parseInt(value.trim(), 10))
    .filter((value) => Number.isInteger(value) && value > 0);
}

function markScoreTruncatedLines(lines, lineIndexes = []) {
  scoreTruncatedSlotIds = new Set();
  renderScoreLyricsGrid();
  scheduleScoreSelectionVisuals();
  return 0;
}

function numberHeader(response, name) {
  const value = Number.parseInt(response?.headers?.get(name) || "", 10);
  return Number.isFinite(value) && value > 0 ? value : null;
}

function waitForAudioDuration(audio) {
  return new Promise((resolve) => {
    if (Number.isFinite(audio.duration) && audio.duration > 0) {
      resolve(Math.round(audio.duration * 1000));
      return;
    }
    const done = () => {
      audio.removeEventListener("loadedmetadata", done);
      audio.removeEventListener("error", done);
      window.clearTimeout(timer);
      resolve(Number.isFinite(audio.duration) && audio.duration > 0 ? Math.round(audio.duration * 1000) : null);
    };
    const timer = window.setTimeout(done, 2500);
    audio.addEventListener("loadedmetadata", done, { once: true });
    audio.addEventListener("error", done, { once: true });
  });
}

function scoreVoiceSignature(voice, mode = scoreTtsMode) {
  return mode === "custom" ? voice?.id || "" : voice?.description || voice?.id || "";
}

function scoreTakeKey(slot, voice, mode = scoreTtsMode) {
  return [
    slot.id,
    slot.text.trim(),
    mode,
    elements.scoreLanguage.value,
    scoreVoiceSignature(voice, mode),
  ].join("\u001f");
}

function cachedScoreTake(slot, voice, mode = scoreTtsMode) {
  const take = scoreVoiceTakes.get(slot.id);
  return take?.key === scoreTakeKey(slot, voice, mode) ? take : null;
}

function scoreTakeFit(slot, take) {
  const effectiveVoiceMs = take.audibleDurationMs || take.audibleEndMs || take.audioDurationMs || take.browserDurationMs || 0;
  const toleratedLimitMs = slot.durationMs + 280;
  const fits = effectiveVoiceMs <= toleratedLimitMs;
  const overrunMs = effectiveVoiceMs - slot.durationMs;
  const tailMs = take.audioDurationMs && take.audibleDurationMs
    ? Math.max(0, take.audioDurationMs - take.audibleDurationMs)
    : 0;
  const tailLabel = tailMs > 300 ? ` · queue audio ${formatShortDuration(tailMs)}` : "";
  return {
    fits,
    state: fits ? "ok" : "warning",
    label: fits
      ? `PRISE OK · voix ${formatShortDuration(effectiveVoiceMs)} / mesure ${formatShortDuration(slot.durationMs)}${tailLabel}`
      : `PRISE LONGUE · voix ${formatShortDuration(effectiveVoiceMs)} / mesure ${formatShortDuration(slot.durationMs)} (+${formatShortDuration(overrunMs)})`,
  };
}

async function rememberScoreTake(slot, voice, mode, response, blob) {
  const arrayBuffer = await blob.arrayBuffer();
  const take = {
    key: scoreTakeKey(slot, voice, mode),
    slotId: slot.id,
    text: slot.text.trim(),
    mode,
    language: elements.scoreLanguage.value,
    voiceId: voice?.id || "",
    voiceName: voice?.name || voice?.id || "",
    contentType: blob.type || response.headers.get("content-type") || "audio/wav",
    bytes: arrayBuffer,
    sizeBytes: blob.size,
    audioDurationMs: numberHeader(response, "x-tts-audio-duration-ms"),
    audibleDurationMs: numberHeader(response, "x-tts-audible-duration-ms"),
    audibleEndMs: numberHeader(response, "x-tts-audible-end-ms"),
    createdAt: Date.now(),
  };
  scoreVoiceTakes.set(slot.id, take);
  return take;
}

function applyScoreTakeStatus(slot, take) {
  const fit = scoreTakeFit(slot, take);
  scoreMeasureTests.set(slot.id, {
    state: fit.state,
    label: fit.label,
  });
  scoreTruncatedSlotIds.delete(slot.id);
  return fit;
}

async function generateScoreTake(slot, voice, mode, index = 1, total = 1) {
  const cached = cachedScoreTake(slot, voice, mode);
  if (cached) return cached;

  const jobId = createJobId("scoretake");
  activeScoreJob = jobId;
  scoreTestingSlotId = slot.id;
  renderScoreLyricsGrid();
  renderProgress("score", {
    stage: "generating",
    percent: 5 + Math.round((index - 1) / Math.max(1, total) * 70),
    message: `Génération de la prise M${slot.startBar} (${index}/${total})…`,
    current: index,
    total,
  });
  pollStatus();

  const response = await fetch("/api/speech", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      text: slot.text.trim(),
      voiceDescription: mode === "design" ? voice.description : "",
      language: elements.scoreLanguage.value,
      mode,
      speaker: mode === "custom" ? voice.id : null,
      jobId,
    }),
  });

  if (!response.ok) {
    const payload = await response.json().catch(() => ({}));
    throw new Error(payload.error || `La prise M${slot.startBar} a échoué.`);
  }

  const blob = await response.blob();
  const take = await rememberScoreTake(slot, voice, mode, response, blob);
  applyScoreTakeStatus(slot, take);
  renderScoreLyricsGrid();
  return take;
}

function audioBufferToMono(buffer) {
  const output = new Float32Array(buffer.length);
  for (let channel = 0; channel < buffer.numberOfChannels; channel += 1) {
    const data = buffer.getChannelData(channel);
    for (let index = 0; index < data.length; index += 1) {
      output[index] += data[index] / buffer.numberOfChannels;
    }
  }
  return output;
}

function encodeMonoWav(samples, sampleRate) {
  const buffer = new ArrayBuffer(44 + samples.length * 2);
  const view = new DataView(buffer);
  const writeString = (offset, value) => {
    for (let index = 0; index < value.length; index += 1) {
      view.setUint8(offset + index, value.charCodeAt(index));
    }
  };
  writeString(0, "RIFF");
  view.setUint32(4, 36 + samples.length * 2, true);
  writeString(8, "WAVE");
  writeString(12, "fmt ");
  view.setUint32(16, 16, true);
  view.setUint16(20, 1, true);
  view.setUint16(22, 1, true);
  view.setUint32(24, sampleRate, true);
  view.setUint32(28, sampleRate * 2, true);
  view.setUint16(32, 2, true);
  view.setUint16(34, 16, true);
  writeString(36, "data");
  view.setUint32(40, samples.length * 2, true);
  let offset = 44;
  for (const sample of samples) {
    const clamped = Math.max(-1, Math.min(1, sample));
    view.setInt16(offset, clamped < 0 ? clamped * 0x8000 : clamped * 0x7fff, true);
    offset += 2;
  }
  return new Blob([buffer], { type: "audio/wav" });
}

function scoreTakeEffectiveDurationMs(take, renderedMs = 0) {
  return take?.audibleEndMs || take?.audibleDurationMs || take?.audioDurationMs || take?.browserDurationMs || renderedMs || 0;
}

function mixScoreTakeWindow(mix, source, startSample, maxSamples, sampleRate) {
  if (!source?.length || maxSamples <= 0 || startSample >= mix.length) {
    return { copiedSamples: 0, cropped: false };
  }

  const availableSamples = Math.max(0, mix.length - startSample);
  const copiedSamples = Math.min(source.length, maxSamples, availableSamples);
  if (copiedSamples <= 0) return { copiedSamples: 0, cropped: source.length > 0 };

  const fadeInSamples = Math.min(
    Math.round(SCORE_TAKE_FADE_IN_MS / 1000 * sampleRate),
    Math.floor(copiedSamples / 4)
  );
  const fadeOutSamples = Math.min(
    Math.round(SCORE_TAKE_FADE_OUT_MS / 1000 * sampleRate),
    Math.floor(copiedSamples / 3)
  );

  for (let index = 0; index < copiedSamples; index += 1) {
    let gain = 1;
    if (fadeInSamples > 0 && index < fadeInSamples) gain *= index / fadeInSamples;
    if (fadeOutSamples > 0 && index >= copiedSamples - fadeOutSamples) {
      gain *= Math.max(0, (copiedSamples - index - 1) / fadeOutSamples);
    }
    mix[startSample + index] += source[index] * gain;
  }

  return { copiedSamples, cropped: source.length > copiedSamples };
}

async function createScoreTakeMeasurePreview(slot, take) {
  const AudioContextClass = window.AudioContext || window.webkitAudioContext;
  if (!AudioContextClass) {
    return null;
  }

  const audioContext = new AudioContextClass();
  try {
    const audioBuffer = await audioContext.decodeAudioData(take.bytes.slice(0));
    const sampleRate = audioBuffer.sampleRate;
    const mono = audioBufferToMono(audioBuffer);
    const totalSamples = Math.max(1, Math.round(slot.durationMs / 1000 * sampleRate));
    const mix = new Float32Array(totalSamples);
    const result = mixScoreTakeWindow(mix, mono, 0, totalSamples, sampleRate);
    return {
      blob: encodeMonoWav(mix, sampleRate),
      durationMs: Math.round(totalSamples / sampleRate * 1000),
      cropped: result.cropped,
    };
  } finally {
    audioContext.close?.();
  }
}

async function assembleScoreTakes(slots, voice, startedAt) {
  const AudioContextClass = window.AudioContext || window.webkitAudioContext;
  if (!AudioContextClass) {
    throw new Error("Le navigateur ne peut pas assembler les prises audio localement.");
  }

  const audioContext = new AudioContextClass();
  try {
    const decoded = new Map();
    let totalMs = scoreSongDurationMs || 0;
    for (const slot of slots) {
      const take = cachedScoreTake(slot, voice, scoreTtsMode);
      if (!take) throw new Error(`La prise M${slot.startBar} est introuvable.`);
      const audioBuffer = await audioContext.decodeAudioData(take.bytes.slice(0));
      const mono = audioBufferToMono(audioBuffer);
      const renderedMs = mono.length / audioBuffer.sampleRate * 1000;
      decoded.set(slot.id, { mono, sampleRate: audioBuffer.sampleRate, take, renderedMs });
      for (const occurrence of occurrencesForScoreSlot(slot)) {
        totalMs = Math.max(
          totalMs,
          occurrence.endMs || (occurrence.startMs + occurrence.durationMs),
          occurrence.startMs + occurrence.durationMs + 250
        );
      }
    }

    const sampleRate = audioContext.sampleRate;
    const totalSamples = Math.max(1, Math.ceil(totalMs / 1000 * sampleRate));
    const mix = new Float32Array(totalSamples);
    let croppedPlacements = 0;
    const croppedSlotIds = new Set();
    for (const slot of slots) {
      const rendered = decoded.get(slot.id);
      for (const occurrence of occurrencesForScoreSlot(slot)) {
        const startSample = Math.round(occurrence.startMs / 1000 * sampleRate);
        const maxSamples = Math.max(1, Math.round(occurrence.durationMs / 1000 * sampleRate));
        const result = mixScoreTakeWindow(mix, rendered.mono, startSample, maxSamples, sampleRate);
        const effectiveMs = scoreTakeEffectiveDurationMs(rendered.take, rendered.renderedMs);
        if (result.cropped && effectiveMs > occurrence.durationMs + SCORE_TAKE_CUT_TOLERANCE_MS) {
          croppedPlacements += 1;
          croppedSlotIds.add(slot.id);
        }
      }
    }

    for (const slot of slots) {
      const test = scoreMeasureTests.get(slot.id);
      if (!test || test.state !== "warning" || croppedSlotIds.has(slot.id)) continue;
      scoreMeasureTests.set(slot.id, { ...test, state: "ok", label: test.label.replace(/^PRISE LONGUE/, "PRISE OK") });
    }

    let peak = 0;
    for (const sample of mix) peak = Math.max(peak, Math.abs(sample));
    if (peak > 0.98) {
      const gain = 0.98 / peak;
      for (let index = 0; index < mix.length; index += 1) mix[index] *= gain;
    }

    const wav = encodeMonoWav(mix, sampleRate);
    if (currentScoreAudioUrl && currentScoreAudioIsObjectUrl) URL.revokeObjectURL(currentScoreAudioUrl);
    currentScoreAudioUrl = URL.createObjectURL(wav);
    currentScoreAudioIsObjectUrl = true;
    currentScoreAudioExtension = "wav";
    elements.scorePlayer.src = currentScoreAudioUrl;
    elements.scoreIdle.hidden = true;
    elements.scoreReady.hidden = false;
    elements.saveScore.textContent = "Enregistrer la voix sur partition";
    renderProgress("score", { stage: "done", percent: 100, message: "Voix assemblée depuis les prises testées" });
    const placedLines = slots.reduce((total, slot) => total + occurrencesForScoreSlot(slot).length, 0);
    const cutLabel = croppedPlacements > 0 ? ` Â· ${croppedPlacements} PLACEMENT${croppedPlacements > 1 ? "S" : ""} LIMITÃ‰${croppedPlacements > 1 ? "S" : ""} Ã€ LA MESURE` : "";
    elements.scoreMetaOutput.textContent = `${slots.length} PRISE${slots.length > 1 ? "S" : ""} · ${placedLines} PLACEMENT${placedLines > 1 ? "S" : ""} · ${voice.name.toUpperCase()} · WAV ASSEMBLÉ · ${(wav.size / 1024).toFixed(0)} KO · ${((performance.now() - startedAt) / 1000).toFixed(1)} S`;
    if (cutLabel) {
      elements.scoreMetaOutput.textContent = elements.scoreMetaOutput.textContent.replace(` Â· ${voice.name.toUpperCase()}`, `${cutLabel} Â· ${voice.name.toUpperCase()}`);
    }
    elements.scorePlayer.play().catch(() => {});
  } finally {
    audioContext.close?.();
  }
}

async function generateScoreFromTakes(slots, voice, mode, startedAt) {
  const total = slots.length;
  for (let index = 0; index < slots.length; index += 1) {
    await generateScoreTake(slots[index], voice, mode, index + 1, total);
  }
  scoreTestingSlotId = null;
  renderProgress("score", { stage: "assembling", percent: 86, message: "Placement des prises sur la partition…" });
  await assembleScoreTakes(slots, voice, startedAt);
}

async function generateFinalScoreSpeech(lines, voice, mode, startedAt) {
  const jobId = createJobId("scorefinal");
  const leadInMs = scoreLeadInDelayMs();
  const finalLines = scoreLinesWithLeadIn(lines);
  const finalSongDurationMs = (scoreSongDurationMs || 0) + leadInMs;
  activeScoreJob = jobId;
  renderProgress("score", {
    stage: "queued",
    percent: 1,
    message: "Régénération finale pour la partition…",
  });
  pollStatus();

  const response = await fetch("/api/score-speech/start", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      lines: finalLines,
      songDurationMs: finalSongDurationMs || null,
      voiceDescription: mode === "design" ? voice.description : "",
      language: elements.scoreLanguage.value,
      mode,
      speaker: mode === "custom" ? voice.id : null,
      jobId,
    }),
  });

  if (!response.ok) {
    const payload = await response.json().catch(() => ({}));
    throw new Error(payload.error || "La régénération finale a échoué.");
  }

  await recoverScoreAudio(jobId, finalLines, voice, startedAt);
}

function clearScoreVoiceTests() {
  if (!scoreMeasureTests.size && !scoreTruncatedSlotIds.size && !scoreVoiceTakes.size) return;
  scoreMeasureTests = new Map();
  scoreTruncatedSlotIds = new Set();
  scoreVoiceTakes = new Map();
  renderScoreLyricsGrid();
  scheduleScoreSelectionVisuals();
}

function previewScoreAudioFromFirstLine(lines) {
  const firstStartMs = Math.min(...lines.map((line) => Number(line.startMs)).filter(Number.isFinite));
  if (!Number.isFinite(firstStartMs) || firstStartMs <= 0) {
    elements.scorePlayer.play().catch(() => {});
    return;
  }

  const seekAndPlay = () => {
    try {
      elements.scorePlayer.currentTime = firstStartMs / 1000;
    } catch {
      // Le navigateur peut refuser le seek avant metadata; dans ce cas on joue simplement depuis le dÃ©but.
    }
    elements.scorePlayer.play().catch(() => {});
  };

  if (Number.isFinite(elements.scorePlayer.duration)) {
    seekAndPlay();
  } else {
    elements.scorePlayer.addEventListener("loadedmetadata", seekAndPlay, { once: true });
  }
}

function showScoreAudioResult(blob, lines, voice, startedAt, recovered = false) {
  if (currentScoreAudioUrl && currentScoreAudioIsObjectUrl) URL.revokeObjectURL(currentScoreAudioUrl);
  currentScoreAudioUrl = URL.createObjectURL(blob);
  currentScoreAudioIsObjectUrl = true;
  currentScoreAudioExtension = audioExtensionFromContentType(blob.type, "wav");
  elements.scorePlayer.src = currentScoreAudioUrl;
  renderProgress("score", {
    stage: "done",
    percent: 100,
    message: recovered ? "Voix sur partition récupérée" : "Voix sur partition prête",
  });
  elements.scoreIdle.hidden = true;
  elements.scoreReady.hidden = false;
  elements.saveScore.textContent = currentScoreAudioExtension === "mp3" ? "Enregistrer le MP3" : "Enregistrer la voix sur partition";
  const durationLabel = scoreSongDurationMs ? ` · ${formatTime(scoreSongDurationMs)}` : "";
  const recoveredLabel = recovered ? " · RÉCUPÉRÉ" : "";
  elements.scoreMetaOutput.textContent = `${lines.length} LIGNE${lines.length > 1 ? "S" : ""}${durationLabel} · ${voice.name.toUpperCase()} · VOIX SEULE${recoveredLabel} · ${(blob.size / 1024).toFixed(0)} KO · ${((performance.now() - startedAt) / 1000).toFixed(1)} S`;
  if (currentScoreAudioExtension === "mp3") {
    elements.scoreMetaOutput.textContent = elements.scoreMetaOutput.textContent.replace("VOIX SEULE", "VOIX SEULE MP3");
  }
  previewScoreAudioFromFirstLine(lines);
}

function showScoreAudioResultUrl(url, lines, voice, startedAt, recovered = true, sizeBytes = null, truncatedCount = 0, contentType = "") {
  if (currentScoreAudioUrl && currentScoreAudioIsObjectUrl) URL.revokeObjectURL(currentScoreAudioUrl);
  currentScoreAudioUrl = url;
  currentScoreAudioIsObjectUrl = false;
  currentScoreAudioExtension = audioExtensionFromContentType(contentType, currentScoreAudioExtension || "mp3");
  elements.scorePlayer.src = currentScoreAudioUrl;
  renderProgress("score", {
    stage: "done",
    percent: 100,
    message: recovered ? "Voix sur partition récupérée" : "Voix sur partition prête",
  });
  elements.scoreIdle.hidden = true;
  elements.scoreReady.hidden = false;
  elements.saveScore.textContent = currentScoreAudioExtension === "mp3" ? "Enregistrer le MP3" : "Enregistrer la voix sur partition";
  const durationLabel = scoreSongDurationMs ? ` · ${formatTime(scoreSongDurationMs)}` : "";
  const recoveredLabel = recovered ? " · RÉCUPÉRÉ" : "";
  const sizeLabel = Number.isFinite(sizeBytes) && sizeBytes > 0 ? ` · ${(sizeBytes / 1024).toFixed(0)} KO` : "";
  elements.scoreMetaOutput.textContent = `${lines.length} LIGNE${lines.length > 1 ? "S" : ""}${durationLabel} · ${voice.name.toUpperCase()} · VOIX SEULE${recoveredLabel}${sizeLabel} · ${((performance.now() - startedAt) / 1000).toFixed(1)} S`;
  if (currentScoreAudioExtension === "mp3") {
    elements.scoreMetaOutput.textContent = elements.scoreMetaOutput.textContent.replace("VOIX SEULE", "VOIX SEULE MP3");
  }
  previewScoreAudioFromFirstLine(lines);
}

async function testScoreSlotVoice(slot) {
  const text = slot?.text?.trim();
  if (!text) {
    showToast("Écris d'abord une parole dans cette mesure.");
    return;
  }
  if (activeScoreJob || scoreTestingSlotId) {
    showToast("Attends la fin de la génération en cours.");
    return;
  }
  const voice = selectedScoreVoice();
  if (!voice) {
    showToast("Choisissez une voix valide.");
    return;
  }

  const scoreMode = scoreTtsMode;
  const startedAt = performance.now();
  scoreTestingSlotId = slot.id;
  renderScoreLyricsGrid();
  renderProgress("score", {
    stage: "queued",
    percent: 1,
    message: `Test unitaire M${slot.startBar}…`,
  });
  pollStatus();

  try {
    const wasCached = Boolean(cachedScoreTake(slot, voice, scoreMode));
    const take = await generateScoreTake(slot, voice, scoreMode, 1, 1);
    const rawBlob = new Blob([take.bytes.slice(0)], { type: take.contentType });
    if (currentScoreAudioUrl && currentScoreAudioIsObjectUrl) URL.revokeObjectURL(currentScoreAudioUrl);
    currentScoreAudioUrl = URL.createObjectURL(rawBlob);
    currentScoreAudioIsObjectUrl = true;
    currentScoreAudioExtension = "wav";
    elements.scorePlayer.src = currentScoreAudioUrl;
    elements.scoreIdle.hidden = true;
    elements.scoreReady.hidden = false;
    elements.saveScore.textContent = `Enregistrer le test M${slot.startBar}`;
    const browserDurationMs = await waitForAudioDuration(elements.scorePlayer);
    take.browserDurationMs = browserDurationMs;
    const fit = applyScoreTakeStatus(slot, take);
    const preview = await createScoreTakeMeasurePreview(slot, take).catch(() => null);
    if (preview?.blob) {
      if (currentScoreAudioUrl && currentScoreAudioIsObjectUrl) URL.revokeObjectURL(currentScoreAudioUrl);
      currentScoreAudioUrl = URL.createObjectURL(preview.blob);
      currentScoreAudioExtension = "wav";
      elements.scorePlayer.src = currentScoreAudioUrl;
    }
    const blob = preview?.blob || rawBlob;
    renderProgress("score", {
      stage: "done",
      percent: 100,
      message: wasCached ? `Prise M${slot.startBar} relue depuis le cache` : `Prise M${slot.startBar} enregistrée`,
    });
    const rawLabel = take.audioDurationMs ? ` · WAV brut ${formatShortDuration(take.audioDurationMs)}` : "";
    elements.scoreMetaOutput.textContent = `TEST M${slot.startBar} · ${voice.name.toUpperCase()} · ${fit.label}${rawLabel} · PRISE MÉMOIRE · ${(blob.size / 1024).toFixed(0)} KO · ${((performance.now() - startedAt) / 1000).toFixed(1)} S`;
    elements.scorePlayer.play().catch(() => {});
  } catch (error) {
    const message = readableFetchError(error);
    renderProgress("score", { stage: "error", percent: 0, message });
    showToast(message);
  } finally {
    activeScoreJob = null;
    scoreTestingSlotId = null;
    renderScoreLyricsGrid();
    scheduleScoreSelectionVisuals();
  }
}

async function recoverScoreAudio(jobId, lines, voice, startedAt) {
  const deadline = Date.now() + 10 * 60 * 1000;
  let sawJob = false;
  let statusFailures = 0;

  while (Date.now() < deadline) {
    let status = null;
    try {
      const statusResponse = await fetch("/api/status", { cache: "no-store" });
      if (statusResponse.ok) status = await statusResponse.json();
    } catch {
      statusFailures += 1;
      if (statusFailures >= 3) break;
    }

    const progress = status?.progress || {};
    if (progress.job_id === jobId) {
      sawJob = true;
      renderGpu(status);
      renderProgress("score", progress, status);

      if (progress.stage === "error") {
        throw new Error(progress.message || "La génération partition a échoué.");
      }

      if (progress.stage === "done") {
        const resultUrl = `/api/score-result/${encodeURIComponent(jobId)}?t=${Date.now()}`;
        try {
          const resultResponse = await fetch(resultUrl, {
            method: "HEAD",
            cache: "no-store",
          });
          if (resultResponse.ok) {
            const sizeBytes = Number(resultResponse.headers.get("content-length")) || null;
            const contentType = resultResponse.headers.get("content-type") || "";
            const truncatedCount = markScoreTruncatedLines(lines, scoreTruncatedIndexesFromResponse(resultResponse));
            showScoreAudioResultUrl(resultUrl, lines, voice, startedAt, true, sizeBytes, truncatedCount, contentType);
            return true;
          }
        } catch (error) {
          if (isFetchConnectionError(error)) {
            showScoreAudioResultUrl(resultUrl, lines, voice, startedAt, true);
            return true;
          }
          throw error;
        }

        const fallbackResponse = await fetch(resultUrl, { cache: "no-store" });
        if (fallbackResponse.ok) {
          const sizeBytes = Number(fallbackResponse.headers.get("content-length")) || null;
          const contentType = fallbackResponse.headers.get("content-type") || "";
          const truncatedCount = markScoreTruncatedLines(lines, scoreTruncatedIndexesFromResponse(fallbackResponse));
          showScoreAudioResultUrl(resultUrl, lines, voice, startedAt, true, sizeBytes, truncatedCount, contentType);
          return true;
        }
      }
    } else if (sawJob && progress.stage === "idle") {
      break;
    }

    await wait(1500);
  }

  throw new Error("Connexion coupée pendant la génération partition. Le moteur est actif, mais le fichier n'a pas pu être récupéré automatiquement.");
}

function extractScoreMeasures(score, trackIndex) {
  const track = score?.tracks?.[trackIndex];
  const staff = track?.staves?.[0];
  const bars = staff?.bars || [];
  const measures = [];
  let fallbackStartMs = 0;

  for (const bar of bars) {
    let beatRef = null;
    for (const voice of bar.voices || []) {
      beatRef = (voice.beats || []).find((beat) => !beat.isEmpty) || beatRef;
      if (beatRef) break;
    }
    const startMs = measureStartMs(bar, score, fallbackStartMs);
    const durationMs = measureDurationMs(bar, score);
    const endMs = startMs + durationMs;
    const barNumber = bar.index + 1;
    const masterBarIndex = bar.masterBar?.index ?? bar.index;
    const regionId = repeatRegionId(bar.masterBar);
    measures.push({
      id: `measure-${barNumber}-${startMs}`,
      startMs,
      endMs,
      durationMs,
      startBar: barNumber,
      endBar: barNumber,
      bar: barNumber,
      masterBarIndex,
      regionId,
      beatRef,
      text: "",
    });
    fallbackStartMs = endMs;
  }

  for (let index = 0; index < measures.length - 1; index += 1) {
    const current = measures[index];
    const next = measures[index + 1];
    if (next.startMs > current.startMs) {
      current.endMs = next.startMs;
      current.durationMs = Math.max(100, current.endMs - current.startMs);
    }
  }

  return measures.sort((a, b) => a.startMs - b.startMs || a.bar - b.bar);
}

function extractScorePoints(score, trackIndex) {
  const track = score?.tracks?.[trackIndex];
  const points = [];
  if (!track) return points;
  const staff = track.staves?.[0];
  for (const bar of staff?.bars || []) {
    const barNumber = bar.index + 1;
    const masterBar = bar.masterBar;
    const regionId = repeatRegionId(masterBar);
    const beats = [];
    for (const voice of bar.voices || []) {
      for (const beat of voice.beats || []) {
        if (!beat.isRest && !beat.isEmpty) beats.push(beat);
      }
    }
    beats.sort((a, b) => beatStartMs(a, score) - beatStartMs(b, score));
    for (const beat of beats) {
      const startMs = beatStartMs(beat, score);
      const duplicate = points.some((point) => Math.abs(point.startMs - startMs) < 8);
      if (!duplicate) {
        points.push({
          id: `m${barNumber}-b${beat.index + 1}-${startMs}`,
          bar: barNumber,
          masterBarIndex: masterBar?.index ?? bar.index,
          beat: beat.index + 1,
          startMs,
          beatRef: beat,
          regionId,
        });
      }
    }
  }
  return points.sort((a, b) => a.startMs - b.startMs);
}

function updateScoreLineSummary() {
  if (!scoreSlots.length) return;
  const filled = scoreSlots.filter((slot) => slot.text.trim()).length;
  const generatedLines = scoreSlots.reduce((total, slot) => total + linesForScoreSlot(slot).length, 0);
  const durationLabel = scoreSongDurationMs ? ` · morceau ${formatTime(scoreSongDurationMs)}` : "";
  elements.scoreLineCount.textContent = `${scoreSlots.length} mesure${scoreSlots.length > 1 ? "s" : ""} · ${filled} remplie${filled > 1 ? "s" : ""} · ${generatedLines} passage${generatedLines > 1 ? "s" : ""} audio${durationLabel}`;
}

function orderedScoreSlots() {
  return [...scoreSlots].sort((a, b) => a.startMs - b.startMs || a.startBar - b.startBar);
}

function updateScoreClipboardControls() {
  const selectedCount = scoreClipboardSelection.size;
  const clipboardCount = scoreLyricsClipboard.length;
  if (elements.scoreCopyLyrics) elements.scoreCopyLyrics.disabled = selectedCount === 0;
  if (elements.scorePasteLyrics) {
    elements.scorePasteLyrics.disabled = !scoreData || clipboardCount === 0 || activeScoreStartMs === null;
  }
  if (elements.scoreClearLyricsSelection) {
    elements.scoreClearLyricsSelection.disabled = selectedCount === 0 && clipboardCount === 0;
  }
  if (elements.scoreClipboardStatus) {
    const selectedLabel = selectedCount ? `${selectedCount} mesure${selectedCount > 1 ? "s" : ""} cochée${selectedCount > 1 ? "s" : ""}` : "Sélection vide";
    const clipboardLabel = clipboardCount ? `bloc ${clipboardCount} parole${clipboardCount > 1 ? "s" : ""}` : "presse-papiers vide";
    elements.scoreClipboardStatus.textContent = `${selectedLabel} · ${clipboardLabel}`;
  }
}

function selectedScoreClipboardSlots() {
  return orderedScoreSlots().filter((slot) => scoreClipboardSelection.has(slot.id));
}

function clearScoreClipboardSelection(clearClipboard = false) {
  scoreClipboardSelection = new Set();
  lastScoreClipboardSlotId = null;
  if (clearClipboard) scoreLyricsClipboard = [];
  updateScoreClipboardControls();
}

function toggleScoreClipboardSlot(slot, checked, shiftKey = false) {
  if (shiftKey && lastScoreClipboardSlotId) {
    const ordered = orderedScoreSlots();
    const startIndex = ordered.findIndex((item) => item.id === lastScoreClipboardSlotId);
    const endIndex = ordered.findIndex((item) => item.id === slot.id);
    if (startIndex >= 0 && endIndex >= 0) {
      const [from, to] = startIndex < endIndex ? [startIndex, endIndex] : [endIndex, startIndex];
      for (const item of ordered.slice(from, to + 1)) {
        if (checked) scoreClipboardSelection.add(item.id);
        else scoreClipboardSelection.delete(item.id);
      }
      lastScoreClipboardSlotId = slot.id;
      renderScoreLyricsGrid();
      return;
    }
  }

  if (checked) scoreClipboardSelection.add(slot.id);
  else scoreClipboardSelection.delete(slot.id);
  lastScoreClipboardSlotId = slot.id;
  renderScoreLyricsGrid();
}

function copySelectedScoreLyrics() {
  const selected = selectedScoreClipboardSlots();
  if (!selected.length) {
    showToast("Coche les mesures à copier.");
    return;
  }
  scoreLyricsClipboard = selected.map((slot) => ({
    text: slot.text || "",
    sourceBar: slot.startBar,
    sourceDurationMs: slot.durationMs,
  }));
  updateScoreClipboardControls();
  showToast(`${scoreLyricsClipboard.length} parole${scoreLyricsClipboard.length > 1 ? "s" : ""} copiée${scoreLyricsClipboard.length > 1 ? "s" : ""}. Clique la mesure cible puis « Coller ici ».`);
}

function scoreMeasureIndexForActiveCursor() {
  if (activeScoreStartMs === null) return -1;
  const activeSlot = nearestScoreSlot(activeScoreStartMs);
  const activeBar = activeSlot?.startBar;
  let index = scoreMeasures.findIndex((measure) => Math.abs(measure.startMs - activeScoreStartMs) <= 40);
  if (index < 0 && activeBar) index = scoreMeasures.findIndex((measure) => measure.startBar === activeBar);
  return index;
}

function pasteScoreLyricsClipboard() {
  if (!scoreLyricsClipboard.length) {
    showToast("Aucun bloc de paroles copié.");
    return;
  }
  const startIndex = scoreMeasureIndexForActiveCursor();
  if (startIndex < 0) {
    showToast("Clique d'abord la mesure où coller le bloc.");
    return;
  }

  const targetMeasures = scoreMeasures.slice(startIndex, startIndex + scoreLyricsClipboard.length);
  if (!targetMeasures.length) {
    showToast("Impossible de trouver une mesure cible.");
    return;
  }

  const pastedSlotIds = new Set();
  targetMeasures.forEach((measure, index) => {
    const clipboardItem = scoreLyricsClipboard[index];
    let slot = scoreSlots.find((item) => item.id === measure.id || item.startBar === measure.startBar);
    if (!slot) {
      slot = { ...measure, text: "" };
      scoreSlots.push(slot);
    }
    slot.text = clipboardItem.text;
    if (slot.text.trim()) scoreLyrics.set(slot.startMs, slot.text.trim());
    else scoreLyrics.delete(slot.startMs);
    scoreTruncatedSlotIds.delete(slot.id);
    scoreMeasureTests.delete(slot.id);
    scoreVoiceTakes.delete(slot.id);
    pastedSlotIds.add(slot.id);
  });

  scoreSlots = orderedScoreSlots();
  scoreClipboardSelection = pastedSlotIds;
  lastScoreClipboardSlotId = targetMeasures[targetMeasures.length - 1]?.id || null;
  activeScoreStartMs = targetMeasures[0].startMs;
  const missingCount = scoreLyricsClipboard.length - targetMeasures.length;
  renderScoreLyricsGrid();
  scheduleScoreSelectionVisuals();
  scrollScoreTabToSlot(targetMeasures[0], "smooth");
  showToast(`${targetMeasures.length} parole${targetMeasures.length > 1 ? "s" : ""} collée${targetMeasures.length > 1 ? "s" : ""} depuis M${targetMeasures[0].startBar}${missingCount > 0 ? ` · ${missingCount} ignorée${missingCount > 1 ? "s" : ""} faute de mesure` : ""}.`);
}

function renderScoreLyricsGrid() {
  elements.scoreLyricsGrid.replaceChildren();
  elements.scoreLyricsGrid.classList.toggle("empty", scoreSlots.length === 0);
  elements.scoreLyricsGrid.classList.toggle("single", scoreSlots.length === 1);
  elements.scoreButton.disabled = Boolean(scoreTestingSlotId) || !scoreSlots.some((slot) => slot.text.trim());
  elements.scoreImportLyrics.disabled = !scoreData;
  elements.scoreSaveLyrics.disabled = scoreSlots.length === 0;
  scoreClipboardSelection = new Set([...scoreClipboardSelection].filter((slotId) => scoreSlots.some((slot) => slot.id === slotId)));
  updateScoreClipboardControls();
  if (!scoreSlots.length) {
    const message = document.createElement("p");
    message.textContent = scoreMeasures.length
      ? "Aucune mesure choisie. Clique une mesure dans la tablature."
      : "Importe une partition pour choisir des mesures.";
    elements.scoreLyricsGrid.append(message);
    elements.scoreLineCount.textContent = scoreMeasures.length ? "Aucune mesure choisie" : "Aucune mesure";
    return;
  }

  scoreSlots.forEach((slot, index) => {
    const occurrenceCount = occurrencesForScoreSlot(slot).length;
    const repeatInfo = occurrenceCount > 1 ? ` · ${occurrenceCount} passages` : "";
    const testResult = scoreMeasureTests.get(slot.id);
    const testStatus = testResult ? ` · ${testResult.label}` : "";
    const row = document.createElement("div");
    row.className = "score-lyric-row";
    row.classList.toggle("active", activeScoreStartMs === slot.startMs);
    row.classList.toggle("clipboard-selected", scoreClipboardSelection.has(slot.id));
    row.classList.toggle("test-ok", testResult?.state === "ok");
    row.classList.toggle("test-warning", testResult?.state === "warning");
    row.dataset.startMs = String(slot.startMs);
    row.dataset.slotId = slot.id;
    const selectWrap = document.createElement("span");
    selectWrap.className = "score-copy-toggle";
    const select = document.createElement("input");
    select.type = "checkbox";
    select.checked = scoreClipboardSelection.has(slot.id);
    select.title = "Inclure cette mesure dans le copier-coller";
    select.addEventListener("click", (event) => {
      event.stopPropagation();
      toggleScoreClipboardSlot(slot, select.checked, event.shiftKey);
    });
    selectWrap.append(select);
    const meta = document.createElement("span");
    meta.textContent = `${activeScoreStartMs === slot.startMs ? "CURSEUR · " : ""}Mesure ${slot.startBar} · ${formatTime(slot.startMs)}-${formatTime(slot.endMs)} · ${(slot.durationMs / 1000).toFixed(1)}s${repeatInfo}`;
    meta.className = "score-lyric-meta";
    const badge = document.createElement("strong");
    const badgeText = `Mesure ${slot.startBar}${occurrenceCount > 1 ? ` x${occurrenceCount}` : ""}`;
    badge.textContent = testResult?.state === "ok" ? `${badgeText} · OK` : badgeText;
    const details = document.createElement("small");
    const detailText = `Mesure ${slot.startBar} · ${formatTime(slot.startMs)} → ${formatTime(slot.endMs)} · ${(slot.durationMs / 1000).toFixed(1)}s${repeatInfo}`;
    details.textContent = `${activeScoreStartMs === slot.startMs ? "ACTIVE · " : ""}${detailText}${testStatus}`;
    meta.replaceChildren(badge, details);
    const input = document.createElement("textarea");
    input.rows = 3;
    input.value = slot.text;
    input.placeholder = "Texte à prononcer sur cette mesure…";
    input.addEventListener("focus", () => {
      activeScoreStartMs = slot.startMs;
      elements.scoreCursorStatus.textContent = `Mesure active : M${slot.startBar} · ${formatTime(slot.startMs)}-${formatTime(slot.endMs)}`;
      for (const item of elements.scoreLyricsGrid.querySelectorAll(".score-lyric-row")) {
        item.classList.toggle("active", item.dataset.slotId === slot.id);
        const itemDetails = item.querySelector(".score-lyric-meta small");
        if (itemDetails) itemDetails.textContent = itemDetails.textContent.replace(/^ACTIVE · /, "");
      }
      details.textContent = `ACTIVE · ${detailText}${testStatus}`;
      scrollScoreTabToSlot(slot);
      updateScoreClipboardControls();
      scheduleScoreSelectionVisuals();
    });
    input.addEventListener("input", () => {
      slot.text = input.value;
      if (slot.text.trim()) scoreLyrics.set(slot.startMs, slot.text.trim());
      else scoreLyrics.delete(slot.startMs);
      scoreMeasureTests.delete(slot.id);
      scoreVoiceTakes.delete(slot.id);
      row.classList.remove("test-ok", "test-warning");
      badge.textContent = badgeText;
      details.textContent = `${activeScoreStartMs === slot.startMs ? "ACTIVE · " : ""}${detailText}`;
      if (scoreTruncatedSlotIds.delete(slot.id)) {
        scheduleScoreSelectionVisuals();
      }
      elements.scoreButton.disabled = Boolean(scoreTestingSlotId) || !scoreSlots.some((item) => item.text.trim());
      updateScoreLineSummary();
    });
    row.addEventListener("click", (event) => {
      if (event.target.closest("button")) return;
      input.focus();
    });
    const test = document.createElement("button");
    test.type = "button";
    test.className = "score-test-voice";
    const hasStoredTake = Boolean(cachedScoreTake(slot, selectedScoreVoice(), scoreTtsMode));
    test.textContent = scoreTestingSlotId === slot.id ? "Test…" : hasStoredTake ? "Rejouer" : "Tester";
    test.title = "Générer seulement cette mesure pour vérifier la durée de la voix";
    test.disabled = Boolean(scoreTestingSlotId) || !slot.text.trim();
    test.addEventListener("click", (event) => {
      event.preventDefault();
      event.stopPropagation();
      testScoreSlotVoice(slot);
    });
    const remove = document.createElement("button");
    remove.type = "button";
    remove.className = "score-remove-interval";
    remove.textContent = "×";
    remove.title = "Supprimer cette mesure";
    remove.addEventListener("click", (event) => {
      event.preventDefault();
      event.stopPropagation();
      scoreSlots = scoreSlots.filter((item) => item.id !== slot.id);
      scoreLyrics.delete(slot.startMs);
      scoreTruncatedSlotIds.delete(slot.id);
      scoreMeasureTests.delete(slot.id);
      scoreVoiceTakes.delete(slot.id);
      if (activeScoreStartMs === slot.startMs) activeScoreStartMs = null;
      if (scoreSelectionStart?.startMs === slot.startMs) scoreSelectionStart = null;
      renderScoreLyricsGrid();
      scheduleScoreSelectionVisuals();
      elements.scoreCursorStatus.textContent = scoreSlots.length
        ? "Mesure supprimée · clique une autre mesure"
        : "Curseur vocal : clique une mesure";
    });
    row.append(selectWrap, meta, input, test, remove);
    elements.scoreLyricsGrid.append(row);
  });

  updateScoreLineSummary();
  updateScoreClipboardControls();
}

function refreshScoreSlots() {
  if (!scoreData) return;
  const index = Number(elements.scoreTrack.value) || 0;
  scorePoints = extractScorePoints(scoreData, index);
  scoreMeasures = extractScoreMeasures(scoreData, index);
  const playbackTimeline = buildScorePlaybackTimeline(scoreData);
  scorePlaybackOccurrences = playbackTimeline.occurrences;
  scoreSongDurationMs = playbackTimeline.durationMs;
  updateScoreLeadInStatus();
  scoreSlots = [];
  scoreTruncatedSlotIds = new Set();
  scoreMeasureTests = new Map();
  scoreVoiceTakes = new Map();
  clearScoreClipboardSelection(true);
  activeScoreStartMs = null;
  scoreSelectionStart = null;
  renderScoreLyricsGrid();
  const track = scoreData.tracks?.[index];
  const title = scoreData.title || scoreFileName;
  elements.scoreCursorStatus.textContent = scoreMeasures.length
    ? "Curseur vocal : clique une mesure"
    : "Curseur vocal : aucune mesure";
  const playedMeasures = [...scorePlaybackOccurrences.values()].reduce((total, items) => total + items.length, 0);
  const durationLabel = scoreSongDurationMs ? ` · durée ${formatTime(scoreSongDurationMs)}` : "";
  const repeatLabel = playedMeasures > scoreMeasures.length ? ` · ${playedMeasures} mesures jouées avec reprises` : "";
  elements.scoreMeta.textContent = `${title} · piste ${index + 1}/${scoreData.tracks?.length || 1} · ${track?.name || "Piste"} · ${scoreMeasures.length} mesures${repeatLabel}${durationLabel}`;
}

function populateScoreTracks(score) {
  elements.scoreTrack.replaceChildren();
  for (const track of score.tracks || []) {
    const option = document.createElement("option");
    option.value = String(track.index);
    const bars = track.staves?.[0]?.bars?.length || 0;
    option.textContent = `${track.index + 1}. ${track.name || "Piste sans nom"} · ${bars} mesures`;
    elements.scoreTrack.append(option);
  }
  elements.scoreTrack.disabled = !score.tracks?.length;
  elements.scoreTrack.classList.toggle("multiple", (score.tracks?.length || 0) > 1);
}

function setupScoreApi() {
  if (scoreApi || !globalThis.alphaTab) return scoreApi;
  elements.scoreTab.replaceChildren();
  scoreApi = new alphaTab.AlphaTabApi(elements.scoreTab, {
    core: {
      fontDirectory: "/vendor/alphatab/font/",
      includeNoteBounds: true,
    },
    display: {
      layoutMode: "page",
      staveProfile: "ScoreTab",
    },
    player: {
      enablePlayer: false,
    },
  });
  scoreApi.scoreLoaded.on((score) => {
    scoreData = score;
    scoreRepeatGroupIds = new WeakMap();
    scoreRepeatGroupCounter = 0;
    populateScoreTracks(score);
    scoreLyrics = new Map();
    scoreMeasureTests = new Map();
    scoreVoiceTakes = new Map();
    clearScoreClipboardSelection(true);
    resetScoreCursor();
    refreshScoreSlots();
    elements.scoreAutoFill.disabled = false;
    showToast("Partition chargÃ©e. Choisis la piste puis Ã©cris tes paroles.");
  });
  scoreApi.error.on((error) => {
    showToast(error?.message || "Impossible de lire cette tablature Guitar Pro.");
  });
  scoreApi.postRenderFinished.on(scheduleScoreSelectionVisuals);
  return scoreApi;
}

async function loadScoreFile(file) {
  if (!file) return;
  try {
    const api = setupScoreApi();
    if (!api) throw new Error("alphaTab n'est pas chargÃ©.");
    scoreFileName = file.name.replace(/\.[^.]+$/i, "") || "partition";
    elements.scoreFileDropTitle.textContent = file.name;
    elements.scoreFileDrop.classList.add("loaded");
    elements.scoreMeta.textContent = "Lecture de la partitionâ€¦";
    resetScoreResult();
    resetScoreCursor();
    const bytes = new Uint8Array(await file.arrayBuffer());
    api.load(bytes);
  } catch (error) {
    elements.scoreFile.value = "";
    elements.scoreFileDrop.classList.remove("loaded");
    elements.scoreFileDropTitle.textContent = "DÃ©poser ou choisir une partition Guitar Pro";
    showToast(error.message || "Impossible de charger cette partition.");
  }
}

function autoFillScoreLyrics() {
  const chunks = elements.scoreBulkText.value
    .split(/\n+|(?<=[.!?â€¦])\s+/u)
    .map((value) => value.trim())
    .filter(Boolean);
  if (!chunks.length) {
    showToast("Collez d'abord un texte Ã  rÃ©partir.");
    return;
  }
  if (!scoreSlots.length) {
    showToast("Choisis d'abord une ou plusieurs mesures dans la tablature.");
    return;
  }
  for (const slot of scoreSlots) slot.text = "";
  scoreLyrics = new Map();
  scoreMeasureTests = new Map();
  scoreVoiceTakes = new Map();
  scoreTruncatedSlotIds = new Set();
  clearScoreClipboardSelection(true);
  chunks.slice(0, scoreSlots.length).forEach((text, index) => {
    scoreSlots[index].text = text;
    scoreLyrics.set(scoreSlots[index].startMs, text);
  });
  renderScoreLyricsGrid();
}

function renderDialoguePreview() {
  elements.dialoguePreview.replaceChildren();
  elements.dialoguePreview.classList.toggle("empty", dialogueElements.length === 0);
  elements.dialogueButton.disabled = dialogueElements.length === 0;

  if (!dialogueElements.length) {
    const message = document.createElement("p");
    message.textContent = "Les répliques apparaîtront ici, alternées entre A et B.";
    elements.dialoguePreview.append(message);
    elements.dialogueCount.textContent = "Aucun fichier chargé";
    return;
  }

  dialogueElements.forEach((text, index) => {
    const line = document.createElement("article");
    const speaker = index % 2 === 0 ? "A" : "B";
    line.className = `dialogue-line ${speaker === "B" ? "speaker-b" : "speaker-a"}`;

    const badge = document.createElement("span");
    badge.className = "line-speaker";
    badge.textContent = speaker;
    const content = document.createElement("div");
    const paragraph = document.createElement("p");
    paragraph.textContent = text;
    const metadata = document.createElement("small");
    metadata.textContent = `INDEX ${index} · VOIX ${speaker}`;
    content.append(paragraph, metadata);
    line.append(badge, content);
    elements.dialoguePreview.append(line);
  });

  elements.dialogueCount.textContent = `${dialogueElements.length} réplique${dialogueElements.length > 1 ? "s" : ""}`;
}

async function loadDialogueFile(file) {
  if (!file) return;
  try {
    const data = JSON.parse(await file.text());
    if (!data || !Array.isArray(data.elements)) {
      throw new Error('Le fichier doit respecter le format { "elements": string[] }.');
    }
    if (data.elements.length < 1 || data.elements.length > 50) {
      throw new Error("Le fichier doit contenir entre 1 et 50 répliques.");
    }
    if (data.elements.some((value) => typeof value !== "string" || !value.trim())) {
      throw new Error("Chaque élément doit être un texte non vide.");
    }
    if (data.elements.some((value) => value.trim().length > 1000)) {
      throw new Error("Une réplique ne peut pas dépasser 1000 caractères.");
    }

    dialogueElements = data.elements.map((value) => value.trim());
    dialogueFileName = file.name.replace(/\.json$/i, "") || "dialogue";
    elements.fileDropTitle.textContent = file.name;
    elements.fileDrop.classList.add("loaded");
    resetDialogueResult();
    renderDialoguePreview();
  } catch (error) {
    dialogueElements = [];
    elements.dialogueFile.value = "";
    elements.fileDropTitle.textContent = "Déposer ou choisir un fichier JSON";
    renderDialoguePreview();
    showToast(error.message || "Le fichier JSON est invalide.");
  }
}

function renderBatchPreview() {
  elements.batchPreview.replaceChildren();
  elements.batchPreview.classList.toggle("empty", batchFiles.length === 0);
  if (!batchFiles.length) {
    const message = document.createElement("p");
    message.textContent = "Aucun lot chargÃ©. Le champ texte ci-dessus reste utilisÃ© en mode voix unique.";
    elements.batchPreview.append(message);
    elements.batchFileDropTitle.textContent = "Importer plusieurs fichiers texte";
    return;
  }

  const list = document.createElement("div");
  list.className = "batch-file-list";
  for (const file of batchFiles) {
    const item = document.createElement("span");
    item.textContent = `${file.name} â†’ ${file.name.replace(/\.[^.]+$/, "") || file.name}.wav`;
    list.append(item);
  }
  const clear = document.createElement("button");
  clear.type = "button";
  clear.className = "batch-clear";
  clear.textContent = "Retirer le lot";
  clear.addEventListener("click", () => {
    batchFiles = [];
    elements.batchFiles.value = "";
    elements.batchFileDrop.classList.remove("loaded");
    renderBatchPreview();
    resetResult();
  });
  elements.batchPreview.append(list, clear);
  elements.batchFileDropTitle.textContent = `${batchFiles.length} fichier${batchFiles.length > 1 ? "s" : ""} chargÃ©${batchFiles.length > 1 ? "s" : ""}`;
}

async function loadBatchFiles(files) {
  const selected = Array.from(files || []);
  if (!selected.length) return;
  try {
    if (selected.length > 30) {
      throw new Error("Le lot est limitÃ© Ã  30 fichiers.");
    }
    const loaded = [];
    for (const file of selected) {
      const text = (await file.text()).trim();
      if (!text) throw new Error(`${file.name} est vide.`);
      if (text.length > configuration.maxCharacters) {
        throw new Error(`${file.name} dÃ©passe ${configuration.maxCharacters} caractÃ¨res.`);
      }
      loaded.push({ name: file.name, text });
    }
    batchFiles = loaded;
    elements.batchFileDrop.classList.add("loaded");
    renderBatchPreview();
    resetResult();
  } catch (error) {
    batchFiles = [];
    elements.batchFiles.value = "";
    elements.batchFileDrop.classList.remove("loaded");
    renderBatchPreview();
    showToast(error.message || "Impossible de charger ces fichiers.");
  }
}

function resetResult() {
  elements.player.pause();
  elements.player.removeAttribute("src");
  if (currentAudioUrl) URL.revokeObjectURL(currentAudioUrl);
  currentAudioUrl = null;
  currentAudioExtension = "wav";
  currentAudioDownloadName = null;
  elements.player.hidden = false;
  elements.waveform.hidden = false;
  elements.download.textContent = "TÃ©lÃ©charger le WAV";
  elements.ready.hidden = true;
  elements.idle.hidden = false;
  hideProgress("speech");
}

elements.text.addEventListener("input", updateCounter);
elements.description.addEventListener("input", () => {
  document.querySelectorAll(".preset").forEach((item) => item.classList.remove("active"));
  document.querySelector('[data-preset="custom"]')?.classList.add("active");
});
elements.player.addEventListener("play", () => elements.waveform.classList.add("playing"));
elements.player.addEventListener("pause", () => elements.waveform.classList.remove("playing"));
elements.player.addEventListener("ended", () => elements.waveform.classList.remove("playing"));
elements.reset.addEventListener("click", resetResult);
elements.modeTabs.forEach((tab) => tab.addEventListener("click", () => switchMode(tab.dataset.mode)));
elements.modelOptions.forEach((button) => button.addEventListener("click", () => {
  setTtsMode(button.dataset.target, button.dataset.ttsMode);
}));
elements.scoreFile.addEventListener("change", () => loadScoreFile(elements.scoreFile.files[0]));
elements.scoreFileDrop.addEventListener("dragover", (event) => {
  event.preventDefault();
  elements.scoreFileDrop.classList.add("dragging");
});
elements.scoreFileDrop.addEventListener("dragleave", () => elements.scoreFileDrop.classList.remove("dragging"));
elements.scoreFileDrop.addEventListener("drop", (event) => {
  event.preventDefault();
  elements.scoreFileDrop.classList.remove("dragging");
  loadScoreFile(event.dataTransfer.files[0]);
});
elements.scoreTab.addEventListener("click", handleScoreTabClick);
elements.scoreTab.addEventListener("scroll", () => {
  scheduleScoreSelectionVisuals();
});
setupScoreResizeObserver();
elements.scoreVoice.addEventListener("change", clearScoreVoiceTests);
elements.scoreLanguage.addEventListener("change", clearScoreVoiceTests);
elements.scoreLeadInBeats?.addEventListener("input", () => {
  const beats = scoreLeadInBeats();
  elements.scoreLeadInBeats.value = String(beats);
  updateScoreLeadInStatus();
  resetScoreResult();
});
elements.scoreLeadInFour?.addEventListener("click", () => {
  if (!elements.scoreLeadInBeats) return;
  elements.scoreLeadInBeats.value = "4";
  updateScoreLeadInStatus();
  resetScoreResult();
  showToast(`Intro Guitar Pro : 4 coups ajoutés (${formatShortDuration(scoreLeadInDelayMs())}).`);
});
updateScoreLeadInStatus();
elements.scoreTrack.addEventListener("change", () => {
  if (scoreData && scoreApi) {
    const track = scoreData.tracks?.[Number(elements.scoreTrack.value) || 0];
    if (track) scoreApi.renderTracks([track]);
  }
  resetScoreCursor();
  refreshScoreSlots();
});
elements.scoreAutoFill.addEventListener("click", autoFillScoreLyrics);
elements.batchFiles.addEventListener("change", () => loadBatchFiles(elements.batchFiles.files));
elements.batchFileDrop.addEventListener("dragover", (event) => {
  event.preventDefault();
  elements.batchFileDrop.classList.add("dragging");
});
elements.batchFileDrop.addEventListener("dragleave", () => elements.batchFileDrop.classList.remove("dragging"));
elements.batchFileDrop.addEventListener("drop", (event) => {
  event.preventDefault();
  elements.batchFileDrop.classList.remove("dragging");
  loadBatchFiles(event.dataTransfer.files);
});
elements.dialogueFile.addEventListener("change", () => loadDialogueFile(elements.dialogueFile.files[0]));
elements.fileDrop.addEventListener("dragover", (event) => {
  event.preventDefault();
  elements.fileDrop.classList.add("dragging");
});
elements.fileDrop.addEventListener("dragleave", () => elements.fileDrop.classList.remove("dragging"));
elements.fileDrop.addEventListener("drop", (event) => {
  event.preventDefault();
  elements.fileDrop.classList.remove("dragging");
  loadDialogueFile(event.dataTransfer.files[0]);
});
elements.dialoguePlayer.addEventListener("play", () => elements.dialogueWaveform.classList.add("playing"));
elements.dialoguePlayer.addEventListener("pause", () => elements.dialogueWaveform.classList.remove("playing"));
elements.dialoguePlayer.addEventListener("ended", () => elements.dialogueWaveform.classList.remove("playing"));
elements.scorePlayer.addEventListener("play", () => elements.scoreWaveform.classList.add("playing"));
elements.scorePlayer.addEventListener("pause", () => elements.scoreWaveform.classList.remove("playing"));
elements.scorePlayer.addEventListener("ended", () => elements.scoreWaveform.classList.remove("playing"));
elements.resetDialogue.addEventListener("click", resetDialogueResult);
elements.resetScore.addEventListener("click", resetScoreResult);
elements.dialogueOutput.addEventListener("change", resetDialogueResult);
elements.unloadModels.addEventListener("click", async () => {
  if (activeSpeechJob || activeDialogueJob || activeScoreJob) {
    showToast("Attendez la fin de la génération avant de libérer les modèles.");
    return;
  }
  elements.unloadModels.disabled = true;
  elements.unloadModels.textContent = "Libération…";
  try {
    const response = await fetch("/api/unload", { method: "POST" });
    const result = await response.json();
    if (!response.ok) throw new Error(result.error || "Impossible de libérer les modèles.");
    const freed = Number.isFinite(result.freed_mb) ? ` · ${result.freed_mb} Mo libérés` : "";
    showToast(`Modèles déchargés${freed}.`);
    await pollStatus();
  } catch (error) {
    showToast(readableFetchError(error));
  } finally {
    elements.unloadModels.disabled = false;
    elements.unloadModels.textContent = "Libérer les modèles";
  }
});
elements.download.addEventListener("click", () => {
  if (!currentAudioUrl) return;
  const link = document.createElement("a");
  link.href = currentAudioUrl;
  link.download = currentAudioDownloadName || `voice-forge-${Date.now()}.${currentAudioExtension}`;
  link.click();
});
elements.saveDialogue.addEventListener("click", () => {
  if (!currentDialogueAudioUrl) return;
  const link = document.createElement("a");
  link.href = currentDialogueAudioUrl;
  link.download = `${dialogueFileName}-genere.${currentDialogueExtension}`;
  link.click();
});
elements.saveScore.addEventListener("click", () => {
  if (!currentScoreAudioUrl) return;
  const link = document.createElement("a");
  link.href = currentScoreAudioUrl;
  link.download = `${scoreFileName}-voix.${currentScoreAudioExtension || "mp3"}`;
  link.click();
});
elements.scoreSaveLyrics.addEventListener("click", saveScoreLyricsProject);
elements.scoreImportLyrics.addEventListener("click", () => {
  if (!scoreData) {
    showToast("Charge d'abord la partition Guitar Pro correspondante.");
    return;
  }
  elements.scoreLyricsFile.click();
});
elements.scoreLyricsFile.addEventListener("change", () => loadScoreLyricsFile(elements.scoreLyricsFile.files[0]));
elements.scoreCopyLyrics?.addEventListener("click", copySelectedScoreLyrics);
elements.scorePasteLyrics?.addEventListener("click", pasteScoreLyricsClipboard);
elements.scoreClearLyricsSelection?.addEventListener("click", () => {
  clearScoreClipboardSelection(scoreClipboardSelection.size === 0);
  renderScoreLyricsGrid();
});

elements.form.addEventListener("submit", async (event) => {
  event.preventDefault();
  const isBatch = batchFiles.length > 0;
  if (!elements.text.value.trim() && !isBatch) {
    showToast("Ajoutez d'abord le texte à interpréter ou importez des fichiers.");
    elements.text.focus();
    return;
  }
  if (speechTtsMode === "design" && !elements.description.value.trim()) {
    showToast("Décrivez la voix attendue ou choisissez un preset.");
    elements.description.focus();
    return;
  }

  elements.button.disabled = true;
  elements.button.classList.add("loading");
  elements.buttonLabel.textContent = isBatch ? "Lot en cours" : "Forge en cours";
  const startedAt = performance.now();
  activeSpeechJob = createJobId("speech");
  elements.ready.hidden = true;
  renderProgress("speech", {
    stage: "queued",
    percent: 1,
    message: isBatch ? "Envoi du lot au moteur vocal…" : "Envoi au moteur vocal…",
  });
  pollStatus();

  try {
    const response = await fetch(isBatch ? "/api/batch" : "/api/speech", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(isBatch
        ? {
            files: batchFiles,
            voiceDescription: speechTtsMode === "design" ? elements.description.value : "",
            language: elements.language.value,
            mode: speechTtsMode,
            speaker: speechTtsMode === "custom" ? selectedCustomSpeaker : null,
            jobId: activeSpeechJob,
          }
        : {
            text: elements.text.value,
            voiceDescription: speechTtsMode === "design" ? elements.description.value : "",
            language: elements.language.value,
            mode: speechTtsMode,
            speaker: speechTtsMode === "custom" ? selectedCustomSpeaker : null,
            jobId: activeSpeechJob,
          }),
    });

    if (!response.ok) {
      const payload = await response.json().catch(() => ({}));
      throw new Error(payload.error || "La génération a échoué.");
    }

    const blob = await response.blob();
    if (currentAudioUrl) URL.revokeObjectURL(currentAudioUrl);
    currentAudioUrl = URL.createObjectURL(blob);
    currentAudioExtension = isBatch ? "zip" : "wav";
    currentAudioDownloadName = isBatch
      ? `voice-forge-lot-${Date.now()}.zip`
      : `voice-forge-${Date.now()}.wav`;
    elements.player.hidden = isBatch;
    elements.waveform.hidden = isBatch;
    elements.download.textContent = isBatch ? `Télécharger ${batchFiles.length} WAV (ZIP)` : "Télécharger le WAV";
    if (isBatch) {
      elements.player.pause();
      elements.player.removeAttribute("src");
    } else {
      elements.player.src = currentAudioUrl;
    }
    renderProgress("speech", { stage: "done", percent: 100, message: isBatch ? "Lot prêt" : "Voix prête" });
    elements.idle.hidden = true;
    elements.ready.hidden = false;
    const voiceName = speechTtsMode === "custom" ? selectedCustomSpeaker : "VOICEDESIGN";
    const outputLabel = isBatch ? `${batchFiles.length} FICHIERS WAV` : "1 FICHIER WAV";
    elements.meta.textContent = `${voiceName.toUpperCase()} · ${outputLabel} · ${elements.language.value.toUpperCase()} · LOCAL · ${(blob.size / 1024).toFixed(0)} KO · ${((performance.now() - startedAt) / 1000).toFixed(1)} S`;
    if (!isBatch) elements.player.play().catch(() => {});
  } catch (error) {
    const message = readableFetchError(error);
    renderProgress("speech", { stage: "error", percent: 0, message });
    showToast(message);
  } finally {
    activeSpeechJob = null;
    elements.button.disabled = false;
    elements.button.classList.remove("loading");
    elements.buttonLabel.textContent = "Générer la voix";
  }
});

elements.scoreForm.addEventListener("submit", async (event) => {
  event.preventDefault();
  const slots = scoreSlots.filter((slot) => slot.text.trim());
  const lines = scoreSlots.flatMap(linesForScoreSlot);
  if (!lines.length) {
    showToast("Ajoutez au moins une parole sur la timeline.");
    return;
  }

  const voice = selectedScoreVoice();
  if (!voice) {
    showToast("Choisissez une voix valide.");
    return;
  }
  const scoreMode = scoreTtsMode;
  if (scoreTruncatedSlotIds.size) {
    scoreTruncatedSlotIds = new Set();
    renderScoreLyricsGrid();
  }

  elements.scoreButton.disabled = true;
  elements.scoreButton.classList.add("loading");
  elements.scoreButtonLabel.textContent = "Régénération finale";
  const startedAt = performance.now();
  elements.scoreReady.hidden = true;
  renderProgress("score", { stage: "queued", percent: 1, message: "Préparation de la génération finale…" });

  try {
    await generateFinalScoreSpeech(lines, voice, scoreMode, startedAt);
  } catch (error) {
    const message = readableFetchError(error);
    renderProgress("score", { stage: "error", percent: 0, message });
    showToast(message);
  } finally {
    activeScoreJob = null;
    scoreTestingSlotId = null;
    elements.scoreButton.disabled = !scoreSlots.some((slot) => slot.text.trim());
    elements.scoreButton.classList.remove("loading");
    elements.scoreButtonLabel.textContent = "Générer la voix sur partition";
  }
});

elements.dialogueForm.addEventListener("submit", async (event) => {
  event.preventDefault();
  if (!dialogueElements.length) {
    showToast("Chargez d'abord un fichier de dialogue JSON.");
    return;
  }
  if (elements.dialogueVoiceA.value === elements.dialogueVoiceB.value) {
    showToast("Choisissez deux types de voix différents.");
    return;
  }

  const voiceA = findVoiceChoice(elements.dialogueVoiceA.value, dialogueTtsMode);
  const voiceB = findVoiceChoice(elements.dialogueVoiceB.value, dialogueTtsMode);
  const splitPairs = elements.dialogueOutput.value === "pairs";
  if (!voiceA || !voiceB) {
    showToast("Les voix sélectionnées sont invalides.");
    return;
  }

  const dialogueMode = dialogueTtsMode;

  elements.dialogueButton.disabled = true;
  elements.dialogueButton.classList.add("loading");
  elements.dialogueButtonLabel.textContent = `Génération de ${dialogueElements.length} répliques`;
  const startedAt = performance.now();
  activeDialogueJob = createJobId("dialogue");
  elements.dialogueReady.hidden = true;
  renderProgress("dialogue", { stage: "queued", percent: 1, message: "Envoi du dialogue au moteur…" });
  pollStatus();

  try {
    const response = await fetch("/api/dialogue", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        elements: dialogueElements,
        voiceADescription: dialogueMode === "design" ? voiceA.description : "",
        voiceBDescription: dialogueMode === "design" ? voiceB.description : "",
        language: elements.dialogueLanguage.value,
        pauseMs: Number(elements.dialoguePause.value),
        mode: dialogueMode,
        speakerA: dialogueMode === "custom" ? voiceA.id : null,
        speakerB: dialogueMode === "custom" ? voiceB.id : null,
        jobId: activeDialogueJob,
        splitPairs,
      }),
    });

    if (!response.ok) {
      const payload = await response.json().catch(() => ({}));
      throw new Error(payload.error || "La génération du dialogue a échoué.");
    }

    const blob = await response.blob();
    if (currentDialogueAudioUrl) URL.revokeObjectURL(currentDialogueAudioUrl);
    currentDialogueAudioUrl = URL.createObjectURL(blob);
    const isArchive = response.headers.get("content-type")?.includes("zip") || splitPairs;
    currentDialogueExtension = isArchive ? "zip" : "wav";
    elements.dialoguePlayer.hidden = isArchive;
    elements.dialogueWaveform.hidden = isArchive;
    elements.saveDialogue.textContent = isArchive
      ? `Enregistrer les ${Math.ceil(dialogueElements.length / 2)} WAV (ZIP)`
      : "Enregistrer le dialogue";
    if (isArchive) {
      elements.dialoguePlayer.pause();
      elements.dialoguePlayer.removeAttribute("src");
    } else {
      elements.dialoguePlayer.src = currentDialogueAudioUrl;
    }
    renderProgress("dialogue", { stage: "done", percent: 100, message: "Dialogue prêt" });
    elements.dialogueIdle.hidden = true;
    elements.dialogueReady.hidden = false;
    const outputMeta = isArchive
      ? `${Math.ceil(dialogueElements.length / 2)} FICHIERS WAV`
      : "1 FICHIER WAV";
    elements.dialogueMeta.textContent = `${dialogueElements.length} RÉPLIQUES · ${outputMeta} · ${voiceA.name.toUpperCase()} / ${voiceB.name.toUpperCase()} · ${(blob.size / 1024).toFixed(0)} KO · ${((performance.now() - startedAt) / 1000).toFixed(1)} S`;
    if (!isArchive) elements.dialoguePlayer.play().catch(() => {});
  } catch (error) {
    const message = readableFetchError(error);
    renderProgress("dialogue", { stage: "error", percent: 0, message });
    showToast(message);
  } finally {
    activeDialogueJob = null;
    elements.dialogueButton.disabled = false;
    elements.dialogueButton.classList.remove("loading");
    elements.dialogueButtonLabel.textContent = "Générer le dialogue";
  }
});

switchMode(modeFromLocation());
initialize();
