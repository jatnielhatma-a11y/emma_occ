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
    Object,
    Set,
    String
  });
  return module.exports;
}

function loadNovaModules() {
  return loadTsModule("lib/nova/modules.ts");
}

function loadNovaFoundation() {
  const modules = loadNovaModules();
  return loadTsModule("lib/nova/foundation.ts", {
    "./modules": modules
  });
}

test("Release 1 preserves Emma OCC as an active NOVA module", () => {
  const { getActiveNovaModules } = loadNovaModules();
  const emmaOcc = getActiveNovaModules().find((module) => module.id === "emma-occ");

  assert.ok(emmaOcc);
  assert.equal(emmaOcc.status, "active");
  assert.equal(emmaOcc.preservesEmmaOcc, true);
  assert.ok(emmaOcc.capabilities.includes("Mission Control dashboard"));
  assert.ok(emmaOcc.capabilities.includes("NS commute reference"));
});

test("foundation registry covers required integrations and platform capabilities", () => {
  const { REQUIRED_FOUNDATION_CAPABILITIES, getMissingFoundationCapabilities } = loadNovaModules();

  assert.equal(REQUIRED_FOUNDATION_CAPABILITIES.length >= 10, true);
  assert.equal(getMissingFoundationCapabilities().length, 0);
});

test("future NOVA releases stay planned after Release 4 activation", () => {
  const { NOVA_RELEASES, getPlannedNovaModules } = loadNovaModules();
  const futureReleases = NOVA_RELEASES.filter((release) => release.id > 4);
  const plannedModuleIds = new Set(getPlannedNovaModules().map((module) => module.id));

  assert.equal(NOVA_RELEASES.find((release) => release.id === 2)?.status, "active");
  assert.equal(NOVA_RELEASES.find((release) => release.id === 3)?.status, "active");
  assert.equal(NOVA_RELEASES.find((release) => release.id === 4)?.status, "active");
  assert.ok(futureReleases.every((release) => release.status === "planned"));
  assert.ok(plannedModuleIds.has("nova-intelligence-platform"));
});

test("foundation summary reports readiness with Emma OCC preserved", () => {
  const { buildNovaFoundationSummary, getFoundationReadinessLabel } = loadNovaFoundation();
  const summary = buildNovaFoundationSummary();

  assert.equal(getFoundationReadinessLabel(), "Foundation ready");
  assert.equal(summary.emmaOccPreserved, true);
  assert.equal(summary.missingCapabilities.length, 0);
  assert.equal(summary.activeModules.some((module) => module.id === "privacy-first-memory"), true);
});
