import test from "node:test";
import assert from "node:assert/strict";
import { createRequire } from "node:module";
import { readFileSync } from "node:fs";
import vm from "node:vm";
import ts from "typescript";

const require = createRequire(import.meta.url);

function loadTsModule(path, mocks = {}) {
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
    fetch,
    JSON,
    Math,
    Number,
    String,
    Boolean
  });
  return module.exports;
}

function loadDailyBriefModule() {
  const types = loadTsModule("lib/ai/types.ts");
  return loadTsModule("lib/ai/daily-brief.ts", {
    "./types": types,
    "../operations/resilience": { resilientFetch: fetch }
  });
}

const baseContext = {
  language: "en",
  today: "2026-07-12",
  generatedAt: "2026-07-12T08:00:00.000Z",
  duty: {
    todayLabel: "No duty loaded",
    nextDutyLabel: "2026-07-13 - Late Shift 15:00-23:05",
    upcomingWorkingCount: 4,
    vacationOrRestCount: 2
  },
  commute: {
    routeLabel: "Almere to Utrecht",
    status: "green",
    recommendation: "NS live rail route",
    isLive: true,
    confidence: 0.9,
    incidents: [],
    checkedAt: "2026-07-12T08:00:00.000Z"
  },
  calendar: {
    connected: true,
    lastSyncLabel: "Last sync 12 Jul 2026, 08:00",
    sourceLabel: "Google Calendar"
  },
  email: {
    connected: false,
    actionableCount: null
  },
  weather: {
    label: "18C, Clear",
    risk: "green",
    source: "Weather",
    checkedAt: "2026-07-12T08:00:00.000Z"
  },
  conflicts: {
    count: 0,
    highest: null,
    risk: "green"
  },
  integrations: {
    fallbackCount: 0,
    unavailableCount: 0
  },
  sources: [
    {
      label: "Route",
      source: "Live route provider",
      timestamp: "2026-07-12T08:00:00.000Z",
      freshness: "live",
      confidence: 0.9
    }
  ]
};

test("fallback daily brief suppresses non-actionable green updates", () => {
  const { buildFallbackDailyBrief } = loadDailyBriefModule();
  const brief = buildFallbackDailyBrief(baseContext);

  assert.equal(brief.status, "green");
  assert.equal(brief.shouldNotify, false);
  assert.ok(brief.suppressedUpdates.length > 0);
  assert.ok(brief.facts.some((fact) => fact.label === "Commute"));
});

test("fallback daily brief escalates red route incidents", () => {
  const { buildFallbackDailyBrief } = loadDailyBriefModule();
  const brief = buildFallbackDailyBrief({
    ...baseContext,
    commute: {
      ...baseContext.commute,
      status: "red",
      confidence: 0.45,
      incidents: [
        {
          title: "NS trip cancellation",
          detail: "Selected trip is cancelled.",
          severity: "red",
          source: "NS API"
        }
      ]
    }
  });

  assert.equal(brief.status, "red");
  assert.equal(brief.shouldNotify, true);
  assert.equal(brief.suppressedUpdates.length, 0);
  assert.equal(brief.recommendations[0].priority, "now");
});

test("generateDailyBrief uses deterministic fallback without an OpenAI key", async () => {
  const previousKey = process.env.OPENAI_API_KEY;
  delete process.env.OPENAI_API_KEY;
  const { generateDailyBrief } = loadDailyBriefModule();

  const result = await generateDailyBrief(baseContext);

  assert.equal(result.generatedBy, "fallback");
  assert.equal(result.model, null);
  assert.equal(result.brief.title, "Daily operations brief");

  if (previousKey) process.env.OPENAI_API_KEY = previousKey;
});
