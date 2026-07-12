"use client";

import { FormEvent, useState } from "react";

type CommuteSettingsFormProps = {
  initial: {
    enabled: boolean;
    beforeMinutes: number;
    afterMinutes: number;
    travelMode: "manual" | "ns";
    homeAddress: string;
    workAddress: string;
    homeStation: string;
    workStation: string;
  };
};

export function CommuteSettingsForm({ initial }: CommuteSettingsFormProps) {
  const [enabled, setEnabled] = useState(initial.enabled);
  const [beforeMinutes, setBeforeMinutes] = useState(initial.beforeMinutes);
  const [afterMinutes, setAfterMinutes] = useState(initial.afterMinutes);
  const [travelMode, setTravelMode] = useState<"manual" | "ns">(initial.travelMode);
  const [homeAddress, setHomeAddress] = useState(initial.homeAddress);
  const [workAddress, setWorkAddress] = useState(initial.workAddress);
  const [homeStation, setHomeStation] = useState(initial.homeStation);
  const [workStation, setWorkStation] = useState(initial.workStation);
  const [status, setStatus] = useState("");

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setStatus("Saving...");
    const response = await fetch("/api/settings/commute", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ enabled, beforeMinutes, afterMinutes, travelMode, homeAddress, workAddress, homeStation, workStation })
    });
    const payload = await response.json();
    setStatus(payload.ok ? "Commute settings saved." : payload.error);
  }

  return (
    <form onSubmit={onSubmit} className="mt-5 space-y-4">
      <label className="flex items-center justify-between gap-4 rounded-md border border-occ-line bg-occ-ink p-3 text-sm text-zinc-300">
        Add commute blocks to working duties
        <input
          type="checkbox"
          checked={enabled}
          onChange={(event) => setEnabled(event.target.checked)}
          className="h-5 w-5 accent-occ-cyan"
        />
      </label>
      <div className="grid gap-3 sm:grid-cols-2">
        <label className="block text-sm text-zinc-300 sm:col-span-2">
          Commute source
          <select
            value={travelMode}
            onChange={(event) => setTravelMode(event.target.value as "manual" | "ns")}
            className="focus-ring mt-2 w-full rounded-md border border-occ-line bg-occ-ink px-3 py-2 text-white"
          >
            <option value="manual">Manual buffer</option>
            <option value="ns">NS live reference</option>
          </select>
        </label>
        <label className="block text-sm text-zinc-300 sm:col-span-2">
          Home address
          <input
            type="text"
            value={homeAddress}
            onChange={(event) => setHomeAddress(event.target.value)}
            placeholder="Lemmerstraat 18, 1324 BP Almere"
            className="focus-ring mt-2 w-full rounded-md border border-occ-line bg-occ-ink px-3 py-2 text-white placeholder:text-zinc-600"
          />
        </label>
        <label className="block text-sm text-zinc-300 sm:col-span-2">
          Work address or destination
          <input
            type="text"
            value={workAddress}
            onChange={(event) => setWorkAddress(event.target.value)}
            placeholder="Admiraal Helfrichlaan 1, 3527 KV Utrecht"
            className="focus-ring mt-2 w-full rounded-md border border-occ-line bg-occ-ink px-3 py-2 text-white placeholder:text-zinc-600"
          />
        </label>
        <label className="block text-sm text-zinc-300">
          Home NS station
          <input
            type="text"
            value={homeStation}
            onChange={(event) => setHomeStation(event.target.value)}
            placeholder="Almere Centrum"
            className="focus-ring mt-2 w-full rounded-md border border-occ-line bg-occ-ink px-3 py-2 text-white placeholder:text-zinc-600"
          />
        </label>
        <label className="block text-sm text-zinc-300">
          Work NS station
          <input
            type="text"
            value={workStation}
            onChange={(event) => setWorkStation(event.target.value)}
            placeholder="Utrecht Centraal"
            className="focus-ring mt-2 w-full rounded-md border border-occ-line bg-occ-ink px-3 py-2 text-white placeholder:text-zinc-600"
          />
        </label>
        <label className="block text-sm text-zinc-300">
          Before duty
          <input
            type="number"
            min={0}
            max={240}
            value={beforeMinutes}
            onChange={(event) => setBeforeMinutes(Number(event.target.value))}
            className="focus-ring mt-2 w-full rounded-md border border-occ-line bg-occ-ink px-3 py-2 text-white"
          />
        </label>
        <label className="block text-sm text-zinc-300">
          After duty
          <input
            type="number"
            min={0}
            max={240}
            value={afterMinutes}
            onChange={(event) => setAfterMinutes(Number(event.target.value))}
            className="focus-ring mt-2 w-full rounded-md border border-occ-line bg-occ-ink px-3 py-2 text-white"
          />
        </label>
      </div>
      {travelMode === "ns" ? (
        <div className="rounded-md border border-occ-cyan/30 bg-occ-cyan/10 p-3 text-sm text-cyan-100">
          Door-to-door links use your addresses. NS station names are used for railway planner links, route alerts, and calendar commute references.
        </div>
      ) : null}
      <div className="flex items-center gap-3">
        <button className="focus-ring rounded-md bg-occ-cyan px-4 py-2 font-semibold text-occ-ink">Save commute settings</button>
        {status ? <span className="text-sm text-zinc-400">{status}</span> : null}
      </div>
    </form>
  );
}
