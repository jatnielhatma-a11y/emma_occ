"use client";

import { Footprints, Route } from "lucide-react";
import { FormEvent, useState } from "react";
import { StatusBadge } from "@/components/dashboard/StatusBadge";

export function LearningPanel({ latestRouteSnapshotId }: { latestRouteSnapshotId?: string | null }) {
  const [segmentLabel, setSegmentLabel] = useState("Home to Almere Centrum");
  const [distanceMeters, setDistanceMeters] = useState(900);
  const [durationMinutes, setDurationMinutes] = useState(12);
  const [feedbackType, setFeedbackType] = useState("accepted");
  const [status, setStatus] = useState("");

  async function saveWalkingSample(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setStatus("Saving walking sample...");
    const response = await fetch("/api/learning/walking-speed", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        segmentLabel,
        distanceMeters,
        durationSeconds: durationMinutes * 60,
        source: "manual"
      })
    });
    const payload = await response.json();
    setStatus(payload.ok ? `Learned walking speed ${payload.learnedSpeed} km/h.` : payload.error);
  }

  async function saveRouteFeedback() {
    setStatus("Saving route feedback...");
    const response = await fetch("/api/learning/route-feedback", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        routeSnapshotId: latestRouteSnapshotId ?? undefined,
        selectedOptionId: "latest-recommended",
        feedbackType
      })
    });
    const payload = await response.json();
    setStatus(payload.ok ? "Route preference feedback saved." : payload.error);
  }

  return (
    <section className="rounded-lg border border-occ-line bg-occ-panel p-5">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="text-xs uppercase tracking-[0.18em] text-occ-cyan">Phase 6</p>
          <h2 className="mt-2 text-2xl font-semibold text-white">Learning controls</h2>
          <p className="mt-2 text-sm text-zinc-500">Save measured commute facts and NOVA adjusts preferences gradually.</p>
        </div>
        <StatusBadge tone="cyan">Operator confirmed</StatusBadge>
      </div>

      <div className="mt-5 grid gap-5 xl:grid-cols-2">
        <form onSubmit={saveWalkingSample} className="rounded-md border border-occ-line bg-occ-ink p-4">
          <div className="flex items-center gap-2 text-sm font-semibold text-white">
            <Footprints size={16} className="text-occ-cyan" />
            Walking speed sample
          </div>
          <label className="mt-4 block text-sm text-zinc-300">
            Segment
            <input value={segmentLabel} onChange={(event) => setSegmentLabel(event.target.value)} className="focus-ring mt-2 w-full rounded-md border border-occ-line bg-occ-panel px-3 py-2 text-white" />
          </label>
          <div className="mt-3 grid gap-3 sm:grid-cols-2">
            <label className="block text-sm text-zinc-300">
              Distance meters
              <input type="number" min={20} max={50000} value={distanceMeters} onChange={(event) => setDistanceMeters(Number(event.target.value))} className="focus-ring mt-2 w-full rounded-md border border-occ-line bg-occ-panel px-3 py-2 text-white" />
            </label>
            <label className="block text-sm text-zinc-300">
              Minutes
              <input type="number" min={1} max={480} value={durationMinutes} onChange={(event) => setDurationMinutes(Number(event.target.value))} className="focus-ring mt-2 w-full rounded-md border border-occ-line bg-occ-panel px-3 py-2 text-white" />
            </label>
          </div>
          <button className="focus-ring mt-4 rounded-md bg-occ-cyan px-4 py-2 text-sm font-semibold text-occ-ink">Save sample</button>
        </form>

        <div className="rounded-md border border-occ-line bg-occ-ink p-4">
          <div className="flex items-center gap-2 text-sm font-semibold text-white">
            <Route size={16} className="text-occ-cyan" />
            Route feedback
          </div>
          <label className="mt-4 block text-sm text-zinc-300">
            Feedback
            <select value={feedbackType} onChange={(event) => setFeedbackType(event.target.value)} className="focus-ring mt-2 w-full rounded-md border border-occ-line bg-occ-panel px-3 py-2 text-white">
              <option value="accepted">Accepted route</option>
              <option value="rejected">Rejected route</option>
              <option value="too_much_walking">Too much walking</option>
              <option value="too_many_transfers">Too many transfers</option>
              <option value="late">Arrived late</option>
              <option value="unsafe">Felt unsafe</option>
              <option value="other">Other</option>
            </select>
          </label>
          <button type="button" onClick={saveRouteFeedback} className="focus-ring mt-4 rounded-md bg-occ-cyan px-4 py-2 text-sm font-semibold text-occ-ink">
            Save feedback
          </button>
        </div>
      </div>
      {status ? <p className="mt-4 text-sm text-zinc-400">{status}</p> : null}
    </section>
  );
}
