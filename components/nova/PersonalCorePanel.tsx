"use client";

import { FormEvent, useState } from "react";
import { StatusBadge } from "@/components/dashboard/StatusBadge";
import type { MemorySettings, PersonalCoreCounts, PersonalCoreEntry } from "@/lib/nova/personal-core";

type PersonalCorePanelProps = {
  initialProfile: {
    preferredName: string;
    familyContext: string;
    primaryLanguage: "en" | "es" | "fr";
    timezone: string;
  };
  initialMemorySettings: MemorySettings;
  counts: PersonalCoreCounts;
};

const entryKinds: Array<{ value: PersonalCoreEntry["kind"]; label: string }> = [
  { value: "interest", label: "Interest" },
  { value: "goal", label: "Goal" },
  { value: "habit", label: "Habit" },
  { value: "relationship", label: "Relationship" },
  { value: "timeline", label: "Timeline" },
  { value: "memory", label: "Memory" }
];

export function PersonalCorePanel({ initialProfile, initialMemorySettings, counts }: PersonalCorePanelProps) {
  const [profile, setProfile] = useState(initialProfile);
  const [memorySettings, setMemorySettings] = useState(initialMemorySettings);
  const [entry, setEntry] = useState<PersonalCoreEntry>({
    kind: "interest",
    title: "",
    detail: "",
    category: "general",
    sourceKind: "manual",
    tags: []
  });
  const [tagsText, setTagsText] = useState("");
  const [status, setStatus] = useState("");
  const [isSaving, setIsSaving] = useState(false);

  async function submit(payload: Record<string, unknown>, successMessage: string) {
    setIsSaving(true);
    setStatus("");
    const response = await fetch("/api/personal-core", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload)
    });
    const body = await response.json();
    setIsSaving(false);
    setStatus(body.ok ? successMessage : body.error);
  }

  async function saveProfile(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    await submit({ action: "saveProfile", profile }, "Personal identity saved.");
  }

  async function saveMemorySettings(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    await submit({ action: "saveMemorySettings", memorySettings }, "Memory consent updated.");
  }

  async function addEntry(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const tags = tagsText
      .split(",")
      .map((tag) => tag.trim())
      .filter(Boolean);
    await submit({ action: "addEntry", entry: { ...entry, tags } }, "Personal core entry saved.");
    setEntry({ ...entry, title: "", detail: "" });
    setTagsText("");
  }

  return (
    <div className="space-y-5">
      <section className="grid gap-4 md:grid-cols-3 xl:grid-cols-6">
        <div className="rounded-lg border border-occ-line bg-occ-panel p-4">
          <p className="text-sm text-zinc-400">Interests</p>
          <strong className="mt-2 block text-2xl text-white">{counts.interests}</strong>
        </div>
        <div className="rounded-lg border border-occ-line bg-occ-panel p-4">
          <p className="text-sm text-zinc-400">Goals</p>
          <strong className="mt-2 block text-2xl text-white">{counts.goals}</strong>
        </div>
        <div className="rounded-lg border border-occ-line bg-occ-panel p-4">
          <p className="text-sm text-zinc-400">Habits</p>
          <strong className="mt-2 block text-2xl text-white">{counts.habits}</strong>
        </div>
        <div className="rounded-lg border border-occ-line bg-occ-panel p-4">
          <p className="text-sm text-zinc-400">Relationships</p>
          <strong className="mt-2 block text-2xl text-white">{counts.relationships}</strong>
        </div>
        <div className="rounded-lg border border-occ-line bg-occ-panel p-4">
          <p className="text-sm text-zinc-400">Timeline</p>
          <strong className="mt-2 block text-2xl text-white">{counts.timeline}</strong>
        </div>
        <div className="rounded-lg border border-occ-line bg-occ-panel p-4">
          <p className="text-sm text-zinc-400">Memories</p>
          <strong className="mt-2 block text-2xl text-white">{counts.memories}</strong>
        </div>
      </section>

      <div className="grid gap-5 xl:grid-cols-[1fr_0.85fr]">
        <form onSubmit={saveProfile} className="rounded-lg border border-occ-line bg-occ-panel p-5">
          <div className="flex flex-wrap items-center gap-3">
            <StatusBadge tone="green">Release 2 active</StatusBadge>
            <StatusBadge tone="neutral">User scoped</StatusBadge>
          </div>
          <h2 className="mt-4 text-2xl font-semibold text-white">Personal Identity</h2>
          <div className="mt-5 grid gap-3 sm:grid-cols-2">
            <label className="block text-sm text-zinc-300">
              Preferred name
              <input
                value={profile.preferredName}
                onChange={(event) => setProfile({ ...profile, preferredName: event.target.value })}
                className="focus-ring mt-2 w-full rounded-md border border-occ-line bg-occ-ink px-3 py-2 text-white"
              />
            </label>
            <label className="block text-sm text-zinc-300">
              Language
              <select
                value={profile.primaryLanguage}
                onChange={(event) => setProfile({ ...profile, primaryLanguage: event.target.value as "en" | "es" | "fr" })}
                className="focus-ring mt-2 w-full rounded-md border border-occ-line bg-occ-ink px-3 py-2 text-white"
              >
                <option value="en">English</option>
                <option value="es">Spanish</option>
                <option value="fr">French</option>
              </select>
            </label>
            <label className="block text-sm text-zinc-300 sm:col-span-2">
              Time zone
              <input
                value={profile.timezone}
                onChange={(event) => setProfile({ ...profile, timezone: event.target.value })}
                className="focus-ring mt-2 w-full rounded-md border border-occ-line bg-occ-ink px-3 py-2 text-white"
              />
            </label>
            <label className="block text-sm text-zinc-300 sm:col-span-2">
              Family context
              <textarea
                value={profile.familyContext}
                onChange={(event) => setProfile({ ...profile, familyContext: event.target.value })}
                rows={4}
                className="focus-ring mt-2 w-full rounded-md border border-occ-line bg-occ-ink px-3 py-2 text-white"
              />
            </label>
          </div>
          <button className="focus-ring mt-4 rounded-md bg-occ-cyan px-4 py-2 font-semibold text-occ-ink" disabled={isSaving}>
            Save identity
          </button>
        </form>

        <form onSubmit={saveMemorySettings} className="rounded-lg border border-occ-line bg-occ-panel p-5">
          <div className="flex flex-wrap items-center gap-3">
            <StatusBadge tone={memorySettings.memoryEnabled ? "green" : "amber"}>
              Memory {memorySettings.memoryEnabled ? "enabled" : "disabled"}
            </StatusBadge>
            <StatusBadge tone="neutral">Opt-in</StatusBadge>
          </div>
          <h2 className="mt-4 text-2xl font-semibold text-white">Memory Consent</h2>
          <div className="mt-5 space-y-3">
            <label className="flex items-center justify-between gap-4 rounded-md border border-occ-line bg-occ-ink p-3 text-sm text-zinc-300">
              Enable personal memory
              <input
                type="checkbox"
                checked={memorySettings.memoryEnabled}
                onChange={(event) => setMemorySettings({ ...memorySettings, memoryEnabled: event.target.checked })}
                className="h-5 w-5 accent-occ-cyan"
              />
            </label>
            <label className="flex items-center justify-between gap-4 rounded-md border border-occ-line bg-occ-ink p-3 text-sm text-zinc-300">
              Allow AI-suggested memories
              <input
                type="checkbox"
                checked={memorySettings.allowAiSuggestions}
                onChange={(event) => setMemorySettings({ ...memorySettings, allowAiSuggestions: event.target.checked })}
                className="h-5 w-5 accent-occ-cyan"
              />
            </label>
            <label className="block text-sm text-zinc-300">
              Retention days
              <input
                type="number"
                min={1}
                max={3650}
                value={memorySettings.retentionDays}
                onChange={(event) => setMemorySettings({ ...memorySettings, retentionDays: Number(event.target.value) })}
                className="focus-ring mt-2 w-full rounded-md border border-occ-line bg-occ-ink px-3 py-2 text-white"
              />
            </label>
          </div>
          <button className="focus-ring mt-4 rounded-md bg-occ-cyan px-4 py-2 font-semibold text-occ-ink" disabled={isSaving}>
            Save consent
          </button>
        </form>
      </div>

      <form onSubmit={addEntry} className="rounded-lg border border-occ-line bg-occ-panel p-5">
        <div className="flex flex-wrap items-center gap-3">
          <StatusBadge tone="cyan">Life graph</StatusBadge>
          <StatusBadge tone={entry.kind === "memory" && !memorySettings.memoryEnabled ? "amber" : "neutral"}>
            {entry.kind === "memory" && !memorySettings.memoryEnabled ? "Enable memory first" : "Manual capture"}
          </StatusBadge>
        </div>
        <h2 className="mt-4 text-2xl font-semibold text-white">Add Personal Core Entry</h2>
        <div className="mt-5 grid gap-3 md:grid-cols-3">
          <label className="block text-sm text-zinc-300">
            Type
            <select
              value={entry.kind}
              onChange={(event) => setEntry({ ...entry, kind: event.target.value as PersonalCoreEntry["kind"] })}
              className="focus-ring mt-2 w-full rounded-md border border-occ-line bg-occ-ink px-3 py-2 text-white"
            >
              {entryKinds.map((kind) => (
                <option key={kind.value} value={kind.value}>
                  {kind.label}
                </option>
              ))}
            </select>
          </label>
          <label className="block text-sm text-zinc-300 md:col-span-2">
            Title
            <input
              value={entry.title}
              onChange={(event) => setEntry({ ...entry, title: event.target.value })}
              className="focus-ring mt-2 w-full rounded-md border border-occ-line bg-occ-ink px-3 py-2 text-white"
            />
          </label>
          <label className="block text-sm text-zinc-300">
            Category
            <input
              value={entry.category}
              onChange={(event) => setEntry({ ...entry, category: event.target.value })}
              className="focus-ring mt-2 w-full rounded-md border border-occ-line bg-occ-ink px-3 py-2 text-white"
            />
          </label>
          <label className="block text-sm text-zinc-300">
            Source
            <select
              value={entry.sourceKind}
              onChange={(event) => setEntry({ ...entry, sourceKind: event.target.value as PersonalCoreEntry["sourceKind"] })}
              className="focus-ring mt-2 w-full rounded-md border border-occ-line bg-occ-ink px-3 py-2 text-white"
            >
              <option value="manual">Manual</option>
              <option value="calendar">Calendar</option>
              <option value="gmail">Gmail</option>
              <option value="roster">Roster</option>
              <option value="system">System</option>
              <option value="ai_suggestion">AI suggestion</option>
            </select>
          </label>
          <label className="block text-sm text-zinc-300">
            Tags
            <input
              value={tagsText}
              onChange={(event) => setTagsText(event.target.value)}
              placeholder="family, health, work"
              className="focus-ring mt-2 w-full rounded-md border border-occ-line bg-occ-ink px-3 py-2 text-white placeholder:text-zinc-600"
            />
          </label>
          <label className="block text-sm text-zinc-300 md:col-span-3">
            Detail
            <textarea
              value={entry.detail}
              onChange={(event) => setEntry({ ...entry, detail: event.target.value })}
              rows={4}
              className="focus-ring mt-2 w-full rounded-md border border-occ-line bg-occ-ink px-3 py-2 text-white"
            />
          </label>
        </div>
        <div className="mt-4 flex flex-wrap items-center gap-3">
          <button className="focus-ring rounded-md bg-occ-cyan px-4 py-2 font-semibold text-occ-ink" disabled={isSaving}>
            Save entry
          </button>
          {status ? <span className="text-sm text-zinc-400">{status}</span> : null}
        </div>
      </form>
    </div>
  );
}
