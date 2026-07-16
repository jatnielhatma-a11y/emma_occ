import { AlertTriangle, Bell, CalendarDays, CloudSun, Database, RefreshCw, ShieldCheck, TrainFront } from "lucide-react";
import { DailyBriefPanel } from "@/components/ai/DailyBriefPanel";
import { AiAssistantPanel } from "@/components/dashboard/AiAssistantPanel";
import { ConflictPanel } from "@/components/dashboard/ConflictPanel";
import { DutyLeaveAccounting } from "@/components/dashboard/DutyLeaveAccounting";
import { DutySummary } from "@/components/dashboard/DutySummary";
import { HourlyDashboardRefresh } from "@/components/dashboard/HourlyDashboardRefresh";
import { LiveClock } from "@/components/dashboard/LiveClock";
import { StatCard } from "@/components/dashboard/StatCard";
import { StatusBadge } from "@/components/dashboard/StatusBadge";
import { WeeklyTimeline } from "@/components/dashboard/WeeklyTimeline";
import { IntegrationHealthPanel } from "@/components/nova/IntegrationHealthPanel";
import { LocationPermissionPanel } from "@/components/nova/LocationPermissionPanel";
import { MissionVoicePanel } from "@/components/nova/MissionVoicePanel";
import { MissionControl } from "@/components/nova/MissionControl";
import { fetchLiveWeather } from "@/lib/live-demo";
import { fetchNsCommuteStatus } from "@/lib/ns-commute";
import { buildIntegrationHealth } from "@/lib/providers/health";
import { DUTY_MINUTES, formatDutyMinutes, isVacationDuty } from "@/lib/roster/accounting";
import { currentLedgerDuties } from "@/lib/roster/ledger";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

type DashboardDuty = {
  id: string;
  duty_date: string;
  start_time: string | null;
  end_time: string | null;
  duty_label: string;
  original_duty_code: string | null;
  location: string | null;
  is_overnight: boolean;
  is_off: boolean;
  is_sick_leave: boolean;
};

type DashboardConflict = {
  id: string;
  severity: "Low" | "Medium" | "High" | "Critical";
  title: string;
  detail: string | null;
  conflict_type: string;
};

type LatestImport = {
  id: string;
  status: string;
  filename: string;
  file_type: string;
  imported_at: string;
  row_count: number;
  comparison: Record<string, unknown> | null;
};

function todayInTimezone() {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: process.env.APP_TIMEZONE || "Europe/Amsterdam",
    year: "numeric",
    month: "2-digit",
    day: "2-digit"
  }).format(new Date());
}

function formatDateTime(value?: string | null) {
  if (!value) return "Not yet";
  return new Intl.DateTimeFormat("en-GB", {
    timeZone: process.env.APP_TIMEZONE || "Europe/Amsterdam",
    dateStyle: "medium",
    timeStyle: "short"
  }).format(new Date(value));
}

function calendarSourceLabel(latestImport?: LatestImport | null) {
  if (!latestImport) return "No roster loaded";
  if (latestImport.file_type === "calendar/snapshot") return "Google Calendar snapshot";
  return latestImport.filename;
}

