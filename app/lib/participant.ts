/**
 * Participant identity (BR-04, BR-RULE-02, BR-RULE-03, TR-04): name rules, the public display name
 * ("Ana Silva" → "Ana S.") and the 4-character code. Only the display name is ever stored.
 * Runtime-neutral (Web Crypto exists in Node and Workers).
 */
import { isBlockedWord } from "./blocked-words";

export const NAME_MIN = 2;
export const NAME_MAX = 40;

// A word starts with a letter, then letters, combining marks, hyphens or apostrophes.
const WORD = /^\p{L}[\p{L}\p{M}'’-]*$/u;
const ALLOWED = /^[\p{L}\p{M}'’ -]*$/u;

export type NameResult = { ok: true; name: string } | { ok: false; message: string };

/** Trims, collapses spaces and checks the name rules. The message is shown next to the field. */
export function validateName(raw: string): NameResult {
  const name = raw.trim().replace(/\s+/g, " ");
  if (name === "") return { ok: false, message: "Enter a name or nickname." };
  if (name.length < NAME_MIN) {
    return { ok: false, message: `Use at least ${NAME_MIN} characters.` };
  }
  if (name.length > NAME_MAX) {
    return { ok: false, message: `Use at most ${NAME_MAX} characters.` };
  }
  if (!ALLOWED.test(name)) {
    return { ok: false, message: "Use only letters, spaces, hyphens and apostrophes." };
  }
  const words = name.split(" ");
  if (!words.every((word) => WORD.test(word))) {
    return { ok: false, message: "Each word must start with a letter." };
  }
  if (words.some(isBlockedWord)) return { ok: false, message: "Please choose a different name." };
  return { ok: true, name };
}

const capitalise = (word: string) => word.charAt(0).toLocaleUpperCase("en") + word.slice(1);

/** First word + initial of the last word: "José da Costa" → "José C.". Expects a valid name. */
export function displayName(name: string): string {
  const words = name.trim().split(/\s+/);
  const first = capitalise(words[0]);
  if (words.length === 1) return first;
  const last = words[words.length - 1];
  return `${first} ${last.charAt(0).toLocaleUpperCase("en")}.`;
}

/** 31 characters: digits and capitals without the look-alikes 0, O, 1, I and L. */
export const CODE_ALPHABET = "23456789ABCDEFGHJKMNPQRSTUVWXYZ";
export const CODE_LENGTH = 4;

// Bytes at or above this are discarded so every character is equally likely (248 = 31 × 8).
const UNBIASED_LIMIT = 256 - (256 % CODE_ALPHABET.length);

export function randomCode(): string {
  let code = "";
  while (code.length < CODE_LENGTH) {
    for (const byte of crypto.getRandomValues(new Uint8Array(8))) {
      if (byte < UNBIASED_LIMIT && code.length < CODE_LENGTH) {
        code += CODE_ALPHABET[byte % CODE_ALPHABET.length];
      }
    }
  }
  return code;
}

const CODE_ATTEMPTS = 20;

/** A code not yet used with this display name. `isTaken` checks the database. */
export async function pickUniqueCode(
  isTaken: (code: string) => Promise<boolean>,
  random: () => string = randomCode,
): Promise<string> {
  for (let attempt = 0; attempt < CODE_ATTEMPTS; attempt++) {
    const code = random();
    if (!(await isTaken(code))) return code;
  }
  throw new Error(`no free code after ${CODE_ATTEMPTS} attempts`);
}

export const GROUP_CODE_MAX = 20;
const GROUP_CODE = /^[A-Z0-9-]+$/;

export type GroupCodeResult =
  { ok: true; groupCode: string | null } | { ok: false; message: string };

/** Optional group code from a professor: up to 20 letters, digits or hyphens, stored in capitals. */
export function normaliseGroupCode(raw: string | undefined | null): GroupCodeResult {
  const value = (raw ?? "").trim().toUpperCase();
  if (value === "") return { ok: true, groupCode: null };
  if (value.length > GROUP_CODE_MAX || !GROUP_CODE.test(value)) {
    return {
      ok: false,
      message: `Use up to ${GROUP_CODE_MAX} letters, digits or hyphens, as your professor gave it.`,
    };
  }
  return { ok: true, groupCode: value };
}
