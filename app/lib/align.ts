/**
 * Word alignment between a reference text and what a scorer heard. A minimum-edit-distance
 * alignment (match 0, substitution / omission / insertion 1) gives, for each reference word, the
 * spoken word that matched it. T0.5 uses it to find sentence boundaries in time; T3.3 reuses it
 * for word errors.
 */

/** Lower case, letters, digits and apostrophes only. "Don't," → "don't". */
export function normaliseWord(word: string): string {
  return word
    .toLowerCase()
    .replace(/[’‘]/g, "'")
    .replace(/[^a-z0-9']/g, "")
    .replace(/^'+|'+$/g, "");
}

/** The words of `text`, as written (with punctuation), skipping tokens with no letters or digits. */
export function referenceWords(text: string): string[] {
  return text.split(/\s+/).filter((token) => normaliseWord(token) !== "");
}

export type AlignmentOp =
  | { op: "match"; ref: number; spoken: number }
  | { op: "substitution"; ref: number; spoken: number }
  | { op: "omission"; ref: number }
  | { op: "insertion"; spoken: number };

export function alignWords(reference: string[], spoken: string[]): AlignmentOp[] {
  const ref = reference.map(normaliseWord);
  const heard = spoken.map(normaliseWord);
  const rows = ref.length + 1;
  const cols = heard.length + 1;
  const cost = new Uint32Array(rows * cols);
  for (let i = 0; i < rows; i++) cost[i * cols] = i;
  for (let j = 0; j < cols; j++) cost[j] = j;
  for (let i = 1; i < rows; i++) {
    for (let j = 1; j < cols; j++) {
      const same = ref[i - 1] === heard[j - 1] ? 0 : 1;
      cost[i * cols + j] = Math.min(
        cost[(i - 1) * cols + (j - 1)] + same,
        cost[(i - 1) * cols + j] + 1,
        cost[i * cols + (j - 1)] + 1,
      );
    }
  }

  const ops: AlignmentOp[] = [];
  let i = ref.length;
  let j = heard.length;
  while (i > 0 || j > 0) {
    const here = cost[i * cols + j];
    if (i > 0 && j > 0) {
      const same = ref[i - 1] === heard[j - 1];
      if (here === cost[(i - 1) * cols + (j - 1)] + (same ? 0 : 1)) {
        ops.push({ op: same ? "match" : "substitution", ref: i - 1, spoken: j - 1 });
        i--;
        j--;
        continue;
      }
    }
    if (i > 0 && here === cost[(i - 1) * cols + j] + 1) {
      ops.push({ op: "omission", ref: i - 1 });
      i--;
    } else {
      ops.push({ op: "insertion", spoken: j - 1 });
      j--;
    }
  }
  return ops.reverse();
}

/** For each reference word, the index of the spoken word aligned to it, or null if omitted. */
export function spokenIndexByReference(
  ops: AlignmentOp[],
  referenceCount: number,
): (number | null)[] {
  const result: (number | null)[] = Array.from({ length: referenceCount }, () => null);
  for (const op of ops) {
    if (op.op === "match" || op.op === "substitution") result[op.ref] = op.spoken;
  }
  return result;
}
