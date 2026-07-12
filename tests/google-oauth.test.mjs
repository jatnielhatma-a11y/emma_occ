import test from "node:test";
import assert from "node:assert/strict";
import { createRequire } from "node:module";
import { readFileSync } from "node:fs";
import vm from "node:vm";
import ts from "typescript";

const require = createRequire(import.meta.url);

function loadTsModule(path) {
  const source = readFileSync(path, "utf8");
  const transpiled = ts.transpileModule(source, {
    compilerOptions: {
      module: ts.ModuleKind.CommonJS,
      target: ts.ScriptTarget.ES2020
    }
  }).outputText;
  const module = { exports: {} };
  const customRequire = (specifier) => {
    if (specifier === "../operations/resilience") return { resilientFetch: fetch };
    return require(specifier);
  };
  vm.runInNewContext(transpiled, {
    module,
    exports: module.exports,
    require: customRequire,
    process,
    Buffer,
    URLSearchParams,
    fetch,
    crypto: require("crypto")
  });
  return module.exports;
}

test("builds a Google OAuth URL with PKCE and Calendar plus Gmail scopes", () => {
  const previous = {
    clientId: process.env.GOOGLE_CLIENT_ID,
    redirectUri: process.env.GOOGLE_REDIRECT_URI
  };
  process.env.GOOGLE_CLIENT_ID = "client-id";
  process.env.GOOGLE_REDIRECT_URI = "https://example.com/api/auth/google/callback";

  const { buildGoogleOAuthUrl, codeChallengeForVerifier, GOOGLE_GMAIL_READONLY_SCOPE, GOOGLE_CALENDAR_EVENTS_SCOPE } = loadTsModule("lib/google/oauth.ts");
  const verifier = "a".repeat(64);
  const url = new URL(
    buildGoogleOAuthUrl({
      state: "state-1",
      codeChallenge: codeChallengeForVerifier(verifier)
    })
  );

  assert.equal(url.searchParams.get("code_challenge_method"), "S256");
  assert.equal(url.searchParams.get("state"), "state-1");
  assert.match(url.searchParams.get("scope") ?? "", new RegExp(GOOGLE_GMAIL_READONLY_SCOPE));
  assert.match(url.searchParams.get("scope") ?? "", new RegExp(GOOGLE_CALENDAR_EVENTS_SCOPE));

  if (previous.clientId === undefined) delete process.env.GOOGLE_CLIENT_ID;
  else process.env.GOOGLE_CLIENT_ID = previous.clientId;
  if (previous.redirectUri === undefined) delete process.env.GOOGLE_REDIRECT_URI;
  else process.env.GOOGLE_REDIRECT_URI = previous.redirectUri;
});

test("encrypts and decrypts Google tokens", () => {
  const previous = process.env.GOOGLE_TOKEN_ENCRYPTION_KEY;
  process.env.GOOGLE_TOKEN_ENCRYPTION_KEY = "0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef";

  const { encryptGoogleToken, decryptGoogleToken, hashOAuthState, verifyOAuthState } = loadTsModule("lib/google/token-crypto.ts");
  const encrypted = encryptGoogleToken("refresh-token");

  assert.notEqual(encrypted, "refresh-token");
  assert.equal(decryptGoogleToken(encrypted), "refresh-token");
  assert.equal(verifyOAuthState("state", hashOAuthState("state")), true);
  assert.equal(verifyOAuthState("state", hashOAuthState("other")), false);

  if (previous === undefined) delete process.env.GOOGLE_TOKEN_ENCRYPTION_KEY;
  else process.env.GOOGLE_TOKEN_ENCRYPTION_KEY = previous;
});

test("detects Google services from granted scopes", () => {
  const { googleServicesFromScope, GOOGLE_GMAIL_READONLY_SCOPE, GOOGLE_CALENDAR_EVENTS_SCOPE } = loadTsModule("lib/google/oauth.ts");

  const allServices = googleServicesFromScope(`${GOOGLE_GMAIL_READONLY_SCOPE} ${GOOGLE_CALENDAR_EVENTS_SCOPE}`);
  assert.equal(allServices.calendar, true);
  assert.equal(allServices.gmail, true);

  const gmailOnly = googleServicesFromScope(GOOGLE_GMAIL_READONLY_SCOPE);
  assert.equal(gmailOnly.calendar, false);
  assert.equal(gmailOnly.gmail, true);
});