export default async function DashboardPage() {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user }
  } = await supabase.auth.getUser();

  const today = todayInTimezone();

  const { data: latestImport } = await supabase
    .from("imports")
    .select("id,status,filename,file_type,imported_at,row_count,comparison")
    .eq("user_id", user?.id)
    .order("imported_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  let duties: unknown[] = [];
  if (latestImport?.id) {
    const { data } = await supabase
      .from("duties")
      .select("id,duty_date,start_time,end_time,duty_label,original_duty_code,location,notes,source_file,is_overnight,is_off,is_sick_leave")
      .eq("user_id", user?.id)
      .eq("import_id", latestImport.id)
      .order("duty_date", { ascending: true })
      .order("start_time", { ascending: true, nullsFirst: false })
      .limit(370);

    duties = data ?? [];
  }

  const { data: conflicts = [] } = await supabase
    .from("conflict_logs")
    .select("id,severity,title,detail,conflict_type")
    .eq("user_id", user?.id)
    .is("resolved_at", null)
    .order("created_at", { ascending: false })
    .limit(10);

  const { count: activeConflictCount = 0 } = await supabase
    .from("conflict_logs")
    .select("id", { count: "exact", head: true })
    .eq("user_id", user?.id)
    .is("resolved_at", null);

  const { data: calendarConnection } = await supabase
    .from("google_calendar_connections")
    .select("calendar_id,connected_at,last_sync_at,disconnected_at")
    .eq("user_id", user?.id)
    .eq("calendar_id", process.env.GOOGLE_CALENDAR_ID || "primary")
    .maybeSingle();

  const { data: latestCalendarLog } = await supabase
    .from("calendar_sync_logs")
    .select("status,synced_at,created_at,error_message")
    .eq("user_id", user?.id)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  const { data: commute } = await supabase
    .from("commute_settings")
    .select("enabled,before_minutes,after_minutes,travel_mode,home_address,work_address,home_station,work_station,updated_at")
    .eq("user_id", user?.id)
    .maybeSingle();

  const { data: activeMission } = await supabase
    .from("commute_missions")
    .select("latest_location_label,latest_confidence,current_phase,status,latest_event_at")
    .eq("user_id", user?.id)
    .in("status", ["planned", "active"])
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  const { data: latestRouteSnapshot } = await supabase
    .from("commute_route_snapshots")
    .select("route_status,is_live,confidence,recommended_option,created_at")
    .eq("user_id", user?.id)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  const { data: latestAiBrief } = await supabase
    .from("ai_briefs")
    .select("*")
    .eq("user_id", user?.id)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  const { count: activeNotificationCount = 0 } = await supabase
    .from("notification_events")
    .select("id", { count: "exact", head: true })
    .eq("user_id", user?.id)
    .in("status", ["pending", "sent"]);

  const [weather, nsStatus] = await Promise.all([
    fetchLiveWeather(),
    fetchNsCommuteStatus({
      homeStation: commute?.home_station || process.env.NS_HOME_STATION,
      workStation: commute?.work_station || process.env.NS_WORK_STATION,
      homeAddress: commute?.home_address || process.env.COMMUTE_HOME_ADDRESS,
      workAddress: commute?.work_address || process.env.COMMUTE_WORK_ADDRESS
    })
  ]);

  const typedDuties = (duties ?? []) as DashboardDuty[];
  const typedConflicts = (conflicts ?? []) as DashboardConflict[];
  const typedLatestImport = latestImport as LatestImport | null;
  const appTimeZone = process.env.APP_TIMEZONE || "Europe/Amsterdam";
  const calendarConnected = Boolean(calendarConnection && !calendarConnection.disconnected_at);
  const todayDuty = typedDuties.find((duty) => duty.duty_date === today);
  const nextDuty = typedDuties.find((duty) => duty.duty_date >= today && !duty.is_off);
  const dutyLedgerWindow = currentLedgerDuties(typedDuties, today);
  const dutyLedgerEnd = dutyLedgerWindow.at(-1)?.duty_date ?? today;
  const workingDutyCount = typedDuties.filter((duty) => !duty.is_off && !isVacationDuty(duty)).length;
  const importWindow = typedLatestImport?.comparison?.window;
  const calendarSource = calendarSourceLabel(typedLatestImport);
  const integrationHealth = buildIntegrationHealth({
    calendarConnected,
    latestImportReady: Boolean(typedLatestImport),
    nsStatus: nsStatus.status,
    weatherAvailable: Boolean(weather),
    latestCalendarLogStatus: latestCalendarLog?.status
  });
  const routeRecommendation = (latestRouteSnapshot?.recommended_option ?? {}) as any;
  const nsRisk = (latestRouteSnapshot?.route_status as "green" | "amber" | "red" | undefined) ?? (nsStatus.status === "clear" ? "green" : "amber");
  const todayLabel = todayDuty ? `${todayDuty.duty_label} ${todayDuty.start_time ?? ""}-${todayDuty.end_time ?? ""}` : "No duty loaded for today";
  const nextDutyLabel = nextDuty ? `${nextDuty.duty_date} - ${nextDuty.duty_label}` : "No upcoming work duty";
  const commuteLabel = routeRecommendation.title
    ? `${routeRecommendation.title}${latestRouteSnapshot?.is_live ? " live" : " fallback"}`
    : nsStatus.status === "clear"
      ? "NS route clear"
      : nsStatus.status === "attention"
        ? "Check alternatives"
        : "Route needs review";
  const weatherLabel = weather ? `${weather.tempC}C, ${weather.description}` : "Unavailable";

  return (
    <div className="space-y-5">
      <HourlyDashboardRefresh />
      <MissionControl
        todayLabel={todayLabel}
        nextDutyLabel={nextDutyLabel}
        commuteLabel={commuteLabel}
        weatherLabel={weatherLabel}
        activeConflictCount={activeConflictCount ?? typedConflicts.length}
        calendarConnected={calendarConnected}
        hasRoster={Boolean(typedLatestImport)}
        nsRisk={nsRisk}
        locationLabel={activeMission?.latest_location_label}
        commutePhase={activeMission?.current_phase}
        locationConfidence={activeMission?.latest_confidence}
      />

      <DailyBriefPanel initialBrief={latestAiBrief as any} />

      <MissionVoicePanel compact />

      <div className="grid gap-4 xl:grid-cols-[1.3fr_0.7fr]">
        <IntegrationHealthPanel health={integrationHealth} />
        <LocationPermissionPanel />
      </div>

      <section id="emma-occ" className="scroll-mt-28 space-y-5">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <p className="text-xs uppercase tracking-[0.18em] text-occ-cyan">NOVA module</p>
            <h2 className="text-2xl font-semibold text-white">Emma OCC</h2>
          </div>
          <StatusBadge tone="cyan">Operational module active</StatusBadge>
        </div>
        <DutySummary todayDuty={todayDuty} nextDuty={nextDuty} />
      </section>

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-6">
        <LiveClock timeZone={appTimeZone} />
        <StatCard
          label="Live data source"
          value="Supabase"
          helper={typedLatestImport ? `${typedLatestImport.row_count} duty rows from ${calendarSource}` : "Waiting for first roster import"}
          icon={Database}
        />
        <StatCard
          label="Calendar status"
          value={calendarConnected ? "OAuth connected" : typedLatestImport?.file_type === "calendar/snapshot" ? "Snapshot loaded" : "Not connected"}
          helper={
            calendarConnected
              ? `Hourly refresh active - Last sync ${formatDateTime(calendarConnection?.last_sync_at)}`
              : typedLatestImport?.file_type === "calendar/snapshot"
                ? String(importWindow || "Read-only connector reference")
                : "Connect Google Calendar before writeback"
          }
          icon={CalendarDays}
        />
        <StatCard
          label="Planned duty load"
          value={formatDutyMinutes(workingDutyCount * DUTY_MINUTES)}
          helper={`${workingDutyCount} working duties before SL/vacation edits`}
          icon={ShieldCheck}
        />
        <StatCard
          label="Active conflicts"
          value={activeConflictCount ?? typedConflicts.length}
          helper="Unresolved operational alerts"
          icon={AlertTriangle}
        />
        <StatCard
          label="Notifications"
          value={activeNotificationCount ?? 0}
          helper="Actionable alerts not marked read"
          icon={Bell}
        />
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <section className="rounded-lg border border-occ-line bg-occ-panel p-5">
          <div className="flex items-start justify-between gap-3">
            <div>
              <p className="text-sm text-zinc-400">Commute intelligence</p>
              <h2 className="mt-2 text-2xl font-semibold text-white">
                {routeRecommendation.title ??
                  (nsStatus.status === "clear"
                    ? "NS route clear"
                    : nsStatus.status === "attention"
                      ? "Check alternatives"
                      : nsStatus.status === "needs-route"
                        ? "Route setup needed"
                        : "NS status unavailable")}
              </h2>
              <p className="mt-2 text-sm text-zinc-500">
                {nsStatus.homeAddress && (nsStatus.workAddress || nsStatus.workStation)
                  ? `${nsStatus.homeAddress} to ${nsStatus.workAddress || nsStatus.workStation}`
                  : nsStatus.homeStation && nsStatus.workStation
                    ? `${nsStatus.homeStation} to ${nsStatus.workStation}`
                    : "Home/work route not complete"}
              </p>
            </div>
            <span className="grid h-10 w-10 shrink-0 place-items-center rounded-md bg-occ-panel2 text-occ-cyan">
              <TrainFront size={20} />
            </span>
          </div>

          <div className="mt-4 space-y-2">
            {nsStatus.alerts.length ? (
              nsStatus.alerts.slice(0, 2).map((alert) => (
                <p key={alert.title} className="rounded-md border border-occ-amber/40 bg-occ-amber/10 p-2 text-sm text-amber-100">
                  <strong>{alert.title}</strong> {alert.detail}
                </p>
              ))
            ) : (
              <p className="rounded-md border border-occ-green/30 bg-occ-green/10 p-2 text-sm text-green-100">
                No station-specific NS disruption or platform-change language detected in the latest public snapshot.
              </p>
            )}
          </div>

          <div className="mt-5 border-t border-occ-line pt-4">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <h3 className="text-sm font-semibold text-white">Best commuting options</h3>
              <StatusBadge tone={latestRouteSnapshot?.is_live ? "green" : commute?.travel_mode === "ns" ? "cyan" : "neutral"}>
                {latestRouteSnapshot?.is_live ? "Phase 4 live" : commute?.travel_mode === "ns" ? "NS reference" : "Reference mode"}
              </StatusBadge>
            </div>
            <div className="mt-3 divide-y divide-occ-line">
              {nsStatus.options.slice(0, 4).map((option) => (
                <div key={option.id} className="grid gap-3 py-3 sm:grid-cols-[2rem_1fr_auto] sm:items-center">
                  <span className="grid h-8 w-8 place-items-center rounded-md border border-occ-cyan/30 bg-occ-cyan/10 text-xs font-semibold text-occ-cyan">
                    {option.rank}
                  </span>
                  <div className="min-w-0">
                    <p className="font-medium text-white">{option.title}</p>
                    <p className="mt-1 text-sm text-zinc-500">{option.recommendation}</p>
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
        </section>

        <section className="rounded-lg border border-occ-line bg-occ-panel p-5">
          <div className="flex items-start justify-between gap-3">
            <div>
              <p className="text-sm text-zinc-400">Weather and calendar reliability</p>
              <h2 className="mt-2 text-2xl font-semibold text-white">
                {weather ? `${weather.tempC}C, ${weather.description}` : "Weather unavailable"}
              </h2>
              <p className="mt-2 text-sm text-zinc-500">
                {weather
                  ? `${weather.location} - feels like ${weather.feelsLikeC}C, wind ${weather.windKmph} km/h, humidity ${weather.humidity}%`
                  : "Current weather source could not be reached."}
              </p>
            </div>
            <span className="grid h-10 w-10 shrink-0 place-items-center rounded-md bg-occ-panel2 text-occ-cyan">
              <CloudSun size={20} />
            </span>
          </div>
          <div className="mt-5 grid gap-3 sm:grid-cols-2">
            <div className="rounded-md bg-occ-ink p-3">
              <p className="text-sm text-zinc-400">Calendar readout</p>
              <strong className="mt-1 block text-white">{calendarSource}</strong>
              <p className="mt-1 text-xs text-zinc-500">{typedLatestImport ? formatDateTime(typedLatestImport.imported_at) : "No import yet"}</p>
            </div>
            <div className="rounded-md bg-occ-ink p-3">
              <p className="text-sm text-zinc-400">Last sync log</p>
              <strong className="mt-1 block text-white">{latestCalendarLog?.status ?? "No writeback yet"}</strong>
              <p className="mt-1 text-xs text-zinc-500">{latestCalendarLog ? formatDateTime(latestCalendarLog.synced_at ?? latestCalendarLog.created_at) : "Calendar preview available after import"}</p>
            </div>
          </div>
          <p className="mt-4 text-xs text-zinc-600">
            Sources: Supabase roster tables, Google Calendar connector snapshot, NS public status, and wttr.in weather.
          </p>
        </section>
      </div>

      <DutyLeaveAccounting
        duties={typedDuties}
        today={today}
        sourceLabel={calendarSource}
        storageScope={`dashboard-${user?.id ?? "local"}`}
        persistMode="api"
      />

      <div className="grid gap-4 md:grid-cols-3">
        <StatCard label="Calendar sync" value={latestCalendarLog?.status ?? "Ready"} helper={latestCalendarLog?.error_message ?? "Preview/writeback available after OAuth connection"} icon={RefreshCw} />
        <StatCard label="Import status" value={typedLatestImport?.status ?? "No import"} helper={typedLatestImport?.filename ?? "Upload your first roster"} icon={CalendarDays} />
        <StatCard label="10-day ledger" value={dutyLedgerWindow.length} helper={`Loaded ${today} through ${dutyLedgerEnd}`} icon={AlertTriangle} />
      </div>

      <WeeklyTimeline duties={dutyLedgerWindow} />

      <div className="grid gap-5 xl:grid-cols-[1.3fr_0.9fr]">
        <section className="rounded-lg border border-occ-line bg-occ-panel p-5">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <h2 className="text-lg font-semibold text-white">Roster mix</h2>
              <p className="text-sm text-zinc-500">Loaded roster composition after the latest import.</p>
            </div>
          </div>
          <div className="mt-5 grid gap-3 sm:grid-cols-3">
            <div className="rounded-md bg-occ-ink p-3">
              <p className="text-sm text-zinc-400">Rest days</p>
              <strong className="mt-1 block text-2xl text-white">{typedDuties.filter((duty) => duty.is_off).length}</strong>
              <p className="mt-1 text-xs text-zinc-500">OFF and Rest entries</p>
            </div>
            <div className="rounded-md bg-occ-ink p-3">
              <p className="text-sm text-zinc-400">Night shifts</p>
              <strong className="mt-1 block text-2xl text-white">{typedDuties.filter((duty) => duty.duty_label === "Night Shift").length}</strong>
              <p className="mt-1 text-xs text-zinc-500">23:00-07:05 duties</p>
            </div>
            <div className="rounded-md bg-occ-ink p-3">
              <p className="text-sm text-zinc-400">Late shifts</p>
              <strong className="mt-1 block text-2xl text-white">{typedDuties.filter((duty) => duty.duty_label === "Late Shift").length}</strong>
              <p className="mt-1 text-xs text-zinc-500">15:00-23:05 duties</p>
            </div>
          </div>
          <p className="mt-4 text-xs text-zinc-600">
            {dutyLedgerWindow.length} synced calendar roster row(s) in the rolling 10-day ledger from {today} through {dutyLedgerEnd}.
          </p>
        </section>
        <ConflictPanel conflicts={typedConflicts} />
      </div>

      <AiAssistantPanel />
    </div>
  );
}
