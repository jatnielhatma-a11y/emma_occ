import test from "node:test";
import assert from "node:assert/strict";
import { createRequire } from "node:module";
import { readFileSync } from "node:fs";
import vm from "node:vm";
import ts from "typescript";

const require = createRequire(import.meta.url);

function loadTsModule(path, mocks = {}) {
  const source = readFileSync(path, "utf8");
  const transpiled = ts.transpileModule(source, {
    compilerOptions: {
      module: ts.ModuleKind.CommonJS,
      target: ts.ScriptTarget.ES2020
    }
  }).outputText;
  const module = { exports: {} };
  const customRequire = (id) => mocks[id] ?? require(id);
  vm.runInNewContext(transpiled, {
    module,
    exports: module.exports,
    require: customRequire,
    Array,
    Boolean,
    Math,
    Number,
    Object,
    String
  });
  return module.exports;
}

function loadNovaIntelligence() {
  return loadTsModule("lib/nova/nova-intelligence.ts");
}

test("Release 5 readiness tracks all platform capabilities", () => {
  const { buildNovaIntelligenceReadiness } = loadNovaIntelligence();
  const readiness = buildNovaIntelligenceReadiness({
    multi_device_sync: 1,
    voice: 1,
    vision: 1,
    collaboration: 1,
    developer_platform: 1,
    nova_intelligence: 1
  });

  assert.equal(readiness.totalRecords, 6);
  assert.equal(readiness.activeCapabilityCount, 6);
  assert.equal(readiness.allCapabilitiesStarted, true);
  assert.equal(readiness.syncStatus, "sync-ready");
  assert.equal(readiness.multimodalStatus, "multimodal-ready");
  assert.equal(readiness.platformStatus, "extension-governed");
});

test("Release 5 guardrails require consent and explicit scopes", () => {
  const { capabilityGuardrail } = loadNovaIntelligence();

  assert.equal(
    capabilityGuardrail({
      capability: "voice",
      privacyMode: "private",
      consentRequired: true,
      consentGranted: false,
      syncEnabled: false
    }),
    "explicit-consent-required"
  );
  assert.equal(
    capabilityGuardrail({
      capability: "developer_platform",
      privacyMode: "private",
      consentRequired: true,
      consentGranted: true,
      syncEnabled: false
    }),
    "developer-scope-required"
  );
  assert.equal(
    capabilityGuardrail({
      capability: "multi_device_sync",
      privacyMode: "disabled",
      consentRequired: true,
      consentGranted: true,
      syncEnabled: true
    }),
    "sync-blocked"
  );
});

test("Release 5 seed records remain private and consent-gated", () => {
  const { release5SeedRecords } = loadNovaIntelligence();
  const records = release5SeedRecords();

  assert.equal(records.length, 6);
  assert.ok(records.some((record) => record.capability === "voice" && record.localOnly));
  assert.ok(records.some((record) => record.capability === "vision" && record.localOnly));
  assert.ok(records.some((record) => record.capability === "developer_platform" && record.privacyMode === "developer_scoped"));
  assert.equal(records.every((record) => record.consentRequired), true);
  assert.equal(records.every((record) => record.consentGranted === false), true);
});
