import test from 'node:test';
import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
import { readFileSync } from 'node:fs';
import vm from 'node:vm';
import ts from 'typescript';

const require = createRequire(import.meta.url);

function loadTsModule(path) {
  const source = readFileSync(path, 'utf8');
  const transpiled = ts.transpileModule(source, {
    compilerOptions: {
      module: ts.ModuleKind.CommonJS,
      target: ts.ScriptTarget.ES2020,
    },
  }).outputText;
  const module = { exports: {} };
  vm.runInNewContext(transpiled, {
    module,
    exports: module.exports,
    require,
    Object,
    Set,
  });
  return module.exports;
}

test('Release 7 allows a production-live candidate without final v1.0 approval', () => {
  const { buildRelease7LaunchSummary, release7LaunchChecks } = loadTsModule('src/lib/nova/production-launch.ts');
  const summary = buildRelease7LaunchSummary(release7LaunchChecks(true));

  assert.equal(summary.requiredChecksCovered, true);
  assert.equal(summary.productionLive, true);
  assert.equal(summary.status, 'production-live-candidate');
  assert.equal(summary.v1Ready, false);
  assert.equal(summary.blockers, 0);
  assert.equal(summary.manualChecks > 0, true);
});

test('Release 7 launch guardrails block critical failures', () => {
  const { launchCheckGuardrail } = loadTsModule('src/lib/nova/production-launch.ts');

  assert.equal(
    launchCheckGuardrail({ status: 'blocked', critical: true, automated: true }),
    'launch-blocker'
  );
  assert.equal(
    launchCheckGuardrail({ status: 'manual', critical: true, automated: false }),
    'manual-proof-required'
  );
});
