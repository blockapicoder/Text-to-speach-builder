import assert from "node:assert/strict";
import { describe, it } from "node:test";

import request from "supertest";

import { parsePcm16Wav, wavToMp3 } from "../src/audio.js";
import { createApp } from "../src/app.js";
import { getConfig } from "../src/config.js";

const config = getConfig({ TTS_MAX_CHARACTERS: "20" });
const fakeSynthesize = async () => ({
  bytes: Buffer.from("fake-wav"),
  contentType: "audio/wav",
  extension: "wav",
  audioDurationMs: 1230,
  audibleDurationMs: 980,
  audibleEndMs: 1110,
});
const fakeDialogue = async () => ({
  bytes: Buffer.from("fake-dialogue-wav"),
  contentType: "audio/wav",
  extension: "wav",
});
const fakeBatch = async () => ({
  bytes: Buffer.from("fake-batch-zip"),
  contentType: "application/zip",
  extension: "zip",
});
const fakeScoreSpeech = async () => ({
  bytes: Buffer.from("fake-score-wav"),
  contentType: "audio/wav",
  extension: "wav",
});
const fakeTruncatedScoreSpeech = async () => ({
  bytes: Buffer.from("fake-score-wav"),
  contentType: "audio/wav",
  extension: "wav",
  truncatedLines: [1, 3],
  truncatedCount: 2,
});

function createTestWav({ sampleRate = 44100, durationMs = 240, frequency = 220 } = {}) {
  const samples = Math.round(sampleRate * durationMs / 1000);
  const buffer = Buffer.alloc(44 + samples * 2);
  buffer.write("RIFF", 0, "ascii");
  buffer.writeUInt32LE(36 + samples * 2, 4);
  buffer.write("WAVE", 8, "ascii");
  buffer.write("fmt ", 12, "ascii");
  buffer.writeUInt32LE(16, 16);
  buffer.writeUInt16LE(1, 20);
  buffer.writeUInt16LE(1, 22);
  buffer.writeUInt32LE(sampleRate, 24);
  buffer.writeUInt32LE(sampleRate * 2, 28);
  buffer.writeUInt16LE(2, 32);
  buffer.writeUInt16LE(16, 34);
  buffer.write("data", 36, "ascii");
  buffer.writeUInt32LE(samples * 2, 40);
  for (let index = 0; index < samples; index += 1) {
    const value = Math.round(Math.sin(index / sampleRate * Math.PI * 2 * frequency) * 0x4fff);
    buffer.writeInt16LE(value, 44 + index * 2);
  }
  return buffer;
}

