"use client";

import { Brain, RefreshCw, ShieldAlert } from "lucide-react";
import { useState } from "react";
import { StatusBadge } from "@/components/dashboard/StatusBadge";

type BriefRow = {
  title: string;
  summary: string;
  status: "green" | "amber" | "red";
  confidence: number;
  should_notify: boolean;
  facts: Array<{ label: string; value: string; risk: "green" | "amber" | "red"; sourceLabel: string }>;
  recommendations: Array<{ priority: "now" | "soon" | "monitor"; action: string; reason: string; risk: "green" | "amber" | "red" }>;
  suppressed_updates: string[];
  sources: Array<{ label: string; source: string; timestamp: string; freshness: string; confidence: number }>;
  generated_by: "openai" | "fallback";
  created_at: string;
};

type DailyBriefPanelProps = {
  initialBrief: BriefRow | null;
};

function formatTime(value?: string | null) {
  if (!value) return "Not generated";
  return new Intl.DateTimeFormat("en-GB", {
    dateStyle: "medium",
    timeStyle: "short"
  }).format(new Date(value));
}

export function DailyBriefPanel({ initialBrief }: DailyBriefPanelProps) {
  const [brief, setBrief] = useState(initialBrief);
  const [loading, setLoading] = useState(false);
  const [status, setStatus] = useState("");

  async function generateBrief() {
    setLoading(true);
    setStatus("Generating brief...");
    try {
      const response = await fetch("/api/ai/daily-brief", { method: "POST" });
      const payload = await response.json();
      if (!payload.ok) {
        setStatus(payload.error ?? "Brief generation failed.");
        return;
      }
      setBrief(payload.brief);
      setStatus("Daily brief updated.");
    } catch {
      setStatus("Brief generation failed.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <section className="rounded-lg border border-occ-line bg-occ-panel p-5">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="flex items-start gap-3">
          <span className="grid h-10 w-10 shrink-0 place-items-center rounded-md bg-occ-panel2 text-occ-cyan">
            <Brain size={20} />
          </span>
          <div>
            <p className="text-xs uppercase tracking-[0.18em] text-occ-cyan">Phase 5</p>
            <h2 className="mt-1 text-lg font-semibold text-white">{brief?.title ?? "NOVA daily brief"}</h2>
            <p className="mt-1 text-sm text-zinc-500">{brief ? formatTime(brief.created_at) : "Generate a verified operations brief."}</p>
          </div>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <StatusBadge tone={brief?.status ?? "neutral"}>{brief?.status ?? "waiting"}</StatusBadge>
          <StatusBadge tone={brief?.generated_by === "openai" ? "green" : "neutral"}>{brief?.generated_by ?? "not generated"}</StatusBadge>
          <button
            type="button"
            onClick={generateBrief}
            disabled={loading}
            className="focus-ring inline-flex items-center gap-2 rounded-md bg-occ-cyan px-3 py-2 text-sm font-semibold text-occ-ink disabled:opacity-60"
          >
            <RefreshCw size={15} className={loading ? "animate-spin" : ""} />
            Generate
          </button>
        </div>
      </div>

      {brief ? (
        <>
          <p className="mt-5 rounded-md border border-occ-line bg-occ-ink p-3 text-sm text-zinc-200">{brief.summary}</p>

          <div className="mt-5 grid gap-3 lg:grid-cols-2">
            <div>
              <h3 className="text-sm font-semibold text-white">Facts</h3>
              <div className="mt-3 space-y-2">
                {brief.facts.map((fact) => (
                  <div key={`${fact.label}-${fact.value}`} className="rounded-md bg-occ-ink p-3">
                    <div className="flex items-center justify-between gap-2">
                      <p className="text-sm font-medium text-white">{fact.label}</p>
                      <StatusBadge tone={fact.risk}>{fact.risk}</StatusBadge>
                    </div>
                    <p className="mt-1 text-sm text-zinc-500">{fact.value}</p>
                  </div>
                ))}
              </div>
            </div>

            <div>
              <h3 className="text-sm font-semibold text-white">Recommended actions</h3>
              <div className="mt-3 space-y-2">
                {brief.recommendations.map((item) => (
                  <div key={`${item.priority}-${item.action}`} className="rounded-md bg-occ-ink p-3">
                    <div className="flex items-center gap-2">
                      <ShieldAlert size={15} className="text-occ-cyan" />
                      <p className="text-sm font-medium text-white">{item.action}</p>
                    </div>
                    <p className="mt-1 text-sm text-zinc-500">{item.reason}</p>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {brief.suppressed_updates.length ? (
            <div className="mt-5 rounded-md border border-occ-line bg-occ-ink p-3">
              <p className="text-sm font-semibold text-white">Suppressed updates</p>
              <p className="mt-1 text-sm text-zinc-500">{brief.suppressed_updates.join(" ")}</p>
            </div>
          ) : null}
        </>
      ) : (
        <p className="mt-5 rounded-md border border-occ-line bg-occ-ink p-3 text-sm text-zinc-500">
          Generate a daily brief to summarize duty, commute, weather, calendar, and operational risks.
        </p>
      )}

      {status ? <p className="mt-4 text-sm text-zinc-400">{status}</p> : null}
    </section>
  );
}
