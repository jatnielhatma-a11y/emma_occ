import { fetchLiveWeather } from "@/lib/live-demo";
import { isVacationDuty } from "@/lib/roster/accounting";
import type { NovaBriefSource, NovaOperationalContext, NovaRisk } from "./types";

type SupabaseLike = {
  from(table: string): any;
};

type DutyRow = {
  duty_date: string;
  start_time: string | null;
  end_time: string | null;
  duty_label: string;
  original_duty_code: string | null;
  is_off: boolean;
};

type RouteSnapshotRow = {
  route_status: NovaRisk;
  is_live: boolean;
  confidence: number;
  provider_summary: Record<string, unknown> | null;
  recommended_option: Record<string, unknown> | null;
  incidents: unknown[] | null;
  created_at: string;
};

type ConflictRow = {
  severity: "Low" | "Medium" | "High" | "Critical";
  title: string;
  detail: string | null;
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
  if (!value) return "Not recorded";
  return new Intl.DateTimeFormat("en-GB", {
    timeZone: process.env.APP_TIMEZONE || "Europe/Amsterdam",
    dateStyle: "medium",
    timeStyle: "short"
  }).format(new Date(value));
}

function dutyLabel(duty?: DutyRow | null) {
  if (!duty) return "No duty loaded";
  if (duty.is_off) return `${duty.duty_date} - ${duty.duty_label}`;
  return `${duty.duty_date} - ${duty.duty_label} ${duty.start_time?.slice(0, 5) ?? "--:--"}-${duty.end_time?.slice(0, 5) ?? "--:--"}`;
}

function riskFromConflict(severity?: ConflictRow["severity"] | null): NovaRisk {
  if (severity === "Critical" || severity === "High") return "red";
  if (severity === "Medium" || severity === "Low") return "amber";
  return "green";
}

function weatherRisk(description: string, windKmph: string): NovaRisk {
  const lower = description.toLowerCase();
  const wind = Number(windKmph || 0);
  if (lower.includes("storm") || lower.includes("snow") || wind >= 45) return "red";
  if (lower.includes("rain") || lower.includes("shower") || lower.includes("mist") || wind >= 30) return "amber";
  return "green";
}

function normalizeLanguage(value?: string | null): "en" | "es" | "fr" {
  return value === "es" || value === "fr" ? value : "en";
}

function source(label: string, sourceName: string, timestamp: string, freshness: NovaBriefSource["freshness"], confidence: number): NovaBriefSource {
  return {
    label,
    source: sourceName,
    timestamp,
    freshness,
    confidence
  };
}

function incidentRows(value: unknown[] | null | undefined) {
  return (value ?? []).slice(0, 5).map((incident) => {
    const row = incident as Record<string, unknown>;
    const severity: NovaRisk = row.severity === "red" || row.severity === "amber" || row.severity === "green" ? row.severity : "amber";
    return {
      title: String(row.title ?? "Route incident"),
      detail: String(row.detail ?? "Review route details."),
      severity,
      source: String(row.source ?? "Route provider")
    };
  });
}

