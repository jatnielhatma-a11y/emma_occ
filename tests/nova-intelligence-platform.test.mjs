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

test('Release 5 readiness covers every NOVA capability family', () => {
  const { buildNovaIntelligenceReadiness, emptyNovaCapabilityCounts, release5SeedRecords } = loadTsModule(
    'src/lib/nova/nova-intelligence.ts'
  );
  const counts = release5SeedRecords().reduce(
    (next, record) => ({ ...next, [record.capability]: next[record.capability] + 1 }),
    { ...emptyNovaCapabilityCounts }
  );
  const readiness = buildNovaIntelligenceReadiness(counts);

  assert.equal(readiness.totalRecords, 6);
  assert.equal(readiness.activeCapabilityCount, 6);
  assert.equal(readiness.allCapabilitiesStarted, true);
  assert.equal(readiness.syncStatus, 'sync-ready');
  assert.equal(readiness.platformStatus, 'extension-ready');
});

test('voice and vision stay blocked until explicit consent is granted', () => {
  const { capabilityGuardrail, release5SeedRecords } = loadTsModule('src/lib/nova/nova-intelligence.ts');
  const records = release5SeedRecords();

  assert.equal(capabilityGuardrail(records.find((record) => record.capability === 'voice')), 'explicit-consent-required');
  assert.equal(capabilityGuardrail(records.find((record) => record.capability === 'vision')), 'explicit-consent-required');
});

test('Release 5 guardrails block unsafe sync and developer scope mistakes', () => {
  const { capabilityGuardrail } = loadTsModule('src/lib/nova/nova-intelligence.ts');

  assert.equal(
    capabilityGuardrail({
      capability: 'multi_device_sync',
      privacyMode: 'local_only',
      consentRequired: false,
      consentGranted: true,
      syncEnabled: true,
    }),
    'blocked-local-only-sync'
  );
  assert.equal(
    capabilityGuardrail({
      capability: 'developer_platform',
      privacyMode: 'private_sync',
      consentRequired: true,
      consentGranted: true,
      syncEnabled: false,
    }),
    'developer-scope-required'
  );
});
