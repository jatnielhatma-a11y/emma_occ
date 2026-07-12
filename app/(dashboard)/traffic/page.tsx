import { AlertTriangle, Database, RadioTower, Route } from "lucide-react";
import { StatusBadge } from "@/components/dashboard/StatusBadge";
import { createSupabaseServerClient } from "@/lib/supabase/server";

function formatDateTime(value?: string | null) {
  if (!value) return "No snapshot yet";
  return new Intl.DateTimeFormat("en-GB", {
    dateStyle: "medium",
    timeStyle: "short",
    timeZone: process.env.APP_TIMEZONE || "Europe/Amsterdam"
  }).format(new Date(value));
}

export default async function TrafficPage() {
  const supabase = createSupabaseServerClient();
  const {
    data: { user }
  } = await supabase.auth.getUser();

  const { data: snapshot } = await supabase
    .from("commute_route_snapshots")
    .select("direction,route_status,confidence,is_live,provider_summary,recommended_option,backup_options,incidents,created_at")
    .eq("user_id", user?.id)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  const providerSummary = (snapshot?.provider_summary ?? {}) as any;
  const recommended = (snapshot?.recommended_option ?? {}) as any;
  const backups = Array.isArray(snapshot?.backup_options) ? (snapshot?.backup_options as any[]) : [];
  const incidents = Array.isArray(snapshot?.incidents) ? (snapshot?.incidents as any[]) : [];
  const sources = Array.isArray(providerSummary.sources) ? providerSummary.sources : [];

  return (
    <div className="space-y-5">
      <section className="rounded-lg border border-occ-line bg-occ-panel p-5">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <p className="text-xs uppercase tracking-[0.18em] text-occ-cyan">Phase 4</p>
            <h1 className="mt-2 text-3xl font-semibold text-white">Traffic and route status</h1>
            <p className="mt-3 max-w-3xl text-sm text-zinc-400">
              This page reviews the latest commute route snapshot saved from the Commute page refresh.
            </p>
          </div>
          <StatusBadge tone={snapshot?.route_status ?? "neutral"}>{snapshot?.route_status ?? "No snapshot"}</StatusBadge>
        </div>
      </section>

      <div className="grid gap-4 md:grid-cols-3">
        <section className="rounded-lg border border-occ-line bg-occ-panel p-5">
          <div className="flex items-center gap-2">
            <Route size={18} className="text-occ-cyan" />
            <h2 className="font-semibold text-white">Recommended route</h2>
          </div>
          <p className="mt-4 text-2xl font-semibold text-white">{recommended.title ?? "No route checked"}</p>
          <p className="mt-2 text-sm text-zinc-500">{recommended.detail ?? "Refresh route intelligence from the Commute page."}</p>
          {recommended.url ? (
            <a className="mt-4 inline-flex text-sm font-medium text-occ-cyan hover:text-white" href={recommended.url} target="_blank" rel="noreferrer">
              Open route
            </a>
          ) : null}
        </section>

        <section className="rounded-lg border border-occ-line bg-occ-panel p-5">
          <div className="flex items-center gap-2">
            <Database size={18} className="text-occ-cyan" />
            <h2 className="font-semibold text-white">Snapshot</h2>
          </div>
          <p className="mt-4 text-2xl font-semibold text-white">{formatDateTime(snapshot?.created_at)}</p>
          <p className="mt-2 text-sm text-zinc-500">
            {providerSummary.routeLabel ?? "No route label"} · {snapshot?.direction ?? "direction pending"}
          </p>
        </section>

        <section className="rounded-lg border border-occ-line bg-occ-panel p-5">
          <div className="flex items-center gap-2">
            <RadioTower size={18} className="text-occ-cyan" />
            <h2 className="font-semibold text-white">Provider state</h2>
          </div>
          <p className="mt-4 text-2xl font-semibold text-white">{snapshot?.is_live ? "Live" : "Fallback"}</p>
          <p className="mt-2 text-sm text-zinc-500">
            {typeof snapshot?.confidence === "number" ? `${Math.round(snapshot.confidence * 100)}% confidence` : "Confidence pending"}
          </p>
        </section>
      </div>

      <section className="rounded-lg border border-occ-line bg-occ-panel p-5">
        <div className="flex items-center gap-2">
          <AlertTriangle size={18} className="text-occ-amber" />
          <h2 className="font-semibold text-white">Alerts and disruptions</h2>
        </div>
        <div className="mt-5 divide-y divide-occ-line">
          {incidents.length ? (
            incidents.map((incident) => (
              <div key={`${incident.source}-${incident.title}-${incident.detail}`} className="py-3">
                <div className="flex flex-wrap items-center gap-2">
                  <p className="font-medium text-white">{incident.title}</p>
                  <StatusBadge tone={incident.severity ?? "amber"}>{incident.source}</StatusBadge>
                </div>
                <p className="mt-1 text-sm text-zinc-500">{incident.detail}</p>
              </div>
            ))
          ) : (
            <p className="py-8 text-sm text-zinc-500">No route alerts stored in the latest snapshot.</p>
          )}
        </div>
      </section>

      <div className="grid gap-5 xl:grid-cols-2">
        <section className="rounded-lg border border-occ-line bg-occ-panel p-5">
          <h2 className="font-semibold text-white">Backup options</h2>
          <div className="mt-5 divide-y divide-occ-line">
            {backups.length ? (
              backups.map((option) => (
                <div key={option.id} className="grid gap-3 py-3 sm:grid-cols-[1fr_auto] sm:items-center">
                  <div>
                    <p className="font-medium text-white">{option.title}</p>
                    <p className="mt-1 text-sm text-zinc-500">{option.detail}</p>
                  </div>
                  {option.url ? (
                    <a className="text-sm font-medium text-occ-cyan hover:text-white" href={option.url} target="_blank" rel="noreferrer">
                      Open
                    </a>
                  ) : null}
                </div>
              ))
            ) : (
              <p className="py-8 text-sm text-zinc-500">No backup route options stored yet.</p>
            )}
          </div>
        </section>

        <section className="rounded-lg border border-occ-line bg-occ-panel p-5">
          <h2 className="font-semibold text-white">Sources</h2>
          <div className="mt-5 grid gap-3 sm:grid-cols-2">
            {sources.length ? (
              sources.map((source: any) => (
                <div key={`${source.name}-${source.checkedAt}`} className="rounded-md bg-occ-ink p-3">
                  <p className="text-sm font-medium text-white">{source.name}</p>
                  <p className="mt-1 text-xs text-zinc-500">
                    {source.freshness} · {Math.round(Number(source.confidence ?? 0) * 100)}%
                  </p>
                </div>
              ))
            ) : (
              <p className="text-sm text-zinc-500">Provider sources will appear after the first refresh.</p>
            )}
          </div>
        </section>
      </div>
    </div>
  );
}
