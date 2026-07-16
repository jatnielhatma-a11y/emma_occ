import type { AccountingDuty } from "./accounting";

function dutyTime(value: string | null | undefined) {
  return value?.slice(0, 5) || "99:99";
}

export function sortDutiesForLedger<T extends Pick<AccountingDuty, "duty_date" | "start_time" | "end_time">>(duties: T[]) {
  return [...duties].sort((first, second) => {
    const byDate = first.duty_date.localeCompare(second.duty_date);
    if (byDate !== 0) return byDate;

    const byStart = dutyTime(first.start_time).localeCompare(dutyTime(second.start_time));
    if (byStart !== 0) return byStart;

    return dutyTime(first.end_time).localeCompare(dutyTime(second.end_time));
  });
}

export function currentLedgerDuties<T extends Pick<AccountingDuty, "duty_date" | "start_time" | "end_time">>(duties: T[], today: string) {
  return rollingLedgerDuties(duties, today, 10);
}

export function ledgerEndDate(today: string, daysAhead = 10) {
  const endDate = new Date(`${today}T00:00:00.000Z`);
  endDate.setUTCDate(endDate.getUTCDate() + Math.max(0, daysAhead - 1));
  return endDate.toISOString().slice(0, 10);
}

export function rollingLedgerDuties<T extends Pick<AccountingDuty, "duty_date" | "start_time" | "end_time">>(duties: T[], today: string, daysAhead = 10) {
  const end = ledgerEndDate(today, daysAhead);

  return sortDutiesForLedger(duties).filter((duty) => duty.duty_date >= today && duty.duty_date <= end);
}

export function shiftCodeDescription(duty: Pick<AccountingDuty, "duty_label" | "original_duty_code">) {
  const code = (duty.original_duty_code ?? "").trim();
  const label = duty.duty_label.trim() || "Custom Duty";

  if (!code || code.toLowerCase() === label.toLowerCase()) return label;
  return `${code} - ${label}`;
}
