const elements = {
  form: document.querySelector("#speechForm"),
  text: document.querySelector("#speechText"),
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
  dialogueForm: document.querySelector("#dialogueForm"),
  dialogueFile: document.querySelector("#dialogueFile"),
  fileDrop: document.querySelector("#fileDrop"),
  fileDropTitle: document.querySelector("#fileDropTitle"),
  dialogueVoiceA: document.querySelector("#dialogueVoiceA"),
  dialogueVoiceB: document.querySelector("#dialogueVoiceB"),
  dialogueLanguage: document.querySelector("#dialogueLanguage"),
  dialoguePause: document.querySelector("#dialoguePause"),
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
  modelOptions: document.querySelectorAll(".model-option"),
  designVoiceControls: document.querySelector("#designVoiceControls"),
  customVoiceControls: document.querySelector("#customVoiceControls"),
  customSpeakers: document.querySelector("#customSpeakers"),
  gpuMonitor: document.querySelector("#gpuMonitor"),
  gpuProfile: document.querySelector("#gpuProfile"),
  gpuTemperature: document.querySelector("#gpuTemperature"),
  gpuMemory: document.querySelector("#gpuMemory"),
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
};

let currentAudioUrl = null;
let currentDialogueAudioUrl = null;
let dialogueElements = [];
let dialogueFileName = "dialogue";
let speechTtsMode = "design";
let dialogueTtsMode = "design";
let selectedCustomSpeaker = "Ryan";
let activeSpeechJob = null;
let activeDialogueJob = null;
let statusRequestRunning = false;
let configuration = {
  maxCharacters: 4096,
  defaultLanguage: "French",
  presets: [],
  customSpeakers: [],
};

function showToast(message) {
  elements.toast.textContent = message;
  elements.toast.classList.add("visible");
  window.clearTimeout(showToast.timeout);
  showToast.timeout = window.setTimeout(() => elements.toast.classList.remove("visible"), 4200);
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
  return kind === "speech"
    ? {
        idle: elements.idle,
        container: elements.speechProgress,
        message: elements.speechProgressMessage,
        percent: elements.speechProgressPercent,
        bar: elements.speechProgressBar,
        detail: elements.speechProgressDetail,
      }
    : {
        idle: elements.dialogueIdle,
        container: elements.dialogueProgress,
        message: elements.dialogueProgressMessage,
        percent: elements.dialogueProgressPercent,
        bar: elements.dialogueProgressBar,
        detail: elements.dialogueProgressDetail,
      };
}

function renderProgress(kind, progress, gpu = {}) {
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
  const thermal = gpu?.available ? `GPU ${gpu.temperature} °C · ${gpu.utilization} %` : "GPU non détecté";
  view.detail.textContent = `${segment} · ${thermal}`;
}

function hideProgress(kind) {
  const view = progressElements(kind);
  view.idle.classList.remove("generating");
  view.container.hidden = true;
  view.container.classList.remove("cooling", "error");
}

function renderGpu(status) {
  const gpu = status?.gpu || {};
  const state = status?.thermal_state || "offline";
  const profileLabels = { performance: "PERFORMANCE", balanced: "ÉQUILIBRÉ", eco: "ÉCO" };
  elements.gpuProfile.textContent = `GPU · ${profileLabels[status?.power_profile] || "ÉQUILIBRÉ"}`;
  elements.gpuMonitor.className = `gpu-monitor ${gpu.available ? state : "offline"}`;
  if (!gpu.available) {
    elements.gpuTemperature.textContent = "-- °C";
    elements.gpuMemory.textContent = "VRAM indisponible";
    return;
  }
  elements.gpuTemperature.textContent = `${gpu.temperature} °C`;
  elements.gpuMemory.textContent = `VRAM ${gpu.memory_used_mb}/${gpu.memory_total_mb} Mo · ${gpu.power_watts} W`;
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
      renderProgress("speech", progress, status.gpu);
    }
    if (activeDialogueJob && progress.job_id === activeDialogueJob) {
      renderProgress("dialogue", progress, status.gpu);
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

function refreshDialogueVoiceOptions(mode) {
  const choices = dialogueChoices(mode);
  const label = (item) => `${item.icon}  ${item.name}`;
  const defaultA = mode === "custom" ? "Ryan" : "wizard";
  const defaultB = mode === "custom" ? "Serena" : "goat";
  appendOptions(elements.dialogueVoiceA, choices, defaultA, label);
  appendOptions(elements.dialogueVoiceB, choices, defaultB, label);
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
  } else {
    dialogueTtsMode = mode;
    refreshDialogueVoiceOptions(mode);
  }
  const selectedMode = configuration.modes?.find((item) => item.id === mode);
  if (selectedMode) elements.model.textContent = selectedMode.model.toUpperCase();
}

