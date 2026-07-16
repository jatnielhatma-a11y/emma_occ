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
    process,
    Date,
    Intl,
    Object
  });
  return module.exports;
}

const dutyCodes = loadTsModule("lib/roster/duty-codes.ts");
const ledger = loadTsModule("lib/roster/ledger.ts", {
  "./duty-codes": dutyCodes
});
const scheduler = loadTsModule("lib/calendar/daily-ledger-sync.ts", {
  "../roster/ledger": ledger
});

test("daily ledger sync window starts at Amsterdam local date and spans 10 days", () => {
  const window = scheduler.dailyLedgerDutyWindow(new Date("2026-07-15T22:00:00.000Z"), "Europe/Amsterdam");

  assert.equal(window.startDate, "2026-07-16");
  assert.equal(window.endDate, "2026-07-25");
  assert.equal(window.timeZone, "Europe/Amsterdam");
});

test("daily ledger sync only runs at Amsterdam midnight across summer and winter offsets", () => {
  assert.equal(scheduler.isLocalMidnightRefreshWindow(new Date("2026-07-15T22:00:00.000Z"), "Europe/Amsterdam"), true);
  assert.equal(scheduler.isLocalMidnightRefreshWindow(new Date("2026-01-15T23:00:00.000Z"), "Europe/Amsterdam"), true);
  assert.equal(scheduler.isLocalMidnightRefreshWindow(new Date("2026-07-15T23:00:00.000Z"), "Europe/Amsterdam"), false);
  assert.equal(scheduler.isLocalMidnightRefreshWindow(new Date("2026-01-15T22:00:00.000Z"), "Europe/Amsterdam"), false);
});
