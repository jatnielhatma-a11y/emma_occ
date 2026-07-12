"use client";

import { FormEvent, useState } from "react";
import type { Phase2Preferences } from "@/lib/settings/preferences";

type ToggleKey =
  | "preferDirectTrains"
  | "minimizeTransfers"
  | "minimizeWalking"
  | "preferFastestArrival"
  | "preferLowestCost"
  | "allowCycling"
  | "allowBus"
  | "allowTaxi"
  | "avoidPoorlyLitRoutesAtNight"
  | "avoidStairs"
  | "requireStepFreeAccess"
  | "preferFamiliarRoutes"
  | "preferReliabilityOverSpeed";

const routeToggles: Array<{ key: ToggleKey; label: string }> = [
  { key: "preferDirectTrains", label: "Prefer direct trains" },
  { key: "minimizeTransfers", label: "Minimize transfers" },
  { key: "minimizeWalking", label: "Minimize walking" },
  { key: "preferFastestArrival", label: "Prefer fastest arrival" },
  { key: "preferLowestCost", label: "Prefer lowest cost" },
  { key: "allowBus", label: "Allow bus" },
  { key: "allowTaxi", label: "Allow taxi or rideshare" },
  { key: "allowCycling", label: "Allow cycling" },
  { key: "avoidPoorlyLitRoutesAtNight", label: "Avoid poorly lit routes at night" },
  { key: "avoidStairs", label: "Avoid stairs" },
  { key: "requireStepFreeAccess", label: "Require step-free access" },
  { key: "preferFamiliarRoutes", label: "Prefer familiar routes" },
  { key: "preferReliabilityOverSpeed", label: "Prefer reliability over speed" }
];

function ToggleRow({ label, checked, onChange }: { label: string; checked: boolean; onChange: (checked: boolean) => void }) {
  return (
    <label className="flex items-center justify-between gap-4 rounded-md border border-occ-line bg-occ-ink p-3 text-sm text-zinc-300">
      {label}
      <input type="checkbox" checked={checked} onChange={(event) => onChange(event.target.checked)} className="h-5 w-5 accent-occ-cyan" />
    </label>
  );
}

