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
    Set,
    String
  });
  return module.exports;
}

function loadPersonalCore() {
  return loadTsModule("lib/nova/personal-core.ts");
}

test("privacy-first memory is disabled by default", () => {
  const { canPersistMemory, defaultMemorySettings } = loadPersonalCore();
  const permission = canPersistMemory(defaultMemorySettings, { sourceKind: "manual" });

  assert.equal(defaultMemorySettings.memoryEnabled, false);
  assert.equal(permission.allowed, false);
  assert.match(permission.reason, /disabled/i);
});

test("AI-suggested memory needs separate consent", () => {
  const { canPersistMemory } = loadPersonalCore();
  const permission = canPersistMemory(
    {
      memoryEnabled: true,
      allowAiSuggestions: false,
      retentionDays: 365,
      consentVersion: "nova-r2-privacy-v1"
    },
    { sourceKind: "ai_suggestion" }
  );

  assert.equal(permission.allowed, false);
  assert.match(permission.reason, /separate permission/i);
});

test("manual memory can persist after explicit consent", () => {
  const { canPersistMemory } = loadPersonalCore();
  const permission = canPersistMemory(
    {
      memoryEnabled: true,
      allowAiSuggestions: false,
      retentionDays: 365,
      consentVersion: "nova-r2-privacy-v1"
    },
    { sourceKind: "manual" }
  );

  assert.equal(permission.allowed, true);
});

test("personal core readiness counts life graph records separately from memories", () => {
  const { buildPersonalCoreReadiness } = loadPersonalCore();
  const readiness = buildPersonalCoreReadiness(
    {
      memoryEnabled: true,
      allowAiSuggestions: true,
      retentionDays: 90,
      consentVersion: "nova-r2-privacy-v1"
    },
    {
      interests: 2,
      goals: 1,
      habits: 3,
      relationships: 4,
      timeline: 5,
      memories: 6
    }
  );

  assert.equal(readiness.memoryStatus, "enabled");
  assert.equal(readiness.aiMemorySuggestions, "allowed");
  assert.equal(readiness.lifeGraphCount, 15);
  assert.equal(readiness.hasPersonalContext, true);
  assert.equal(readiness.retentionLabel, "90 days");
});

test("entry kinds route to the correct Supabase tables", () => {
  const { destinationForEntry } = loadPersonalCore();

  assert.equal(destinationForEntry("interest"), "nova_interests");
  assert.equal(destinationForEntry("goal"), "nova_goals");
  assert.equal(destinationForEntry("habit"), "nova_habits");
  assert.equal(destinationForEntry("relationship"), "nova_relationships");
  assert.equal(destinationForEntry("timeline"), "nova_timeline_events");
  assert.equal(destinationForEntry("memory"), "nova_memory_items");
});
