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
    Boolean,
    Number,
    String,
  });
  return module.exports;
}

test('memory is disabled by default', () => {
  const { canPersistMemory, defaultMemorySettings } = loadTsModule('src/lib/nova/personal-core.ts');
  const permission = canPersistMemory(defaultMemorySettings, 'manual');

  assert.equal(defaultMemorySettings.memoryEnabled, false);
  assert.equal(permission.allowed, false);
  assert.match(permission.reason, /disabled/i);
});

test('AI-suggested memory needs separate permission', () => {
  const { canPersistMemory } = loadTsModule('src/lib/nova/personal-core.ts');
  const permission = canPersistMemory({
    memoryEnabled: true,
    allowAiSuggestions: false,
    retentionDays: 365,
    consentVersion: 'nova-r2-privacy-v1',
  }, 'ai_suggestion');

  assert.equal(permission.allowed, false);
  assert.match(permission.reason, /separate permission/i);
});

test('personal core readiness counts life graph records', () => {
  const { buildPersonalCoreReadiness } = loadTsModule('src/lib/nova/personal-core.ts');
  const readiness = buildPersonalCoreReadiness({
    memoryEnabled: true,
    allowAiSuggestions: true,
    retentionDays: 90,
    consentVersion: 'nova-r2-privacy-v1',
  }, {
    interests: 1,
    goals: 2,
    habits: 3,
    relationships: 4,
    timeline: 5,
    memories: 6,
  });

  assert.equal(readiness.memoryStatus, 'enabled');
  assert.equal(readiness.aiMemorySuggestions, 'allowed');
  assert.equal(readiness.lifeGraphCount, 15);
  assert.equal(readiness.hasPersonalContext, true);
});
