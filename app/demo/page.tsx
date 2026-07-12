import { readFileSync } from "node:fs";
import { join } from "node:path";
import { AlertTriangle, CalendarDays, CloudSun, Clock3, Moon, Plane, RefreshCw, Sunrise, TrainFront } from "lucide-react";
import { AiAssistantPanel } from "@/components/dashboard/AiAssistantPanel";
import { ConflictPanel } from "@/components/dashboard/ConflictPanel";
import { DutyLeaveAccounting } from "@/components/dashboard/DutyLeaveAccounting";
import { DutySummary } from "@/components/dashboard/DutySummary";
import { StatCard } from "@/components/dashboard/StatCard";
import { StatusBadge } from "@/components/dashboard/StatusBadge";
import { AppShell } from "@/components/layout/AppShell";
import {
  calendarEventsToDuties,
  fetchLiveWeather,
  fetchNsStatus,
  loadLiveCalendarSnapshot
} from "@/lib/live-demo";
import { DUTY_MINUTES, formatDutyMinutes, isVacationDuty } from "@/lib/roster/accounting";
import { detectConflicts, parseRosterText, summarizeDuties } from "@/lib/roster/core";
import type { NormalizedDuty } from "@/lib/roster/types";

export const dynamic = "force-dynamic";

function toDashboardDuty(duty: NormalizedDuty, index: number) {
  return {
    id: `demo-duty-${index}`,
    duty_date: duty.date,
    start_time: duty.startTime || null,
    end_time: duty.endTime || null,
    duty_label: duty.dutyLabel,
    original_duty_code: duty.originalDutyCode || null,
    location: duty.location || null,
    is_overnight: duty.isOvernight,
    is_off: duty.isOff,
    is_sick_leave: false
  };
}

