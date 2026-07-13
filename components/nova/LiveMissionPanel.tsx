"use client";

import { TimerReset, Navigation } from "lucide-react";
import { useEffect, useState } from "react";
import { StatusBadge } from "@/components/dashboard/StatusBadge";

type MissionSnapshot = {
  id?: string;
  status?: string | null;
  current_phase?: string | null;
  latest_location_label?: string | null;
  latest_confidence?: number | null;
  latest_event_at?: string | null;
};

type LocationEventSummary = {
  id: string;
  event_type: string;
  coarse_location_label: string | null;
  confidence: number | null;
  accuracy_meters: number | null;
  route_phase: string | null;
  created_at: string;
};

function formatDateTime(value?: string | null) {
  if (!value) return "Not recorded";
  return new Intl.DateTimeFormat("en-GB", {
    dateStyle: "medium",
    timeStyle: "short",
    timeZone: process.env.NEXT_PUBLIC_APP_TIMEZONE || "Europe/Amsterdam"
  }).format(new Date(value));
}

function phaseLabel(value?: string | null) {
  return value ? value.replaceAll("_", " ") : "not started";
}

export function LiveMissionPanel({
  initialMission,
  initialEvents
}: {
  initialMission: MissionSnapshot | null;
  initialEvents: LocationEventSummary[];
}) {
  const [mission, setMission] = useState(initialMission);
  const [events, setEvents] = useState(initialEvents);

  useEffect(() => {
    async function refreshMission() {
      const response = await fetch("/api/location/mission");
      const payload = await response.json();
      if (payload.ok) {
        setMission(payload.mission ?? null);
        setEvents(payload.events ?? []);
      }
    }

    const interval = window.setInterval(() => {
      if (document.visibilityState === "visible") {
        void refreshMission();
      }
    }, 20_000);

    return () => window.clearInterval(interval);
  }, []);

  const missionTone = mission?.status === "active" ? "green" : mission?.status === "completed" ? "cyan" : "neutral";

  return (
    <div className="grid gap-5">
      <section className="rounded-lg border border-occ-line bg-occ-panel p-5">
        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <Navigation size={18} className="text-occ-cyan" />
            <h2 className="text-lg font-semibold text-white">Current mission</h2>
          </div>
          <StatusBadge tone={missionTone}>{mission?.status ?? "waiting"}</StatusBadge>
        </div>
        <div className="mt-5 grid gap-3 sm:grid-cols-2">
          <span className="rounded-md bg-occ-ink p-3 text-sm text-zinc-400">
            Phase
            <strong className="mt-1 block text-white">{phaseLabel(mission?.current_phase)}</strong>
          </span>
          <span className="rounded-md bg-occ-ink p-3 text-sm text-zinc-400">
            Latest location
            <strong className="mt-1 block text-white">{mission?.latest_location_label ?? "No GPS event yet"}</strong>
          </span>
          <span className="rounded-md bg-occ-ink p-3 text-sm text-zinc-400">
            Confidence
            <strong className="mt-1 block text-white">
              {typeof mission?.latest_confidence === "number" ? `${Math.round(mission.latest_confidence * 100)}%` : "Unknown"}
            </strong>
          </span>
          <span className="rounded-md bg-occ-ink p-3 text-sm text-zinc-400">
            Last event
            <strong className="mt-1 block text-white">{formatDateTime(mission?.latest_event_at)}</strong>
          </span>
        </div>
      </section>

      <section className="rounded-lg border border-occ-line bg-occ-panel p-5">
        <div className="flex items-center gap-2">
          <TimerReset size={18} className="text-occ-cyan" />
          <h2 className="text-lg font-semibold text-white">Recent coarse events</h2>
        </div>
        <div className="mt-5 divide-y divide-occ-line">
          {events.length ? (
            events.map((event) => (
              <div key={event.id} className="grid gap-2 py-3 sm:grid-cols-[1fr_130px] sm:items-center">
                <div>
                  <p className="text-sm font-medium text-white">{event.coarse_location_label ?? "In transit"}</p>
                  <p className="text-xs text-zinc-500">
                    {phaseLabel(event.route_phase)} · {Math.round(Number(event.confidence ?? 0) * 100)}% · accuracy{" "}
                    {event.accuracy_meters ?? "unknown"} m
                  </p>
                </div>
                <span className="text-xs text-zinc-500">{formatDateTime(event.created_at)}</span>
              </div>
            ))
          ) : (
            <p className="py-8 text-sm text-zinc-500">No coarse location events stored yet.</p>
          )}
        </div>
      </section>
    </div>
  );
}
