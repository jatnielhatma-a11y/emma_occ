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
    Math,
    Object,
    String
  });
  return module.exports;
}

test("Release 6 readiness covers every production gate without declaring launch ready prematurely", () => {
  const { buildProductionReadinessSummary, release6SeedRecords } = loadTsModule("lib/nova/production-readiness.ts");
  const summary = buildProductionReadinessSummary(release6SeedRecords("2026-07-13T08:00:00.000Z"));

  assert.equal(summary.requiredGatesCovered, true);
  assert.equal(summary.coveredGateCount, summary.requiredGateCount);
  assert.equal(summary.blockers, 0);
  assert.equal(summary.criticalPassed, true);
  assert.equal(summary.launchStatus, "candidate-with-follow-up");
  assert.ok(summary.manualChecks >= 1);
});

test("Release 6 guardrails block critical failures and require rollback rehearsal", () => {
  const { productionGateGuardrail } = loadTsModule("lib/nova/production-readiness.ts");

  assert.equal(
    productionGateGuardrail({
      gate: "security",
      status: "blocked",
      severity: "critical",
      stage: "automated"
    }),
    "release-blocker"
  );
  assert.equal(
    productionGateGuardrail({
      gate: "rollback",
      status: "manual",
      severity: "high",
      stage: "manual"
    }),
    "rollback-test-required"
  );
});

test("Release 6 Supabase migration uses RLS and explicit authenticated grants", () => {
  const sql = readFileSync("supabase/migrations/20260713110000_release6_production_readiness.sql", "utf8");

  assert.match(sql, /alter table public\.production_readiness_reviews enable row level security/i);
  assert.match(sql, /alter table public\.release_incident_runbooks enable row level security/i);
  assert.match(sql, /alter table public\.commute_accuracy_measurements enable row level security/i);
  assert.match(sql, /to authenticated\s+using \(\(select auth\.uid\(\)\) = user_id\)\s+with check \(\(select auth\.uid\(\)\) = user_id\)/i);
  assert.match(sql, /grant select, insert, update, delete on public\.production_readiness_reviews to authenticated/i);
  assert.match(sql, /grant select, insert, update, delete on public\.commute_accuracy_measurements to authenticated/i);
});
