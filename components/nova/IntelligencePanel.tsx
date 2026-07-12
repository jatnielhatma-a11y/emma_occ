"use client";

import { FormEvent, useState } from "react";
import { BrainCircuit, RefreshCw, ShieldCheck } from "lucide-react";
import { StatusBadge } from "@/components/dashboard/StatusBadge";
import { automationGuardrail, type IntelligenceKind, type IntelligenceRecord } from "@/lib/nova/intelligence";

type IntelligencePanelProps = {
  recentRecords: Array<{
    id: string;
    kind: IntelligenceKind;
    title: string;
    detail: string;
    status: string;
    confidence: number;
    risk: "green" | "amber" | "red";
    source_type: string;
    automation_enabled: boolean;
    requires_confirmation: boolean;
    created_at: string;
  }>;
};

const kindOptions: Array<{ value: IntelligenceKind; label: string }> = [
  { value: "prediction", label: "Prediction" },
  { value: "recommendation", label: "Recommendation" },
  { value: "context_signal", label: "Context signal" },
  { value: "automation_rule", label: "Automation rule" },
  { value: "daily_ai_routine", label: "Daily AI routine" }
];

function guardrailLabel(record: Pick<IntelligenceRecord, "kind" | "automationEnabled" | "requiresConfirmation">) {
  switch (automationGuardrail(record)) {
    case "disabled-by-default":
      return "Disabled by default";
    case "manual-confirmation-required":
      return "Confirmation required";
    case "blocked-unconfirmed-automation":
      return "Blocked";
    default:
      return "Advisory";
  }
}

