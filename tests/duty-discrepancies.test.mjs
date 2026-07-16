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
    Object,
    RegExp,
    Set,
    Map
  });
  return module.exports;
}

const dutyCodes = loadTsModule("lib/roster/duty-codes.ts");
const ledger = loadTsModule("lib/roster/ledger.ts", {
  "./duty-codes": dutyCodes
});
const calendarLedger = loadTsModule("lib/calendar/duty-ledger.ts", {
  "@/lib/roster/ledger": ledger,
  "@/lib/roster/duty-codes": dutyCodes
});
const discrepancies = loadTsModule("lib/calendar/duty-discrepancies.ts", {
  "@/lib/calendar/duty-ledger": calendarLedger
});

test("duty code catalogue describes canonical and loaded codes", () => {
  assert.match(dutyCodes.dutyCodeDescription({ original_duty_code: "VL", duty_label: "Vacation" }), /Vacation or approved leave day/);
  assert.match(dutyCodes.dutyCodeDescription({ original_duty_code: "382G", duty_label: "Asd - NH Mcn" }), /Asd - NH Mcn/);
  assert.match(dutyCodes.dutyCodeDescription({ original_duty_code: "ABC", duty_label: "Custom Duty" }), /Custom roster duty/);
});

test("reference table service codes resolve from 3-digit letter duty codes", () => {
  assert.equal(dutyCodes.findDutyCodeDefinition("110L").label, "LMP 1");
  assert.equal(dutyCodes.findDutyCodeDefinition("121L").label, "LMP 2");
  assert.equal(dutyCodes.findDutyCodeDefinition("340H").label, "Oost Mcn");
  assert.equal(dutyCodes.findDutyCodeDefinition("343A").label, "Asd - Flevo Hc");
  assert.equal(dutyCodes.findDutyCodeDefinition("364G").label, "NH - Hfdo Mcn");
  assert.equal(dutyCodes.findDutyCodeDefinition("367R").label, "Rtd Hc");
  assert.equal(dutyCodes.findDutyCodeDefinition("371U").label, "Ut Hc");
  assert.equal(dutyCodes.findDutyCodeDefinition("375X").label, "Gvc - Ledn Hc");
  assert.equal(dutyCodes.findDutyCodeDefinition("382G").label, "Asd - NH Mcn");
  assert.equal(dutyCodes.findDutyCodeDefinition("387X").label, "Rtd - Gvc Hc");
});

test("daily discrepancy plan corrects an unambiguous roster row from live Google Calendar", () => {
  const summary = discrepancies.planDailyDutyDiscrepancyActions({
    rosterDuties: [
      {
        id: "roster-1",
        duty_date: "2026-07-17",
        start_time: null,
        end_time: null,
        duty_label: "OFF Day",
        original_duty_code: "R",
        location: null,
        is_overnight: false,
        is_off: true,
        is_sick_leave: false
      }
    ],
    calendarItems: [
      {
        id: "calendar-1",
        source_event_id: "night-1",
        title: "Night Shift",
        description: null,
        location: "Utrecht",
        starts_at: "2026-07-17T21:00:00.000Z",
        ends_at: "2026-07-18T05:05:00.000Z",
        all_day_date: null,
        all_day_end_date: null,
        is_all_day: false,
        status: "confirmed",
        synced_at: "2026-07-17T00:05:00.000Z"
      }
    ],
    dutyWindow: { startDate: "2026-07-17", endDate: "2026-07-26" },
    timeZone: "Europe/Amsterdam"
  });

  assert.equal(summary.corrected, 1);
  assert.equal(summary.logged, 0);
  assert.equal(summary.actions[0].kind, "correct");
  assert.equal(summary.actions[0].dutyId, "roster-1");
  assert.equal(summary.actions[0].update.duty_label, "Night Shift");
  assert.equal(summary.actions[0].update.start_time, "23:00");
  assert.equal(summary.actions[0].update.end_time, "07:05");
  assert.equal(summary.actions[0].update.is_off, false);
});

test("daily discrepancy plan logs missing roster rows instead of guessing", () => {
  const summary = discrepancies.planDailyDutyDiscrepancyActions({
    rosterDuties: [],
    calendarItems: [
      {
        id: "calendar-1",
        source_event_id: "off-1",
        title: "NS Off day",
        description: null,
        location: null,
        starts_at: null,
        ends_at: null,
        all_day_date: "2026-07-17",
        all_day_end_date: "2026-07-18",
        is_all_day: true,
        status: "confirmed",
        synced_at: "2026-07-17T00:05:00.000Z"
      }
    ],
    dutyWindow: { startDate: "2026-07-17", endDate: "2026-07-26" },
    timeZone: "Europe/Amsterdam"
  });

  assert.equal(summary.corrected, 0);
  assert.equal(summary.logged, 1);
  assert.equal(summary.actions[0].conflictType, "roster_missing_live_calendar_duty");
});
