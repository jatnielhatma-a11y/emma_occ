import type { RosterConflict } from "@/lib/roster/types";

export type EmmaDuty = {
  duty_date: string;
  start_time: string | null;
  end_time: string | null;
  duty_label: string;
  location: string | null;
  is_off: boolean;
  is_overnight: boolean;
};

export type EmmaContext = {
  today: string;
  duties: EmmaDuty[];
  conflicts: Array<Pick<RosterConflict, "severity" | "title" | "detail" | "conflictType">>;
};

function formatDuty(duty: EmmaDuty) {
  if (duty.is_off) return `${duty.duty_date}: OFF Day`;
  return `${duty.duty_date}: ${duty.duty_label} ${duty.start_time?.slice(0, 5) ?? "--:--"}-${duty.end_time?.slice(0, 5) ?? "--:--"}${duty.location ? ` at ${duty.location}` : ""}`;
}

function minutesBetween(previous: EmmaDuty, next: EmmaDuty) {
  if (!previous.end_time || !next.start_time) return null;
  const previousEndDate = previous.is_overnight ? addDays(previous.duty_date, 1) : previous.duty_date;
  const end = new Date(`${previousEndDate}T${previous.end_time}`).getTime();
  const start = new Date(`${next.duty_date}T${next.start_time}`).getTime();
  if (Number.isNaN(end) || Number.isNaN(start)) return null;
  return Math.round((start - end) / 60000);
}

function addDays(date: string, days: number) {
  const value = new Date(`${date}T00:00:00.000Z`);
  value.setUTCDate(value.getUTCDate() + days);
  return value.toISOString().slice(0, 10);
}

export function buildEmmaContextSummary(context: EmmaContext) {
  return {
    today: context.today,
    dutyCount: context.duties.length,
    nextDuty: context.duties.find((duty) => duty.duty_date >= context.today && !duty.is_off) ?? null,
    nextOffDay: context.duties.find((duty) => duty.duty_date >= context.today && duty.is_off) ?? null,
    nightShifts: context.duties.filter((duty) => duty.duty_label === "Night Shift").length,
    lateShifts: context.duties.filter((duty) => duty.duty_label === "Late Shift").length,
    conflicts: context.conflicts.length
  };
}

export function answerFromRoster(prompt: string, context: EmmaContext) {
  const lower = prompt.toLowerCase();
  const upcoming = context.duties.filter((duty) => duty.duty_date >= context.today);
  const nextDuty = upcoming.find((duty) => !duty.is_off);
  const nextOff = upcoming.find((duty) => duty.is_off);
  const weekEnd = addDays(context.today, 7);
  const weekDuties = context.duties.filter((duty) => duty.duty_date >= context.today && duty.duty_date <= weekEnd);

  if (lower.includes("next duty")) {
    return nextDuty ? `Your next duty is ${formatDuty(nextDuty)}.` : "I do not see an upcoming working duty in the imported roster.";
  }

  if (lower.includes("night shift") && lower.includes("week")) {
    const nights = weekDuties.filter((duty) => duty.duty_label === "Night Shift");
    return nights.length
      ? `Yes. This week you have ${nights.length} night shift(s): ${nights.map(formatDuty).join("; ")}.`
      : "No night shifts are visible this week.";
  }

  if (lower.includes("late shift") && (lower.includes("month") || lower.includes("many"))) {
    const lates = context.duties.filter((duty) => duty.duty_label === "Late Shift");
    return `I see ${lates.length} late shift(s) in the loaded roster period.`;
  }

  if (lower.includes("conflict")) {
    return context.conflicts.length
      ? `There are ${context.conflicts.length} active conflict(s). Highest visible item: ${context.conflicts[0].title} (${context.conflicts[0].severity}).`
      : "No active conflicts are visible in the loaded roster data.";
  }

  if (lower.includes("off day") || lower.includes("rest day")) {
    return nextOff ? `Your next OFF day is ${formatDuty(nextOff)}.` : "I do not see an upcoming OFF day in the loaded roster.";
  }

  if (lower.includes("rest") && lower.includes("before")) {
    const nextIndex = context.duties.findIndex((duty) => duty === nextDuty);
    const previous = nextIndex > 0 ? context.duties[nextIndex - 1] : null;
    const rest = previous && nextDuty ? minutesBetween(previous, nextDuty) : null;
    return rest === null
      ? "I do not have enough timing data to calculate rest before the next shift."
      : `You have about ${Math.max(0, Math.round(rest / 60))} hours of rest before your next shift.`;
  }

  if (lower.includes("weekly summary") || lower.includes("summary")) {
    const working = weekDuties.filter((duty) => !duty.is_off);
    const off = weekDuties.filter((duty) => duty.is_off);
    const nights = weekDuties.filter((duty) => duty.duty_label === "Night Shift");
    return `Weekly summary: ${working.length} working duty/duties, ${off.length} OFF day(s), ${nights.length} night shift(s), and ${context.conflicts.length} active conflict(s).`;
  }

  if (lower.includes("suggest")) {
    return context.conflicts.length
      ? "Suggested improvement: review the active conflicts first, especially overnight and consecutive night-shift alerts, before syncing further calendar changes."
      : "Suggested improvement: keep commute buffers enabled and confirm calendar sync after each roster import.";
  }

  return nextDuty
    ? `Based on your roster, the most important upcoming item is ${formatDuty(nextDuty)}.`
    : "I can only answer from imported roster and calendar data, and I do not see an upcoming duty in the loaded period.";
}
