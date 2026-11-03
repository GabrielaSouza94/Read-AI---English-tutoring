/**
 * Admin password hashing with PBKDF2-SHA256 (Web Crypto), so the same code runs in Node scripts and
 * in the Worker. Format: `pbkdf2_sha256$<iterations>$<salt b64>$<hash b64>`.
 * 100,000 iterations is the most the Workers runtime allows for PBKDF2.
 */

const ALGORITHM = "pbkdf2_sha256";
const ITERATIONS = 100_000;
const SALT_BYTES = 16;
const HASH_BITS = 256;
export const MIN_PASSWORD_LENGTH = 12;

const toBase64 = (bytes: Uint8Array) => btoa(String.fromCharCode(...bytes));
const fromBase64 = (text: string) => Uint8Array.from(atob(text), (c) => c.charCodeAt(0));

async function derive(
  password: string,
  salt: Uint8Array<ArrayBuffer>,
  iterations: number,
): Promise<Uint8Array> {
  const key = await crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode(password),
    "PBKDF2",
    false,
    ["deriveBits"],
  );
  const bits = await crypto.subtle.deriveBits(
    { name: "PBKDF2", hash: "SHA-256", salt, iterations },
    key,
    HASH_BITS,
  );
  return new Uint8Array(bits);
}

function equalInConstantTime(a: Uint8Array, b: Uint8Array): boolean {
  if (a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i++) diff |= a[i] ^ b[i];
  return diff === 0;
}

export async function hashPassword(password: string): Promise<string> {
  if (password.length < MIN_PASSWORD_LENGTH) {
    throw new Error(`Password must be at least ${MIN_PASSWORD_LENGTH} characters`);
  }
  const salt = crypto.getRandomValues(new Uint8Array(SALT_BYTES));
  const hash = await derive(password, salt, ITERATIONS);
  return [ALGORITHM, ITERATIONS, toBase64(salt), toBase64(hash)].join("$");
}

/** True when `password` matches `stored`. A malformed `stored` value returns false. */
export async function verifyPassword(password: string, stored: string): Promise<boolean> {
  const [algorithm, iterationsText, saltText, hashText, ...rest] = stored.split("$");
  const iterations = Number(iterationsText);
  if (
    algorithm !== ALGORITHM ||
    rest.length > 0 ||
    !Number.isInteger(iterations) ||
    iterations < 1 ||
    iterations > ITERATIONS
  ) {
    return false;
  }
  try {
    const expected = fromBase64(hashText);
    const actual = await derive(password, fromBase64(saltText), iterations);
    return equalInConstantTime(actual, expected);
  } catch {
    return false;
  }
}
