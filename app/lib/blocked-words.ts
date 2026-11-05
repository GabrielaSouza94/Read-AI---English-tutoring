/**
 * Names that are refused at session start (BRD R3). Matched per word, after lowercasing, removing
 * accents, and collapsing repeated letters ("Fuuuck" → "fuck"), so "Cassandra" is never blocked.
 * English and Portuguese profanity, plus words that impersonate the site. Words that are also real
 * names or everyday words ("Dick", "Rola") are left out. The admin can still hide
 * anything this misses (T5.3).
 */
const WORDS = [
  // English
  "arse",
  "ass",
  "asshole",
  "bastard",
  "bitch",
  "bollocks",
  "cock",
  "cunt",
  "dildo",
  "fag",
  "faggot",
  "fuck",
  "fucker",
  "fucking",
  "motherfucker",
  "nazi",
  "nigga",
  "nigger",
  "penis",
  "piss",
  "porn",
  "pussy",
  "rape",
  "retard",
  "shit",
  "slut",
  "twat",
  "vagina",
  "wank",
  "wanker",
  "whore",
  // Portuguese
  "arrombado",
  "babaca",
  "bosta",
  "buceta",
  "caralho",
  "corno",
  "cu",
  "cuzao",
  "foda",
  "foder",
  "fodase",
  "merda",
  "otario",
  "piroca",
  "porra",
  "puta",
  "puto",
  "punheta",
  "vadia",
  "viado",
  "xoxota",
  // Impersonation
  "admin",
  "administrator",
  "moderator",
  "official",
  "readai",
];

/** Lowercase, no accents or apostrophes, repeated letters collapsed. */
export function normaliseWord(word: string): string {
  return word
    .normalize("NFD")
    .replace(/\p{M}/gu, "")
    .toLowerCase()
    .replace(/['’-]/g, "")
    .replace(/(.)\1+/g, "$1");
}

const BLOCKED = new Set(WORDS.map(normaliseWord));

export function isBlockedWord(word: string): boolean {
  return BLOCKED.has(normaliseWord(word));
}
