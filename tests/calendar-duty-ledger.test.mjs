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

test("Google Calendar duty events populate the current 10-day rollout", () => {
  const rows = calendarLedger.calendarItemsToLedgerDuties(
    [
      {
        id: "item-commute",
        source_event_id: "commute",
        title: "Commute to work",
        description: null,
        location: null,
        starts_at: "2026-07-16T20:55:00.000Z",
        ends_at: "2026-07-16T21:00:00.000Z",
        all_day_date: null,
        all_day_end_date: null,
        is_all_day: false,
        status: "confirmed",
        synced_at: "2026-07-16T02:50:11.000Z"
      },
      {
        id: "item-shift",
        source_event_id: "night",
        title: "Night Shift",
        description: null,
        location: "Utrecht",
        starts_at: "2026-07-16T21:00:00.000Z",
        ends_at: "2026-07-17T05:05:00.000Z",
        all_day_date: null,
        all_day_end_date: null,
        is_all_day: false,
        status: "confirmed",
        synced_at: "2026-07-16T02:50:11.000Z"
      },
      {
        id: "item-off",
        source_event_id: "off",
        title: "NS Off day",
        description: null,
        location: null,
        starts_at: null,
        ends_at: null,
        all_day_date: "2026-07-17",
        all_day_end_date: "2026-07-18",
        is_all_day: true,
        status: "confirmed",
        synced_at: "2026-07-16T02:50:11.000Z"
      }
    ],
    "2026-07-16",
    "Europe/Amsterdam"
  );

  assert.equal(rows.length, 2);
  assert.equal(rows[0].duty_date, "2026-07-16");
  assert.equal(rows[0].duty_label, "Night Shift");
  assert.equal(rows[0].start_time, "23:00");
  assert.equal(rows[0].end_time, "07:05");
  assert.equal(rows[0].source_kind, "google_calendar");
  assert.equal(rows[1].duty_date, "2026-07-17");
  assert.equal(rows[1].duty_label, "OFF Day");
  assert.equal(rows[1].original_duty_code, "NS");
});

test("Google Calendar rows replace roster rows for dates that have live calendar duties", () => {
  const merged = calendarLedger.mergeRosterAndCalendarLedgerDuties(
    [
      {
        id: "roster-stale",
        duty_date: "2026-07-16",
        start_time: null,
        end_time: null,
        duty_label: "OFF Day",
        original_duty_code: "R",
        location: null,
        is_overnight: false,
        is_off: true,
        is_sick_leave: false
      },
      {
        id: "roster-next",
        duty_date: "2026-07-18",
        start_time: "15:00",
        end_time: "23:05",
        duty_label: "Late Shift",
        original_duty_code: "L",
        location: null,
        is_overnight: false,
        is_off: false,
        is_sick_leave: false
      }
    ],
    [
      {
        id: "google-night",
        duty_date: "2026-07-16",
        start_time: "23:00",
        end_time: "07:05",
        duty_label: "Night Shift",
        original_duty_code: "",
        location: "Utrecht",
        is_overnight: true,
        is_off: false,
        is_sick_leave: false,
        source_kind: "google_calendar"
      }
    ],
    "2026-07-16"
  );

  assert.equal(merged.some((row) => row.id === "roster-stale"), false);
  assert.equal(merged.some((row) => row.id === "google-night"), true);
  assert.equal(merged.some((row) => row.id === "roster-next"), true);
});

test("Google Calendar service-code titles translate to plain language", () => {
  const row = calendarLedger.googleCalendarItemToLedgerDuty(
    {
      id: "item-service-code",
      source_event_id: "night-387x",
      title: "Nightshift-387X",
      description: null,
      location: null,
      starts_at: "2026-07-18T21:00:00.000Z",
      ends_at: "2026-07-19T05:05:00.000Z",
      all_day_date: null,
      all_day_end_date: null,
      is_all_day: false,
      status: "confirmed",
      synced_at: "2026-07-18T02:50:11.000Z"
    },
    "2026-07-18",
    "Europe/Amsterdam"
  );

  assert.equal(row.original_duty_code, "387X");
  assert.equal(row.duty_label, "Night Shift - Rtd - Gvc Hc");
  assert.equal(row.start_time, "23:00");
  assert.equal(row.end_time, "07:05");
});
