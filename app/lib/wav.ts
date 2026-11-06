/**
 * Minimal WAV (RIFF, PCM) encoder, reader and slicer. Recordings are 16 kHz, 16-bit, mono PCM (TRD §3),
 * the format both Deepgram and Azure accept. The browser encodes recordings with it (T2.2), and the
 * server cuts long reads into chunks for Azure (T0.5).
 */

export type WavInfo = {
  sampleRate: number;
  channels: number;
  bitsPerSample: number;
  dataOffset: number;
  dataLength: number;
  durationSec: number;
};

export class WavError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "WavError";
  }
}

const ascii = (view: DataView, offset: number) =>
  String.fromCharCode(...[0, 1, 2, 3].map((i) => view.getUint8(offset + i)));

export function parseWav(bytes: Uint8Array): WavInfo {
  if (bytes.length < 12) throw new WavError("Audio is too short to be a WAV file");
  const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
  if (ascii(view, 0) !== "RIFF" || ascii(view, 8) !== "WAVE") {
    throw new WavError("Audio is not a WAV file");
  }

  let format: { audioFormat: number; channels: number; sampleRate: number; bits: number } | null =
    null;
  let offset = 12;
  while (offset + 8 <= bytes.length) {
    const id = ascii(view, offset);
    const size = view.getUint32(offset + 4, true);
    const body = offset + 8;
    if (id === "fmt ") {
      format = {
        audioFormat: view.getUint16(body, true),
        channels: view.getUint16(body + 2, true),
        sampleRate: view.getUint32(body + 4, true),
        bits: view.getUint16(body + 14, true),
      };
    } else if (id === "data") {
      if (!format) throw new WavError("WAV data chunk comes before its format chunk");
      if (format.audioFormat !== 1) throw new WavError("WAV audio must be PCM");
      // Streaming writers may leave the size at 0 or 0xFFFFFFFF: use the rest of the file.
      const dataLength = size === 0 || body + size > bytes.length ? bytes.length - body : size;
      const bytesPerSecond = format.sampleRate * format.channels * (format.bits / 8);
      return {
        sampleRate: format.sampleRate,
        channels: format.channels,
        bitsPerSample: format.bits,
        dataOffset: body,
        dataLength,
        durationSec: dataLength / bytesPerSecond,
      };
    }
    offset = body + size + (size % 2); // chunks are padded to an even length
  }
  throw new WavError("WAV file has no audio data");
}

/** A 44-byte PCM WAV header for `dataLength` bytes of audio. */
export function wavHeader(
  info: Omit<WavInfo, "dataOffset" | "durationSec">,
): Uint8Array<ArrayBuffer> {
  const header = new Uint8Array(44);
  const view = new DataView(header.buffer);
  const blockAlign = info.channels * (info.bitsPerSample / 8);
  const write = (offset: number, text: string) =>
    [...text].forEach((char, i) => view.setUint8(offset + i, char.charCodeAt(0)));
  write(0, "RIFF");
  view.setUint32(4, 36 + info.dataLength, true);
  write(8, "WAVE");
  write(12, "fmt ");
  view.setUint32(16, 16, true);
  view.setUint16(20, 1, true); // PCM
  view.setUint16(22, info.channels, true);
  view.setUint32(24, info.sampleRate, true);
  view.setUint32(28, info.sampleRate * blockAlign, true);
  view.setUint16(32, blockAlign, true);
  view.setUint16(34, info.bitsPerSample, true);
  write(36, "data");
  view.setUint32(40, info.dataLength, true);
  return header;
}

/** A new WAV file holding the audio from `startSec` to `endSec`, cut on whole samples. */
export function sliceWav(
  bytes: Uint8Array,
  startSec: number,
  endSec: number,
  info = parseWav(bytes),
): Uint8Array<ArrayBuffer> {
  const blockAlign = info.channels * (info.bitsPerSample / 8);
  const toByte = (sec: number) => {
    const sample = Math.round(Math.min(Math.max(sec, 0), info.durationSec) * info.sampleRate);
    return Math.min(sample * blockAlign, info.dataLength - (info.dataLength % blockAlign));
  };
  const start = toByte(startSec);
  const end = Math.max(start, toByte(endSec));
  const header = wavHeader({ ...info, dataLength: end - start });
  const out = new Uint8Array(header.length + end - start);
  out.set(header);
  out.set(bytes.subarray(info.dataOffset + start, info.dataOffset + end), header.length);
  return out;
}

/** A 16-bit mono PCM WAV from float samples (-1..1, clipped), given as one or more chunks. */
export function encodeWav(chunks: Float32Array[], sampleRate: number): Uint8Array<ArrayBuffer> {
  const samples = chunks.reduce((total, chunk) => total + chunk.length, 0);
  const header = wavHeader({ sampleRate, channels: 1, bitsPerSample: 16, dataLength: samples * 2 });
  const out = new Uint8Array(header.length + samples * 2);
  out.set(header);
  const view = new DataView(out.buffer);
  let offset = header.length;
  for (const chunk of chunks) {
    for (const sample of chunk) {
      const clipped = Math.max(-1, Math.min(1, sample));
      view.setInt16(offset, clipped < 0 ? clipped * 0x8000 : clipped * 0x7fff, true);
      offset += 2;
    }
  }
  return out;
}
