import test from "node:test";
import assert from "node:assert/strict";
import { createRequire } from "node:module";
import { readFileSync } from "node:fs";
import vm from "node:vm";
import ts from "typescript";

const require = createRequire(import.meta.url);

function loadGeofenceModule() {
  const source = readFileSync("lib/location/geofence.ts", "utf8");
  const transpiled = ts.transpileModule(source, {
    compilerOptions: {
      module: ts.ModuleKind.CommonJS,
      target: ts.ScriptTarget.ES2020
    }
  }).outputText;
  const module = { exports: {} };
  vm.runInNewContext(transpiled, { module, exports: module.exports, require, Math });
  return module.exports;
}

const { distanceMeters, findNearestGeofence, inferCommutePhase, eventTypeForMatch } = loadGeofenceModule();

const locations = [
  {
    id: "home",
    label: "Home",
    kind: "home",
    latitude: 52.3705,
    longitude: 5.217,
    radiusMeters: 160
  },
  {
    id: "almere",
    label: "Almere Centrum",
    kind: "station",
    latitude: 52.375,
    longitude: 5.2176,
    radiusMeters: 350
  },
  {
    id: "utrecht",
    label: "Utrecht Centraal",
    kind: "station",
    latitude: 52.0894,
    longitude: 5.1103,
    radiusMeters: 350
  }
];

test("calculates realistic distance between nearby GPS points", () => {
  const meters = distanceMeters(
    { latitude: 52.3705, longitude: 5.217 },
    { latitude: 52.3715, longitude: 5.217 }
  );

  assert.ok(meters > 100);
  assert.ok(meters < 120);
});

test("matches the nearest geofence and confirms when accuracy is good", () => {
  const match = findNearestGeofence(
    {
      latitude: 52.375,
      longitude: 5.2176,
      accuracyMeters: 35
    },
    locations
  );

  assert.equal(match.location.label, "Almere Centrum");
  assert.equal(match.confirmed, true);
  assert.equal(eventTypeForMatch(match), "enter");
});

test("infers outbound and return commute phases from station geofences", () => {
  const almereMatch = findNearestGeofence(
    {
      latitude: 52.375,
      longitude: 5.2176,
      accuracyMeters: 35
    },
    locations
  );
  const utrechtMatch = findNearestGeofence(
    {
      latitude: 52.0894,
      longitude: 5.1103,
      accuracyMeters: 35
    },
    locations
  );

  assert.equal(inferCommutePhase({ match: almereMatch, direction: "outbound" }), "at_origin_station");
  assert.equal(inferCommutePhase({ match: utrechtMatch, direction: "outbound" }), "at_destination_station");
  assert.equal(inferCommutePhase({ match: utrechtMatch, direction: "return" }), "at_origin_station");
  assert.equal(inferCommutePhase({ match: almereMatch, direction: "return" }), "at_destination_station");
});
