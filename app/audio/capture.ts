/**
 * Microphone capture in the browser (T2.2): getUserMedia with echo cancellation and noise
 * suppression, an AudioWorklet that copies the raw samples, and a downsampler to 16 kHz mono.
 * The worklet is loaded from a Blob, so there is no extra file to serve and no host name involved.
 * Audio stays in memory; nothing is stored.
 */
import { createDownsampler } from "~/lib/audio-level";

const WORKLET_SOURCE = `
class PcmTap extends AudioWorkletProcessor {
  process(inputs) {
    const channel = inputs[0] && inputs[0][0];
    if (channel) this.port.postMessage(channel.slice(0));
    return true;
  }
}
registerProcessor("pcm-tap", PcmTap);
`;

export type Capture = { stop(): Promise<void> };

export function captureSupported(): boolean {
  return (
    typeof navigator !== "undefined" &&
    typeof navigator.mediaDevices?.getUserMedia === "function" &&
    typeof AudioWorkletNode !== "undefined"
  );
}

/**
 * Asks for the microphone and calls `onSamples` with 16 kHz mono chunks until `stop()`.
 * Rejects with the browser's DOMException (NotAllowedError, NotFoundError, ...) on failure.
 */
export async function startCapture(onSamples: (samples: Float32Array) => void): Promise<Capture> {
  if (!captureSupported()) {
    throw new DOMException("Audio capture is not supported", "NotSupportedError");
  }
  const stream = await navigator.mediaDevices.getUserMedia({
    audio: {
      channelCount: 1,
      echoCancellation: true,
      noiseSuppression: true,
      autoGainControl: true,
    },
  });
  const context = new AudioContext();
  const stopStream = () => stream.getTracks().forEach((track) => track.stop());
  try {
    const url = URL.createObjectURL(new Blob([WORKLET_SOURCE], { type: "text/javascript" }));
    try {
      await context.audioWorklet.addModule(url);
    } finally {
      URL.revokeObjectURL(url);
    }
    const source = context.createMediaStreamSource(stream);
    const tap = new AudioWorkletNode(context, "pcm-tap");
    // Connected to a silent output so every browser keeps pulling audio through the worklet.
    const mute = context.createGain();
    mute.gain.value = 0;
    const downsampler = createDownsampler(context.sampleRate);
    tap.port.onmessage = (event: MessageEvent<Float32Array>) => {
      const samples = downsampler.process(event.data);
      if (samples.length > 0) onSamples(samples);
    };
    source.connect(tap).connect(mute).connect(context.destination);
    if (context.state === "suspended") await context.resume();

    return {
      async stop() {
        tap.port.onmessage = null;
        source.disconnect();
        tap.disconnect();
        stopStream();
        await context.close();
      },
    };
  } catch (error) {
    stopStream();
    await context.close().catch(() => {});
    throw error;
  }
}
