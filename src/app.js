import express from "express";
import { fileURLToPath } from "node:url";
import { Agent } from "undici";

import { getConfig } from "./config.js";
import { wavToMp3 } from "./audio.js";
import {
  validateBatchRequest,
  validateDialogueRequest,
  validateScoreSpeechRequest,
  validateSpeechRequest,
} from "./validation.js";

const engineDispatcher = new Agent({
  connectTimeout: 10_000,
  headersTimeout: 0,
  bodyTimeout: 0,
});
const SCORE_RESULT_TTL_MS = 30 * 60 * 1000;
const SCORE_RESULT_LIMIT = 8;

function pruneScoreResults(results) {
  const now = Date.now();
  for (const [jobId, result] of results) {
    if (now - result.createdAt > SCORE_RESULT_TTL_MS) {
      results.delete(jobId);
    }
  }
  while (results.size > SCORE_RESULT_LIMIT) {
    const oldestJobId = results.keys().next().value;
    if (!oldestJobId) break;
    results.delete(oldestJobId);
  }
}

function validJobId(jobId) {
  return typeof jobId === "string" && /^[a-zA-Z0-9_-]{1,80}$/.test(jobId);
}

function parseNumberListHeader(value) {
  return String(value || "")
    .split(",")
    .map((item) => Number.parseInt(item.trim(), 10))
    .filter((item) => Number.isInteger(item) && item > 0);
}

async function callLocalEngine(config, payload) {
  const engineResponse = await fetch(`${config.engineUrl}/speech`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      text: payload.text,
      voice_description: payload.voiceDescription || "Voix naturelle, expressive et claire.",
      language: payload.language,
      mode: payload.mode,
      speaker: payload.speaker || null,
      job_id: payload.jobId || null,
    }),
    dispatcher: engineDispatcher,
  });

  if (!engineResponse.ok) {
    const detail = await engineResponse.json().catch(() => ({}));
    const error = new Error(detail.detail || "Le moteur local a refusé la génération.");
    error.status = engineResponse.status;
    error.publicMessage = detail.detail;
    throw error;
  }

  return {
    bytes: Buffer.from(await engineResponse.arrayBuffer()),
    contentType: engineResponse.headers.get("content-type") || "audio/wav",
    extension: "wav",
    audioDurationMs: Number.parseInt(engineResponse.headers.get("x-tts-audio-duration-ms") || "0", 10) || null,
    audibleDurationMs: Number.parseInt(engineResponse.headers.get("x-tts-audible-duration-ms") || "0", 10) || null,
    audibleEndMs: Number.parseInt(engineResponse.headers.get("x-tts-audible-end-ms") || "0", 10) || null,
  };
}

async function callLocalDialogueEngine(config, payload) {
  const engineResponse = await fetch(`${config.engineUrl}/dialogue`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      elements: payload.elements,
      voice_a_description: payload.voiceADescription,
      voice_b_description: payload.voiceBDescription,
      language: payload.language,
      pause_ms: payload.pauseMs,
      mode: payload.mode,
      speaker_a: payload.speakerA || null,
      speaker_b: payload.speakerB || null,
      job_id: payload.jobId || null,
      split_pairs: payload.splitPairs,
    }),
    dispatcher: engineDispatcher,
  });

  if (!engineResponse.ok) {
    const detail = await engineResponse.json().catch(() => ({}));
    const error = new Error(detail.detail || "Le moteur local a refusé le dialogue.");
    error.status = engineResponse.status;
    error.publicMessage = detail.detail;
    throw error;
  }

  const contentType = engineResponse.headers.get("content-type") || "audio/wav";
  return {
    bytes: Buffer.from(await engineResponse.arrayBuffer()),
    contentType,
    extension: contentType.includes("zip") ? "zip" : "wav",
  };
}

