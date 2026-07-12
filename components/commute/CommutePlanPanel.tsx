"use client";

import { RefreshCw, Route, TriangleAlert } from "lucide-react";
import { useState } from "react";
import { StatusBadge } from "@/components/dashboard/StatusBadge";
import type { CommuteDirection, CommutePlan, CommuteRouteOption } from "@/lib/commute/route-planner";

type CommutePlanPanelProps = {
  initialPlan: CommutePlan | null;
  direction: CommuteDirection;
};

function formatMinutes(value: number | null) {
  return typeof value === "number" ? `${value} min` : "Open planner";
}

function OptionRow({ option }: { option: CommuteRouteOption }) {
  return (
    <div className="grid gap-3 py-3 sm:grid-cols-[2rem_1fr_auto] sm:items-center">
      <span className="grid h-8 w-8 place-items-center rounded-md border border-occ-cyan/30 bg-occ-cyan/10 text-xs font-semibold text-occ-cyan">
        {option.rank}
      </span>
      <div className="min-w-0">
        <div className="flex flex-wrap items-center gap-2">
          <p className="font-medium text-white">{option.title}</p>
          <StatusBadge tone={option.risk}>{option.risk}</StatusBadge>
          <StatusBadge tone={option.isLive ? "green" : "neutral"}>{option.isLive ? "live" : "fallback"}</StatusBadge>
        </div>
        <p className="mt-1 text-sm text-zinc-500">{option.detail}</p>
        <p className="mt-1 text-xs text-zinc-600">
          {option.source} · {Math.round(option.confidence * 100)}% confidence · {formatMinutes(option.durationMinutes)}
        </p>
      </div>
      {option.url ? (
        <a className="text-sm font-medium text-occ-cyan hover:text-white" href={option.url} target="_blank" rel="noreferrer">
          Open
        </a>
      ) : null}
    </div>
  );
}

export function CommutePlanPanel({ initialPlan, direction }: CommutePlanPanelProps) {
  const [plan, setPlan] = useState(initialPlan);
  const [status, setStatus] = useState("");
  const [loading, setLoading] = useState(false);

  async function refreshPlan() {
    setLoading(true);
    setStatus("Checking route...");
    try {
      const response = await fetch(`/api/commute/plan?direction=${direction}`);
      const payload = await response.json();
      if (!payload.ok) {
        setStatus(payload.error ?? "Route refresh failed.");
        if (payload.plan) setPlan(payload.plan);
        return;
      }
      setPlan(payload.plan);
      setStatus("Route snapshot saved.");
    } catch {
      setStatus("Route refresh failed.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <section className="rounded-lg border border-occ-line bg-occ-panel p-5">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="text-xs uppercase tracking-[0.18em] text-occ-cyan">Phase 4</p>
          <h2 className="mt-2 text-lg font-semibold text-white">Route intelligence</h2>
          <p className="mt-2 text-sm text-zinc-500">{plan?.routeLabel ?? "Add commute settings to compare live route options."}</p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <StatusBadge tone={plan?.status ?? "neutral"}>{plan?.status ?? "waiting"}</StatusBadge>
          <StatusBadge tone={plan?.isLive ? "green" : "neutral"}>{plan?.isLive ? "live provider" : "fallback links"}</StatusBadge>
          <button
            type="button"
            onClick={refreshPlan}
            disabled={loading}
            className="focus-ring inline-flex items-center gap-2 rounded-md bg-occ-cyan px-3 py-2 text-sm font-semibold text-occ-ink disabled:opacity-60"
          >
            <RefreshCw size={15} className={loading ? "animate-spin" : ""} />
            Refresh
          </button>
        </div>
      </div>

      {plan?.recommended ? (
        <div className="mt-5 rounded-md border border-occ-cyan/30 bg-occ-cyan/10 p-4">
          <div className="flex items-center gap-2 text-sm font-semibold text-cyan-100">
            <Route size={17} />
            Recommended option
          </div>
          <OptionRow option={plan.recommended} />
        </div>
      ) : (
        <p className="mt-5 rounded-md border border-occ-amber/30 bg-occ-amber/10 p-3 text-sm text-amber-100">
          Route settings are incomplete, so NOVA cannot recommend a commute option yet.
        </p>
      )}

      {plan?.backups.length ? (
        <div className="mt-5 divide-y divide-occ-line">
          {plan.backups.map((option) => (
            <OptionRow key={option.id} option={option} />
          ))}
        </div>
      ) : null}

      {plan?.incidents.length ? (
        <div className="mt-5 space-y-2">
          <div className="flex items-center gap-2 text-sm font-semibold text-white">
            <TriangleAlert size={16} className="text-occ-amber" />
            Alerts and buffers
          </div>
          {plan.incidents.slice(0, 5).map((incident) => (
            <p key={`${incident.source}-${incident.title}-${incident.detail}`} className="rounded-md border border-occ-line bg-occ-ink p-3 text-sm text-zinc-300">
              <strong className="text-white">{incident.title}</strong> {incident.detail}
            </p>
          ))}
        </div>
      ) : null}

      <div className="mt-5 grid gap-2 sm:grid-cols-2 xl:grid-cols-4">
        {(plan?.sources ?? []).map((source) => (
          <div key={`${source.name}-${source.checkedAt}`} className="rounded-md bg-occ-ink p-3">
            <p className="text-sm font-medium text-white">{source.name}</p>
            <p className="mt-1 text-xs text-zinc-500">
              {source.freshness} · {Math.round(source.confidence * 100)}%
            </p>
          </div>
        ))}
      </div>
      {status ? <p className="mt-4 text-sm text-zinc-400">{status}</p> : null}
    </section>
  );
}
