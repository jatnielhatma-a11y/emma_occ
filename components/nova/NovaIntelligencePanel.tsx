"use client";

import { FormEvent, useState } from "react";
import { Cpu, Plus, RefreshCw, ShieldCheck } from "lucide-react";
import { StatusBadge } from "@/components/dashboard/StatusBadge";
import { capabilityGuardrail, type NovaCapability, type NovaCapabilityRecord } from "@/lib/nova/nova-intelligence";

type CapabilityRow = {
  id: string;
  capability: NovaCapability;
  title: string;
  detail: string;
  status: string;
  privacy_mode: "private" | "family_scoped" | "developer_scoped" | "disabled";
  consent_required: boolean;
  consent_granted: boolean;
  local_only: boolean;
  sync_enabled: boolean;
  device_scope: "personal" | "family" | "collaborator" | "developer";
  risk: "green" | "amber" | "red";
  confidence: number;
  created_at: string;
};

type NovaIntelligencePanelProps = {
  recentRecords: CapabilityRow[];
};

const capabilityOptions: Array<{ value: NovaCapability; label: string }> = [
  { value: "multi_device_sync", label: "Multi-device sync" },
  { value: "voice", label: "Voice" },
  { value: "vision", label: "Vision" },
  { value: "collaboration", label: "Collaboration" },
  { value: "developer_platform", label: "Developer platform" },
  { value: "nova_intelligence", label: "NOVA Intelligence" }
];

function guardrailLabel(record: Pick<NovaCapabilityRecord, "capability" | "privacyMode" | "consentRequired" | "consentGranted" | "syncEnabled">) {
  return capabilityGuardrail(record).replaceAll("-", " ");
}

function rowGuardrail(row: CapabilityRow) {
  return guardrailLabel({
    capability: row.capability,
    privacyMode: row.privacy_mode,
    consentRequired: row.consent_required,
    consentGranted: row.consent_granted,
    syncEnabled: row.sync_enabled
  });
}

