import test from "node:test";
import assert from "node:assert/strict";
import { createRequire } from "node:module";
import { readFileSync } from "node:fs";
import vm from "node:vm";
import ts from "typescript";
import { classifyDuty } from "../lib/roster/core.js";

const require = createRequire(import.meta.url);

function restoreEnv(name, value) {
  if (value === undefined) delete process.env[name];
  else process.env[name] = value;
}

function loadTsModule(path, mocks = {}, extraGlobals = {}) {
  const source = readFileSync(path, "utf8");
  const transpiled = ts.transpileModule(source, {
    compilerOptions: {
      module: ts.ModuleKind.CommonJS,
      target: ts.ScriptTarget.ES2020
    }
  }).outputText;
  const module = { exports: {} };
  const customRequire = (id) => mocks[id] ?? require(id);
  vm.runInNewContext(transpiled, {
    module,
    exports: module.exports,
    require: customRequire,
    process,
    console,
    setTimeout,
    clearTimeout,
    Promise,
    Math,
    Date,
    URL,
    AbortController,
    ...extraGlobals
  });
  return module.exports;
}

test("phase 7 roster edge cases classify R, reserve marker, and VL", () => {
  const rest = classifyDuty({ date: "2026-07-14", dutyCode: "R" });
  const reserve = classifyDuty({ date: "2026-07-15", startTime: "09:00", endTime: "17:05", dutyCode: "*" });
  const vacation = classifyDuty({ date: "2026-07-16", dutyCode: "VL" });

  assert.equal(rest.isOff, true);
  assert.equal(rest.dutyLabel, "OFF Day");
  assert.equal(reserve.isOff, false);
  assert.equal(reserve.dutyLabel, "Reserve Duty");
  assert.equal(vacation.isOff, true);
  assert.equal(vacation.dutyLabel, "Vacation");
});

test("phase 7 retry wrapper retries transient provider failures", async () => {
  let attempts = 0;
  const { resilientFetch } = loadTsModule("lib/operations/resilience.ts", {
    "./logger": {
      logOperationalEvent: () => {},
      errorMessage: (error) => error.message
    }
  }, {
    fetch: async () => {
      attempts += 1;
      if (attempts === 1) return { status: 503 };
      return { status: 200, ok: true };
    }
  });

  const response = await resilientFetch("https://example.test", {}, { label: "test-provider", attempts: 2, baseDelayMs: 1 });

  assert.equal(response.status, 200);
  assert.equal(attempts, 2);
});

test("phase 7 health report labels fallback integrations without exposing secrets", async () => {
  const previous = {
    supabaseUrl: process.env.NEXT_PUBLIC_SUPABASE_URL,
    serviceRole: process.env.SUPABASE_SERVICE_ROLE_KEY,
    maps: process.env.GOOGLE_MAPS_API_KEY,
    ns: process.env.NS_API_KEY,
    openai: process.env.OPENAI_API_KEY
  };
  delete process.env.NEXT_PUBLIC_SUPABASE_URL;
  delete process.env.SUPABASE_SERVICE_ROLE_KEY;
  delete process.env.GOOGLE_MAPS_API_KEY;
  delete process.env.NS_API_KEY;
  delete process.env.OPENAI_API_KEY;

  const { buildProductionHealthReport } = loadTsModule("lib/operations/health.ts", {
    "@/lib/google/oauth": { hasGoogleOAuthConfig: () => false },
    "@/lib/google/token-crypto": { hasGoogleTokenEncryptionKey: () => false },
    "@/lib/maps/google-routes": { hasGoogleRoutesConfig: () => false },
    "@/lib/commute/ns-live": { hasNsApiConfig: () => false },
    "@/lib/supabase/admin": { createSupabaseAdminClient: () => ({}) },
    "./resilience": { resilientFetch: async () => ({ ok: false, status: 503 }) },
    "./logger": { errorMessage: (error) => error.message }
  });

  const report = await buildProductionHealthReport();
  assert.equal(report.status, "down");
  assert.ok(report.checks.some((item) => item.id === "google-routes" && item.freshness === "fallback"));
  assert.ok(JSON.stringify(report).includes("fallback"));
  assert.equal(JSON.stringify(report).includes("secret"), false);

  restoreEnv("NEXT_PUBLIC_SUPABASE_URL", previous.supabaseUrl);
  restoreEnv("SUPABASE_SERVICE_ROLE_KEY", previous.serviceRole);
  restoreEnv("GOOGLE_MAPS_API_KEY", previous.maps);
  restoreEnv("NS_API_KEY", previous.ns);
  restoreEnv("OPENAI_API_KEY", previous.openai);
});
