import { calendarItemsToLedgerDuties, type GoogleCalendarDutyItem } from "@/lib/calendar/duty-ledger";
import type { AccountingDuty } from "@/lib/roster/accounting";

type SupabaseLike = {
  from: (table: string) => any;
};

type DutyWindow = {
  startDate: string;
  endDate: string;
};

type RosterDutyRow = AccountingDuty & {
  import_id?: string | null;
  notes?: string | null;
  manual_label_override?: boolean | null;
};

type DiscrepancyAction = {
  kind: "correct" | "log";
  date: string;
  severity: "Low" | "Medium" | "High" | "Critical";
  conflictType: string;
  title: string;
  detail: string;
  dutyId?: string;
  update?: Record<string, string | boolean | null>;
};

export type DailyDutyDiscrepancySummary = {
  checkedDates: number;
  calendarDutyRows: number;
  rosterDutyRows: number;
  corrected: number;
  logged: number;
  skipped: number;
  actions: DiscrepancyAction[];
};

function addDays(date: string, days: number) {
  const next = new Date(`${date}T00:00:00.000Z`);
  next.setUTCDate(next.getUTCDate() + days);
  return next.toISOString().slice(0, 10);
}

function datesInWindow(window: DutyWindow) {
  const dates = [];
  for (let date = window.startDate; date <= window.endDate; date = addDays(date, 1)) {
    dates.push(date);
  }
  return dates;
}

function byDate<T extends { duty_date: string }>(rows: T[]) {
  return rows.reduce<Record<string, T[]>>((grouped, row) => {
    grouped[row.duty_date] = [...(grouped[row.duty_date] ?? []), row];
    return grouped;
  }, {});
}

function cleanTime(value: string | null | undefined) {
  return value?.slice(0, 5) ?? null;
}

function cleanCode(value: string | null | undefined) {
  return value?.trim() ?? "";
}

function dutyFingerprint(duty: Pick<AccountingDuty, "start_time" | "end_time" | "duty_label" | "original_duty_code" | "is_off" | "is_overnight" | "location">) {
  return {
    start_time: cleanTime(duty.start_time),
    end_time: cleanTime(duty.end_time),
    duty_label: duty.duty_label.trim(),
    original_duty_code: cleanCode(duty.original_duty_code),
    is_off: Boolean(duty.is_off),
    is_overnight: Boolean(duty.is_overnight),
    location: duty.location?.trim() || null
  };
}

function correctionUpdate(roster: RosterDutyRow, calendar: AccountingDuty) {
  const rosterFingerprint = dutyFingerprint(roster);
  const calendarFingerprint = dutyFingerprint(calendar);
  const update: Record<string, string | boolean | null> = {};

  if (roster.manual_label_override) return update;
  if (rosterFingerprint.start_time !== calendarFingerprint.start_time) update.start_time = calendarFingerprint.start_time;
  if (rosterFingerprint.end_time !== calendarFingerprint.end_time) update.end_time = calendarFingerprint.end_time;
  if (rosterFingerprint.duty_label !== calendarFingerprint.duty_label) update.duty_label = calendarFingerprint.duty_label;
  if (calendarFingerprint.original_duty_code && rosterFingerprint.original_duty_code !== calendarFingerprint.original_duty_code) {
    update.original_duty_code = calendarFingerprint.original_duty_code;
  }
  if (rosterFingerprint.is_off !== calendarFingerprint.is_off) update.is_off = calendarFingerprint.is_off;
  if (rosterFingerprint.is_overnight !== calendarFingerprint.is_overnight) update.is_overnight = calendarFingerprint.is_overnight;
  if (calendarFingerprint.location && rosterFingerprint.location !== calendarFingerprint.location) update.location = calendarFingerprint.location;

  return update;
}

function describeUpdate(update: Record<string, string | boolean | null>) {
  const fields = Object.keys(update);
  return fields.length ? `Corrected ${fields.join(", ")} from live Google Calendar.` : "";
}

