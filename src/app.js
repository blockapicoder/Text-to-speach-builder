import express from "express";
import { fileURLToPath } from "node:url";
import { Agent } from "undici";

import { getConfig } from "./config.js";
import { validateBatchRequest, validateDialogueRequest, validateSpeechRequest } from "./validation.js";

const engineDispatcher = new Agent({
  connectTimeout: 10_000,
  headersTimeout: 0,
  bodyTimeout: 0,
});

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

export function createApp({
  config = getConfig(),
  synthesize = (payload) => callLocalEngine(config, payload),
  synthesizeDialogue = (payload) => callLocalDialogueEngine(config, payload),
  synthesizeBatch = (payload) => callLocalBatchEngine(config, payload),
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

  app.use(express.static(fileURLToPath(new URL("../public", import.meta.url))));

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