export async function buildNovaOperationalContext(supabase: SupabaseLike, userId: string): Promise<NovaOperationalContext> {
  const today = todayInTimezone();

  const [
    { data: settings },
    { data: duties = [] },
    { data: conflicts = [] },
    { data: routeSnapshot },
    { data: latestImport },
    { data: calendarConnection },
    { data: latestCalendarLog },
    { count: upcomingAppointments = 0 },
    { count: openTasks = 0 },
    { count: upcomingSpecialDates = 0 },
    weather
  ] = await Promise.all([
    supabase.from("user_settings").select("preferred_language").eq("user_id", userId).maybeSingle(),
    supabase
      .from("duties")
      .select("duty_date,start_time,end_time,duty_label,original_duty_code,is_off")
      .eq("user_id", userId)
      .gte("duty_date", today)
      .order("duty_date", { ascending: true })
      .limit(45),
    supabase
      .from("conflict_logs")
      .select("severity,title,detail")
      .eq("user_id", userId)
      .is("resolved_at", null)
      .order("created_at", { ascending: false })
      .limit(10),
    supabase
      .from("commute_route_snapshots")
      .select("route_status,is_live,confidence,provider_summary,recommended_option,incidents,created_at")
      .eq("user_id", userId)
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle(),
    supabase
      .from("imports")
      .select("filename,file_type,imported_at")
      .eq("user_id", userId)
      .order("imported_at", { ascending: false })
      .limit(1)
      .maybeSingle(),
    supabase
      .from("google_calendar_connections")
      .select("connected_at,last_sync_at,disconnected_at,connected_services")
      .eq("user_id", userId)
      .eq("calendar_id", process.env.GOOGLE_CALENDAR_ID || "primary")
      .maybeSingle(),
    supabase
      .from("calendar_sync_logs")
      .select("status,synced_at,created_at")
      .eq("user_id", userId)
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle(),
    supabase
      .from("nova_calendar_items")
      .select("id", { count: "exact", head: true })
      .eq("user_id", userId)
      .neq("item_kind", "special_date")
      .neq("status", "cancelled")
      .or(`starts_at.gte.${new Date().toISOString()},all_day_date.gte.${today}`),
    supabase
      .from("nova_tasks")
      .select("id", { count: "exact", head: true })
      .eq("user_id", userId)
      .neq("status", "completed"),
    supabase
      .from("nova_calendar_items")
      .select("id", { count: "exact", head: true })
      .eq("user_id", userId)
      .eq("item_kind", "special_date")
      .neq("status", "cancelled")
      .gte("all_day_date", today),
    fetchLiveWeather()
  ]);

  const typedDuties = (duties ?? []) as DutyRow[];
  const typedConflicts = (conflicts ?? []) as ConflictRow[];
  const typedSnapshot = routeSnapshot as RouteSnapshotRow | null;
  const todayDuty = typedDuties.find((duty) => duty.duty_date === today);
  const nextDuty = typedDuties.find((duty) => !duty.is_off && !isVacationDuty(duty));
  const highestConflict = typedConflicts[0] ?? null;
  const routeSummary = (typedSnapshot?.provider_summary ?? {}) as Record<string, unknown>;
  const routeRecommendation = (typedSnapshot?.recommended_option ?? {}) as Record<string, unknown>;
  const routeStatus = typedSnapshot?.route_status ?? "amber";
  const routeCheckedAt = typedSnapshot?.created_at ?? null;
  const weatherLabel = weather ? `${weather.tempC}C, ${weather.description}` : "Weather unavailable";
  const weatherStatus = weather ? weatherRisk(weather.description, weather.windKmph) : "amber";
  const calendarConnected = Boolean(calendarConnection && !calendarConnection.disconnected_at);
  const gmailConnected = Boolean(calendarConnection?.connected_services?.gmail);
  const calendarSource = latestImport?.file_type === "calendar/snapshot" ? "Google Calendar snapshot" : latestImport?.filename ?? "No roster import";
  const sources = [
    source("Roster", "Supabase", latestImport?.imported_at ?? new Date().toISOString(), latestImport ? "recent" : "unavailable", latestImport ? 0.85 : 0.25),
    source(
      "Route",
      typedSnapshot?.is_live ? "Live route provider" : "Route fallback",
      routeCheckedAt ?? new Date().toISOString(),
      typedSnapshot?.is_live ? "live" : typedSnapshot ? "fallback" : "unavailable",
      Number(typedSnapshot?.confidence ?? 0.3)
    ),
    source(
      "Calendar",
      "Google Calendar",
      latestCalendarLog?.synced_at ?? latestCalendarLog?.created_at ?? calendarConnection?.connected_at ?? new Date().toISOString(),
      calendarConnected ? "recent" : "fallback",
      calendarConnected ? 0.82 : 0.42
    ),
    source("Weather", weather?.source ?? "Weather provider", new Date().toISOString(), weather ? "recent" : "unavailable", weather ? 0.75 : 0.25)
  ];

  return {
    language: normalizeLanguage(settings?.preferred_language),
    today,
    generatedAt: new Date().toISOString(),
    duty: {
      todayLabel: dutyLabel(todayDuty),
      nextDutyLabel: dutyLabel(nextDuty),
      upcomingWorkingCount: typedDuties.filter((duty) => !duty.is_off && !isVacationDuty(duty)).length,
      vacationOrRestCount: typedDuties.filter((duty) => duty.is_off || isVacationDuty(duty)).length
    },
    commute: {
      routeLabel: String(routeSummary.routeLabel ?? "Commute route not refreshed"),
      status: routeStatus,
      recommendation: String(routeRecommendation.title ?? "Refresh commute route intelligence"),
      isLive: Boolean(typedSnapshot?.is_live),
      confidence: Number(typedSnapshot?.confidence ?? 0.3),
      incidents: incidentRows(typedSnapshot?.incidents),
      checkedAt: routeCheckedAt
    },
    calendar: {
      connected: calendarConnected,
      lastSyncLabel: calendarConnected ? `Last sync ${formatDateTime(calendarConnection?.last_sync_at)}` : "Calendar not connected",
      sourceLabel: calendarSource,
      upcomingAppointments: upcomingAppointments ?? 0,
      openTasks: openTasks ?? 0,
      upcomingSpecialDates: upcomingSpecialDates ?? 0
    },
    email: {
      connected: gmailConnected,
      actionableCount: null
    },
    weather: {
      label: weatherLabel,
      risk: weatherStatus,
      source: weather?.source ?? "Weather provider",
      checkedAt: new Date().toISOString()
    },
    conflicts: {
      count: typedConflicts.length,
      highest: highestConflict ? `${highestConflict.title} (${highestConflict.severity})` : null,
      risk: riskFromConflict(highestConflict?.severity)
    },
    integrations: {
      fallbackCount: sources.filter((item) => item.freshness === "fallback").length,
      unavailableCount: sources.filter((item) => item.freshness === "unavailable").length
    },
    sources
  };
}