export function Phase2PreferencesForm({ initial }: { initial: Phase2Preferences }) {
  const [preferences, setPreferences] = useState(initial);
  const [status, setStatus] = useState("");
  const [isSaving, setIsSaving] = useState(false);

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setStatus("");
    setIsSaving(true);

    const response = await fetch("/api/settings/preferences", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(preferences)
    });
    const payload = await response.json();
    setIsSaving(false);
    setStatus(payload.ok ? "Phase 2 preferences saved." : payload.error);
  }

  return (
    <form onSubmit={onSubmit} className="space-y-5">
      <section className="rounded-lg border border-occ-line bg-occ-panel p-5">
        <p className="text-xs uppercase tracking-[0.18em] text-occ-cyan">Identity</p>
        <h2 className="mt-2 text-2xl font-semibold text-white">Profile and language</h2>
        <div className="mt-5 grid gap-3 sm:grid-cols-3">
          <label className="block text-sm text-zinc-300 sm:col-span-2">
            Display name
            <input
              value={preferences.displayName}
              onChange={(event) => setPreferences({ ...preferences, displayName: event.target.value })}
              className="focus-ring mt-2 w-full rounded-md border border-occ-line bg-occ-ink px-3 py-2 text-white"
            />
          </label>
          <label className="block text-sm text-zinc-300">
            Language
            <select
              value={preferences.preferredLanguage}
              onChange={(event) => setPreferences({ ...preferences, preferredLanguage: event.target.value as Phase2Preferences["preferredLanguage"] })}
              className="focus-ring mt-2 w-full rounded-md border border-occ-line bg-occ-ink px-3 py-2 text-white"
            >
              <option value="en">English</option>
              <option value="es">Spanish</option>
              <option value="fr">French</option>
            </select>
          </label>
          <label className="block text-sm text-zinc-300 sm:col-span-3">
            Time zone
            <input
              value={preferences.timezone}
              onChange={(event) => setPreferences({ ...preferences, timezone: event.target.value })}
              className="focus-ring mt-2 w-full rounded-md border border-occ-line bg-occ-ink px-3 py-2 text-white"
            />
          </label>
        </div>
      </section>

      <section className="rounded-lg border border-occ-line bg-occ-panel p-5">
        <p className="text-xs uppercase tracking-[0.18em] text-occ-cyan">Routing</p>
        <h2 className="mt-2 text-2xl font-semibold text-white">Route preferences</h2>
        <div className="mt-5 grid gap-3 md:grid-cols-2">
          {routeToggles.map((item) => (
            <ToggleRow
              key={item.key}
              label={item.label}
              checked={preferences.routePreferences[item.key]}
              onChange={(checked) =>
                setPreferences({
                  ...preferences,
                  routePreferences: { ...preferences.routePreferences, [item.key]: checked }
                })
              }
            />
          ))}
        </div>
        <div className="mt-4 grid gap-3 sm:grid-cols-2">
          <label className="block text-sm text-zinc-300">
            Weather buffer minutes
            <input
              type="number"
              min={0}
              max={60}
              value={preferences.routePreferences.extraWeatherBufferMinutes}
              onChange={(event) =>
                setPreferences({
                  ...preferences,
                  routePreferences: { ...preferences.routePreferences, extraWeatherBufferMinutes: Number(event.target.value) }
                })
              }
              className="focus-ring mt-2 w-full rounded-md border border-occ-line bg-occ-ink px-3 py-2 text-white"
            />
          </label>
          <label className="block text-sm text-zinc-300">
            Station arrival buffer minutes
            <input
              type="number"
              min={0}
              max={60}
              value={preferences.routePreferences.stationArrivalBufferMinutes}
              onChange={(event) =>
                setPreferences({
                  ...preferences,
                  routePreferences: { ...preferences.routePreferences, stationArrivalBufferMinutes: Number(event.target.value) }
                })
              }
              className="focus-ring mt-2 w-full rounded-md border border-occ-line bg-occ-ink px-3 py-2 text-white"
            />
          </label>
        </div>
      </section>

      <section className="rounded-lg border border-occ-line bg-occ-panel p-5">
        <p className="text-xs uppercase tracking-[0.18em] text-occ-cyan">Privacy</p>
        <h2 className="mt-2 text-2xl font-semibold text-white">Notifications and data controls</h2>
        <div className="mt-5 grid gap-3 md:grid-cols-2">
          <ToggleRow
            label="Location services enabled"
            checked={preferences.locationPreferences.enabled}
            onChange={(checked) =>
              setPreferences({ ...preferences, locationPreferences: { ...preferences.locationPreferences, enabled: checked } })
            }
          />
          <ToggleRow
            label="High accuracy only while commuting"
            checked={preferences.locationPreferences.highAccuracyWhenCommuting}
            onChange={(checked) =>
              setPreferences({ ...preferences, locationPreferences: { ...preferences.locationPreferences, highAccuracyWhenCommuting: checked } })
            }
          />
          <ToggleRow
            label="Store coarse location events"
            checked={preferences.locationPreferences.storeCoarseEvents}
            onChange={(checked) =>
              setPreferences({ ...preferences, locationPreferences: { ...preferences.locationPreferences, storeCoarseEvents: checked } })
            }
          />
          <ToggleRow
            label="Store raw GPS history"
            checked={preferences.locationPreferences.storeRawHistory}
            onChange={(checked) =>
              setPreferences({ ...preferences, locationPreferences: { ...preferences.locationPreferences, storeRawHistory: checked } })
            }
          />
          <ToggleRow
            label="Gmail triage enabled"
            checked={preferences.privacySettings.gmailTriageEnabled}
            onChange={(checked) => setPreferences({ ...preferences, privacySettings: { ...preferences.privacySettings, gmailTriageEnabled: checked } })}
          />
          <ToggleRow
            label="Allow AI to use email context"
            checked={preferences.privacySettings.allowAiEmailContext}
            onChange={(checked) => setPreferences({ ...preferences, privacySettings: { ...preferences.privacySettings, allowAiEmailContext: checked } })}
          />
        </div>
        <div className="mt-4 grid gap-3 sm:grid-cols-2">
          <label className="block text-sm text-zinc-300">
            Quiet hours start
            <input
              type="time"
              value={preferences.notificationPreferences.quietHoursStart}
              onChange={(event) =>
                setPreferences({
                  ...preferences,
                  notificationPreferences: { ...preferences.notificationPreferences, quietHoursStart: event.target.value }
                })
              }
              className="focus-ring mt-2 w-full rounded-md border border-occ-line bg-occ-ink px-3 py-2 text-white"
            />
          </label>
          <label className="block text-sm text-zinc-300">
            Quiet hours end
            <input
              type="time"
              value={preferences.notificationPreferences.quietHoursEnd}
              onChange={(event) =>
                setPreferences({
                  ...preferences,
                  notificationPreferences: { ...preferences.notificationPreferences, quietHoursEnd: event.target.value }
                })
              }
              className="focus-ring mt-2 w-full rounded-md border border-occ-line bg-occ-ink px-3 py-2 text-white"
            />
          </label>
        </div>
      </section>

      <div className="flex flex-wrap items-center gap-3">
        <button disabled={isSaving} className="focus-ring rounded-md bg-occ-cyan px-4 py-2 font-semibold text-occ-ink disabled:opacity-60">
          {isSaving ? "Saving..." : "Save Phase 2 preferences"}
        </button>
        {status ? <span className="text-sm text-zinc-400">{status}</span> : null}
      </div>
    </form>
  );
}
