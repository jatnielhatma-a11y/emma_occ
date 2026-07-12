import { Activity, Bell, Footprints, Route } from "lucide-react";
import { LearningPanel } from "@/components/learning/LearningPanel";
import { StatusBadge } from "@/components/dashboard/StatusBadge";
import { createSupabaseServerClient } from "@/lib/supabase/server";

function average(rows: Array<{ speed_kmh?: number | string | null }>) {
  const values = rows.map((row) => Number(row.speed_kmh)).filter((value) => Number.isFinite(value));
  if (!values.length) return null;
  return values.reduce((sum, value) => sum + value, 0) / values.length;
}

export default async function AnalyticsPage() {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user }
  } = await supabase.auth.getUser();

  const [
    { data: walkingSamples = [] },
    { data: routeFeedback = [] },
    { data: missionHistory = [] },
    { data: latestRouteSnapshot },
    { count: activeAlertCount = 0 }
  ] = await Promise.all([
    supabase
      .from("walking_speed_samples")
      .select("segment_label,speed_kmh,confidence,created_at")
      .eq("user_id", user?.id)
      .order("created_at", { ascending: false })
      .limit(10),
    supabase
      .from("route_preference_feedback")
      .select("feedback_type,created_at,preference_delta")
      .eq("user_id", user?.id)
      .order("created_at", { ascending: false })
      .limit(10),
    supabase
      .from("mission_history")
      .select("direction,status,arrival_delta_minutes,confidence,created_at")
      .eq("user_id", user?.id)
      .order("created_at", { ascending: false })
      .limit(10),
    supabase
      .from("commute_route_snapshots")
      .select("id")
      .eq("user_id", user?.id)
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle(),
    supabase
      .from("notification_events")
      .select("id", { count: "exact", head: true })
      .eq("user_id", user?.id)
      .in("status", ["pending", "sent"])
  ]);

  const avgSpeed = average((walkingSamples ?? []) as any[]);

  return (
    <div className="space-y-5">
      <section className="rounded-lg border border-occ-line bg-occ-panel p-5">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <p className="text-xs uppercase tracking-[0.18em] text-occ-cyan">Phase 6</p>
            <h1 className="mt-2 text-3xl font-semibold text-white">Operational analytics</h1>
            <p className="mt-2 text-sm text-zinc-500">Mission history, learning samples, route feedback, and alert load.</p>
          </div>
          <StatusBadge tone="cyan">Learning foundation active</StatusBadge>
        </div>
      </section>

      <div className="grid gap-4 md:grid-cols-4">
        <section className="rounded-lg border border-occ-line bg-occ-panel p-5">
          <Footprints size={18} className="text-occ-cyan" />
          <p className="mt-3 text-sm text-zinc-400">Walking speed</p>
          <strong className="mt-1 block text-2xl text-white">{avgSpeed ? `${avgSpeed.toFixed(2)} km/h` : "No samples"}</strong>
        </section>
        <section className="rounded-lg border border-occ-line bg-occ-panel p-5">
          <Route size={18} className="text-occ-cyan" />
          <p className="mt-3 text-sm text-zinc-400">Route feedback</p>
          <strong className="mt-1 block text-2xl text-white">{routeFeedback?.length ?? 0}</strong>
        </section>
        <section className="rounded-lg border border-occ-line bg-occ-panel p-5">
          <Activity size={18} className="text-occ-cyan" />
          <p className="mt-3 text-sm text-zinc-400">Mission records</p>
          <strong className="mt-1 block text-2xl text-white">{missionHistory?.length ?? 0}</strong>
        </section>
        <section className="rounded-lg border border-occ-line bg-occ-panel p-5">
          <Bell size={18} className="text-occ-cyan" />
          <p className="mt-3 text-sm text-zinc-400">Active alerts</p>
          <strong className="mt-1 block text-2xl text-white">{activeAlertCount ?? 0}</strong>
        </section>
      </div>

      <LearningPanel latestRouteSnapshotId={latestRouteSnapshot?.id ?? null} />

      <div className="grid gap-5 xl:grid-cols-3">
        <section className="rounded-lg border border-occ-line bg-occ-panel p-5">
          <h2 className="font-semibold text-white">Recent walking samples</h2>
          <div className="mt-4 divide-y divide-occ-line">
            {(walkingSamples ?? []).length ? (
              (walkingSamples ?? []).map((sample: any) => (
                <div key={`${sample.segment_label}-${sample.created_at}`} className="py-3">
                  <p className="text-sm font-medium text-white">{sample.segment_label}</p>
                  <p className="mt-1 text-xs text-zinc-500">{Number(sample.speed_kmh).toFixed(2)} km/h · {Math.round(Number(sample.confidence) * 100)}%</p>
                </div>
              ))
            ) : (
              <p className="py-6 text-sm text-zinc-500">No walking samples yet.</p>
            )}
          </div>
        </section>
        <section className="rounded-lg border border-occ-line bg-occ-panel p-5">
          <h2 className="font-semibold text-white">Recent route feedback</h2>
          <div className="mt-4 divide-y divide-occ-line">
            {(routeFeedback ?? []).length ? (
              (routeFeedback ?? []).map((feedback: any) => (
                <div key={`${feedback.feedback_type}-${feedback.created_at}`} className="py-3">
                  <p className="text-sm font-medium text-white">{feedback.feedback_type.replaceAll("_", " ")}</p>
                  <p className="mt-1 text-xs text-zinc-500">{Object.keys(feedback.preference_delta ?? {}).join(", ") || "No preference change"}</p>
                </div>
              ))
            ) : (
              <p className="py-6 text-sm text-zinc-500">No route feedback yet.</p>
            )}
          </div>
        </section>
        <section className="rounded-lg border border-occ-line bg-occ-panel p-5">
          <h2 className="font-semibold text-white">Mission history</h2>
          <div className="mt-4 divide-y divide-occ-line">
            {(missionHistory ?? []).length ? (
              (missionHistory ?? []).map((mission: any) => (
                <div key={`${mission.direction}-${mission.created_at}`} className="py-3">
                  <p className="text-sm font-medium text-white">{mission.direction} · {mission.status}</p>
                  <p className="mt-1 text-xs text-zinc-500">Arrival delta {mission.arrival_delta_minutes ?? "unknown"} min</p>
                </div>
              ))
            ) : (
              <p className="py-6 text-sm text-zinc-500">No completed mission records yet.</p>
            )}
          </div>
        </section>
      </div>
    </div>
  );
}