async function callLocalBatchEngine(config, payload) {
  const engineResponse = await fetch(`${config.engineUrl}/batch`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      files: payload.files,
      voice_description: payload.voiceDescription || "Voix naturelle, expressive et claire.",
      language: payload.language,
      mode: payload.mode,
      speaker: payload.speaker || null,
      job_id: payload.jobId || null,
    }),
    dispatcher: engineDispatcher,
  });

  if (!engineResponse.ok) {
    const detail = await engineResponse.json().catch(() => ({}));
    const error = new Error(detail.detail || "Le moteur local a refusÃ© le lot.");
    error.status = engineResponse.status;
    error.publicMessage = detail.detail;
    throw error;
  }

  return {
    bytes: Buffer.from(await engineResponse.arrayBuffer()),
    contentType: engineResponse.headers.get("content-type") || "application/zip",
    extension: "zip",
  };
}

async function callLocalScoreSpeechEngine(config, payload) {
  const engineResponse = await fetch(`${config.engineUrl}/score-speech`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      lines: payload.lines.map((line) => ({
        text: line.text,
        start_ms: line.startMs,
        duration_ms: line.durationMs,
      })),
      song_duration_ms: payload.songDurationMs,
      voice_description: payload.voiceDescription || "Voix naturelle, expressive et claire.",
      language: payload.language,
      mode: payload.mode,
      speaker: payload.speaker || null,
      job_id: payload.jobId || null,
    }),
    dispatcher: engineDispatcher,
  });

  if (!engineResponse.ok) {
    const detail = await engineResponse.json().catch(() => ({}));
    const error = new Error(detail.detail || "Le moteur local a refusÃ© la voix sur partition.");
    error.status = engineResponse.status;
    error.publicMessage = detail.detail;
    throw error;
  }

  const wavBytes = Buffer.from(await engineResponse.arrayBuffer());
  const mp3Bytes = wavToMp3(wavBytes, { kbps: 192 });

  return {
    bytes: mp3Bytes,
    contentType: "audio/mpeg",
    extension: "mp3",
    truncatedLines: parseNumberListHeader(engineResponse.headers.get("x-score-truncated-lines")),
    truncatedCount: Number.parseInt(engineResponse.headers.get("x-score-truncated-count") || "0", 10) || 0,
  };
}

