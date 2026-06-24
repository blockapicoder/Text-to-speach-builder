import assert from "node:assert/strict";
import { describe, it } from "node:test";

import request from "supertest";

import { createApp } from "../src/app.js";
import { getConfig } from "../src/config.js";

const config = getConfig({ TTS_MAX_CHARACTERS: "20" });
const fakeSynthesize = async () => ({
  bytes: Buffer.from("fake-wav"),
  contentType: "audio/wav",
  extension: "wav",
});
const fakeDialogue = async () => ({
  bytes: Buffer.from("fake-dialogue-wav"),
  contentType: "audio/wav",
  extension: "wav",
});

describe("API TTS locale", () => {
  it("expose la configuration open source", async () => {
    const response = await request(createApp({ config, synthesize: fakeSynthesize, synthesizeDialogue: fakeDialogue }))
      .get("/api/config")
      .expect(200);

    assert.match(response.body.model, /Qwen3-TTS/);
    assert.equal(response.body.defaultLanguage, "French");
    assert.ok(response.body.presets.length >= 15);
    assert.ok(response.body.presets.some((preset) => preset.id === "wizard"));
    assert.ok(response.body.presets.some((preset) => preset.id === "goat"));
    assert.ok(response.body.presets.some((preset) => preset.id === "death-metal"));
    assert.ok(response.body.presets.some((preset) => preset.id === "black-metal"));
    assert.equal(response.body.customSpeakers.length, 9);
    assert.ok(response.body.modes.some((mode) => mode.id === "custom"));
  });

  it("refuse un texte vide", async () => {
    const response = await request(createApp({ config, synthesize: fakeSynthesize }))
      .post("/api/speech")
      .send({ text: "" })
      .expect(400);

    assert.match(response.body.error, /obligatoire/);
  });

  it("refuse un texte trop long", async () => {
    await request(createApp({ config, synthesize: fakeSynthesize }))
      .post("/api/speech")
      .send({ text: "x".repeat(21) })
      .expect(400);
  });

  it("renvoie un WAV directement exploitable par le navigateur", async () => {
    const response = await request(createApp({ config, synthesize: fakeSynthesize }))
      .post("/api/speech")
      .send({
        text: "Bonjour le monde",
        language: "French",
        voiceDescription: "Une voix de démon grave.",
      })
      .expect(200)
      .expect("Content-Type", /audio\/wav/);

    assert.equal(response.headers["x-tts-engine"], "qwen3-tts-local");
    assert.equal(response.body.toString(), "fake-wav");
  });

  it("traduit une panne moteur en erreur lisible", async () => {
    const unavailable = async () => {
      const error = new Error("offline");
      error.status = 503;
      throw error;
    };
    const response = await request(createApp({ config, synthesize: unavailable }))
      .post("/api/speech")
      .send({ text: "Bonjour", voiceDescription: "Voix naturelle" })
      .expect(503);

    assert.match(response.body.error, /Qwen3-TTS local/);
  });

  it("alterne et renvoie un dialogue WAV complet", async () => {
    let received;
    const captureDialogue = async (payload) => {
      received = payload;
      return fakeDialogue();
    };
    const response = await request(createApp({
      config,
      synthesize: fakeSynthesize,
      synthesizeDialogue: captureDialogue,
    }))
      .post("/api/dialogue")
      .send({
        elements: ["Bonjour", "Salut", "Comment vas-tu ?"],
        voiceADescription: "Un vieux magicien",
        voiceBDescription: "Une chèvre parlante",
        language: "French",
        pauseMs: 400,
      })
      .expect(200)
      .expect("Content-Type", /audio\/wav/);

    assert.deepEqual(received.elements, ["Bonjour", "Salut", "Comment vas-tu ?"]);
    assert.equal(received.pauseMs, 400);
    assert.equal(response.headers["x-dialogue-lines"], "3");
    assert.equal(response.body.toString(), "fake-dialogue-wav");
  });

  it("refuse un fichier de dialogue mal formé", async () => {
    const response = await request(createApp({
      config,
      synthesize: fakeSynthesize,
      synthesizeDialogue: fakeDialogue,
    }))
      .post("/api/dialogue")
      .send({ elements: "pas un tableau" })
      .expect(400);

    assert.match(response.body.error, /tableau/);
  });

  it("accepte le mode CustomVoice 0.6B et un timbre officiel", async () => {
    let received;
    const capture = async (payload) => {
      received = payload;
      return fakeSynthesize();
    };
    await request(createApp({ config, synthesize: capture, synthesizeDialogue: fakeDialogue }))
      .post("/api/speech")
      .send({
        text: "Bonjour",
        language: "French",
        mode: "custom",
        speaker: "Ryan",
      })
      .expect(200);

    assert.equal(received.mode, "custom");
    assert.equal(received.speaker, "Ryan");
  });

  it("refuse un timbre CustomVoice inconnu", async () => {
    const response = await request(createApp({ config, synthesize: fakeSynthesize, synthesizeDialogue: fakeDialogue }))
      .post("/api/speech")
      .send({ text: "Bonjour", mode: "custom", speaker: "Inconnu" })
      .expect(400);

    assert.match(response.body.error, /inconnu/);
  });

  it("expose la progression et la température du GPU", async () => {
    const getEngineStatus = async () => ({
      ready: true,
      thermal_state: "normal",
      gpu: { available: true, temperature: 62, memory_used_mb: 2048 },
      progress: { job_id: "speech_test", stage: "generating", percent: 45 },
    });
    const response = await request(createApp({ config, getEngineStatus }))
      .get("/api/status")
      .expect(200);

    assert.equal(response.body.gpu.temperature, 62);
    assert.equal(response.body.progress.percent, 45);
  });

  it("transmet un identifiant de progression valide", async () => {
    let received;
    const capture = async (payload) => {
      received = payload;
      return fakeSynthesize();
    };
    await request(createApp({ config, synthesize: capture }))
      .post("/api/speech")
      .send({
        text: "Bonjour",
        voiceDescription: "Voix naturelle",
        jobId: "speech_123abc",
      })
      .expect(200);

    assert.equal(received.jobId, "speech_123abc");
  });

  it("transmet exactement la nouvelle direction VoiceDesign", async () => {
    let received;
    const capture = async (payload) => {
      received = payload;
      return fakeSynthesize();
    };
    const direction = "Une jeune alchimiste, voix rauque, rapide et enthousiaste.";
    await request(createApp({ config, synthesize: capture }))
      .post("/api/speech")
      .send({ text: "Potion prête !", voiceDescription: direction, mode: "design" })
      .expect(200);

    assert.equal(received.voiceDescription, direction);
  });
});
