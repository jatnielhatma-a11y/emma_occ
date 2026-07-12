export const DUTY_MINUTES = 8 * 60 + 5;

export type AccountingDuty = {
  id: string;
  duty_date: string;
  start_time: string | null;
  end_time: string | null;
  duty_label: string;
  original_duty_code: string | null;
  location: string | null;
  is_overnight: boolean;
  is_off: boolean;
  is_sick_leave?: boolean | null;
};

const VACATION_WORDS = ["vacation", "annual leave", "holiday", "vakantie", "verlof"];
const VACATION_CODES = new Set(["VAC", "AL", "LV", "V", "VL"]);

export function isVacationDuty(duty: Pick<AccountingDuty, "duty_label" | "original_duty_code">) {
  const label = duty.duty_label.toLowerCase();
  const code = (duty.original_duty_code ?? "").trim().toUpperCase();

  if (VACATION_CODES.has(code)) return true;
  return VACATION_WORDS.some((word) => label.includes(word));
}

export function formatDutyMinutes(minutes: number) {
  const safeMinutes = Math.max(0, minutes);
  const hours = Math.floor(safeMinutes / 60);
  const remainder = safeMinutes % 60;
  return `${hours}h ${String(remainder).padStart(2, "0")}m`;
}

export function calculateDutyAccounting(duties: AccountingDuty[], sickLeaveIds: Set<string>, today: string) {
  const workingDuties = duties.filter((duty) => !duty.is_off && !isVacationDuty(duty));
  const sickLeaveDuties = workingDuties.filter((duty) => sickLeaveIds.has(duty.id));
  const vacationDutiesToDate = duties.filter((duty) => duty.duty_date <= today && isVacationDuty(duty));
  const adjustedDutyDays = Math.max(0, workingDuties.length - sickLeaveDuties.length);

  return {
    adjustedDutyDays,
    adjustedDutyMinutes: adjustedDutyDays * DUTY_MINUTES,
    sickLeaveDays: sickLeaveDuties.length,
    sickLeaveMinutes: sickLeaveDuties.length * DUTY_MINUTES,
    vacationDaysToDate: vacationDutiesToDate.length,
    vacationMinutesToDate: vacationDutiesToDate.length * DUTY_MINUTES,
    workingDutyDaysBeforeLeave: workingDuties.length
  };
}
