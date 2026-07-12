import { MapPinned, Navigation, TimerReset } from "lucide-react";
import { CommutePlanPanel } from "@/components/commute/CommutePlanPanel";
import { StatusBadge } from "@/components/dashboard/StatusBadge";
import { LocationPermissionPanel } from "@/components/nova/LocationPermissionPanel";
import { buildPhase4CommutePlan } from "@/lib/commute/route-planner";
import { fetchLiveWeather } from "@/lib/live-demo";
import { fetchNsCommuteStatus } from "@/lib/ns-commute";
import { createSupabaseServerClient } from "@/lib/supabase/server";

function formatDateTime(value?: string | null) {
  if (!value) return "Not recorded";
  return new Intl.DateTimeFormat("en-GB", {
    dateStyle: "medium",
    timeStyle: "short",
    timeZone: process.env.APP_TIMEZONE || "Europe/Amsterdam"
  }).format(new Date(value));
}

function phaseLabel(value?: string | null) {
  return value ? value.replaceAll("_", " ") : "not started";
}

export default async function CommutePage() {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user }
  } = await supabase.auth.getUser();

  const { data: commute } = await supabase
    .from("commute_settings")
    .select("enabled,before_minutes,after_minutes,travel_mode,home_address,work_address,home_station,work_station")
    .eq("user_id", user?.id)
    .maybeSingle();

  const { data: settings } = await supabase
    .from("user_settings")
    .select("route_preferences")
    .eq("user_id", user?.id)
    .maybeSingle();

  const { data: activeMission } = await supabase
    .from("commute_missions")
    .select("*")
    .eq("user_id", user?.id)
    .in("status", ["planned", "active"])
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  const { data: events = [] } = await supabase
    .from("location_events")
    .select("id,event_type,coarse_location_label,confidence,accuracy_meters,route_phase,created_at")
    .eq("user_id", user?.id)
    .order("created_at", { ascending: false })
    .limit(8);

  const { data: locations = [] } = await supabase
    .from("saved_locations")
    .select("id,label,kind,address,latitude,longitude,radius_meters")
    .eq("user_id", user?.id)
    .is("deleted_at", null)
    .order("kind", { ascending: true });

  const [weather, nsStatus] = await Promise.all([
    fetchLiveWeather(),
    fetchNsCommuteStatus({
      homeStation: commute?.home_station || process.env.NS_HOME_STATION,
      workStation: commute?.work_station || process.env.NS_WORK_STATION,
      homeAddress: commute?.home_address || process.env.COMMUTE_HOME_ADDRESS,
      workAddress: commute?.work_address || process.env.COMMUTE_WORK_ADDRESS
    })
  ]);

  const commutePlan = await buildPhase4CommutePlan({
    direction: activeMission?.direction === "return" ? "return" : "outbound",
    commute,
    routePreferences: settings?.route_preferences,
    weather
  });

  const geofenceReadyCount = (locations ?? []).filter((location: any) => location.latitude !== null && location.longitude !== null).length;
  const missionTone = activeMission?.status === "active" ? "green" : activeMission?.status === "completed" ? "cyan" : "amber";

  return (
    <div className="space-y-5">
      <section className="rounded-lg border border-occ-line bg-occ-panel p-5">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <p className="text-xs uppercase tracking-[0.18em] text-occ-cyan">Phase 4</p>
            <h1 className="mt-2 text-3xl font-semibold text-white">Commute progress and route intelligence</h1>
            <p className="mt-3 max-w-3xl text-sm text-zinc-400">
              NOVA combines optional GPS progress with live provider checks when keys are available, then falls back to clearly labeled planner links.
            </p>
          </div>
          <StatusBadge tone={missionTone}>{activeMission?.status ?? "No active mission"}</StatusBadge>
        </div>
      </section>

      <div className="grid gap-5 xl:grid-cols-[0.95fr_1.05fr]">
        <LocationPermissionPanel />

        <section className="rounded-lg border border-occ-line bg-occ-panel p-5">
          <div className="flex items-center gap-2">
            <Navigation size={18} className="text-occ-cyan" />
            <h2 className="text-lg font-semibold text-white">Current mission</h2>
          </div>
          <div className="mt-5 grid gap-3 sm:grid-cols-2">
            <span className="rounded-md bg-occ-ink p-3 text-sm text-zinc-400">
              Phase
              <strong className="mt-1 block text-white">{phaseLabel(activeMission?.current_phase)}</strong>
            </span>
            <span className="rounded-md bg-occ-ink p-3 text-sm text-zinc-400">
              Latest location
              <strong className="mt-1 block text-white">{activeMission?.latest_location_label ?? "No GPS event yet"}</strong>
            </span>
            <span className="rounded-md bg-occ-ink p-3 text-sm text-zinc-400">
              Confidence
              <strong className="mt-1 block text-white">
                {typeof activeMission?.latest_confidence === "number" ? `${Math.round(activeMission.latest_confidence * 100)}%` : "Unknown"}
              </strong>
            </span>
            <span className="rounded-md bg-occ-ink p-3 text-sm text-zinc-400">
              Last event
              <strong className="mt-1 block text-white">{formatDateTime(activeMission?.latest_event_at)}</strong>
            </span>
          </div>
        </section>
      </div>

      <CommutePlanPanel initialPlan={commutePlan} direction={commutePlan.direction} />

      <div className="grid gap-5 xl:grid-cols-2">
        <section className="rounded-lg border border-occ-line bg-occ-panel p-5">
          <div className="flex items-center gap-2">
            <MapPinned size={18} className="text-occ-cyan" />
            <h2 className="text-lg font-semibold text-white">Saved geofences</h2>
          </div>
          <p className="mt-2 text-sm text-zinc-500">
            {geofenceReadyCount}/{locations?.length ?? 0} locations have GPS points. Use the GPS panel to bind current coordinates to each saved place.
          </p>
          <div className="mt-5 divide-y divide-occ-line">
            {(locations ?? []).map((location: any) => (
              <div key={location.id} className="grid gap-2 py-3 sm:grid-cols-[1fr_120px_120px] sm:items-center">
                <div>
                  <p className="text-sm font-medium text-white">{location.label}</p>
                  <p className="text-xs text-zinc-500">{location.address ?? location.kind}</p>
                </div>
                <StatusBadge tone={location.latitude !== null && location.longitude !== null ? "green" : "amber"}>
                  {location.latitude !== null && location.longitude !== null ? "Ready" : "Needs point"}
                </StatusBadge>
                <span className="text-xs text-zinc-500">{location.radius_meters} m radius</span>
              </div>
            ))}
          </div>
        </section>

        <section className="rounded-lg border border-occ-line bg-occ-panel p-5">
          <div className="flex items-center gap-2">
            <TimerReset size={18} className="text-occ-cyan" />
            <h2 className="text-lg font-semibold text-white">Recent coarse events</h2>
          </div>
          <div className="mt-5 divide-y divide-occ-line">
            {(events ?? []).length ? (
              (events ?? []).map((event: any) => (
                <div key={event.id} className="grid gap-2 py-3 sm:grid-cols-[1fr_130px] sm:items-center">
                  <div>
                    <p className="text-sm font-medium text-white">{event.coarse_location_label ?? "In transit"}</p>
                    <p className="text-xs text-zinc-500">
                      {phaseLabel(event.route_phase)} · {Math.round(Number(event.confidence ?? 0) * 100)}% · accuracy {event.accuracy_meters ?? "unknown"} m
                    </p>
                  </div>
                  <span className="text-xs text-zinc-500">{formatDateTime(event.created_at)}</span>
                </div>
              ))
            ) : (
              <p className="py-8 text-sm text-zinc-500">No coarse location events stored yet.</p>
            )}
          </div>
        </section>
      </div>

      <section className="rounded-lg border border-occ-line bg-occ-panel p-5">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <p className="text-xs uppercase tracking-[0.18em] text-occ-cyan">NS reference</p>
            <h2 className="mt-2 text-lg font-semibold text-white">{nsStatus.title}</h2>
            <p className="mt-2 text-sm text-zinc-500">
              {nsStatus.homeStation ?? "Home station"} ⇄ {nsStatus.workStation ?? "Work station"}
            </p>
          </div>
          <StatusBadge tone={nsStatus.status === "clear" ? "green" : "amber"}>{nsStatus.status}</StatusBadge>
        </div>
      </section>
    </div>
  );
}
