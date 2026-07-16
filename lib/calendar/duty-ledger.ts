import type { AccountingDuty } from "@/lib/roster/accounting";
import { findDutyCodeDefinition } from "@/lib/roster/duty-codes";
import { currentLedgerDuties, ledgerEndDate } from "@/lib/roster/ledger";

export type GoogleCalendarDutyItem = {
  id: string;
  source_event_id: string;
  title: string;
  description: string | null;
  location: string | null;
  starts_at: string | null;
  ends_at: string | null;
  all_day_date: string | null;
  all_day_end_date: string | null;
  is_all_day: boolean;
  status: string;
  synced_at: string;
};

type CalendarLedgerDuty = AccountingDuty & {
  source_file?: string | null;
  source_calendar_event_id?: string | null;
  source_kind?: "google_calendar" | "roster";
};

const EXCLUDED_TITLE_PATTERNS = [/^commute to work$/i, /^commute home$/i, /learning reminder/i];
const DUTY_TITLE_PATTERNS = [
  /shift/i,
  /\boff\b/i,
  /off day/i,
  /rest day/i,
  /reserve/i,
  /vacation/i,
  /annual leave/i,
  /holiday/i,
  /vakantie/i,
  /verlof/i,
  /\bvl\b/i
];

function localParts(value: string, timeZone: string) {
  const parts = new Intl.DateTimeFormat("en-GB", {
    timeZone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    hourCycle: "h23"
  }).formatToParts(new Date(value));
  const values = Object.fromEntries(parts.map((part) => [part.type, part.value]));
  return {
    date: `${values.year}-${values.month}-${values.day}`,
    time: `${values.hour}:${values.minute}`
  };
}

function titleLooksLikeDuty(title: string) {
  const trimmed = title.trim();
  if (!trimmed || EXCLUDED_TITLE_PATTERNS.some((pattern) => pattern.test(trimmed))) return false;
  return DUTY_TITLE_PATTERNS.some((pattern) => pattern.test(trimmed));
}

function serviceCodeFromTitle(title: string) {
  return title.match(/\b(\d{3}[A-Z])\b/i)?.[1].toUpperCase() ?? null;
}

function shiftPrefixFromTitle(title: string) {
  const lower = title.toLowerCase();
  if (lower.includes("nightshift") || lower.includes("night shift")) return "Night Shift";
  if (lower.includes("lateshift") || lower.includes("late shift")) return "Late Shift";
  return null;
}

function dutyLabelFromTitle(title: string) {
  const normalized = title.trim();
  const lower = normalized.toLowerCase();
  const serviceCode = serviceCodeFromTitle(normalized);
  const serviceDefinition = findDutyCodeDefinition(serviceCode);
  const shiftPrefix = shiftPrefixFromTitle(normalized);
  if (serviceDefinition && shiftPrefix) return `${shiftPrefix} - ${serviceDefinition.label}`;
  if (serviceDefinition) return serviceDefinition.label;

  const codePrefix = normalized.match(/^([A-Z0-9*]{1,8})\s+-\s+/i)?.[1];
  const codeDefinition = findDutyCodeDefinition(codePrefix ?? normalized);
  if (codeDefinition) return codeDefinition.label;

  if (shiftPrefix) return shiftPrefix;
  if (lower.includes("off") || lower.includes("rest day")) return "OFF Day";
  if (lower.includes("vacation") || lower.includes("annual leave") || lower.includes("holiday") || lower.includes("vakantie") || lower.includes("verlof")) return "Vacation";
  if (lower.includes("reserve")) return "Reserve Duty";
  return normalized.replace(/^[A-Z0-9*]{1,8}\s+-\s+/i, "") || "Calendar Duty";
}

function dutyCodeFromTitle(title: string, label: string) {
  const trimmed = title.trim();
  const serviceCode = serviceCodeFromTitle(trimmed);
  if (serviceCode) return serviceCode;

  const codeMatch = trimmed.match(/^([A-Z0-9*]{1,8})\s+-\s+/i);
  if (codeMatch) return codeMatch[1].toUpperCase();
  if (label === "OFF Day" && /\bNS\b/i.test(trimmed)) return "NS";
  const definition = findDutyCodeDefinition(trimmed) ?? findDutyCodeDefinition(label);
  if (definition) return definition.code;
  return "";
}

function isOffDuty(label: string) {
  return label === "OFF Day" || label === "Vacation";
}

export function googleCalendarItemToLedgerDuty(item: GoogleCalendarDutyItem, today: string, timeZone = process.env.APP_TIMEZONE || "Europe/Amsterdam"): CalendarLedgerDuty | null {
  if (item.status === "cancelled" || !titleLooksLikeDuty(item.title)) return null;

  const label = dutyLabelFromTitle(item.title);
  const code = dutyCodeFromTitle(item.title, label);
  const start = item.starts_at ? localParts(item.starts_at, timeZone) : null;
  const end = item.ends_at ? localParts(item.ends_at, timeZone) : null;
  const rawDate = item.all_day_date ?? start?.date;
  if (!rawDate) return null;

  const carriesIntoToday = start?.date && end?.date && start.date < today && end.date >= today;
  const dutyDate = carriesIntoToday ? today : rawDate;
  const isOvernight = Boolean(start?.date && end?.date && start.date !== end.date);

  return {
    id: `google-calendar:${item.source_event_id}:${item.starts_at ?? item.all_day_date ?? item.id}`,
    duty_date: dutyDate,
    start_time: item.is_all_day ? null : start?.time ?? null,
    end_time: item.is_all_day ? null : end?.time ?? null,
    duty_label: label,
    original_duty_code: code,
    location: item.location,
    is_overnight: isOvernight,
    is_off: item.is_all_day || isOffDuty(label),
    is_sick_leave: false,
    source_file: "Google Calendar live sync",
    source_calendar_event_id: item.source_event_id,
    source_kind: "google_calendar"
  };
}

function mergeKey(duty: Pick<AccountingDuty, "duty_date" | "start_time" | "end_time" | "duty_label">) {
  return [duty.duty_date, duty.start_time ?? "", duty.end_time ?? "", duty.duty_label.toLowerCase()].join("|");
}

function preferCalendarDuty(candidate: CalendarLedgerDuty, existing?: CalendarLedgerDuty) {
  if (!existing) return candidate;
  if (existing.location && !candidate.location) return existing;
  return candidate;
}

export function calendarItemsToLedgerDuties(items: GoogleCalendarDutyItem[], today: string, timeZone = process.env.APP_TIMEZONE || "Europe/Amsterdam") {
  const mapped = items
    .map((item) => googleCalendarItemToLedgerDuty(item, today, timeZone))
    .filter((item): item is CalendarLedgerDuty => Boolean(item));
  const deduped = new Map<string, CalendarLedgerDuty>();
  for (const duty of mapped) {
    deduped.set(mergeKey(duty), preferCalendarDuty(duty, deduped.get(mergeKey(duty))));
  }
  return [...deduped.values()];
}

export function mergeRosterAndCalendarLedgerDuties<T extends AccountingDuty>(
  rosterDuties: T[],
  calendarDuties: CalendarLedgerDuty[],
  today: string
): Array<T | CalendarLedgerDuty> {
  const end = ledgerEndDate(today);
  const calendarDates = new Set(calendarDuties.map((duty) => duty.duty_date));
  const rosterOutsideCalendarDates = rosterDuties.filter((duty) => {
    if (duty.duty_date < today || duty.duty_date > end) return true;
    return !calendarDates.has(duty.duty_date);
  });

  return currentLedgerDuties([...rosterOutsideCalendarDates, ...calendarDuties], today);
}
