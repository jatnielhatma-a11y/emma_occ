import { buildCalendarFingerprint } from "./core";
import type { NormalizedDuty } from "./types";

export type CalendarEventDraft = {
  idempotencyKey: string;
  title: string;
  description: string;
  start: string | null;
  end: string | null;
  allDayDate: string | null;
  colorKey: "night" | "late" | "off" | "custom" | "commute";
};

export type CommuteDraftSettings = {
  enabled: boolean;
  beforeMinutes: number;
  afterMinutes: number;
  travelMode?: "manual" | "ns";
  referenceUrl?: string;
  toWorkUrl?: string | null;
  toHomeUrl?: string | null;
};

function pad(value: number) {
  return String(value).padStart(2, "0");
}

function addDays(date: string, days: number) {
  const next = new Date(`${date}T00:00:00.000Z`);
  next.setUTCDate(next.getUTCDate() + days);
  return next.toISOString().slice(0, 10);
}

function addMinutes(localDateTime: string, minutes: number) {
  const [datePart, timePart] = localDateTime.split("T");
  const [hours, mins] = timePart.split(":").map(Number);
  const next = new Date(`${datePart}T00:00:00.000Z`);
  next.setUTCMinutes(hours * 60 + mins + minutes);
  return `${next.getUTCFullYear()}-${pad(next.getUTCMonth() + 1)}-${pad(next.getUTCDate())}T${pad(next.getUTCHours())}:${pad(
    next.getUTCMinutes()
  )}:00`;
}

function dutyDateTime(duty: NormalizedDuty, time: string, addDay = false) {
  if (!time) return null;
  const date = addDay ? addDays(duty.date, 1) : duty.date;
  return `${date}T${time}:00`;
}

export function calendarTitleForDuty(duty: NormalizedDuty) {
  const code = duty.originalDutyCode.trim();
  const label = duty.dutyLabel.trim() || "Custom Duty";

  if (!code || code.toLowerCase() === label.toLowerCase()) return label;
  return `${code} - ${label}`;
}

export function buildCalendarEventDrafts(
  duty: NormalizedDuty,
  commute: CommuteDraftSettings = { enabled: true, beforeMinutes: 45, afterMinutes: 45, travelMode: "manual" }
): CalendarEventDraft[] {
  const fingerprint = buildCalendarFingerprint(duty);
  const startDate = dutyDateTime(duty, duty.startTime);
  const endDate = dutyDateTime(duty, duty.endTime, duty.isOvernight);
  const title = calendarTitleForDuty(duty);
  const event: CalendarEventDraft = {
    idempotencyKey: `duty:${fingerprint}`,
    title,
    description: [
      `Shift code description: ${title}`,
      `Duty code: ${duty.originalDutyCode || "n/a"}`,
      `Label: ${duty.dutyLabel}`,
      duty.location ? `Location: ${duty.location}` : "",
      duty.notes ? `Notes: ${duty.notes}` : "",
      duty.sourceFile ? `Source import: ${duty.sourceFile}` : ""
    ]
      .filter(Boolean)
      .join("\n"),
    start: startDate,
    end: endDate,
    allDayDate: duty.isOff ? duty.date : null,
    colorKey:
      duty.dutyLabel === "Night Shift"
        ? "night"
        : duty.dutyLabel === "Late Shift"
          ? "late"
          : duty.dutyLabel === "OFF Day"
            ? "off"
            : "custom"
  };

  if (duty.isOff || !commute.enabled || !startDate || !endDate) {
    return [event];
  }

  const commuteSource =
    commute.travelMode === "ns"
      ? `NS rail commute reference${commute.referenceUrl ? `: ${commute.referenceUrl}` : "."}`
      : "Manual commute buffer.";
  const toWorkSource =
    commute.travelMode === "ns" && commute.toWorkUrl ? `NS rail commute reference: ${commute.toWorkUrl}` : commuteSource;
  const toHomeSource =
    commute.travelMode === "ns" && commute.toHomeUrl ? `NS rail commute reference: ${commute.toHomeUrl}` : commuteSource;

  return [
    {
      idempotencyKey: `commute-to:${fingerprint}`,
      title: "Commute to work",
      description: `Commute block for ${title}. ${toWorkSource} Source import: ${duty.sourceFile || "n/a"}`,
      start: addMinutes(startDate, -commute.beforeMinutes),
      end: startDate,
      allDayDate: null,
      colorKey: "commute"
    },
    event,
    {
      idempotencyKey: `commute-home:${fingerprint}`,
      title: "Commute home",
      description: `Commute block for ${title}. ${toHomeSource} Source import: ${duty.sourceFile || "n/a"}`,
      start: endDate,
      end: addMinutes(endDate, commute.afterMinutes),
      allDayDate: null,
      colorKey: "commute"
    }
  ];
}