function renderConfig(config) {
  configuration = config;
  elements.text.maxLength = config.maxCharacters;
  const languageLabel = (language) => language === "Auto" ? "Détection automatique" : language;
  appendOptions(elements.language, config.languages, config.defaultLanguage, languageLabel);
  appendOptions(elements.dialogueLanguage, config.languages, config.defaultLanguage, languageLabel);
  const presetLabel = (preset) => `${preset.icon}  ${preset.name}`;
  refreshDialogueVoiceOptions(dialogueTtsMode);

  elements.presets.replaceChildren();
  for (const preset of config.presets) {
    const button = document.createElement("button");
    button.type = "button";
    button.className = "preset";
    button.dataset.preset = preset.id;
    button.innerHTML = `<span class="preset-icon">${preset.icon}</span><span>${preset.name}</span>`;
    button.addEventListener("click", () => {
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
  updateCounter();
}

async function initialize() {
  createWaveform();
  createWaveform(elements.dialogueWaveform);
  try {
    const [configResponse, healthResponse] = await Promise.all([
      fetch("/api/config"),
      fetch("/api/health"),
    ]);
    if (!configResponse.ok || !healthResponse.ok) throw new Error("Serveur indisponible");
    const [config, health] = await Promise.all([configResponse.json(), healthResponse.json()]);
    renderConfig(config);
    setStatus(true, health.configured);
  } catch {
    setStatus(false, false);
  }
  await pollStatus();
  window.setInterval(pollStatus, 2000);
}

function switchMode(mode) {
  const dialogueMode = mode === "dialogue";
  elements.voiceStudio.hidden = dialogueMode;
  elements.dialogueStudio.hidden = !dialogueMode;
  for (const tab of elements.modeTabs) {
    const active = tab.dataset.mode === mode;
    tab.classList.toggle("active", active);
    tab.setAttribute("aria-selected", String(active));
  }
}

function resetDialogueResult() {
  elements.dialoguePlayer.pause();
  elements.dialoguePlayer.removeAttribute("src");
  if (currentDialogueAudioUrl) URL.revokeObjectURL(currentDialogueAudioUrl);
  currentDialogueAudioUrl = null;
  elements.dialogueReady.hidden = true;
  elements.dialogueIdle.hidden = false;
  hideProgress("dialogue");
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

function resetResult() {
  elements.player.pause();
  elements.player.removeAttribute("src");
  if (currentAudioUrl) URL.revokeObjectURL(currentAudioUrl);
  currentAudioUrl = null;
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
elements.resetDialogue.addEventListener("click", resetDialogueResult);
elements.download.addEventListener("click", () => {
  if (!currentAudioUrl) return;
  const link = document.createElement("a");
  link.href = currentAudioUrl;
  link.download = `voice-forge-${Date.now()}.wav`;
  link.click();
});
elements.saveDialogue.addEventListener("click", () => {
  if (!currentDialogueAudioUrl) return;
  const link = document.createElement("a");
  link.href = currentDialogueAudioUrl;
  link.download = `${dialogueFileName}-genere.wav`;
  link.click();
});

elements.form.addEventListener("submit", async (event) => {
  event.preventDefault();
  if (!elements.text.value.trim()) {
    showToast("Ajoutez d'abord le texte à interpréter.");
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
  elements.buttonLabel.textContent = "Forge en cours";
  const startedAt = performance.now();
  activeSpeechJob = createJobId("speech");
  elements.ready.hidden = true;
  renderProgress("speech", { stage: "queued", percent: 1, message: "Envoi au moteur vocal…" });
  pollStatus();

  try {
    const response = await fetch("/api/speech", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
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
    elements.player.src = currentAudioUrl;
    renderProgress("speech", { stage: "done", percent: 100, message: "Voix prête" });
    elements.idle.hidden = true;
    elements.ready.hidden = false;
    const voiceName = speechTtsMode === "custom" ? selectedCustomSpeaker : "VOICEDESIGN";
    elements.meta.textContent = `${voiceName.toUpperCase()} · ${elements.language.value.toUpperCase()} · LOCAL · ${(blob.size / 1024).toFixed(0)} KO · ${((performance.now() - startedAt) / 1000).toFixed(1)} S`;
    elements.player.play().catch(() => {});
  } catch (error) {
    renderProgress("speech", { stage: "error", percent: 0, message: error.message });
    showToast(error.message);
  } finally {
    activeSpeechJob = null;
    elements.button.disabled = false;
    elements.button.classList.remove("loading");
    elements.buttonLabel.textContent = "Générer la voix";
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

  const choices = dialogueChoices(dialogueTtsMode);
  const voiceA = choices.find((item) => item.id === elements.dialogueVoiceA.value);
  const voiceB = choices.find((item) => item.id === elements.dialogueVoiceB.value);
  if (!voiceA || !voiceB) {
    showToast("Les voix sélectionnées sont invalides.");
    return;
  }

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
        voiceADescription: dialogueTtsMode === "design" ? voiceA.description : "",
        voiceBDescription: dialogueTtsMode === "design" ? voiceB.description : "",
        language: elements.dialogueLanguage.value,
        pauseMs: Number(elements.dialoguePause.value),
        mode: dialogueTtsMode,
        speakerA: dialogueTtsMode === "custom" ? voiceA.id : null,
        speakerB: dialogueTtsMode === "custom" ? voiceB.id : null,
        jobId: activeDialogueJob,
      }),
    });

    if (!response.ok) {
      const payload = await response.json().catch(() => ({}));
      throw new Error(payload.error || "La génération du dialogue a échoué.");
    }

    const blob = await response.blob();
    if (currentDialogueAudioUrl) URL.revokeObjectURL(currentDialogueAudioUrl);
    currentDialogueAudioUrl = URL.createObjectURL(blob);
    elements.dialoguePlayer.src = currentDialogueAudioUrl;
    renderProgress("dialogue", { stage: "done", percent: 100, message: "Dialogue prêt" });
    elements.dialogueIdle.hidden = true;
    elements.dialogueReady.hidden = false;
    elements.dialogueMeta.textContent = `${dialogueElements.length} RÉPLIQUES · ${voiceA.name.toUpperCase()} / ${voiceB.name.toUpperCase()} · ${(blob.size / 1024).toFixed(0)} KO · ${((performance.now() - startedAt) / 1000).toFixed(1)} S`;
    elements.dialoguePlayer.play().catch(() => {});
  } catch (error) {
    renderProgress("dialogue", { stage: "error", percent: 0, message: error.message });
    showToast(error.message);
  } finally {
    activeDialogueJob = null;
    elements.dialogueButton.disabled = false;
    elements.dialogueButton.classList.remove("loading");
    elements.dialogueButtonLabel.textContent = "Générer le dialogue";
  }
});

initialize();
