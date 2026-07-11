import { getStoredGoogleRefreshToken, oauthConfigured } from '../google-oauth';

type TokenResponse = { access_token?: string; expires_in?: number; error?: string; error_description?: string };
let cachedToken: { value: string; expiresAt: number; refreshToken: string } | null = null;

export async function getGoogleAccessToken(): Promise<string | null> {
  const staticToken = process.env.GOOGLE_ACCESS_TOKEN;
  if (staticToken) return staticToken;
  const clientId = process.env.GOOGLE_CLIENT_ID;
  const clientSecret = process.env.GOOGLE_CLIENT_SECRET;
  const refreshToken = (await getStoredGoogleRefreshToken()) ?? process.env.GOOGLE_REFRESH_TOKEN;
  if (!clientId || !clientSecret || !refreshToken) return null;
  if (cachedToken && cachedToken.refreshToken === refreshToken && cachedToken.expiresAt > Date.now() + 60_000) return cachedToken.value;
  const body = new URLSearchParams({ client_id: clientId, client_secret: clientSecret, refresh_token: refreshToken, grant_type: 'refresh_token' });
  const response = await fetch('https://oauth2.googleapis.com/token', { method: 'POST', headers: { 'Content-Type': 'application/x-www-form-urlencoded' }, body, cache: 'no-store' });
  const data = await response.json() as TokenResponse;
  if (!response.ok || !data.access_token) throw new Error(data.error_description ?? data.error ?? `Google OAuth ${response.status}`);
  cachedToken = { value: data.access_token, expiresAt: Date.now() + Math.max(300, data.expires_in ?? 3600) * 1000, refreshToken };
  return cachedToken.value;
}

export function googleAuthConfigured(): boolean {
  return Boolean(process.env.GOOGLE_ACCESS_TOKEN || oauthConfigured() || (process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET && process.env.GOOGLE_REFRESH_TOKEN));
}
