import test from "node:test";
import assert from "node:assert/strict";
import {
  buildCalendarFingerprint,
  classifyDuty,
  compareImports,
  detectConflicts,
  parseRosterText
} from "../lib/roster/core.js";

test("classifies exact night shift rule and overnight flag", () => {
  const duty = classifyDuty({
    date: "2026-07-08",
    startTime: "23:00",
    endTime: "07:05",
    dutyCode: "N"
  });

  assert.equal(duty.dutyLabel, "Night Shift");
  assert.equal(duty.isOvernight, true);
  assert.equal(duty.originalDutyCode, "N");
});

test("classifies exact late shift rule", () => {
  const duty = classifyDuty({
    date: "2026-07-08",
    startTime: "15:00",
    endTime: "23:05",
    dutyCode: "L"
  });

  assert.equal(duty.dutyLabel, "Late Shift");
  assert.equal(duty.isOvernight, false);
});

test("detects off day from rest, dash, and empty time rules", () => {
  assert.equal(classifyDuty({ date: "2026-07-08", dutyCode: "Rest" }).dutyLabel, "OFF Day");
  assert.equal(classifyDuty({ date: "2026-07-08", dutyCode: "-" }).isOff, true);
  assert.equal(classifyDuty({ date: "2026-07-08", dutyCode: "" }).isOff, true);
});

test("prepares stable calendar fingerprints for duplicate prevention", () => {
  const duty = classifyDuty({
    date: "2026-07-08",
    startTime: "15:00",
    endTime: "23:05",
    dutyCode: "LATE",
    location: "AMS"
  });

  assert.equal(buildCalendarFingerprint(duty), "2026-07-08|15:00|23:05|Late Shift|LATE|AMS");
});

test("detects overlap, duplicate duties, and rest issues", () => {
  const duties = [
    classifyDuty({ date: "2026-07-08", startTime: "09:00", endTime: "17:00", dutyCode: "A" }),
    classifyDuty({ date: "2026-07-08", startTime: "09:00", endTime: "17:00", dutyCode: "A" }),
    classifyDuty({ date: "2026-07-08", startTime: "16:00", endTime: "22:00", dutyCode: "B" }),
    classifyDuty({ date: "2026-07-09", startTime: "05:00", endTime: "12:00", dutyCode: "C" })
  ];

  const conflictTypes = detectConflicts(duties).map((conflict) => conflict.conflictType);
  assert.ok(conflictTypes.includes("duplicate_duty"));
  assert.ok(conflictTypes.includes("overlapping_duties"));
  assert.ok(conflictTypes.includes("too_little_rest"));
});

test("compares imports by roster date", () => {
  const previous = [
    classifyDuty({ date: "2026-07-08", startTime: "15:00", endTime: "23:05", dutyCode: "LATE" }),
    classifyDuty({ date: "2026-07-09", dutyCode: "Rest" })
  ];
  const next = [
    classifyDuty({ date: "2026-07-08", startTime: "23:00", endTime: "07:05", dutyCode: "NIGHT" }),
    classifyDuty({ date: "2026-07-10", dutyCode: "Rest" })
  ];

  const comparison = compareImports(previous, next);
  assert.equal(comparison.changed.length, 1);
  assert.equal(comparison.added.length, 1);
  assert.equal(comparison.removed.length, 1);
  assert.deepEqual(comparison.dateRange, { start: "2026-07-08", end: "2026-07-10" });
});

test("parses demo csv into normalized duties", () => {
  const duties = parseRosterText(`Date,Start time,End time,Duty code,Duty label,Location,Notes
2026-07-08,23:00,07:05,NIGHT,,AMS OCC,Overnight
2026-07-09,,,Rest,,,`);

  assert.equal(duties.length, 2);
  assert.equal(duties[0].dutyLabel, "Night Shift");
  assert.equal(duties[1].isOff, true);
});