export function createApp({
  config = getConfig(),
  synthesize = (payload) => callLocalEngine(config, payload),
  synthesizeDialogue = (payload) => callLocalDialogueEngine(config, payload),
  synthesizeBatch = (payload) => callLocalBatchEngine(config, payload),
  synthesizeScoreSpeech = (payload) => callLocalScoreSpeechEngine(config, payload),
  getEngineStatus = async () => {
    const engineResponse = await fetch(`${config.engineUrl}/status`, {
      signal: AbortSignal.timeout(2500),
    });
    if (!engineResponse.ok) throw new Error("Statut moteur indisponible.");
    return engineResponse.json();
  },
  unloadEngine = async () => {
    const engineResponse = await fetch(`${config.engineUrl}/unload`, {
      method: "POST",
      signal: AbortSignal.timeout(30_000),
    });
    if (!engineResponse.ok) throw new Error("Impossible de libérer les modèles.");
    return engineResponse.json();
  },
} = {}) {
  const app = express();
  const scoreResults = new Map();

  function rememberScoreResult(jobId, audio, value) {
    if (!jobId) return;
    pruneScoreResults(scoreResults);
    scoreResults.set(jobId, {
      audio,
      lineCount: value.lines.length,
      songDurationMs: value.songDurationMs,
      truncatedLines: audio.truncatedLines || [],
      truncatedCount: Number.isInteger(audio.truncatedCount) ? audio.truncatedCount : audio.truncatedLines?.length || 0,
      createdAt: Date.now(),
    });
  }

  function rememberScoreError(jobId, error) {
    if (!jobId) return;
    pruneScoreResults(scoreResults);
    scoreResults.set(jobId, {
      error: error?.publicMessage || error?.message || "La génération partition a échoué.",
      createdAt: Date.now(),
    });
  }

  function startScoreSpeechJob(value) {
    synthesizeScoreSpeech(value)
      .then((audio) => rememberScoreResult(value.jobId, audio, value))
      .catch((error) => {
        rememberScoreError(value.jobId, error);
        console.error("Erreur de génération partition asynchrone:", error);
      });
  }

  app.disable("x-powered-by");
  app.use(express.json({ limit: "256kb" }));

  app.get("/api/health", async (_request, response) => {
    try {
      const engineResponse = await fetch(`${config.engineUrl}/health`, {
        signal: AbortSignal.timeout(1500),
      });
      const engine = engineResponse.ok ? await engineResponse.json() : null;
      response.json({
        ok: true,
        configured: Boolean(engine?.ready),
        model: engine?.model || config.model,
        mode: engine?.mode || config.defaultMode,
      });
    } catch {
      response.json({ ok: true, configured: false, model: config.model });
    }
  });

  app.get("/api/config", (_request, response) => {
    response.json({
      model: config.model,
      defaultLanguage: config.defaultLanguage,
      maxCharacters: config.maxCharacters,
      languages: config.languages,
      modes: config.modes,
      presets: config.presets,
      customSpeakers: config.customSpeakers,
    });
  });

  app.get("/api/status", async (_request, response) => {
    try {
      return response.json(await getEngineStatus());
    } catch {
      return response.status(503).json({
        ready: false,
        thermal_state: "unavailable",
        gpu: { available: false },
        progress: { stage: "offline", percent: 0, message: "Moteur vocal hors ligne" },
      });
    }
  });

  app.post("/api/unload", async (_request, response, next) => {
    try {
      response.set("Cache-Control", "no-store");
      return response.json(await unloadEngine());
    } catch (error) {
      return next(error);
    }
  });

  app.post("/api/speech", async (request, response, next) => {
    const { errors, value } = validateSpeechRequest(request.body, config);
    if (errors.length) {
      return response.status(400).json({ error: errors.join(" ") });
    }

    try {
      const audio = await synthesize(value);
      const safeTimestamp = new Date().toISOString().replaceAll(":", "-");
      response.set({
        "Content-Type": audio.contentType,
        "Content-Length": String(audio.bytes.length),
        "Content-Disposition": `inline; filename="voix-${safeTimestamp}.${audio.extension}"`,
        "Cache-Control": "no-store",
        "X-TTS-Engine": "qwen3-tts-local",
      });
      if (Number.isFinite(audio.audioDurationMs)) {
        response.set("X-TTS-Audio-Duration-Ms", String(audio.audioDurationMs));
      }
      if (Number.isFinite(audio.audibleDurationMs)) {
        response.set("X-TTS-Audible-Duration-Ms", String(audio.audibleDurationMs));
      }
      if (Number.isFinite(audio.audibleEndMs)) {
        response.set("X-TTS-Audible-End-Ms", String(audio.audibleEndMs));
      }
      return response.send(audio.bytes);
    } catch (error) {
      return next(error);
    }
  });

  app.post("/api/batch", async (request, response, next) => {
    const { errors, value } = validateBatchRequest(request.body, config);
    if (errors.length) {
      return response.status(400).json({ error: errors.join(" ") });
    }

    try {
      const archive = await synthesizeBatch(value);
      const safeTimestamp = new Date().toISOString().replaceAll(":", "-");
      response.set({
        "Content-Type": archive.contentType,
        "Content-Length": String(archive.bytes.length),
        "Content-Disposition": `inline; filename="voice-forge-lot-${safeTimestamp}.${archive.extension}"`,
        "Cache-Control": "no-store",
        "X-TTS-Engine": "qwen3-tts-local",
        "X-Batch-Files": String(value.files.length),
      });
      return response.send(archive.bytes);
    } catch (error) {
      return next(error);
    }
  });

  app.post("/api/score-speech", async (request, response, next) => {
    const { errors, value } = validateScoreSpeechRequest(request.body, config);
    if (errors.length) {
      return response.status(400).json({ error: errors.join(" ") });
    }

    try {
      const audio = await synthesizeScoreSpeech(value);
      const safeTimestamp = new Date().toISOString().replaceAll(":", "-");
      rememberScoreResult(value.jobId, audio, value);
      response.set({
        "Content-Type": audio.contentType,
        "Content-Length": String(audio.bytes.length),
        "Content-Disposition": `inline; filename="voice-forge-partition-${safeTimestamp}.${audio.extension}"`,
        "Cache-Control": "no-store",
        "X-TTS-Engine": "qwen3-tts-local",
        "X-Score-Lines": String(value.lines.length),
        "X-Score-Duration-Ms": String(value.songDurationMs || ""),
        "X-Score-Truncated-Count": String(audio.truncatedCount || 0),
        "X-Score-Truncated-Lines": (audio.truncatedLines || []).join(","),
      });
      return response.send(audio.bytes);
    } catch (error) {
      return next(error);
    }
  });

  app.post("/api/score-speech/start", (request, response) => {
    const { errors, value } = validateScoreSpeechRequest(request.body, config);
    if (errors.length) {
      return response.status(400).json({ error: errors.join(" ") });
    }
    if (!validJobId(value.jobId)) {
      return response.status(400).json({
        error: "Identifiant de génération partition invalide.",
      });
    }

    startScoreSpeechJob(value);
    return response.status(202).json({
      ok: true,
      jobId: value.jobId,
      lineCount: value.lines.length,
      songDurationMs: value.songDurationMs,
    });
  });

  function sendScoreResult(request, response, sendBody = true) {
    const jobId = request.params.jobId;
    if (!validJobId(jobId)) {
      return response.status(400).json({ error: "Identifiant de génération invalide." });
    }

    pruneScoreResults(scoreResults);
    const result = scoreResults.get(jobId);
    if (!result) {
      return response.status(404).json({
        error: "Le fichier de partition généré n'est plus disponible. Relancez la génération.",
      });
    }
    if (result.error) {
      return response.status(500).json({ error: result.error });
    }

    const safeTimestamp = new Date(result.createdAt).toISOString().replaceAll(":", "-");
    response.set({
      "Content-Type": result.audio.contentType,
      "Content-Length": String(result.audio.bytes.length),
      "Content-Disposition": `inline; filename="voice-forge-partition-${safeTimestamp}.${result.audio.extension}"`,
      "Cache-Control": "no-store",
      "X-TTS-Engine": "qwen3-tts-local",
      "X-Score-Lines": String(result.lineCount),
      "X-Score-Duration-Ms": String(result.songDurationMs || ""),
      "X-Score-Recovered": "true",
      "X-Score-Truncated-Count": String(result.truncatedCount || 0),
      "X-Score-Truncated-Lines": (result.truncatedLines || []).join(","),
    });
    if (!sendBody) return response.end();
    return response.send(result.audio.bytes);
  }

  app.head("/api/score-result/:jobId", (request, response) => {
    return sendScoreResult(request, response, false);
  });

  app.get("/api/score-result/:jobId", (request, response) => {
    return sendScoreResult(request, response, true);
  });

  app.post("/api/dialogue", async (request, response, next) => {
    const { errors, value } = validateDialogueRequest(request.body, config);
    if (errors.length) {
      return response.status(400).json({ error: errors.join(" ") });
    }

    try {
      const audio = await synthesizeDialogue(value);
      const safeTimestamp = new Date().toISOString().replaceAll(":", "-");
      response.set({
        "Content-Type": audio.contentType,
        "Content-Length": String(audio.bytes.length),
        "Content-Disposition": `inline; filename="dialogue-${safeTimestamp}.${audio.extension}"`,
        "Cache-Control": "no-store",
        "X-TTS-Engine": "qwen3-tts-local",
        "X-Dialogue-Lines": String(value.elements.length),
        "X-Dialogue-Files": String(value.splitPairs ? Math.ceil(value.elements.length / 2) : 1),
      });
      return response.send(audio.bytes);
    } catch (error) {
      return next(error);
    }
  });

  app.use(express.static(fileURLToPath(new URL("../public", import.meta.url)), {
    etag: false,
    maxAge: 0,
    setHeaders: (response) => {
      response.setHeader("Cache-Control", "no-store");
    },
  }));

  app.use((error, _request, response, _next) => {
    console.error("TTS error:", error?.message ?? error);

    if (error?.type === "entity.parse.failed") {
      return response.status(400).json({ error: "Le JSON envoyé est invalide." });
    }

    const status = Number.isInteger(error?.status) ? error.status : 503;
    const publicMessage = error?.publicMessage || (status === 503
      ? "Le moteur Qwen3-TTS local n'est pas prêt. Démarrez Docker et réessayez."
      : "La génération audio locale a échoué.");

    return response.status(status >= 400 && status < 600 ? status : 500).json({
      error: publicMessage,
    });
  });

  return app;
}
