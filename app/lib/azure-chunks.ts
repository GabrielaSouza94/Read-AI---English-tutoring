/**
 * Long reads for Azure (TRD §6.2, BRD risk R8): split the recording at sentence boundaries found
 * from Deepgram's word timings, score each chunk against its own sentences, then average the
 * scores weighted by reference word count.
 */
import { alignWords, referenceWords, spokenIndexByReference } from "./align";
import type { AzureResult } from "./azure";
import type { SpokenWord } from "./deepgram";

/** Below Azure's 30-second limit, with room for the padding around each chunk. */
export const DEFAULT_MAX_CHUNK_SEC = 25;
/** Silence kept before the first and after the last word of a chunk. */
const PAD_SEC = 0.75;

export type Chunk = {
  startSec: number;
  endSec: number;
  referenceText: string;
  wordCount: number;
};

type Unit = { words: string[]; start: number; end: number };

/** Start and end time of each reference word. Omitted words take the time of the gap they sit in. */
function referenceTimes(reference: string[], spoken: SpokenWord[], durationSec: number) {
  const ops = alignWords(
    reference,
    spoken.map((word) => word.word),
  );
  const matched = spokenIndexByReference(ops, reference.length);
  const times = matched.map((index) =>
    index === null ? null : { start: spoken[index].start, end: spoken[index].end },
  );
  let lastEnd = 0;
  return times.map((time, i) => {
    if (time) {
      lastEnd = time.end;
      return time;
    }
    const after = times.slice(i + 1).find((t) => t !== null)?.start ?? durationSec;
    const at = Math.min(lastEnd, after);
    return { start: at, end: at };
  });
}

/** Sentences as units; a sentence longer than `maxSec` is split at its word boundaries. */
function units(sentences: string[], spoken: SpokenWord[], durationSec: number, maxSec: number) {
  const words = sentences.map(referenceWords);
  const times = referenceTimes(words.flat(), spoken, durationSec);
  const result: Unit[] = [];
  let position = 0;
  for (const sentence of words) {
    let piece: Unit | null = null;
    for (const word of sentence) {
      const time = times[position++];
      if (piece && time.end - piece.start > maxSec - 2 * PAD_SEC) {
        result.push(piece);
        piece = null;
      }
      if (!piece) piece = { words: [], start: time.start, end: time.end };
      piece.words.push(word);
      piece.end = Math.max(piece.end, time.end);
    }
    if (piece) result.push(piece);
  }
  return result;
}

export function planChunks(
  sentences: string[],
  spoken: SpokenWord[],
  durationSec: number,
  maxSec = DEFAULT_MAX_CHUNK_SEC,
): Chunk[] {
  const all = units(sentences, spoken, durationSec, maxSec);
  if (all.length === 0) return [];

  // Cut points halfway through the pause between units.
  const cuts = all.slice(1).map((unit, i) => (all[i].end + unit.start) / 2);
  const bounds = (first: number, last: number) => ({
    startSec: Math.max(first === 0 ? 0 : cuts[first - 1], all[first].start - PAD_SEC, 0),
    endSec: Math.min(
      last === all.length - 1 ? durationSec : cuts[last],
      all[last].end + PAD_SEC,
      durationSec,
    ),
  });

  const chunks: Chunk[] = [];
  let first = 0;
  for (let last = 0; last < all.length; last++) {
    const next = last + 1;
    const fitsNext =
      next < all.length && bounds(first, next).endSec - bounds(first, next).startSec <= maxSec;
    if (!fitsNext) {
      const words = all.slice(first, last + 1).flatMap((unit) => unit.words);
      chunks.push({
        ...bounds(first, last),
        referenceText: words.join(" "),
        wordCount: words.length,
      });
      first = next;
    }
  }
  return chunks;
}

/** Word-count-weighted average of chunk scores, with word offsets moved back to the whole read. */
export function combineChunkResults(results: { chunk: Chunk; result: AzureResult }[]): AzureResult {
  const total = results.reduce((sum, { chunk }) => sum + chunk.wordCount, 0) || 1;
  const weighted = (pick: (result: AzureResult) => number) =>
    results.reduce((sum, { chunk, result }) => sum + pick(result) * chunk.wordCount, 0) / total;
  const hasProsody = results.length > 0 && results.every(({ result }) => result.prosody !== null);
  return {
    accuracy: weighted((r) => r.accuracy),
    fluency: weighted((r) => r.fluency),
    completeness: weighted((r) => r.completeness),
    pronunciation: weighted((r) => r.pronunciation),
    prosody: hasProsody ? weighted((r) => r.prosody ?? 0) : null,
    words: results.flatMap(({ chunk, result }) =>
      result.words.map((word) => ({ ...word, offsetSec: word.offsetSec + chunk.startSec })),
    ),
    recognitionStatus: results.every(({ result }) => result.recognitionStatus === "Success")
      ? "Success"
      : "Partial",
  };
}
