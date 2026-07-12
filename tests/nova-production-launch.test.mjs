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
    String
  });
  return module.exports;
}

test("Release 7 launch checks allow production-live candidate without final v1 approval", () => {
  const { buildRelease7LaunchSummary, release7LaunchChecks } = loadTsModule("lib/nova/production-launch.ts");
  const summary = buildRelease7LaunchSummary(release7LaunchChecks("2026-07-13T08:00:00.000Z", true));

  assert.equal(summary.requiredCovered, true);
  assert.equal(summary.productionLive, true);
  assert.equal(summary.criticalPassed, false);
  assert.equal(summary.v1Ready, false);
  assert.equal(summary.status, "production-live-candidate");
  assert.ok(summary.manualChecks >= 1);
});

test("Release 7 launch guardrails block critical failures", () => {
  const { launchCheckGuardrail } = loadTsModule("lib/nova/production-launch.ts");

  assert.equal(
    launchCheckGuardrail({
      status: "blocked",
      critical: true,
      automated: true
    }),
    "launch-blocker"
  );
  assert.equal(
    launchCheckGuardrail({
      status: "manual",
      critical: true,
      automated: false
    }),
    "manual-proof-required"
  );
});
