import { readFileSync } from "node:fs";
import { createRequire } from "node:module";
import vm from "node:vm";

const require = createRequire(import.meta.url);
let lameBundle = null;

function getLameBundle() {
  if (lameBundle) return lameBundle;
  const source = readFileSync(require.resolve("lamejs/lame.all.js"), "utf8");
  const context = {};
  vm.createContext(context);
  vm.runInContext(`${source}\nlamejs;`, context);
  lameBundle = context.lamejs;
  if (!lameBundle?.Mp3Encoder) {
    throw new Error("Encodeur MP3 lamejs indisponible.");
  }
  return lameBundle;
}

function readChunkId(buffer, offset) {
  return buffer.toString("ascii", offset, offset + 4);
}

export function parsePcm16Wav(wavBytes) {
  const buffer = Buffer.isBuffer(wavBytes) ? wavBytes : Buffer.from(wavBytes);
  if (buffer.length < 44 || readChunkId(buffer, 0) !== "RIFF" || readChunkId(buffer, 8) !== "WAVE") {
    throw new Error("Le fichier audio source n'est pas un WAV RIFF valide.");
  }

  let offset = 12;
  let format = null;
  let data = null;
  while (offset + 8 <= buffer.length) {
    const id = readChunkId(buffer, offset);
    const size = buffer.readUInt32LE(offset + 4);
    const start = offset + 8;
    if (start + size > buffer.length) break;

    if (id === "fmt ") {
      format = {
        audioFormat: buffer.readUInt16LE(start),
        channels: buffer.readUInt16LE(start + 2),
        sampleRate: buffer.readUInt32LE(start + 4),
        bitsPerSample: buffer.readUInt16LE(start + 14),
      };
    } else if (id === "data") {
      data = { start, size };
    }

    offset = start + size + (size % 2);
  }

  if (!format || !data) {
    throw new Error("Le WAV source ne contient pas les blocs audio attendus.");
  }
  if (format.audioFormat !== 1 || format.bitsPerSample !== 16) {
    throw new Error("Seuls les WAV PCM 16 bits peuvent être convertis en MP3.");
  }
  if (format.channels < 1 || format.channels > 2) {
    throw new Error("La conversion MP3 accepte uniquement les WAV mono ou stéréo.");
  }

  const frameCount = Math.floor(data.size / (format.channels * 2));
  const left = new Int16Array(frameCount);
  const right = format.channels === 2 ? new Int16Array(frameCount) : null;
  for (let frame = 0; frame < frameCount; frame += 1) {
    const base = data.start + frame * format.channels * 2;
    left[frame] = buffer.readInt16LE(base);
    if (right) right[frame] = buffer.readInt16LE(base + 2);
  }

  return {
    channels: format.channels,
    sampleRate: format.sampleRate,
    left,
    right,
  };
}

export function wavToMp3(wavBytes, { kbps = 192 } = {}) {
  const wav = parsePcm16Wav(wavBytes);
  const lamejs = getLameBundle();
  const encoder = new lamejs.Mp3Encoder(wav.channels, wav.sampleRate, kbps);
  const chunks = [];
  const blockSize = 1152;

  for (let offset = 0; offset < wav.left.length; offset += blockSize) {
    const left = wav.left.subarray(offset, offset + blockSize);
    const encoded = wav.channels === 2
      ? encoder.encodeBuffer(left, wav.right.subarray(offset, offset + blockSize))
      : encoder.encodeBuffer(left);
    if (encoded.length) chunks.push(Buffer.from(encoded));
  }

  const flushed = encoder.flush();
  if (flushed.length) chunks.push(Buffer.from(flushed));
  return Buffer.concat(chunks);
}
