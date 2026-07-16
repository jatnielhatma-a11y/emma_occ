"use client";

import { CalendarCheck, Clock3, HeartPulse, Umbrella } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import {
  calculateDutyAccounting,
  formatDutyMinutes,
  isVacationDuty,
  type AccountingDuty
} from "@/lib/roster/accounting";
import { currentLedgerDuties, ledgerEndDate, shiftCodeDescription } from "@/lib/roster/ledger";
import { StatusBadge } from "./StatusBadge";

type DutyLeaveAccountingProps = {
  duties: AccountingDuty[];
  today: string;
  sourceLabel: string;
  storageScope: string;
  persistMode?: "local" | "api";
};

function timeRange(duty: AccountingDuty) {
  if (duty.is_off) return "Rest day";
  return `${duty.start_time?.slice(0, 5) ?? "--:--"}-${duty.end_time?.slice(0, 5) ?? "--:--"}`;
}

function rowTone(duty: AccountingDuty, sickLeaveIds: Set<string>) {
  if (sickLeaveIds.has(duty.id)) return "red" as const;
  if (isVacationDuty(duty)) return "amber" as const;
  if (duty.is_off) return "green" as const;
  if (duty.is_overnight) return "violet" as const;
  return "cyan" as const;
}

function storageKey(scope: string) {
  return `emma-occ:sick-leave:${scope}`;
}

function addDays(date: string, days: number) {
  const next = new Date(`${date}T00:00:00.000Z`);
  next.setUTCDate(next.getUTCDate() + days);
  return next.toISOString().slice(0, 10);
}

function shortDate(value: string) {
  return new Intl.DateTimeFormat("en-GB", {
    day: "2-digit",
    month: "short",
    timeZone: "UTC"
  }).format(new Date(`${value}T00:00:00.000Z`));
}

function rolloutLabel(index: number) {
  return index === 0 ? "Today" : `D+${index}`;
}

