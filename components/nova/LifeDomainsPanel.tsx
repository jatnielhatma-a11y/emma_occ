"use client";

import { FormEvent, useState } from "react";
import { StatusBadge } from "@/components/dashboard/StatusBadge";
import { domainPrivacyNote, type LifeDomain, type LifeDomainCounts, type LifeDomainRecord } from "@/lib/nova/life-domains";

type LifeDomainsPanelProps = {
  counts: LifeDomainCounts;
};

const domainOptions: Array<{ value: LifeDomain; label: string }> = [
  { value: "finance", label: "Finance" },
  { value: "home", label: "Home" },
  { value: "travel", label: "Travel" },
  { value: "health", label: "Health" },
  { value: "learning", label: "Learning" }
];

export function LifeDomainsPanel({ counts }: LifeDomainsPanelProps) {
  const [record, setRecord] = useState<LifeDomainRecord>({
    domain: "finance",
    title: "",
    detail: "",
    category: "general",
    status: "active",
    priority: 3,
    targetDate: "",
    amountCents: null,
    currency: "EUR",
    tags: [],
    sensitive: false
  });
  const [tagsText, setTagsText] = useState("");
  const [amountText, setAmountText] = useState("");
  const [status, setStatus] = useState("");
  const [isSaving, setIsSaving] = useState(false);

  async function addRecord(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setIsSaving(true);
    setStatus("");

    const amountCents = amountText.trim() ? Math.round(Number(amountText) * 100) : null;
    const tags = tagsText
      .split(",")
      .map((tag) => tag.trim())
      .filter(Boolean);

    const response = await fetch("/api/life-domains", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "addRecord", record: { ...record, amountCents, tags } })
    });
    const payload = await response.json();
    setIsSaving(false);
    setStatus(payload.ok ? "Life-domain record saved." : payload.error);

    if (payload.ok) {
      setRecord({ ...record, title: "", detail: "", targetDate: "", amountCents: null });
      setAmountText("");
      setTagsText("");
    }
  }

  return (
    <div className="space-y-5">
      <section className="grid gap-4 md:grid-cols-5">
        {domainOptions.map((domain) => (
          <div key={domain.value} className="rounded-lg border border-occ-line bg-occ-panel p-4">
            <p className="text-sm text-zinc-400">{domain.label}</p>
            <strong className="mt-2 block text-2xl text-white">{counts[domain.value]}</strong>
          </div>
        ))}
      </section>

      <form onSubmit={addRecord} className="rounded-lg border border-occ-line bg-occ-panel p-5">
        <div className="flex flex-wrap items-center gap-3">
          <StatusBadge tone="green">Release 3 active</StatusBadge>
          <StatusBadge tone={record.sensitive || record.domain === "health" || record.domain === "finance" ? "amber" : "neutral"}>
            {record.sensitive || record.domain === "health" || record.domain === "finance" ? "Sensitive" : "Manual"}
          </StatusBadge>
        </div>
        <h2 className="mt-4 text-2xl font-semibold text-white">Add Life-Domain Record</h2>
        <p className="mt-2 text-sm text-zinc-500">{domainPrivacyNote(record.domain)}</p>

        <div className="mt-5 grid gap-3 md:grid-cols-3">
          <label className="block text-sm text-zinc-300">
            Domain
            <select
              value={record.domain}
              onChange={(event) => setRecord({ ...record, domain: event.target.value as LifeDomain })}
              className="focus-ring mt-2 w-full rounded-md border border-occ-line bg-occ-ink px-3 py-2 text-white"
            >
              {domainOptions.map((domain) => (
                <option key={domain.value} value={domain.value}>
                  {domain.label}
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
            Category
            <input
              value={record.category}
              onChange={(event) => setRecord({ ...record, category: event.target.value })}
              className="focus-ring mt-2 w-full rounded-md border border-occ-line bg-occ-ink px-3 py-2 text-white"
            />
          </label>
          <label className="block text-sm text-zinc-300">
            Status
            <select
              value={record.status}
              onChange={(event) => setRecord({ ...record, status: event.target.value as LifeDomainRecord["status"] })}
              className="focus-ring mt-2 w-full rounded-md border border-occ-line bg-occ-ink px-3 py-2 text-white"
            >
              <option value="active">Active</option>
              <option value="planned">Planned</option>
              <option value="paused">Paused</option>
              <option value="completed">Completed</option>
            </select>
          </label>
          <label className="block text-sm text-zinc-300">
            Priority
            <input
              type="number"
              min={1}
              max={5}
              value={record.priority}
              onChange={(event) => setRecord({ ...record, priority: Number(event.target.value) })}
              className="focus-ring mt-2 w-full rounded-md border border-occ-line bg-occ-ink px-3 py-2 text-white"
            />
          </label>
          <label className="block text-sm text-zinc-300">
            Target date
            <input
              type="date"
              value={record.targetDate ?? ""}
              onChange={(event) => setRecord({ ...record, targetDate: event.target.value })}
              className="focus-ring mt-2 w-full rounded-md border border-occ-line bg-occ-ink px-3 py-2 text-white"
            />
          </label>
          <label className="block text-sm text-zinc-300">
            Amount
            <input
              type="number"
              min={0}
              step="0.01"
              value={amountText}
              onChange={(event) => setAmountText(event.target.value)}
              className="focus-ring mt-2 w-full rounded-md border border-occ-line bg-occ-ink px-3 py-2 text-white"
            />
          </label>
          <label className="block text-sm text-zinc-300">
            Currency
            <input
              value={record.currency}
              onChange={(event) => setRecord({ ...record, currency: event.target.value.toUpperCase().slice(0, 3) })}
              className="focus-ring mt-2 w-full rounded-md border border-occ-line bg-occ-ink px-3 py-2 text-white"
            />
          </label>
          <label className="block text-sm text-zinc-300 md:col-span-2">
            Tags
            <input
              value={tagsText}
              onChange={(event) => setTagsText(event.target.value)}
              placeholder="family, renewal, 2026"
              className="focus-ring mt-2 w-full rounded-md border border-occ-line bg-occ-ink px-3 py-2 text-white placeholder:text-zinc-600"
            />
          </label>
          <label className="flex items-center justify-between gap-4 rounded-md border border-occ-line bg-occ-ink p-3 text-sm text-zinc-300">
            Sensitive
            <input
              type="checkbox"
              checked={record.sensitive}
              onChange={(event) => setRecord({ ...record, sensitive: event.target.checked })}
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
          <button className="focus-ring rounded-md bg-occ-cyan px-4 py-2 font-semibold text-occ-ink" disabled={isSaving}>
            Save record
          </button>
          {status ? <span className="text-sm text-zinc-400">{status}</span> : null}
        </div>
      </form>
    </div>
  );
}
