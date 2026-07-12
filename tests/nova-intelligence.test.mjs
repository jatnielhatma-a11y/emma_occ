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
    Array,
    Math,
    Object,
  });
  return module.exports;
}

test('Release 4 intelligence readiness tracks active layers', () => {
  const { buildIntelligenceReadiness } = loadTsModule('src/lib/nova/intelligence.ts');
  const readiness = buildIntelligenceReadiness({
    prediction: 1,
    recommendation: 1,
    context_signal: 1,
    automation_rule: 1,
    daily_ai_routine: 1,
  });

  assert.equal(readiness.totalRecords, 5);
  assert.equal(readiness.activeLayerCount, 5);
  assert.equal(readiness.recommendationStatus, 'advisory-ready');
  assert.equal(readiness.automationStatus, 'approval-required');
});

test('Release 4 is active while Release 5 remains planned', () => {
  const { novaReleases, plannedNovaModules } = loadTsModule('src/lib/nova/foundation.ts');
  const plannedIds = new Set(plannedNovaModules().map((module) => module.id));

  assert.equal(novaReleases.find((release) => release.id === 4)?.status, 'active');
  assert.equal(novaReleases.find((release) => release.id === 5)?.status, 'planned');
  assert.equal(plannedIds.has('nova-intelligence'), true);
});

test('Release 4 automation guardrails require confirmation', () => {
  const { automationGuardrail, release4SeedRecords } = loadTsModule('src/lib/nova/intelligence.ts');
  const automation = release4SeedRecords().find((record) => record.kind === 'automation_rule');

  assert.equal(automationGuardrail(automation), 'disabled-by-default');
  assert.equal(
    automationGuardrail({ kind: 'automation_rule', automationEnabled: true, requiresConfirmation: false }),
    'blocked-unconfirmed-automation'
  );
  assert.equal(release4SeedRecords().every((record) => record.requiresConfirmation), true);
  assert.equal(release4SeedRecords().every((record) => record.automationEnabled === false), true);
});
