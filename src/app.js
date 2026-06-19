import express from "express";
import { fileURLToPath } from "node:url";

import { getConfig } from "./config.js";
import { validateDialogueRequest, validateSpeechRequest } from "./validation.js";

async function callLocalEngine(config, payload) {
  const engineResponse = await fetch(`${config.engineUrl}/speech`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      text: payload.text,
      voice_description: payload.voiceDescription || "Voix naturelle, expressive et claire.",
      language: payload.language,
    }),
  });

  if (!engineResponse.ok) {
    const detail = await engineResponse.json().catch(() => ({}));
    const error = new Error(detail.detail || "Le moteur local a refusé la génération.");
    error.status = engineResponse.status;
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
    }),
  });

  if (!engineResponse.ok) {
    const detail = await engineResponse.json().catch(() => ({}));
    const error = new Error(detail.detail || "Le moteur local a refusé le dialogue.");
    error.status = engineResponse.status;
    throw error;
  }

  return {
    bytes: Buffer.from(await engineResponse.arrayBuffer()),
    contentType: engineResponse.headers.get("content-type") || "audio/wav",
    extension: "wav",
  };
}

export function createApp({
  config = getConfig(),
  synthesize = (payload) => callLocalEngine(config, payload),
  synthesizeDialogue = (payload) => callLocalDialogueEngine(config, payload),
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
      response.json({ ok: true, configured: Boolean(engine?.ready), model: config.model });
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
      presets: config.presets,
    });
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
    const publicMessage = status === 503
      ? "Le moteur Qwen3-TTS local n'est pas prêt. Démarrez Docker et réessayez."
      : "La génération audio locale a échoué.";

    return response.status(status >= 400 && status < 600 ? status : 500).json({
      error: publicMessage,
    });
  });

  return app;
}