export function IntelligencePanel({ recentRecords }: IntelligencePanelProps) {
  const [record, setRecord] = useState<IntelligenceRecord>({
    kind: "recommendation",
    title: "",
    detail: "",
    domain: "operations",
    status: "candidate",
    confidence: 0.5,
    priority: 3,
    risk: "green",
    sourceType: "manual",
    sourceRefs: [],
    automationEnabled: false,
    requiresConfirmation: true,
    nextRunAt: "",
    metadata: {}
  });
  const [sourceRefsText, setSourceRefsText] = useState("");
  const [status, setStatus] = useState("");
  const [isSaving, setIsSaving] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);

  async function submitRecord(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setIsSaving(true);
    setStatus("");
    const sourceRefs = sourceRefsText
      .split(",")
      .map((item) => item.trim())
      .filter(Boolean);

    const response = await fetch("/api/intelligence", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "addRecord", record: { ...record, sourceRefs } })
    });
    const payload = await response.json();
    setIsSaving(false);
    setStatus(payload.ok ? "Intelligence record saved." : payload.error);

    if (payload.ok) {
      setRecord({ ...record, title: "", detail: "", sourceRefs: [] });
      setSourceRefsText("");
    }
  }

  async function generateCandidates() {
    setIsGenerating(true);
    setStatus("");
    const response = await fetch("/api/intelligence", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "generateCandidates" })
    });
    const payload = await response.json();
    setIsGenerating(false);
    setStatus(payload.ok ? `${payload.count} Release 4 candidates generated.` : payload.error);
  }

  return (
    <div className="space-y-5">
      <section className="rounded-lg border border-occ-line bg-occ-panel p-5">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div className="flex items-start gap-3">
            <span className="grid h-10 w-10 place-items-center rounded-md bg-occ-panel2 text-occ-cyan">
              <BrainCircuit size={20} />
            </span>
            <div>
              <h2 className="text-lg font-semibold text-white">Release 4 candidates</h2>
              <p className="mt-1 max-w-2xl text-sm text-zinc-500">
                Generate advisory candidates from verified duty, commute, weather, calendar, and integration-health context.
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={generateCandidates}
            disabled={isGenerating}
            className="focus-ring inline-flex items-center gap-2 rounded-md bg-occ-cyan px-3 py-2 text-sm font-semibold text-occ-ink disabled:opacity-60"
          >
            <RefreshCw size={15} className={isGenerating ? "animate-spin" : ""} />
            Generate
          </button>
        </div>

        <div className="mt-5 grid gap-3 md:grid-cols-2">
          {recentRecords.length ? (
            recentRecords.map((item) => (
              <article key={item.id} className="rounded-md border border-occ-line bg-occ-ink p-3">
                <div className="flex flex-wrap items-center gap-2">
                  <StatusBadge tone={item.risk}>{item.risk}</StatusBadge>
                  <StatusBadge tone={item.automation_enabled ? "amber" : "neutral"}>
                    {guardrailLabel({
                      kind: item.kind,
                      automationEnabled: item.automation_enabled,
                      requiresConfirmation: item.requires_confirmation
                    })}
                  </StatusBadge>
                </div>
                <h3 className="mt-3 text-sm font-semibold text-white">{item.title}</h3>
                <p className="mt-1 text-sm text-zinc-500">{item.detail}</p>
                <p className="mt-2 text-xs uppercase tracking-[0.14em] text-zinc-600">
                  {item.kind.replaceAll("_", " ")} · {item.source_type} · {Math.round(item.confidence * 100)}%
                </p>
              </article>
            ))
          ) : (
            <p className="rounded-md border border-occ-line bg-occ-ink p-3 text-sm text-zinc-500">
              No Release 4 records yet. Generate candidates or add a manual recommendation.
            </p>
          )}
        </div>
      </section>

      <form onSubmit={submitRecord} className="rounded-lg border border-occ-line bg-occ-panel p-5">
        <div className="flex flex-wrap items-center gap-3">
          <StatusBadge tone="green">Release 4 active</StatusBadge>
          <StatusBadge tone="amber">Advisory only</StatusBadge>
          <StatusBadge tone={record.automationEnabled ? "amber" : "neutral"}>{guardrailLabel(record)}</StatusBadge>
        </div>
        <h2 className="mt-4 text-2xl font-semibold text-white">Add Intelligence Record</h2>
        <p className="mt-2 text-sm text-zinc-500">
          Predictions and automations are saved as reviewable records. Operational actions stay manual until explicitly confirmed.
        </p>

        <div className="mt-5 grid gap-3 md:grid-cols-3">
          <label className="block text-sm text-zinc-300">
            Kind
            <select
              value={record.kind}
              onChange={(event) => setRecord({ ...record, kind: event.target.value as IntelligenceKind })}
              className="focus-ring mt-2 w-full rounded-md border border-occ-line bg-occ-ink px-3 py-2 text-white"
            >
              {kindOptions.map((kind) => (
                <option key={kind.value} value={kind.value}>
                  {kind.label}
                </option>
              ))}
            </select>
          </label>
          <label className="block text-sm text-zinc-300 md:col-span-2">
            Title
            <input
              value={record.title}
              onChange={(event) => setRecord({ ...record, title: event.target.value })}
              className="focus-ring mt-2 w-full rounded-md border border-occ-line bg-occ-ink px-3 py-2 text-white"
            />
          </label>
          <label className="block text-sm text-zinc-300">
            Domain
            <input
              value={record.domain}
              onChange={(event) => setRecord({ ...record, domain: event.target.value })}
              className="focus-ring mt-2 w-full rounded-md border border-occ-line bg-occ-ink px-3 py-2 text-white"
            />
          </label>
          <label className="block text-sm text-zinc-300">
            Confidence
            <input
              type="number"
              min={0}
              max={1}
              step={0.05}
              value={record.confidence}
              onChange={(event) => setRecord({ ...record, confidence: Number(event.target.value) })}
              className="focus-ring mt-2 w-full rounded-md border border-occ-line bg-occ-ink px-3 py-2 text-white"
            />
          </label>
          <label className="block text-sm text-zinc-300">
            Risk
            <select
              value={record.risk}
              onChange={(event) => setRecord({ ...record, risk: event.target.value as IntelligenceRecord["risk"] })}
              className="focus-ring mt-2 w-full rounded-md border border-occ-line bg-occ-ink px-3 py-2 text-white"
            >
              <option value="green">Green</option>
              <option value="amber">Amber</option>
              <option value="red">Red</option>
            </select>
          </label>
          <label className="block text-sm text-zinc-300 md:col-span-2">
            Source references
            <input
              value={sourceRefsText}
              onChange={(event) => setSourceRefsText(event.target.value)}
              placeholder="Roster, Calendar, NS"
              className="focus-ring mt-2 w-full rounded-md border border-occ-line bg-occ-ink px-3 py-2 text-white placeholder:text-zinc-600"
            />
          </label>
          <label className="flex items-center justify-between gap-4 rounded-md border border-occ-line bg-occ-ink p-3 text-sm text-zinc-300">
            Automation enabled
            <input
              type="checkbox"
              checked={record.automationEnabled}
              onChange={(event) => setRecord({ ...record, automationEnabled: event.target.checked, requiresConfirmation: true })}
              className="h-5 w-5 accent-occ-cyan"
            />
          </label>
          <label className="flex items-center justify-between gap-4 rounded-md border border-occ-line bg-occ-ink p-3 text-sm text-zinc-300">
            Requires confirmation
            <input
              type="checkbox"
              checked={record.requiresConfirmation}
              onChange={(event) => setRecord({ ...record, requiresConfirmation: event.target.checked })}
              className="h-5 w-5 accent-occ-cyan"
            />
          </label>
          <label className="block text-sm text-zinc-300 md:col-span-3">
            Detail
            <textarea
              value={record.detail}
              onChange={(event) => setRecord({ ...record, detail: event.target.value })}
              rows={4}
              className="focus-ring mt-2 w-full rounded-md border border-occ-line bg-occ-ink px-3 py-2 text-white"
            />
          </label>
        </div>

        <div className="mt-4 flex flex-wrap items-center gap-3">
          <button className="focus-ring inline-flex items-center gap-2 rounded-md bg-occ-cyan px-4 py-2 font-semibold text-occ-ink" disabled={isSaving}>
            <ShieldCheck size={16} />
            Save record
          </button>
          {status ? <span className="text-sm text-zinc-400">{status}</span> : null}
        </div>
      </form>
    </div>
  );
}