export function DutyLeaveAccounting({ duties, today, sourceLabel, storageScope, persistMode = "local" }: DutyLeaveAccountingProps) {
  const [sickLeaveIds, setSickLeaveIds] = useState<Set<string>>(() => new Set(duties.filter((duty) => duty.is_sick_leave).map((duty) => duty.id)));
  const [saveState, setSaveState] = useState("");
  const key = storageKey(storageScope);

  useEffect(() => {
    if (persistMode !== "local") return;
    const stored = window.localStorage.getItem(key);
    if (!stored) return;
    try {
      const parsed = JSON.parse(stored) as string[];
      setSickLeaveIds(new Set(parsed));
    } catch {
      setSickLeaveIds(new Set(duties.filter((duty) => duty.is_sick_leave).map((duty) => duty.id)));
    }
  }, [duties, key, persistMode]);

  const accounting = useMemo(() => calculateDutyAccounting(duties, sickLeaveIds, today), [duties, sickLeaveIds, today]);
  const ledgerDuties = useMemo(() => currentLedgerDuties(duties, today), [duties, today]);
  const rolloutDates = useMemo(() => Array.from({ length: 10 }, (_, index) => addDays(today, index)), [today]);
  const dutiesByDate = useMemo(
    () =>
      ledgerDuties.reduce<Record<string, AccountingDuty[]>>((grouped, duty) => {
        grouped[duty.duty_date] = [...(grouped[duty.duty_date] ?? []), duty];
        return grouped;
      }, {}),
    [ledgerDuties]
  );
  const ledgerEnd = ledgerEndDate(today);

  async function toggleSickLeave(duty: AccountingDuty, checked: boolean) {
    const next = new Set(sickLeaveIds);
    if (checked) next.add(duty.id);
    else next.delete(duty.id);

    setSickLeaveIds(next);
    setSaveState(persistMode === "api" ? "Saving..." : "Saved locally");

    if (persistMode === "local") {
      window.localStorage.setItem(key, JSON.stringify([...next]));
      return;
    }

    const response = await fetch("/api/duties/sick-leave", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ dutyId: duty.id, isSickLeave: checked })
    });

    setSaveState(response.ok ? "Saved" : "Could not save");
  }

  function renderDutyRow(duty: AccountingDuty, compact = false) {
    const vacation = isVacationDuty(duty);
    const canMarkSickLeave = !duty.is_off && !vacation;
    const checked = sickLeaveIds.has(duty.id);

    return (
      <div key={`${compact ? "upcoming" : "ledger"}-${duty.id}`} className="grid gap-3 border-t border-occ-line py-3 sm:grid-cols-[118px_1fr_118px_150px] sm:items-center">
        <span className="text-sm font-medium text-zinc-200">{duty.duty_date}</span>
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <StatusBadge tone={rowTone(duty, sickLeaveIds)}>{checked ? "Sick-leave / SL" : vacation ? "Vacation" : duty.duty_label}</StatusBadge>
            <span className="rounded-md border border-occ-line bg-occ-ink px-2 py-1 text-xs text-zinc-300">
              Code {duty.original_duty_code?.trim() || "n/a"}
            </span>
            {duty.is_overnight ? <span className="text-xs text-zinc-500">overnight</span> : null}
          </div>
          <p className="mt-1 truncate text-xs text-zinc-500">Shift code description: {shiftCodeDescription(duty)}</p>
          <p className="mt-1 truncate text-xs text-zinc-600">{duty.location ?? "n/a"}</p>
        </div>
        <span className="text-sm text-zinc-400">{timeRange(duty)}</span>
        <label className="flex items-center gap-2 text-sm text-zinc-300">
          <input
            type="checkbox"
            checked={checked}
            disabled={!canMarkSickLeave}
            onChange={(event) => toggleSickLeave(duty, event.target.checked)}
            className="h-4 w-4 rounded border-occ-line bg-occ-ink text-occ-cyan disabled:cursor-not-allowed disabled:opacity-40"
          />
          <span className={canMarkSickLeave ? "" : "text-zinc-600"}>Sick-leave / SL</span>
        </label>
      </div>
    );
  }

  return (
    <div className="space-y-5">
      <section className="rounded-lg border border-occ-line bg-occ-panel p-5">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h2 className="text-lg font-semibold text-white">Duty leave accounting</h2>
            <p className="text-sm text-zinc-500">Each duty is valued at 8h 05m. Sick leave and vacation adjust duty days and hours.</p>
          </div>
          <StatusBadge tone="cyan">{sourceLabel}</StatusBadge>
        </div>

        <div className="mt-5 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
          <div className="rounded-md bg-occ-ink p-3">
            <div className="flex items-center justify-between gap-3">
              <p className="text-sm text-zinc-400">Adjusted duty days</p>
              <CalendarCheck size={18} className="text-occ-cyan" />
            </div>
            <strong className="mt-2 block text-2xl text-white">{accounting.adjustedDutyDays}</strong>
            <p className="mt-1 text-xs text-zinc-500">{accounting.workingDutyDaysBeforeLeave} before leave</p>
          </div>
          <div className="rounded-md bg-occ-ink p-3">
            <div className="flex items-center justify-between gap-3">
              <p className="text-sm text-zinc-400">Adjusted duty hours</p>
              <Clock3 size={18} className="text-occ-cyan" />
            </div>
            <strong className="mt-2 block text-2xl text-white">{formatDutyMinutes(accounting.adjustedDutyMinutes)}</strong>
            <p className="mt-1 text-xs text-zinc-500">8h 05m per duty</p>
          </div>
          <div className="rounded-md bg-occ-ink p-3">
            <div className="flex items-center justify-between gap-3">
              <p className="text-sm text-zinc-400">Total sick leave</p>
              <HeartPulse size={18} className="text-occ-red" />
            </div>
            <strong className="mt-2 block text-2xl text-white">{accounting.sickLeaveDays}</strong>
            <p className="mt-1 text-xs text-zinc-500">{formatDutyMinutes(accounting.sickLeaveMinutes)}</p>
          </div>
          <div className="rounded-md bg-occ-ink p-3">
            <div className="flex items-center justify-between gap-3">
              <p className="text-sm text-zinc-400">Total vacation</p>
              <Umbrella size={18} className="text-occ-amber" />
            </div>
            <strong className="mt-2 block text-2xl text-white">{accounting.vacationDaysToDate}</strong>
            <p className="mt-1 text-xs text-zinc-500">{formatDutyMinutes(accounting.vacationMinutesToDate)} up to today</p>
          </div>
        </div>
        {saveState ? <p className="mt-3 text-xs text-zinc-500">{saveState}</p> : null}
      </section>

      <section className="rounded-lg border border-occ-line bg-occ-panel p-5">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h2 className="text-lg font-semibold text-white">10-day rollout preview</h2>
            <p className="text-sm text-zinc-500">Today stays first. The preview rolls forward daily and labels missing calendar-synced roster days.</p>
          </div>
          <StatusBadge tone="cyan">{ledgerDuties.length} synced row(s)</StatusBadge>
        </div>
        <div className="mt-4 grid gap-2 sm:grid-cols-2 lg:grid-cols-5">
          {rolloutDates.map((date, index) => {
            const dayDuties = dutiesByDate[date] ?? [];
            const primaryDuty = dayDuties[0];
            const checked = primaryDuty ? sickLeaveIds.has(primaryDuty.id) : false;
            const tone = primaryDuty ? rowTone(primaryDuty, sickLeaveIds) : "neutral";

            return (
              <div key={date} className="min-h-[112px] rounded-md border border-occ-line bg-occ-ink p-3">
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <p className="text-xs uppercase tracking-[0.16em] text-zinc-500">{rolloutLabel(index)}</p>
                    <p className="mt-1 text-sm font-semibold text-white">{shortDate(date)}</p>
                  </div>
                  <StatusBadge tone={tone}>{primaryDuty ? (checked ? "SL" : primaryDuty.duty_label) : "No row"}</StatusBadge>
                </div>
                <p className="mt-3 text-xs text-zinc-500">{primaryDuty ? shiftCodeDescription(primaryDuty) : "No synced roster row for this date."}</p>
                {primaryDuty ? <p className="mt-1 text-xs text-zinc-600">{timeRange(primaryDuty)}</p> : null}
                {dayDuties.length > 1 ? <p className="mt-1 text-xs text-occ-cyan">+{dayDuties.length - 1} additional row(s)</p> : null}
              </div>
            );
          })}
        </div>
      </section>

      <section className="rounded-lg border border-occ-line bg-occ-panel p-5">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h2 className="text-lg font-semibold text-white">Duty ledger</h2>
            <p className="text-sm text-zinc-500">
              Rolling 10-day roster from {today} through {ledgerEnd}, including rest days, vacation, and sick-leave markings.
            </p>
          </div>
          <StatusBadge tone="cyan">{ledgerDuties.length} in 10 days</StatusBadge>
        </div>
        <div className="mt-4">
          {ledgerDuties.length ? ledgerDuties.map((duty) => renderDutyRow(duty)) : <p className="py-8 text-sm text-zinc-500">No roster rows loaded from today onward.</p>}
        </div>
      </section>
    </div>
  );
}