export default async function DemoPage() {
  const liveSnapshot = loadLiveCalendarSnapshot();
  const liveDuties = calendarEventsToDuties(liveSnapshot);
  const [weather, nsStatus] = await Promise.all([fetchLiveWeather(), fetchNsStatus()]);
  const csv = readFileSync(join(process.cwd(), "data/demo-roster.csv"), "utf8");
  const fallbackDuties = parseRosterText(csv, "demo-roster.csv");
  const duties = liveDuties.length ? liveDuties : fallbackDuties;
  const sourceLabel = liveDuties.length ? "Live Google Calendar" : "Sample roster";
  const conflicts = detectConflicts(duties);
  const summary = summarizeDuties(duties, conflicts);
  const dashboardDuties = duties.map(toDashboardDuty);
  const today = "2026-07-07";
  const todayDuty = dashboardDuties.find((duty) => duty.duty_date === today);
  const nextDuty = dashboardDuties.find((duty) => duty.duty_date >= today && !duty.is_off);
  const plannedDutyDays = dashboardDuties.filter((duty) => !duty.is_off && !isVacationDuty(duty)).length;
  const dashboardConflicts = conflicts.map((conflict, index) => ({
    id: `demo-conflict-${index}`,
    severity: conflict.severity,
    title: conflict.title,
    detail: conflict.detail,
    conflict_type: conflict.conflictType
  }));

  return (
    <AppShell userEmail="demo@emma-occ.local">
      <div className="mb-5 rounded-lg border border-occ-cyan/40 bg-occ-cyan/10 p-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <p className="text-xs uppercase tracking-[0.18em] text-occ-cyan">Live demo</p>
            <h2 className="mt-1 text-2xl font-semibold text-white">NOVA Mission Control</h2>
            <p className="mt-2 max-w-3xl text-sm text-zinc-300">
              This demo keeps Emma OCC as the first operational module and uses live session data when available, plus current weather and NS public status checks.
            </p>
          </div>
          <StatusBadge tone={liveDuties.length ? "green" : "amber"}>{sourceLabel} loaded</StatusBadge>
        </div>
      </div>

      <div className="space-y-5">
        <DutySummary todayDuty={todayDuty} nextDuty={nextDuty} />

        <div className="grid gap-4 lg:grid-cols-2">
          <section className="rounded-lg border border-occ-line bg-occ-panel p-5">
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="text-sm text-zinc-400">Live weather</p>
                <h2 className="mt-2 text-2xl font-semibold text-white">
                  {weather ? `${weather.tempC}C, ${weather.description}` : "Weather unavailable"}
                </h2>
                <p className="mt-2 text-sm text-zinc-500">
                  {weather
                    ? `${weather.location} - feels like ${weather.feelsLikeC}C, wind ${weather.windKmph} km/h, humidity ${weather.humidity}%`
                    : "The weather source could not be reached from this server session."}
                </p>
              </div>
              <span className="grid h-10 w-10 shrink-0 place-items-center rounded-md bg-occ-panel2 text-occ-cyan">
                <CloudSun size={20} />
              </span>
            </div>
            <p className="mt-4 text-xs text-zinc-600">
              Source: {weather?.source ?? "wttr.in"} {weather ? `- observed ${weather.observedAt}` : ""}
            </p>
          </section>

          <section className="rounded-lg border border-occ-line bg-occ-panel p-5">
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="text-sm text-zinc-400">NS live reference</p>
                <h2 className="mt-2 text-2xl font-semibold text-white">
                  {nsStatus.status === "clear"
                    ? "No route alert detected"
                    : nsStatus.status === "attention"
                      ? "NS commute alert"
                      : nsStatus.status === "needs-route"
                        ? "Route stations needed"
                        : "NS status unavailable"}
                </h2>
                <p className="mt-2 text-sm text-zinc-500">{nsStatus.title}</p>
                <p className="mt-2 text-sm text-cyan-100">Commute option: NS live reference, 45 min before and 45 min after duty.</p>
                {nsStatus.alerts.length ? (
                  <div className="mt-3 space-y-2">
                    {nsStatus.alerts.slice(0, 2).map((alert) => (
                      <p key={alert.title} className="rounded-md border border-occ-amber/40 bg-occ-amber/10 p-2 text-sm text-amber-100">
                        <strong>{alert.title}</strong> {alert.detail}
                      </p>
                    ))}
                  </div>
                ) : (
                  <p className="mt-3 rounded-md border border-occ-green/30 bg-occ-green/10 p-2 text-sm text-green-100">
                    Emma did not find station-specific NS disruption or platform-change language in the public status snapshot.
                  </p>
                )}
              </div>
              <span className="grid h-10 w-10 shrink-0 place-items-center rounded-md bg-occ-panel2 text-occ-cyan">
                <TrainFront size={20} />
              </span>
            </div>
            <div className="mt-4 flex flex-wrap gap-3 text-sm">
              <a className="text-occ-cyan hover:text-white" href={nsStatus.url} target="_blank">
                Open NS status page
              </a>
              {nsStatus.toWorkUrl ? (
                <a className="text-occ-cyan hover:text-white" href={nsStatus.toWorkUrl} target="_blank">
                  To work
                </a>
              ) : null}
              {nsStatus.toHomeUrl ? (
                <a className="text-occ-cyan hover:text-white" href={nsStatus.toHomeUrl} target="_blank">
                  Home
                </a>
              ) : null}
            </div>
            {nsStatus.options.length ? (
              <div className="mt-5 border-t border-occ-line pt-4">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <h3 className="text-sm font-semibold text-white">Best commuting options</h3>
                  <p className="text-xs text-zinc-500">
                    {nsStatus.homeStation && nsStatus.workStation ? `${nsStatus.homeStation} -> ${nsStatus.workStation}` : "Route setup pending"}
                  </p>
                </div>
                <div className="mt-3 divide-y divide-occ-line">
                  {nsStatus.options.slice(0, 4).map((option) => (
                    <div key={option.id} className="grid gap-3 py-3 sm:grid-cols-[2rem_1fr_auto] sm:items-center">
                      <span className="grid h-8 w-8 place-items-center rounded-md border border-occ-cyan/30 bg-occ-cyan/10 text-xs font-semibold text-occ-cyan">
                        {option.rank}
                      </span>
                      <div className="min-w-0">
                        <div className="flex flex-wrap items-center gap-2">
                          <p className="font-medium text-white">{option.title}</p>
                          <span className="rounded border border-occ-line px-2 py-0.5 text-[11px] uppercase text-zinc-400">{option.recommendation}</span>
                        </div>
                        <p className="mt-1 text-sm text-zinc-500">{option.detail}</p>
                      </div>
                      <div className="flex flex-wrap gap-3 text-sm sm:justify-end">
                        {option.toWorkUrl ? (
                          <a className="text-occ-cyan hover:text-white" href={option.toWorkUrl} target="_blank">
                            To work
                          </a>
                        ) : null}
                        {option.toHomeUrl ? (
                          <a className="text-occ-cyan hover:text-white" href={option.toHomeUrl} target="_blank">
                            Home
                          </a>
                        ) : null}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ) : null}
          </section>
        </div>

        <DutyLeaveAccounting
          duties={dashboardDuties}
          today={today}
          sourceLabel={sourceLabel}
          storageScope={liveDuties.length ? "demo-live" : "demo-fallback"}
        />

        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          <StatCard label="Planned duty hours" value={formatDutyMinutes(plannedDutyDays * DUTY_MINUTES)} helper="Before SL edits" icon={Clock3} />
          <StatCard label="Total rest days" value={summary.restDays} helper="OFF and Rest entries" icon={Sunrise} />
          <StatCard label="Night shifts" value={summary.nightShifts} helper="23:00-07:05 duties" icon={Moon} />
          <StatCard label="Late shifts" value={summary.lateShifts} helper="15:00-23:05 duties" icon={Plane} />
        </div>

        <div className="grid gap-4 md:grid-cols-3">
          <StatCard label="Calendar source" value={liveDuties.length ? "Live" : "Fallback"} helper={liveSnapshot?.generatedAt ?? "demo-roster.csv parsed"} icon={RefreshCw} />
          <StatCard label="Import status" value="Ready" helper={`${sourceLabel} parsed and classified`} icon={CalendarDays} />
          <StatCard label="Active conflicts" value={dashboardConflicts.length} helper={`Detected from ${sourceLabel.toLowerCase()}`} icon={AlertTriangle} />
        </div>

        <div className="grid gap-5 xl:grid-cols-[1.3fr_0.9fr]">
          <section className="rounded-lg border border-occ-line bg-occ-panel p-5">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <h2 className="text-lg font-semibold text-white">Monthly roster overview</h2>
                <p className="text-sm text-zinc-500">
                  {liveSnapshot ? `Live window generated ${liveSnapshot.generatedAt}` : "Imported date range: 2026-07-07 to 2026-07-14"}
                </p>
              </div>
              <StatusBadge tone="cyan">{summary.totalDuties} duties</StatusBadge>
            </div>
            <div className="mt-5 grid gap-3 sm:grid-cols-2">
              {dashboardDuties.map((duty) => (
                <div key={duty.id} className="rounded-md border border-occ-line bg-occ-ink p-3">
                  <p className="text-sm font-medium text-white">{duty.duty_date}</p>
                  <p className="mt-2 text-sm text-zinc-400">{duty.duty_label}</p>
                  <p className="mt-1 text-xs text-zinc-500">
                    {duty.is_off ? "Rest day" : `${duty.start_time?.slice(0, 5)}-${duty.end_time?.slice(0, 5)}`}
                  </p>
                </div>
              ))}
            </div>
          </section>
          <ConflictPanel conflicts={dashboardConflicts} />
        </div>

        <AiAssistantPanel />
      </div>
    </AppShell>
  );
}
