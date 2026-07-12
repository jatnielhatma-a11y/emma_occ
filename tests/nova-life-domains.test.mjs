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

test('life-domain readiness reports coverage and recommendation state', () => {
  const { buildLifeDomainReadiness } = loadTsModule('src/lib/nova/life-domains.ts');
  const readiness = buildLifeDomainReadiness({
    finance: 1,
    home: 0,
    travel: 2,
    health: 0,
    learning: 3,
  });

  assert.equal(readiness.activeDomainCount, 3);
  assert.equal(readiness.totalRecords, 6);
  assert.equal(readiness.allDomainsStarted, false);
  assert.equal(readiness.recommendationStatus, 'context-ready');
});

test('finance and health privacy notes keep Release 3 boundaries explicit', () => {
  const { domainPrivacyNote } = loadTsModule('src/lib/nova/life-domains.ts');

  assert.match(domainPrivacyNote('finance'), /No bank connection/i);
  assert.match(domainPrivacyNote('health'), /not medical advice/i);
});
