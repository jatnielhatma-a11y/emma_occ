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
  });
  return module.exports;
}

test('Release 6 readiness covers every production gate without declaring launch ready prematurely', () => {
  const { buildProductionReadinessSummary, release6SeedRecords } = loadTsModule('src/lib/nova/production-readiness.ts');
  const summary = buildProductionReadinessSummary(release6SeedRecords());

  assert.equal(summary.requiredGatesCovered, true);
  assert.equal(summary.coveredGateCount, summary.requiredGateCount);
  assert.equal(summary.blockers, 0);
  assert.equal(summary.criticalPassed, true);
  assert.equal(summary.launchStatus, 'candidate-with-follow-up');
});

test('Release 6 guardrails block critical failures and require rollback rehearsal', () => {
  const { productionGateGuardrail } = loadTsModule('src/lib/nova/production-readiness.ts');

  assert.equal(
    productionGateGuardrail({
      gate: 'security',
      status: 'blocked',
      severity: 'critical',
      stage: 'automated',
    }),
    'release-blocker'
  );
  assert.equal(
    productionGateGuardrail({
      gate: 'rollback',
      status: 'manual',
      severity: 'high',
      stage: 'manual',
    }),
    'rollback-test-required'
  );
});