describe("API TTS locale", () => {
  it("convertit un WAV PCM en MP3 pour l'export partition", () => {
    const wav = createTestWav();
    const parsed = parsePcm16Wav(wav);
    const mp3 = wavToMp3(wav);

    assert.equal(parsed.channels, 1);
    assert.equal(parsed.sampleRate, 44100);
    assert.ok(mp3.length > 100);
    assert.ok(mp3[0] === 0xff || mp3.subarray(0, 3).toString("ascii") === "ID3");
  });

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
    assert.equal(response.headers["x-tts-audio-duration-ms"], "1230");
    assert.equal(response.headers["x-tts-audible-duration-ms"], "980");
    assert.equal(response.headers["x-tts-audible-end-ms"], "1110");
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

  it("renvoie une archive pour un WAV par paire de répliques", async () => {
    let received;
    const captureDialogue = async (payload) => {
      received = payload;
      return {
        bytes: Buffer.from("fake-dialogue-zip"),
        contentType: "application/zip",
        extension: "zip",
      };
    };
    const response = await request(createApp({
      config,
      synthesize: fakeSynthesize,
      synthesizeDialogue: captureDialogue,
    }))
      .post("/api/dialogue")
      .send({
        elements: ["A1", "B1", "A2", "B2", "A3"],
        voiceADescription: "Un vieux magicien",
        voiceBDescription: "Une chèvre parlante",
        splitPairs: true,
      })
      .expect(200)
      .expect("Content-Type", /application\/zip/);

    assert.equal(received.splitPairs, true);
    assert.match(response.headers["content-disposition"], /\.zip/);
    assert.equal(response.headers["x-dialogue-files"], "3");
    assert.equal(Number(response.headers["content-length"]), Buffer.byteLength("fake-dialogue-zip"));
  });

  it("renvoie une archive avec un WAV par fichier importé", async () => {
    let received;
    const captureBatch = async (payload) => {
      received = payload;
      return fakeBatch();
    };
    const response = await request(createApp({
      config,
      synthesize: fakeSynthesize,
      synthesizeDialogue: fakeDialogue,
      synthesizeBatch: captureBatch,
    }))
      .post("/api/batch")
      .send({
        files: [
          { name: "intro.txt", text: "Bonjour" },
          { name: "scene.md", text: "La scène commence." },
        ],
        voiceDescription: "Une voix grave et calme.",
        language: "French",
      })
      .expect(200)
      .expect("Content-Type", /application\/zip/);

    assert.equal(received.files.length, 2);
    assert.equal(received.files[0].name, "intro.txt");
    assert.equal(response.headers["x-batch-files"], "2");
    assert.match(response.headers["content-disposition"], /\.zip/);
    assert.equal(Number(response.headers["content-length"]), Buffer.byteLength("fake-batch-zip"));
  });

  it("refuse un lot de fichiers mal formé", async () => {
    const response = await request(createApp({
      config,
      synthesize: fakeSynthesize,
      synthesizeDialogue: fakeDialogue,
      synthesizeBatch: fakeBatch,
    }))
      .post("/api/batch")
      .send({ files: [{ name: "vide.txt", text: "" }] })
      .expect(400);

    assert.match(response.body.error, /non vide/);
  });

  it("renvoie une voix WAV calée sur une partition", async () => {
    let received;
    const captureScoreSpeech = async (payload) => {
      received = payload;
      return fakeScoreSpeech();
    };
    const response = await request(createApp({
      config,
      synthesize: fakeSynthesize,
      synthesizeDialogue: fakeDialogue,
      synthesizeBatch: fakeBatch,
      synthesizeScoreSpeech: captureScoreSpeech,
    }))
      .post("/api/score-speech")
      .send({
        lines: [
          { text: "Dans la nuit", startMs: 0, durationMs: 1800 },
          { text: "je marche encore", startMs: 1850, durationMs: 2200 },
        ],
        songDurationMs: 5000,
        voiceDescription: "Slam gothique grave et froid.",
        language: "French",
      })
      .expect(200)
      .expect("Content-Type", /audio\/wav/);

    assert.equal(received.lines.length, 2);
    assert.equal(received.lines[1].startMs, 1850);
    assert.equal(received.lines[1].durationMs, 2200);
    assert.equal(received.songDurationMs, 5000);
    assert.equal(response.headers["x-score-lines"], "2");
    assert.equal(response.headers["x-score-duration-ms"], "5000");
    assert.equal(response.body.toString(), "fake-score-wav");
  });

  it("garde temporairement le WAV de partition pour récupération par job", async () => {
    const app = createApp({
      config,
      synthesize: fakeSynthesize,
      synthesizeDialogue: fakeDialogue,
      synthesizeBatch: fakeBatch,
      synthesizeScoreSpeech: fakeScoreSpeech,
    });

    await request(app)
      .post("/api/score-speech")
      .send({
        lines: [{ text: "Dans la nuit", startMs: 0, durationMs: 1800 }],
        songDurationMs: 5000,
        voiceDescription: "Slam gothique grave et froid.",
        language: "French",
        jobId: "score_recovery_test",
      })
      .expect(200);

    const recovered = await request(app)
      .get("/api/score-result/score_recovery_test")
      .expect(200)
      .expect("Content-Type", /audio\/wav/);

    assert.equal(recovered.headers["x-score-recovered"], "true");
    assert.equal(recovered.headers["x-score-lines"], "1");
    assert.equal(recovered.body.toString(), "fake-score-wav");
  });

  it("démarre une voix sur partition en arrière-plan pour éviter un long fetch navigateur", async () => {
    const app = createApp({
      config,
      synthesize: fakeSynthesize,
      synthesizeDialogue: fakeDialogue,
      synthesizeBatch: fakeBatch,
      synthesizeScoreSpeech: fakeScoreSpeech,
    });

    const started = await request(app)
      .post("/api/score-speech/start")
      .send({
        lines: [{ text: "Dans la nuit", startMs: 0, durationMs: 1800 }],
        songDurationMs: 5000,
        voiceDescription: "Slam gothique grave et froid.",
        language: "French",
        jobId: "score_async_test",
      })
      .expect(202);

    assert.equal(started.body.ok, true);
    assert.equal(started.body.jobId, "score_async_test");
    assert.equal(started.body.lineCount, 1);

    await new Promise((resolve) => setImmediate(resolve));

    await request(app)
      .head("/api/score-result/score_async_test")
      .expect(200)
      .expect("Content-Type", /audio\/wav/)
      .expect("Content-Length", String(Buffer.byteLength("fake-score-wav")));

    const recovered = await request(app)
      .get("/api/score-result/score_async_test")
      .expect(200)
      .expect("Content-Type", /audio\/wav/);

    assert.equal(recovered.headers["x-score-recovered"], "true");
    assert.equal(recovered.body.toString(), "fake-score-wav");
  });

  it("expose les lignes de partition tronquées dans les headers de résultat", async () => {
    const app = createApp({
      config,
      synthesize: fakeSynthesize,
      synthesizeDialogue: fakeDialogue,
      synthesizeBatch: fakeBatch,
      synthesizeScoreSpeech: fakeTruncatedScoreSpeech,
    });

    await request(app)
      .post("/api/score-speech")
      .send({
        lines: [
          { text: "Phrase trop longue", startMs: 0, durationMs: 400 },
          { text: "Phrase correcte", startMs: 800, durationMs: 2000 },
          { text: "Encore trop longue", startMs: 3000, durationMs: 400 },
        ],
        songDurationMs: 6000,
        mode: "custom",
        speaker: "Ryan",
        jobId: "score_truncated_test",
      })
      .expect(200)
      .expect("X-Score-Truncated-Count", "2")
      .expect("X-Score-Truncated-Lines", "1,3");

    await request(app)
      .head("/api/score-result/score_truncated_test")
      .expect(200)
      .expect("X-Score-Truncated-Count", "2")
      .expect("X-Score-Truncated-Lines", "1,3");
  });

  it("refuse une voix sur partition sans parole", async () => {
    const response = await request(createApp({
      config,
      synthesize: fakeSynthesize,
      synthesizeDialogue: fakeDialogue,
      synthesizeBatch: fakeBatch,
      synthesizeScoreSpeech: fakeScoreSpeech,
    }))
      .post("/api/score-speech")
      .send({ lines: [{ text: "", startMs: 0 }] })
      .expect(400);

    assert.match(response.body.error, /texte/);
  });

  it("décharge les modèles à la demande", async () => {
    let called = 0;
    const unloadEngine = async () => {
      called += 1;
      return { ok: true, freed_mb: 4096, unloaded_model: "Qwen/Test" };
    };
    const response = await request(createApp({
      config,
      synthesize: fakeSynthesize,
      synthesizeDialogue: fakeDialogue,
      unloadEngine,
    }))
      .post("/api/unload")
      .expect(200);

    assert.equal(called, 1);
    assert.equal(response.body.freed_mb, 4096);
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
    assert.equal(received.voiceDescription, "");
  });

  it("accepte le mode VoiceDesign 1.7B sans timbre CustomVoice", async () => {
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
        mode: "design",
        voiceDescription: "Un vieux magicien grave et lent.",
      })
      .expect(200);

    assert.equal(received.mode, "design");
    assert.equal(received.voiceDescription, "Un vieux magicien grave et lent.");
    assert.equal(received.speaker, "");
  });

  it("valide les dialogues CustomVoice avec deux timbres officiels", async () => {
    let received;
    const captureDialogue = async (payload) => {
      received = payload;
      return fakeDialogue();
    };
    await request(createApp({
      config,
      synthesize: fakeSynthesize,
      synthesizeDialogue: captureDialogue,
    }))
      .post("/api/dialogue")
      .send({
        elements: ["Bonjour", "Salut"],
        mode: "custom",
        speakerA: "Ryan",
        speakerB: "Serena",
      })
      .expect(200);

    assert.equal(received.mode, "custom");
    assert.equal(received.speakerA, "Ryan");
    assert.equal(received.speakerB, "Serena");
    assert.equal(received.voiceADescription, "");
    assert.equal(received.voiceBDescription, "");
  });

  it("valide les voix sur partition CustomVoice avec un timbre officiel", async () => {
    let received;
    const captureScoreSpeech = async (payload) => {
      received = payload;
      return fakeScoreSpeech();
    };
    await request(createApp({
      config,
      synthesize: fakeSynthesize,
      synthesizeDialogue: fakeDialogue,
      synthesizeBatch: fakeBatch,
      synthesizeScoreSpeech: captureScoreSpeech,
    }))
      .post("/api/score-speech")
      .send({
        lines: [{ text: "Dans la nuit", startMs: 0, durationMs: 1000 }],
        mode: "custom",
        speaker: "Ryan",
      })
      .expect(200);

    assert.equal(received.mode, "custom");
    assert.equal(received.speaker, "Ryan");
    assert.equal(received.voiceDescription, "");
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
