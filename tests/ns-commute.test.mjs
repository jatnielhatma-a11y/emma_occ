import test from "node:test";
import assert from "node:assert/strict";
import { createRequire } from "node:module";
import { readFileSync } from "node:fs";
import vm from "node:vm";
import ts from "typescript";

const require = createRequire(import.meta.url);

function loadNsModule() {
  const source = readFileSync("lib/ns-commute.ts", "utf8");
  const transpiled = ts.transpileModule(source, {
    compilerOptions: {
      module: ts.ModuleKind.CommonJS,
      target: ts.ScriptTarget.ES2020
    }
  }).outputText;
  const module = { exports: {} };
  vm.runInNewContext(transpiled, { module, exports: module.exports, require, URLSearchParams, Date });
  return module.exports;
}

const { analyzeNsCommuteHtml, build9292PlannerUrl, buildGoogleMapsUrl, buildNsPlannerUrl } = loadNsModule();

test("builds NS planner links for both commute directions", () => {
  const url = buildNsPlannerUrl("Amsterdam Centraal", "Utrecht Centraal");

  assert.match(url, /ns\.nl\/reisplanner/);
  assert.match(url, /Amsterdam\+Centraal/);
  assert.match(url, /Utrecht\+Centraal/);
});

test("alerts when disruption and platform language appears near commute stations", () => {
  const html = `<html><title>Actuele situatie op het spoor | NS</title><body>
    Utrecht Centraal: door een storing en spoorwijziging vertrekken treinen vanaf een ander spoor.
  </body></html>`;

  const status = analyzeNsCommuteHtml({
    html,
    homeStation: "Amsterdam Centraal",
    workStation: "Utrecht Centraal",
    checkedAt: "2026-07-07T10:00:00.000Z"
  });

  assert.equal(status.status, "attention");
  assert.ok(status.alerts.some((alert) => alert.title.includes("Platform change")));
  assert.ok(status.alerts.some((alert) => alert.title.includes("NS disruption")));
  assert.equal(status.options[0].id, "9292-ov");
  assert.equal(status.options[1].id, "google-transit");
  assert.equal(status.options[2].id, "ns-train");
});

test("prompts for stations before route-specific alerts", () => {
  const status = analyzeNsCommuteHtml({
    html: "<html><title>Actuele situatie op het spoor | NS</title><body></body></html>",
    checkedAt: "2026-07-07T10:00:00.000Z"
  });

  assert.equal(status.status, "needs-route");
  assert.equal(status.toWorkUrl, null);
  assert.equal(status.alerts[0].title, "Route stations needed");
  assert.equal(status.options[0].id, "9292-ov");
});

test("ranks NS first when the route status is clear", () => {
  const status = analyzeNsCommuteHtml({
    html: "<html><title>Actuele situatie op het spoor | NS</title><body>Geen actuele storing rond de route.</body></html>",
    homeStation: "Amsterdam Centraal",
    workStation: "Utrecht Centraal",
    checkedAt: "2026-07-07T10:00:00.000Z"
  });

  assert.equal(status.status, "clear");
  assert.equal(status.options[0].id, "ns-train");
  assert.equal(status.options[1].id, "9292-ov");
});

test("builds Google Maps route links for commute comparison", () => {
  const url = buildGoogleMapsUrl("Amsterdam Centraal", "Utrecht Centraal", "transit");

  assert.match(url, /google\.com\/maps\/dir/);
  assert.match(url, /api=1/);
  assert.match(url, /travelmode=transit/);
  assert.match(url, /Amsterdam\+Centraal/);
  assert.match(url, /Utrecht\+Centraal/);
});

test("builds route-aware 9292 planner links", () => {
  const url = build9292PlannerUrl("Lemmerstraat 18, Almere", "Admiraal Helfrichlaan 1, Utrecht");

  assert.match(url, /9292\.nl\/en\/planner/);
  assert.match(url, /Lemmerstraat\+18/);
  assert.match(url, /Admiraal\+Helfrichlaan\+1/);
  assert.match(url, /time=now/);
});

test("uses door-to-door addresses for Google commute options", () => {
  const status = analyzeNsCommuteHtml({
    html: "<html><title>Actuele situatie op het spoor | NS</title><body>Geen actuele storing rond de route.</body></html>",
    homeStation: "Almere Centrum",
    workStation: "Utrecht Centraal",
    homeAddress: "Lemmerstraat 18, 1324 BP Almere, Netherlands",
    workAddress: "Admiraal Helfrichlaan 1, 3527 KV Utrecht, Netherlands",
    checkedAt: "2026-07-07T10:00:00.000Z"
  });

  const transit = status.options.find((option) => option.id === "google-transit");

  assert.match(transit.toWorkUrl, /Lemmerstraat\+18/);
  assert.match(transit.toWorkUrl, /Admiraal\+Helfrichlaan\+1/);
  assert.match(transit.toHomeUrl, /1324\+BP\+Almere/);

  const ov9292 = status.options.find((option) => option.id === "9292-ov");

  assert.match(ov9292.toWorkUrl, /9292\.nl\/en\/planner/);
  assert.match(ov9292.toWorkUrl, /Lemmerstraat\+18/);
});
