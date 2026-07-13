"use client";

import { BookOpenCheck, PiggyBank, PlusCircle, Target } from "lucide-react";
import { FormEvent, useState } from "react";
import { StatusBadge } from "@/components/dashboard/StatusBadge";
import {
  domainPrivacyNote,
  learningCapabilitySummary,
  savingsCapabilitySummary,
  type LifeDomain,
  type LifeDomainCounts,
  type LifeDomainRecord,
  type LifeDomainStoredRecord
} from "@/lib/nova/life-domains";

type LifeDomainsPanelProps = {
  counts: LifeDomainCounts;
  capabilityRecords: LifeDomainStoredRecord[];
};

const domainOptions: Array<{ value: LifeDomain; label: string }> = [
  { value: "finance", label: "Finance" },
  { value: "home", label: "Home" },
  { value: "travel", label: "Travel" },
  { value: "health", label: "Health" },
  { value: "learning", label: "Learning" }
];

function formatMoney(cents: number, currency = "EUR") {
  return new Intl.NumberFormat("en-GB", {
    style: "currency",
    currency,
    maximumFractionDigits: 0
  }).format(cents / 100);
}

export function LifeDomainsPanel({ counts, capabilityRecords }: LifeDomainsPanelProps) {
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
  const [savingsTitle, setSavingsTitle] = useState("Family savings goal");
  const [savingsAmount, setSavingsAmount] = useState("");
  const [savingsTargetDate, setSavingsTargetDate] = useState("");
  const [learningTitle, setLearningTitle] = useState("Learning plan");
  const [learningFocus, setLearningFocus] = useState("Course");
  const [learningTargetDate, setLearningTargetDate] = useState("");
  const [status, setStatus] = useState("");
  const [isSaving, setIsSaving] = useState(false);
  const savingsSummary = savingsCapabilitySummary(capabilityRecords);
  const learningSummary = learningCapabilitySummary(capabilityRecords);
  const savingsRecords = capabilityRecords.filter((item) => item.domain === "finance" && item.category === "savings_goal");
  const learningRecords = capabilityRecords.filter((item) => item.domain === "learning");

  async function saveRecord(nextRecord: LifeDomainRecord) {
    setIsSaving(true);
    setStatus("");

    const response = await fetch("/api/life-domains", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "addRecord", record: nextRecord })
    });
    const payload = await response.json();
    setIsSaving(false);
    setStatus(payload.ok ? "Life-domain record saved." : payload.error);
    return Boolean(payload.ok);
  }

  async function addRecord(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    const amountCents = amountText.trim() ? Math.round(Number(amountText) * 100) : null;
    const tags = tagsText
      .split(",")
      .map((tag) => tag.trim())
      .filter(Boolean);

    const ok = await saveRecord({ ...record, amountCents, tags });
    if (ok) {
      setRecord({ ...record, title: "", detail: "", targetDate: "", amountCents: null });
      setAmountText("");
      setTagsText("");
    }
  }

  async function addSavingsGoal(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const amountCents = savingsAmount.trim() ? Math.round(Number(savingsAmount) * 100) : null;
    const ok = await saveRecord({
      domain: "finance",
      title: savingsTitle,
      detail: "Manual NOVA savings goal. No bank connection is used.",
      category: "savings_goal",
      status: "active",
      priority: 2,
      targetDate: savingsTargetDate || null,
      amountCents,
      currency: "EUR",
      tags: ["savings"],
      sensitive: true
    });

    if (ok) {
      setSavingsTitle("Family savings goal");
      setSavingsAmount("");
      setSavingsTargetDate("");
    }
  }

  async function addLearningPlan(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const ok = await saveRecord({
      domain: "learning",
      title: learningTitle,
      detail: `Focus: ${learningFocus}`,
      category: "learning_plan",
      status: "active",
      priority: 3,
      targetDate: learningTargetDate || null,
      amountCents: null,
      currency: "EUR",
      tags: ["learning", learningFocus.toLowerCase()].filter(Boolean),
      sensitive: false
    });

    if (ok) {
      setLearningTitle("Learning plan");
      setLearningFocus("Course");
      setLearningTargetDate("");
    }
  }

  return (
    <div className="space-y-5">
      <section className="grid gap-4 xl:grid-cols-2">
        <form onSubmit={addSavingsGoal} className="rounded-lg border border-occ-line bg-occ-panel p-5">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <div className="flex flex-wrap items-center gap-2">
                <StatusBadge tone="green">Savings active</StatusBadge>
                <StatusBadge tone="amber">Manual finance</StatusBadge>
              </div>
              <h2 className="mt-4 flex items-center gap-2 text-2xl font-semibold text-white">
                <PiggyBank size={22} className="text-occ-gold" />
                NOVA Savings
              </h2>
              <p className="mt-2 text-sm text-zinc-500">Create private savings goals for family plans, reserves, travel, or personal targets.</p>
            </div>
            <div className="rounded-md border border-occ-line bg-occ-ink p-3 text-right">
              <p className="text-sm text-zinc-400">Active goals</p>
              <strong className="mt-1 block text-xl text-white">{savingsSummary.activeGoals}</strong>
              <p className="mt-1 text-xs text-zinc-500">{formatMoney(savingsSummary.totalTargetCents)}</p>
            </div>
          </div>

          <div className="mt-5 grid gap-3 sm:grid-cols-[1fr_150px]">
            <label className="block text-sm text-zinc-300">
              Goal name
              <input value={savingsTitle} onChange={(event) => setSavingsTitle(event.target.value)} className="focus-ring mt-2 w-full rounded-md border border-occ-line bg-occ-ink px-3 py-2 text-white" />
            </label>
            <label className="block text-sm text-zinc-300">
              Target EUR
              <input type="number" min={0} step="0.01" value={savingsAmount} onChange={(event) => setSavingsAmount(event.target.value)} className="focus-ring mt-2 w-full rounded-md border border-occ-line bg-occ-ink px-3 py-2 text-white" />
            </label>
            <label className="block text-sm text-zinc-300">
              Target date
              <input type="date" value={savingsTargetDate} onChange={(event) => setSavingsTargetDate(event.target.value)} className="focus-ring mt-2 w-full rounded-md border border-occ-line bg-occ-ink px-3 py-2 text-white" />
            </label>
            <button className="focus-ring mt-7 inline-flex min-h-10 items-center justify-center gap-2 rounded-md bg-occ-cyan px-4 text-sm font-semibold text-occ-ink" disabled={isSaving}>
              <PlusCircle size={17} />
              Add goal
            </button>
          </div>

          <div className="mt-5 divide-y divide-occ-line">
            {savingsRecords.length ? (
              savingsRecords.slice(0, 4).map((item) => (
                <div key={item.id ?? item.title} className="py-3">
                  <p className="text-sm font-medium text-white">{item.title}</p>
                  <p className="mt-1 text-xs text-zinc-500">
                    {item.amountCents ? formatMoney(item.amountCents, item.currency) : "No target amount"} · {item.targetDate || "No target date"}
                  </p>
                </div>
              ))
            ) : (
              <p className="py-5 text-sm text-zinc-500">No savings goals yet.</p>
            )}
          </div>
        </form>

        <form onSubmit={addLearningPlan} className="rounded-lg border border-occ-line bg-occ-panel p-5">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <div className="flex flex-wrap items-center gap-2">
                <StatusBadge tone="green">Learning active</StatusBadge>
                <StatusBadge tone="cyan">{learningSummary.recommendationMode}</StatusBadge>
              </div>
              <h2 className="mt-4 flex items-center gap-2 text-2xl font-semibold text-white">
                <BookOpenCheck size={22} className="text-occ-cyan" />
                NOVA Learning
              </h2>
              <p className="mt-2 text-sm text-zinc-500">Track courses, certifications, skills, and reading so NOVA can support reviewable recommendations.</p>
            </div>
            <div className="rounded-md border border-occ-line bg-occ-ink p-3 text-right">
              <p className="text-sm text-zinc-400">Active plans</p>
              <strong className="mt-1 block text-xl text-white">{learningSummary.activePlans}</strong>
              <p className="mt-1 text-xs text-zinc-500">{learningSummary.completedRecords} completed</p>
            </div>
          </div>

          <div className="mt-5 grid gap-3 sm:grid-cols-[1fr_150px]">
            <label className="block text-sm text-zinc-300">
              Plan name
              <input value={learningTitle} onChange={(event) => setLearningTitle(event.target.value)} className="focus-ring mt-2 w-full rounded-md border border-occ-line bg-occ-ink px-3 py-2 text-white" />
            </label>
            <label className="block text-sm text-zinc-300">
              Focus
              <select value={learningFocus} onChange={(event) => setLearningFocus(event.target.value)} className="focus-ring mt-2 w-full rounded-md border border-occ-line bg-occ-ink px-3 py-2 text-white">
                <option>Course</option>
                <option>Certification</option>
                <option>Language</option>
                <option>Reading</option>
                <option>Skill</option>
              </select>
            </label>
            <label className="block text-sm text-zinc-300">
              Target date
              <input type="date" value={learningTargetDate} onChange={(event) => setLearningTargetDate(event.target.value)} className="focus-ring mt-2 w-full rounded-md border border-occ-line bg-occ-ink px-3 py-2 text-white" />
            </label>
            <button className="focus-ring mt-7 inline-flex min-h-10 items-center justify-center gap-2 rounded-md bg-occ-cyan px-4 text-sm font-semibold text-occ-ink" disabled={isSaving}>
              <Target size={17} />
              Add plan
            </button>
          </div>

          <div className="mt-5 divide-y divide-occ-line">
            {learningRecords.length ? (
              learningRecords.slice(0, 4).map((item) => (
                <div key={item.id ?? item.title} className="py-3">
                  <p className="text-sm font-medium text-white">{item.title}</p>
                  <p className="mt-1 text-xs text-zinc-500">
                    {item.category.replaceAll("_", " ")} · {item.targetDate || "No target date"}
                  </p>
                </div>
              ))
            ) : (
              <p className="py-5 text-sm text-zinc-500">No learning plans yet.</p>
            )}
          </div>
        </form>
      </section>

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
