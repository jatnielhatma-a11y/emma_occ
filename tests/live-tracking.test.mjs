import test from "node:test";
import assert from "node:assert/strict";
import { createRequire } from "node:module";
import { readFileSync } from "node:fs";
import vm from "node:vm";
import ts from "typescript";

const require = createRequire(import.meta.url);

function loadModule(path, mocks = {}) {
  const source = readFileSync(path, "utf8");
  const transpiled = ts.transpileModule(source, {
    compilerOptions: {
      module: ts.ModuleKind.CommonJS,
      target: ts.ScriptTarget.ES2020
    }
  }).outputText;
  const module = { exports: {} };
  const customRequire = (id) => mocks[id] ?? require(id);
  vm.runInNewContext(transpiled, { module, exports: module.exports, require: customRequire, Math, Date });
  return module.exports;
}

const geofence = loadModule("lib/location/geofence.ts");
const { shouldSubmitLocationUpdate } = loadModule("lib/location/live-tracking.ts", {
  "./geofence": geofence
});

test("live GPS submits the first update immediately", () => {
  assert.equal(
    shouldSubmitLocationUpdate({
      nextPosition: { latitude: 52.37, longitude: 5.21, accuracyMeters: 25 },
      now: 1_000
    }),
    true
  );
});

test("live GPS suppresses duplicate nearby updates before cooldown", () => {
  assert.equal(
    shouldSubmitLocationUpdate({
      nextPosition: { latitude: 52.37001, longitude: 5.21001, accuracyMeters: 25 },
      lastSubmittedPosition: { latitude: 52.37, longitude: 5.21, accuracyMeters: 25 },
      lastSubmittedAt: 1_000,
      now: 20_000,
      intervalMs: 60_000,
      minDistanceMeters: 75
    }),
    false
  );
});

test("live GPS submits after meaningful movement before cooldown", () => {
  assert.equal(
    shouldSubmitLocationUpdate({
      nextPosition: { latitude: 52.371, longitude: 5.21, accuracyMeters: 25 },
      lastSubmittedPosition: { latitude: 52.37, longitude: 5.21, accuracyMeters: 25 },
      lastSubmittedAt: 1_000,
      now: 20_000,
      intervalMs: 60_000,
      minDistanceMeters: 75
    }),
    true
  );
});

test("live GPS submits routine updates after cooldown", () => {
  assert.equal(
    shouldSubmitLocationUpdate({
      nextPosition: { latitude: 52.37001, longitude: 5.21001, accuracyMeters: 25 },
      lastSubmittedPosition: { latitude: 52.37, longitude: 5.21, accuracyMeters: 25 },
      lastSubmittedAt: 1_000,
      now: 62_000,
      intervalMs: 60_000,
      minDistanceMeters: 75
    }),
    true
  );
});
