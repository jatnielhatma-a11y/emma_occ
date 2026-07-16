import { ledgerEndDate } from "../roster/ledger";

const DEFAULT_TIMEZONE = "Europe/Amsterdam";

function appTimezone(timeZone = process.env.APP_TIMEZONE || DEFAULT_TIMEZONE) {
  return timeZone;
}

function localDateTimeParts(now: Date, timeZone = appTimezone()) {
  const parts = new Intl.DateTimeFormat("en-GB", {
    timeZone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    hourCycle: "h23"
  }).formatToParts(now);

  const values = Object.fromEntries(parts.map((part) => [part.type, part.value]));
  return {
    date: `${values.year}-${values.month}-${values.day}`,
    hour: values.hour,
    minute: values.minute,
    timeZone
  };
}

export function appDateInTimezone(now = new Date(), timeZone = appTimezone()) {
  return localDateTimeParts(now, timeZone).date;
}

export function isLocalMidnightRefreshWindow(now = new Date(), timeZone = appTimezone()) {
  const parts = localDateTimeParts(now, timeZone);
  return parts.hour === "00" && parts.minute === "00";
}

export function dailyLedgerDutyWindow(now = new Date(), timeZone = appTimezone()) {
  const startDate = appDateInTimezone(now, timeZone);
  return {
    startDate,
    endDate: ledgerEndDate(startDate),
    timeZone
  };
}
