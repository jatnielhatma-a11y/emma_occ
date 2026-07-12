import { createHash, randomBytes } from "crypto";
import { resilientFetch } from "../operations/resilience";

export const GOOGLE_CALENDAR_EVENTS_SCOPE = "https://www.googleapis.com/auth/calendar.events";
export const GOOGLE_GMAIL_READONLY_SCOPE = "https://www.googleapis.com/auth/gmail.readonly";
export const GOOGLE_PROFILE_SCOPE = "openid email profile";

export const GOOGLE_AUTH_SCOPES = [
  GOOGLE_CALENDAR_EVENTS_SCOPE,
  GOOGLE_GMAIL_READONLY_SCOPE,
  "openid",
  "email",
  "profile"
];

export type GoogleTokenResponse = {
  access_token: string;
  refresh_token?: string;
  expires_in?: number;
  scope?: string;
  token_type?: string;
  id_token?: string;
};

export function base64UrlRandom(bytes = 32) {
  return randomBytes(bytes).toString("base64url");
}

export function codeChallengeForVerifier(verifier: string) {
  return createHash("sha256").update(verifier).digest("base64url");
}

export function getGoogleRedirectUri() {
  if (process.env.GOOGLE_REDIRECT_URI) return process.env.GOOGLE_REDIRECT_URI;
  const appUrl = process.env.NEXT_PUBLIC_APP_URL;
  if (appUrl) return `${appUrl.replace(/\/$/, "")}/api/auth/google/callback`;
  return process.env.NODE_ENV === "production" ? undefined : "http://localhost:3000/api/auth/google/callback";
}

export function getGoogleOAuthConfig() {
  return {
    clientId: process.env.GOOGLE_CLIENT_ID,
    clientSecret: process.env.GOOGLE_CLIENT_SECRET,
    redirectUri: getGoogleRedirectUri()
  };
}

export function hasGoogleOAuthConfig() {
  const config = getGoogleOAuthConfig();
  return Boolean(config.clientId && config.clientSecret && config.redirectUri);
}

export function buildGoogleOAuthUrl({
  state,
  codeChallenge,
  scopes = GOOGLE_AUTH_SCOPES
}: {
  state: string;
  codeChallenge: string;
  scopes?: string[];
}) {
  const config = getGoogleOAuthConfig();
  if (!config.clientId || !config.redirectUri) {
    throw new Error("Missing Google OAuth configuration.");
  }

  const params = new URLSearchParams({
    client_id: config.clientId,
    redirect_uri: config.redirectUri,
    response_type: "code",
    access_type: "offline",
    prompt: "consent",
    include_granted_scopes: "true",
    state,
    scope: scopes.join(" "),
    code_challenge: codeChallenge,
    code_challenge_method: "S256"
  });

  return `https://accounts.google.com/o/oauth2/v2/auth?${params.toString()}`;
}

export async function exchangeGoogleCode(code: string, codeVerifier: string): Promise<GoogleTokenResponse> {
  const config = getGoogleOAuthConfig();
  if (!config.clientId || !config.clientSecret || !config.redirectUri) {
    throw new Error("Missing Google OAuth configuration.");
  }

  const response = await resilientFetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: {
      "Content-Type": "application/x-www-form-urlencoded"
    },
    body: new URLSearchParams({
      code,
      client_id: config.clientId,
      client_secret: config.clientSecret,
      redirect_uri: config.redirectUri,
      grant_type: "authorization_code",
      code_verifier: codeVerifier
    })
  }, {
    label: "Google OAuth token exchange",
    timeoutMs: 8_000,
    attempts: 2
  });

  if (!response.ok) {
    throw new Error(`Google token exchange failed with ${response.status}.`);
  }

  return response.json();
}

export async function refreshGoogleAccessToken(refreshToken: string): Promise<GoogleTokenResponse> {
  const config = getGoogleOAuthConfig();
  if (!config.clientId || !config.clientSecret) {
    throw new Error("Missing Google OAuth configuration.");
  }

  const response = await resilientFetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: {
      "Content-Type": "application/x-www-form-urlencoded"
    },
    body: new URLSearchParams({
      refresh_token: refreshToken,
      client_id: config.clientId,
      client_secret: config.clientSecret,
      grant_type: "refresh_token"
    })
  }, {
    label: "Google OAuth token refresh",
    timeoutMs: 8_000,
    attempts: 2
  });

  if (!response.ok) {
    throw new Error(`Google token refresh failed with ${response.status}.`);
  }

  return response.json();
}

export async function revokeGoogleToken(token: string) {
  const response = await resilientFetch("https://oauth2.googleapis.com/revoke", {
    method: "POST",
    headers: {
      "Content-Type": "application/x-www-form-urlencoded"
    },
    body: new URLSearchParams({ token })
  }, {
    label: "Google OAuth token revoke",
    timeoutMs: 8_000,
    attempts: 2
  });

  if (!response.ok && response.status !== 400) {
    throw new Error(`Google token revoke failed with ${response.status}.`);
  }
}

export function parseGrantedScopes(scope = "") {
  return new Set(scope.split(/\s+/).filter(Boolean));
}

export function googleServicesFromScope(scope = "") {
  const scopes = parseGrantedScopes(scope);
  return {
    calendar: scopes.has(GOOGLE_CALENDAR_EVENTS_SCOPE),
    gmail: scopes.has(GOOGLE_GMAIL_READONLY_SCOPE)
  };
}