export function NovaIntelligencePanel({ recentRecords }: NovaIntelligencePanelProps) {
  const [record, setRecord] = useState<NovaCapabilityRecord>({
    capability: "nova_intelligence",
    title: "",
    detail: "",
    status: "candidate",
    privacyMode: "private",
    consentRequired: true,
    consentGranted: false,
    localOnly: false,
    syncEnabled: false,
    deviceScope: "personal",
    risk: "green",
    confidence: 0.5,
    sourceRefs: [],
    metadata: {}
  });
  const [sourceRefsText, setSourceRefsText] = useState("");
  const [status, setStatus] = useState("");
  const [isSaving, setIsSaving] = useState(false);
  const [isSeeding, setIsSeeding] = useState(false);

  async function seedRelease5() {
    setIsSeeding(true);
    setStatus("");
    const response = await fetch("/api/nova-intelligence", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "seedRelease5" })
    });
    const payload = await response.json();
    setIsSeeding(false);
    setStatus(payload.ok ? `${payload.count} NOVA Intelligence capability records created.` : payload.error);
  }

  async function addCapability(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setIsSaving(true);
    setStatus("");
    const sourceRefs = sourceRefsText
      .split(",")
      .map((item) => item.trim())
      .filter(Boolean);

    const response = await fetch("/api/nova-intelligence", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "addCapability", record: { ...record, sourceRefs } })
    });
    const payload = await response.json();
    setIsSaving(false);
    setStatus(payload.ok ? "Capability record saved." : payload.error);

    if (payload.ok) {
      setRecord({ ...record, title: "", detail: "", sourceRefs: [] });
      setSourceRefsText("");
    }
  }

  return (
    <div className="space-y-5">
      <section className="rounded-lg border border-occ-line bg-occ-panel p-5">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div className="flex items-start gap-3">
            <span className="grid h-10 w-10 place-items-center rounded-md bg-occ-panel2 text-occ-cyan">
              <Cpu size={20} />
            </span>
            <div>
              <h2 className="text-lg font-semibold text-white">Release 5 capability records</h2>
              <p className="mt-1 max-w-2xl text-sm text-zinc-500">
                Seed device, voice, vision, collaboration, developer, and NOVA Intelligence records with consent and scope labels.
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={seedRelease5}
            disabled={isSeeding}
            className="focus-ring inline-flex items-center gap-2 rounded-md bg-occ-cyan px-3 py-2 text-sm font-semibold text-occ-ink disabled:opacity-60"
          >
            <RefreshCw size={15} className={isSeeding ? "animate-spin" : ""} />
            Seed
          </button>
        </div>

        <div className="mt-5 grid gap-3 md:grid-cols-2">
          {recentRecords.length ? (
            recentRecords.map((item) => (
              <article key={item.id} className="rounded-md border border-occ-line bg-occ-ink p-3">
                <div className="flex flex-wrap items-center gap-2">
                  <StatusBadge tone={item.risk}>{item.risk}</StatusBadge>
                  <StatusBadge tone={item.consent_granted ? "green" : "amber"}>{item.consent_granted ? "consented" : "consent needed"}</StatusBadge>
                  <StatusBadge tone="neutral">{rowGuardrail(item)}</StatusBadge>
                </div>
                <h3 className="mt-3 text-sm font-semibold text-white">{item.title}</h3>
                <p className="mt-1 text-sm text-zinc-500">{item.detail}</p>
                <p className="mt-2 text-xs uppercase tracking-[0.14em] text-zinc-600">
                  {item.capability.replaceAll("_", " ")} · {item.privacy_mode.replaceAll("_", " ")} · {Math.round(item.confidence * 100)}%
                </p>
              </article>
            ))
          ) : (
            <p className="rounded-md border border-occ-line bg-occ-ink p-3 text-sm text-zinc-500">
              No Release 5 records yet. Seed the baseline or add a scoped capability.
            </p>
          )}
        </div>
      </section>

      <form onSubmit={addCapability} className="rounded-lg border border-occ-line bg-occ-panel p-5">
        <div className="flex flex-wrap items-center gap-3">
          <StatusBadge tone="green">Release 5 active</StatusBadge>
          <StatusBadge tone="amber">{guardrailLabel(record)}</StatusBadge>
          <StatusBadge tone={record.syncEnabled ? "cyan" : "neutral"}>{record.syncEnabled ? "sync enabled" : "sync off"}</StatusBadge>
        </div>
        <h2 className="mt-4 text-2xl font-semibold text-white">Add NOVA Capability</h2>
        <p className="mt-2 text-sm text-zinc-500">
          Release 5 capabilities are consent-gated. Voice and vision stay explicit-session only, collaboration is scoped, and developer extensions require explicit permissions.
        </p>

        <div className="mt-5 grid gap-3 md:grid-cols-3">
          <label className="block text-sm text-zinc-300">
            Capability
            <select
              value={record.capability}
              onChange={(event) => setRecord({ ...record, capability: event.target.value as NovaCapability })}
              className="focus-ring mt-2 w-full rounded-md border border-occ-line bg-occ-ink px-3 py-2 text-white"
            >
              {capabilityOptions.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
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
            Privacy mode
            <select
              value={record.privacyMode}
              onChange={(event) => setRecord({ ...record, privacyMode: event.target.value as NovaCapabilityRecord["privacyMode"] })}
              className="focus-ring mt-2 w-full rounded-md border border-occ-line bg-occ-ink px-3 py-2 text-white"
            >
              <option value="private">Private</option>
              <option value="family_scoped">Family scoped</option>
              <option value="developer_scoped">Developer scoped</option>
              <option value="disabled">Disabled</option>
            </select>
          </label>
          <label className="block text-sm text-zinc-300">
            Device scope
            <select
              value={record.deviceScope}
              onChange={(event) => setRecord({ ...record, deviceScope: event.target.value as NovaCapabilityRecord["deviceScope"] })}
              className="focus-ring mt-2 w-full rounded-md border border-occ-line bg-occ-ink px-3 py-2 text-white"
            >
              <option value="personal">Personal</option>
              <option value="family">Family</option>
              <option value="collaborator">Collaborator</option>
              <option value="developer">Developer</option>
            </select>
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
          <label className="flex items-center justify-between gap-4 rounded-md border border-occ-line bg-occ-ink p-3 text-sm text-zinc-300">
            Consent granted
            <input
              type="checkbox"
              checked={record.consentGranted}
              onChange={(event) => setRecord({ ...record, consentGranted: event.target.checked })}
              className="h-5 w-5 accent-occ-cyan"
            />
          </label>
          <label className="flex items-center justify-between gap-4 rounded-md border border-occ-line bg-occ-ink p-3 text-sm text-zinc-300">
            Local only
            <input
              type="checkbox"
              checked={record.localOnly}
              onChange={(event) => setRecord({ ...record, localOnly: event.target.checked })}
              className="h-5 w-5 accent-occ-cyan"
            />
          </label>
          <label className="flex items-center justify-between gap-4 rounded-md border border-occ-line bg-occ-ink p-3 text-sm text-zinc-300">
            Sync enabled
            <input
              type="checkbox"
              checked={record.syncEnabled}
              onChange={(event) => setRecord({ ...record, syncEnabled: event.target.checked })}
              className="h-5 w-5 accent-occ-cyan"
            />
          </label>
          <label className="block text-sm text-zinc-300 md:col-span-3">
            Source references
            <input
              value={sourceRefsText}
              onChange={(event) => setSourceRefsText(event.target.value)}
              placeholder="PWA, voice consent, family context"
              className="focus-ring mt-2 w-full rounded-md border border-occ-line bg-occ-ink px-3 py-2 text-white placeholder:text-zinc-600"
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
            <Plus size={16} />
            Save capability
          </button>
          <span className="inline-flex items-center gap-2 text-sm text-zinc-500">
            <ShieldCheck size={14} />
            Consent and scope are enforced before activation.
          </span>
          {status ? <span className="text-sm text-zinc-400">{status}</span> : null}
        </div>
      </form>
    </div>
  );
}