export function planDailyDutyDiscrepancyActions({
  rosterDuties,
  calendarItems,
  dutyWindow,
  timeZone = process.env.APP_TIMEZONE || "Europe/Amsterdam"
}: {
  rosterDuties: RosterDutyRow[];
  calendarItems: GoogleCalendarDutyItem[];
  dutyWindow: DutyWindow;
  timeZone?: string;
}): DailyDutyDiscrepancySummary {
  const dates = datesInWindow(dutyWindow);
  const calendarDuties = calendarItemsToLedgerDuties(calendarItems, dutyWindow.startDate, timeZone);
  const rosterByDate = byDate(rosterDuties);
  const calendarByDate = byDate(calendarDuties);
  const actions: DiscrepancyAction[] = [];
  let skipped = 0;

  for (const date of dates) {
    const rosterRows = rosterByDate[date] ?? [];
    const calendarRows = calendarByDate[date] ?? [];

    if (!rosterRows.length && !calendarRows.length) {
      skipped += 1;
      continue;
    }

    if (!rosterRows.length && calendarRows.length) {
      actions.push({
        kind: "log",
        date,
        severity: "High",
        conflictType: "roster_missing_live_calendar_duty",
        title: "Roster duty missing",
        detail: `${date} has ${calendarRows.length} live Google Calendar duty row(s), but no imported roster duty row.`
      });
      continue;
    }

    if (rosterRows.length && !calendarRows.length) {
      actions.push({
        kind: "log",
        date,
        severity: "Medium",
        conflictType: "calendar_missing_roster_duty",
        title: "Google Calendar duty missing",
        detail: `${date} has ${rosterRows.length} imported roster duty row(s), but no matching live Google Calendar duty row.`
      });
      continue;
    }

    if (rosterRows.length !== 1 || calendarRows.length !== 1) {
      actions.push({
        kind: "log",
        date,
        severity: "Medium",
        conflictType: "ambiguous_roster_calendar_discrepancy",
        title: "Ambiguous roster/calendar duty match",
        detail: `${date} has ${rosterRows.length} roster row(s) and ${calendarRows.length} Google Calendar duty row(s). Manual review required.`
      });
      continue;
    }

    const update = correctionUpdate(rosterRows[0], calendarRows[0]);
    const detail = describeUpdate(update);
    if (!detail) {
      skipped += 1;
      continue;
    }

    actions.push({
      kind: "correct",
      date,
      severity: "Low",
      conflictType: "roster_calendar_discrepancy_corrected",
      title: "Roster corrected from Google Calendar",
      detail,
      dutyId: rosterRows[0].id,
      update
    });
  }

  return {
    checkedDates: dates.length,
    calendarDutyRows: calendarDuties.length,
    rosterDutyRows: rosterDuties.length,
    corrected: actions.filter((action) => action.kind === "correct").length,
    logged: actions.filter((action) => action.kind === "log").length,
    skipped,
    actions
  };
}

async function insertConflictOnce({
  supabase,
  userId,
  importId,
  action
}: {
  supabase: SupabaseLike;
  userId: string;
  importId: string | null;
  action: DiscrepancyAction;
}) {
  const { data: existing = [] } = await supabase
    .from("conflict_logs")
    .select("id")
    .eq("user_id", userId)
    .eq("conflict_type", action.conflictType)
    .eq("detail", action.detail)
    .is("resolved_at", null)
    .limit(1);

  if (existing?.length) return false;

  await supabase.from("conflict_logs").insert({
    user_id: userId,
    import_id: importId,
    duty_id: action.dutyId ?? null,
    severity: action.severity,
    conflict_type: action.conflictType,
    title: action.title,
    detail: action.detail,
    resolved_at: action.kind === "correct" ? new Date().toISOString() : null
  });

  return true;
}

export async function reconcileDailyDutyDiscrepancies({
  supabase,
  userId,
  importId,
  rosterDuties,
  dutyWindow,
  timeZone = process.env.APP_TIMEZONE || "Europe/Amsterdam"
}: {
  supabase: SupabaseLike;
  userId: string;
  importId: string | null;
  rosterDuties: RosterDutyRow[];
  dutyWindow: DutyWindow;
  timeZone?: string;
}) {
  const calendarQueryEndExclusive = addDays(dutyWindow.endDate, 2);
  const [{ data: timedCalendarItems = [] }, { data: allDayCalendarItems = [] }] = await Promise.all([
    supabase
      .from("nova_calendar_items")
      .select("id,source_event_id,title,description,location,starts_at,ends_at,all_day_date,all_day_end_date,is_all_day,status,synced_at")
      .eq("user_id", userId)
      .eq("source_provider", "google_calendar")
      .neq("status", "cancelled")
      .gte("starts_at", `${dutyWindow.startDate}T00:00:00.000Z`)
      .lt("starts_at", `${calendarQueryEndExclusive}T00:00:00.000Z`),
    supabase
      .from("nova_calendar_items")
      .select("id,source_event_id,title,description,location,starts_at,ends_at,all_day_date,all_day_end_date,is_all_day,status,synced_at")
      .eq("user_id", userId)
      .eq("source_provider", "google_calendar")
      .neq("status", "cancelled")
      .gte("all_day_date", dutyWindow.startDate)
      .lte("all_day_date", dutyWindow.endDate)
  ]);

  const summary = planDailyDutyDiscrepancyActions({
    rosterDuties,
    calendarItems: [...((timedCalendarItems ?? []) as GoogleCalendarDutyItem[]), ...((allDayCalendarItems ?? []) as GoogleCalendarDutyItem[])],
    dutyWindow,
    timeZone
  });

  for (const action of summary.actions) {
    if (action.kind === "correct" && action.dutyId && action.update) {
      await supabase.from("duties").update(action.update).eq("id", action.dutyId).eq("user_id", userId);
      const targetDuty = rosterDuties.find((duty) => duty.id === action.dutyId);
      if (targetDuty) Object.assign(targetDuty, action.update);
    }

    await insertConflictOnce({ supabase, userId, importId, action });
  }

  return summary;
}
