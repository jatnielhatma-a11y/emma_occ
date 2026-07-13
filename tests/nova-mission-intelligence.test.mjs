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
  vm.runInNewContext(transpiled, {
    module,
    exports: module.exports,
    require,
    Date,
    Object,
    Set,
    String
  });
  return module.exports;
}

test("Release 9 mission summary covers every voice and autonomy focus", () => {
  const { buildRelease9MissionSummary, release9SeedRecords } = loadTsModule("lib/nova/mission-intelligence.ts");
  const summary = buildRelease9MissionSummary(release9SeedRecords("2026-07-13T08:00:00.000Z"));

  assert.equal(summary.totalRecords, 8);
  assert.equal(summary.coveredFocusCount, summary.requiredFocusCount);
  assert.equal(summary.allFocusesCovered, true);
  assert.equal(summary.blockers, 0);
  assert.equal(summary.transcriptStorageDisabled, true);
  assert.equal(summary.externalActionsRequireApproval, true);
  assert.equal(summary.status, "voice-ready");
  assert.equal(summary.autonomyMode, "advisory-autonomy");
});

test("Release 9 guardrails block unsafe automation and transcript storage", () => {
  const { missionGuardrail } = loadTsModule("lib/nova/mission-intelligence.ts");

  assert.equal(
    missionGuardrail({
      externalAction: true,
      requiresApproval: false,
      approvalGranted: false,
      storesTranscript: false,
      explicitConsent: false,
      sourceFreshness: "recent",
      impact: "high",
      status: "ready"
    }),
    "approval-required"
  );
  assert.equal(
    missionGuardrail({
      externalAction: false,
      requiresApproval: false,
      approvalGranted: false,
      storesTranscript: true,
      explicitConsent: false,
      sourceFreshness: "live",
      impact: "medium",
      status: "ready"
    }),
    "transcript-consent-required"
  );
  assert.equal(
    missionGuardrail({
      externalAction: true,
      requiresApproval: true,
      approvalGranted: false,
      storesTranscript: false,
      explicitConsent: false,
      sourceFreshness: "recent",
      impact: "high",
      status: "monitoring"
    }),
    "protected-draft"
  );
});

test("Release 9 command router maps voice commands to trusted NOVA routes", () => {
  const { classifyMissionCommand } = loadTsModule("lib/nova/mission-intelligence.ts");

  assert.equal(classifyMissionCommand("NOVA brief me").route, "/dashboard");
  assert.equal(classifyMissionCommand("check my commute and NS").route, "/commute");
  assert.equal(classifyMissionCommand("show next duty").route, "/dashboard#emma-occ");
  assert.equal(classifyMissionCommand("open settings").route, "/settings");
  assert.equal(classifyMissionCommand("please erase the moon").intent, "unknown");
});
