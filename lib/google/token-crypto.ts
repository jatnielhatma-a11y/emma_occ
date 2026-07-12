import { createCipheriv, createDecipheriv, createHash, randomBytes, timingSafeEqual } from "crypto";

const TOKEN_PREFIX = "v1";
const IV_BYTES = 12;

function base64UrlEncode(buffer: Buffer) {
  return buffer.toString("base64url");
}

function base64UrlDecode(value: string) {
  return Buffer.from(value, "base64url");
}

function encryptionSecret() {
  return process.env.GOOGLE_TOKEN_ENCRYPTION_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY;
}

function deriveKey(secret = encryptionSecret()) {
  if (!secret) {
    throw new Error("Missing Google token encryption secret.");
  }

  if (/^[a-f0-9]{64}$/i.test(secret)) {
    return Buffer.from(secret, "hex");
  }

  try {
    const decoded = Buffer.from(secret, "base64");
    if (decoded.length === 32) return decoded;
  } catch {
    // Fall through to hashing plain-text secrets.
  }

  return createHash("sha256").update(secret).digest();
}

export function hasGoogleTokenEncryptionKey() {
  return Boolean(encryptionSecret());
}

export function hashOAuthState(value: string) {
  return createHash("sha256").update(value).digest("hex");
}

export function verifyOAuthState(value: string, expectedHash: string) {
  const actual = Buffer.from(hashOAuthState(value), "hex");
  const expected = Buffer.from(expectedHash, "hex");
  return actual.length === expected.length && timingSafeEqual(actual, expected);
}

export function encryptGoogleToken(token: string | null | undefined) {
  if (!token) return null;

  const iv = randomBytes(IV_BYTES);
  const cipher = createCipheriv("aes-256-gcm", deriveKey(), iv);
  const encrypted = Buffer.concat([cipher.update(token, "utf8"), cipher.final()]);
  const tag = cipher.getAuthTag();

  return [TOKEN_PREFIX, base64UrlEncode(iv), base64UrlEncode(tag), base64UrlEncode(encrypted)].join(":");
}

export function decryptGoogleToken(encrypted: string | null | undefined) {
  if (!encrypted) return null;
  if (!encrypted.startsWith(`${TOKEN_PREFIX}:`)) return encrypted;

  const [, iv, tag, value] = encrypted.split(":");
  if (!iv || !tag || !value) {
    throw new Error("Invalid encrypted Google token format.");
  }

  const decipher = createDecipheriv("aes-256-gcm", deriveKey(), base64UrlDecode(iv));
  decipher.setAuthTag(base64UrlDecode(tag));
  return Buffer.concat([decipher.update(base64UrlDecode(value)), decipher.final()]).toString("utf8");
}
