import test from "node:test";
import assert from "node:assert/strict";
import { createRequire } from "node:module";
import { readFileSync } from "node:fs";
import vm from "node:vm";
import ts from "typescript";

const require = createRequire(import.meta.url);

function loadCalendarModule() {
  const source = readFileSync("lib/roster/calendar.ts", "utf8");
  const transpiled = ts.transpileModule(source, {
    compilerOptions: {
      module: ts.ModuleKind.CommonJS,
      target: ts.ScriptTarget.ES2020
    }
  }).outputText;
  const module = { exports: {} };
  const localRequire = (specifier) => {
    if (specifier === "./core") return require("../lib/roster/core.js");
    return require(specifier);
  };
  vm.runInNewContext(transpiled, { module, exports: module.exports, require: localRequire });
  return module.exports;
}

const { buildCalendarEventDrafts } = loadCalendarModule();

function loadGoogleModule(calendarModule) {
  const moduleCache = new Map();
  function loadTsModule(path) {
    if (moduleCache.has(path)) return moduleCache.get(path);
    const source = readFileSync(path, "utf8");
    const transpiled = ts.transpileModule(source, {
      compilerOptions: {
        module: ts.ModuleKind.CommonJS,
        target: ts.ScriptTarget.ES2020
      }
    }).outputText;
    const module = { exports: {} };
    moduleCache.set(path, module.exports);
    const localRequire = (specifier) => {
      if (specifier === "../operations/resilience") return { resilientFetch: fetch };
      return require(specifier);
    };
    vm.runInNewContext(transpiled, { module, exports: module.exports, require: localRequire, process, Buffer, URLSearchParams, fetch, crypto: require("crypto") });
    moduleCache.set(path, module.exports);
    return module.exports;
  }

  const source = readFileSync("lib/calendar/google.ts", "utf8");
  const transpiled = ts.transpileModule(source, {
    compilerOptions: {
      module: ts.ModuleKind.CommonJS,
      target: ts.ScriptTarget.ES2020
    }
  }).outputText;
  const module = { exports: {} };
  const localRequire = (specifier) => {
    if (specifier === "@/lib/roster/calendar") return calendarModule;
    if (specifier === "@/lib/google/token-crypto") return loadTsModule("lib/google/token-crypto.ts");
    if (specifier === "@/lib/google/oauth") return loadTsModule("lib/google/oauth.ts");
    return require(specifier);
  };
  vm.runInNewContext(transpiled, { module, exports: module.exports, require: localRequire, process });
  return module.exports;
}

const { toGoogleCalendarEvent } = loadGoogleModule({ buildCalendarEventDrafts });

test("calendar drafts keep overnight duties in local roster time", () => {
  const duty = {
    date: "2026-07-10",
    startTime: "23:00",
    endTime: "07:05",
    originalDutyCode: "382G",
    dutyLabel: "Night Shift",
    location: "Utrecht",
    notes: "",
    sourceFile: "demo.csv",
    sourceRow: 2,
    isOff: false,
    isOvernight: true
  };

  const drafts = buildCalendarEventDrafts(duty, { enabled: true, beforeMinutes: 45, afterMinutes: 45 });

  assert.equal(drafts.length, 3);
  assert.equal(drafts[0].start, "2026-07-10T22:15:00");
  assert.equal(drafts[0].end, "2026-07-10T23:00:00");
  assert.equal(drafts[1].start, "2026-07-10T23:00:00");
  assert.equal(drafts[1].end, "2026-07-11T07:05:00");
  assert.equal(drafts[2].start, "2026-07-11T07:05:00");
  assert.equal(drafts[2].end, "2026-07-11T07:50:00");
});

test("NS commute mode is included in commute block descriptions", () => {
  const duty = {
    date: "2026-07-10",
    startTime: "23:00",
    endTime: "07:05",
    originalDutyCode: "382G",
    dutyLabel: "Night Shift",
    location: "Utrecht",
    notes: "",
    sourceFile: "demo.csv",
    sourceRow: 2,
    isOff: false,
    isOvernight: true
  };

  const drafts = buildCalendarEventDrafts(duty, {
    enabled: true,
    beforeMinutes: 45,
    afterMinutes: 45,
    travelMode: "ns",
    referenceUrl: "https://www.ns.nl/reisinformatie/actuele-situatie-op-het-spoor"
  });

  assert.match(drafts[0].description, /NS rail commute reference/);
  assert.match(drafts[0].description, /ns\.nl/);
  assert.match(drafts[2].description, /NS rail commute reference/);
});

test("off days are drafted as all-day calendar items", () => {
  const duty = {
    date: "2026-07-08",
    startTime: "",
    endTime: "",
    originalDutyCode: "OFF",
    dutyLabel: "OFF Day",
    location: "",
    notes: "",
    sourceFile: "demo.csv",
    sourceRow: 3,
    isOff: true,
    isOvernight: false
  };

  const [draft] = buildCalendarEventDrafts(duty);

  assert.equal(draft.title, "OFF Day");
  assert.equal(draft.start, null);
  assert.equal(draft.end, null);
  assert.equal(draft.allDayDate, "2026-07-08");

  const googleEvent = toGoogleCalendarEvent(draft);
  assert.equal(googleEvent.start.date, "2026-07-08");
  assert.equal(googleEvent.end.date, "2026-07-09");
  assert.equal(googleEvent.colorId, "10");
});
