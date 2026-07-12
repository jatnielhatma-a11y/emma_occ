"use client";

import { CalendarCheck, Clock3, HeartPulse, Umbrella } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import {
  calculateDutyAccounting,
  formatDutyMinutes,
  isVacationDuty,
  type AccountingDuty
} from "@/lib/roster/accounting";
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
  const upcomingDuties = useMemo(() => duties.filter((duty) => duty.duty_date >= today).slice(0, 7), [duties, today]);

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
            {duty.is_overnight ? <span className="text-xs text-zinc-500">overnight</span> : null}
          </div>
          <p className="mt-1 truncate text-xs text-zinc-500">{duty.location ?? "n/a"}</p>
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
            <h2 className="text-lg font-semibold text-white">Upcoming duties</h2>
            <p className="text-sm text-zinc-500">Next seven roster entries with editable SL marking.</p>
          </div>
          <StatusBadge tone="cyan">{upcomingDuties.length} loaded</StatusBadge>
        </div>
        <div className="mt-4">{upcomingDuties.length ? upcomingDuties.map((duty) => renderDutyRow(duty, true)) : <p className="py-8 text-sm text-zinc-500">No upcoming duties loaded.</p>}</div>
      </section>

      <section className="rounded-lg border border-occ-line bg-occ-panel p-5">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h2 className="text-lg font-semibold text-white">Duty ledger</h2>
            <p className="text-sm text-zinc-500">All loaded duties, rest days, vacation, and sick-leave markings.</p>
          </div>
          <StatusBadge tone="cyan">{duties.length} entries</StatusBadge>
        </div>
        <div className="mt-4">{duties.length ? duties.map((duty) => renderDutyRow(duty)) : <p className="py-8 text-sm text-zinc-500">Import a roster to populate the ledger.</p>}</div>
      </section>
    </div>
  );
}
