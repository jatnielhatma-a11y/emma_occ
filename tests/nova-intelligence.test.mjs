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
    Array,
    Boolean,
    Math,
    Number,
    Object,
    String
  });
  return module.exports;
}

function loadIntelligence() {
  return loadTsModule("lib/nova/intelligence.ts", {
    "@/lib/ai/types": {}
  });
}

test("Release 4 intelligence readiness tracks all active layers", () => {
  const { buildIntelligenceReadiness } = loadIntelligence();
  const readiness = buildIntelligenceReadiness({
    prediction: 1,
    recommendation: 2,
    context_signal: 1,
    automation_rule: 1,
    daily_ai_routine: 1
  });

  assert.equal(readiness.totalRecords, 6);
  assert.equal(readiness.activeLayerCount, 5);
  assert.equal(readiness.allLayersStarted, true);
  assert.equal(readiness.recommendationStatus, "advisory-ready");
  assert.equal(readiness.automationStatus, "approval-required");
});

test("automation guardrails block unconfirmed automation", () => {
  const { automationGuardrail, intelligenceRecordSchema } = loadIntelligence();
  const automation = intelligenceRecordSchema.parse({
    kind: "automation_rule",
    title: "Calendar change",
    automationEnabled: true,
    requiresConfirmation: true
  });

  assert.equal(automationGuardrail(automation), "manual-confirmation-required");
  assert.equal(
    automationGuardrail({
      kind: "automation_rule",
      automationEnabled: true,
      requiresConfirmation: false
    }),
    "blocked-unconfirmed-automation"
  );
});

test("Release 4 recommendations preserve advisory boundaries", () => {
  const { buildRelease4Recommendations } = loadIntelligence();
  const records = buildRelease4Recommendations({
    language: "en",
    today: "2026-07-12",
    generatedAt: "2026-07-12T08:00:00.000Z",
    duty: {
      todayLabel: "Late shift",
      nextDutyLabel: "Night shift",
      upcomingWorkingCount: 2,
      vacationOrRestCount: 1
    },
    commute: {
      routeLabel: "Almere to Utrecht",
      status: "amber",
      recommendation: "Take the next NS option",
      isLive: true,
      confidence: 0.62,
      incidents: [],
      checkedAt: "2026-07-12T07:55:00.000Z"
    },
    calendar: {
      connected: false,
      lastSyncLabel: "Calendar not connected",
      sourceLabel: "Fallback"
    },
    email: {
      connected: false,
      actionableCount: null
    },
    weather: {
      label: "18C, rain",
      risk: "amber",
      source: "Open-Meteo",
      checkedAt: "2026-07-12T07:55:00.000Z"
    },
    conflicts: {
      count: 0,
      highest: null,
      risk: "green"
    },
    integrations: {
      fallbackCount: 1,
      unavailableCount: 1
    },
    sources: [
      { label: "Roster", source: "Supabase", timestamp: "2026-07-12T07:55:00.000Z", freshness: "recent", confidence: 0.8 },
      { label: "Route", source: "NS", timestamp: "2026-07-12T07:55:00.000Z", freshness: "live", confidence: 0.62 }
    ]
  });

  assert.ok(records.some((record) => record.kind === "recommendation" && record.domain === "commute"));
  assert.ok(records.some((record) => record.kind === "daily_ai_routine"));
  assert.ok(records.some((record) => record.kind === "automation_rule"));
  assert.equal(records.every((record) => record.requiresConfirmation), true);
  assert.equal(records.every((record) => record.automationEnabled === false), true);
});
