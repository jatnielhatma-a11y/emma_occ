import { createCipheriv, createDecipheriv, createHash, randomBytes } from 'node:crypto';
import { cookies } from 'next/headers';

const TOKEN_COOKIE = 'emma_google_refresh';
const STATE_COOKIE = 'emma_google_state';
const VERIFIER_COOKIE = 'emma_google_verifier';
const SCOPES = [
  'https://www.googleapis.com/auth/calendar.readonly',
  'https://www.googleapis.com/auth/gmail.readonly',
  'openid',
  'email',
].join(' ');

function key() {
  const secret = process.env.GOOGLE_TOKEN_ENCRYPTION_KEY;
  if (!secret) throw new Error('GOOGLE_TOKEN_ENCRYPTION_KEY is not configured');
  return createHash('sha256').update(secret).digest();
}

function encrypt(value: string) {
  const iv = randomBytes(12);
  const cipher = createCipheriv('aes-256-gcm', key(), iv);
  const encrypted = Buffer.concat([cipher.update(value, 'utf8'), cipher.final()]);
  return Buffer.concat([iv, cipher.getAuthTag(), encrypted]).toString('base64url');
}

function decrypt(value: string) {
  const payload = Buffer.from(value, 'base64url');
  const iv = payload.subarray(0, 12);
  const tag = payload.subarray(12, 28);
  const encrypted = payload.subarray(28);
  const decipher = createDecipheriv('aes-256-gcm', key(), iv);
  decipher.setAuthTag(tag);
  return Buffer.concat([decipher.update(encrypted), decipher.final()]).toString('utf8');
}

export function oauthConfigured() {
  return Boolean(process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET && process.env.GOOGLE_TOKEN_ENCRYPTION_KEY);
}

export async function buildGoogleAuthorizationUrl(origin: string) {
  if (!oauthConfigured()) throw new Error('Google OAuth client credentials are not configured');
  const state = randomBytes(24).toString('base64url');
  const verifier = randomBytes(48).toString('base64url');
  const challenge = createHash('sha256').update(verifier).digest('base64url');
  const store = await cookies();
  const secure = process.env.NODE_ENV === 'production';
  store.set(STATE_COOKIE, state, { httpOnly: true, sameSite: 'lax', secure, path: '/', maxAge: 600 });
  store.set(VERIFIER_COOKIE, verifier, { httpOnly: true, sameSite: 'lax', secure, path: '/', maxAge: 600 });
  const url = new URL('https://accounts.google.com/o/oauth2/v2/auth');
  url.searchParams.set('client_id', process.env.GOOGLE_CLIENT_ID!);
  url.searchParams.set('redirect_uri', `${origin}/api/auth/google/callback`);
  url.searchParams.set('response_type', 'code');
  url.searchParams.set('scope', SCOPES);
  url.searchParams.set('access_type', 'offline');
  url.searchParams.set('prompt', 'consent');
  url.searchParams.set('include_granted_scopes', 'true');
  url.searchParams.set('state', state);
  url.searchParams.set('code_challenge', challenge);
  url.searchParams.set('code_challenge_method', 'S256');
  return url.toString();
}

export async function exchangeGoogleCode(code: string, state: string, origin: string) {
  const store = await cookies();
  if (!state || state !== store.get(STATE_COOKIE)?.value) throw new Error('Invalid OAuth state');
  const verifier = store.get(VERIFIER_COOKIE)?.value;
  if (!verifier) throw new Error('Missing OAuth verifier');
  const body = new URLSearchParams({
    code,
    client_id: process.env.GOOGLE_CLIENT_ID!,
    client_secret: process.env.GOOGLE_CLIENT_SECRET!,
    redirect_uri: `${origin}/api/auth/google/callback`,
    grant_type: 'authorization_code',
    code_verifier: verifier,
  });
  const response = await fetch('https://oauth2.googleapis.com/token', { method: 'POST', headers: { 'Content-Type': 'application/x-www-form-urlencoded' }, body, cache: 'no-store' });
  if (!response.ok) throw new Error(`Google token exchange failed (${response.status})`);
  const data = await response.json() as { refresh_token?: string };
  if (!data.refresh_token) throw new Error('Google did not return a refresh token. Revoke prior consent and reconnect.');
  store.set(TOKEN_COOKIE, encrypt(data.refresh_token), { httpOnly: true, sameSite: 'lax', secure: process.env.NODE_ENV === 'production', path: '/', maxAge: 60 * 60 * 24 * 365 });
  store.delete(STATE_COOKIE);
  store.delete(VERIFIER_COOKIE);
}

export async function getStoredGoogleRefreshToken() {
  try {
    const value = (await cookies()).get(TOKEN_COOKIE)?.value;
    return value ? decrypt(value) : undefined;
  } catch { return undefined; }
}

export async function disconnectGoogle() {
  (await cookies()).delete(TOKEN_COOKIE);
}

export async function isGoogleConnected() {
  return Boolean(await getStoredGoogleRefreshToken());
}
