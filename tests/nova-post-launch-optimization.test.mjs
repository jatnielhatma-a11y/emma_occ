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

test("Release 8 optimization summary covers every post-launch focus", () => {
  const { buildRelease8OptimizationSummary, release8SeedRecords } = loadTsModule("lib/nova/post-launch-optimization.ts");
  const summary = buildRelease8OptimizationSummary(release8SeedRecords("2026-07-13T08:00:00.000Z"));

  assert.equal(summary.totalRecords, 9);
  assert.equal(summary.coveredFocusCount, summary.requiredFocusCount);
  assert.equal(summary.allFocusesCovered, true);
  assert.equal(summary.blockers, 0);
  assert.equal(summary.privacyReady, true);
  assert.equal(summary.status, "learning-ready");
  assert.equal(summary.recommendationMode, "advisory-ready");
});

test("Release 8 guardrails block silent automation and unreviewed personal data", () => {
  const { optimizationGuardrail } = loadTsModule("lib/nova/post-launch-optimization.ts");

  assert.equal(
    optimizationGuardrail({
      status: "tuning",
      sourceFreshness: "recent",
      impact: "medium",
      usesPersonalData: true,
      privacyReviewed: true,
      consentRequired: true,
      consentGranted: false,
      automationEnabled: true
    }),
    "automation-consent-required"
  );
  assert.equal(
    optimizationGuardrail({
      status: "observing",
      sourceFreshness: "manual",
      impact: "medium",
      usesPersonalData: true,
      privacyReviewed: false,
      consentRequired: true,
      consentGranted: true,
      automationEnabled: false
    }),
    "privacy-review-required"
  );
  assert.equal(
    optimizationGuardrail({
      status: "observing",
      sourceFreshness: "fallback",
      impact: "high",
      usesPersonalData: false,
      privacyReviewed: true,
      consentRequired: false,
      consentGranted: false,
      automationEnabled: false
    }),
    "source-verification-required"
  );
});

test("Release 8 migration protects optimization records with RLS", () => {
  const sql = readFileSync("supabase/migrations/20260713012654_release8_post_launch_optimization.sql", "utf8");

  assert.match(sql, /create table if not exists public\.optimization_feedback/i);
  assert.match(sql, /create table if not exists public\.optimization_tuning_records/i);
  assert.match(sql, /alter table public\.optimization_feedback enable row level security/i);
  assert.match(sql, /alter table public\.optimization_tuning_records enable row level security/i);
  assert.match(sql, /using \(\(select auth\.uid\(\)\) = user_id\)/i);
  assert.match(sql, /with check \(\(select auth\.uid\(\)\) = user_id\)/i);
  assert.match(sql, /constraint optimization_no_silent_automation/i);
  assert.match(sql, /grant select, insert, update, delete on public\.optimization_feedback to authenticated/i);
});
