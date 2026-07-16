import test from "node:test";
import assert from "node:assert/strict";
import { createRequire } from "node:module";
import { readFileSync } from "node:fs";
import vm from "node:vm";
import ts from "typescript";

const require = createRequire(import.meta.url);

function loadTsModule(path) {
  const source = readFileSync(path, "utf8");
  const transpiled = ts.transpileModule(source, {
    compilerOptions: {
      module: ts.ModuleKind.CommonJS,
      target: ts.ScriptTarget.ES2020
    }
  }).outputText;
  const module = { exports: {} };
  vm.runInNewContext(transpiled, {
    module,
    exports: module.exports,
    require,
    String
  });
  return module.exports;
}

test("duty ledger starts at the current day and keeps chronological order", () => {
  const { currentLedgerDuties } = loadTsModule("lib/roster/ledger.ts");
  const rows = currentLedgerDuties(
    [
      { id: "past", duty_date: "2026-07-12", start_time: "23:00", end_time: "07:05" },
      { id: "future", duty_date: "2026-07-14", start_time: "15:00", end_time: "23:05" },
      { id: "day-ten", duty_date: "2026-07-22", start_time: "08:00", end_time: "16:05" },
      { id: "day-eleven", duty_date: "2026-07-23", start_time: "08:00", end_time: "16:05" },
      { id: "today-late", duty_date: "2026-07-13", start_time: "15:00", end_time: "23:05" },
      { id: "today-early", duty_date: "2026-07-13", start_time: "08:00", end_time: "16:05" }
    ],
    "2026-07-13"
  );

  assert.equal(JSON.stringify(rows.map((row) => row.id)), JSON.stringify(["today-early", "today-late", "future", "day-ten"]));
});

test("duty ledger keeps the rolling 10-day calendar window from today", () => {
  const { currentLedgerDuties } = loadTsModule("lib/roster/ledger.ts");
  const rows = currentLedgerDuties(
    [
      { id: "stale-yesterday", duty_date: "2026-07-15", start_time: "08:00", end_time: "16:05" },
      { id: "today", duty_date: "2026-07-16", start_time: "08:00", end_time: "16:05" },
      { id: "plus-nine", duty_date: "2026-07-25", start_time: "08:00", end_time: "16:05" },
      { id: "plus-ten", duty_date: "2026-07-26", start_time: "08:00", end_time: "16:05" }
    ],
    "2026-07-16"
  );

  assert.equal(rows[0].id, "today");
  assert.equal(rows.at(-1).id, "plus-nine");
  assert.equal(rows.some((row) => row.id === "stale-yesterday"), false);
  assert.equal(rows.some((row) => row.id === "plus-ten"), false);
});

test("shift code description combines roster code and shift label", () => {
  const { shiftCodeDescription } = loadTsModule("lib/roster/ledger.ts");

  assert.equal(shiftCodeDescription({ original_duty_code: "382G", duty_label: "Night Shift" }), "382G - Night Shift");
  assert.equal(shiftCodeDescription({ original_duty_code: "", duty_label: "Late Shift" }), "Late Shift");
});
