import test from "node:test";
import assert from "node:assert/strict";
import { createRequire } from "node:module";
import { readFileSync } from "node:fs";
import vm from "node:vm";
import ts from "typescript";

const require = createRequire(import.meta.url);

function loadAccountingModule() {
  const source = readFileSync("lib/roster/accounting.ts", "utf8");
  const transpiled = ts.transpileModule(source, {
    compilerOptions: {
      module: ts.ModuleKind.CommonJS,
      target: ts.ScriptTarget.ES2020
    }
  }).outputText;
  const module = { exports: {} };
  vm.runInNewContext(transpiled, { module, exports: module.exports, require });
  return module.exports;
}

const { calculateDutyAccounting, formatDutyMinutes, isVacationDuty } = loadAccountingModule();

const duties = [
  {
    id: "late-1",
    duty_date: "2026-07-06",
    start_time: "15:00",
    end_time: "23:05",
    duty_label: "Late Shift",
    original_duty_code: "LATE",
    location: "AMS",
    is_overnight: false,
    is_off: false
  },
  {
    id: "vac-1",
    duty_date: "2026-07-07",
    start_time: null,
    end_time: null,
    duty_label: "Vacation",
    original_duty_code: "VAC",
    location: null,
    is_overnight: false,
    is_off: false
  },
  {
    id: "night-1",
    duty_date: "2026-07-10",
    start_time: "23:00",
    end_time: "07:05",
    duty_label: "Night Shift",
    original_duty_code: "382G",
    location: "Utrecht",
    is_overnight: true,
    is_off: false
  },
  {
    id: "off-1",
    duty_date: "2026-07-11",
    start_time: null,
    end_time: null,
    duty_label: "OFF Day",
    original_duty_code: "OFF",
    location: null,
    is_overnight: false,
    is_off: true
  }
];

test("detects vacation by roster label and code", () => {
  assert.equal(isVacationDuty(duties[1]), true);
  assert.equal(isVacationDuty(duties[0]), false);
});

test("calculates adjusted duties, sick leave, and vacation hours", () => {
  const accounting = calculateDutyAccounting(duties, new Set(["night-1"]), "2026-07-07");

  assert.equal(accounting.workingDutyDaysBeforeLeave, 2);
  assert.equal(accounting.adjustedDutyDays, 1);
  assert.equal(accounting.adjustedDutyMinutes, 485);
  assert.equal(accounting.sickLeaveDays, 1);
  assert.equal(accounting.sickLeaveMinutes, 485);
  assert.equal(accounting.vacationDaysToDate, 1);
  assert.equal(accounting.vacationMinutesToDate, 485);
});

test("formats duty-minute totals as hours and minutes", () => {
  assert.equal(formatDutyMinutes(485), "8h 05m");
  assert.equal(formatDutyMinutes(970), "16h 10m");
});
