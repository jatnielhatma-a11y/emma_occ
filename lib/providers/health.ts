import type { ProviderFreshness, ProviderHealth, ProviderRisk } from "./types";

type HealthInput = {
  calendarConnected: boolean;
  latestImportReady: boolean;
  nsStatus: "clear" | "attention" | "needs-route" | "unavailable";
  weatherAvailable: boolean;
  latestCalendarLogStatus?: string | null;
};

function statusFromBoolean(value: boolean, fallback: ProviderRisk = "amber"): ProviderRisk {
  return value ? "green" : fallback;
}

function freshnessFromBoolean(value: boolean): ProviderFreshness {
  return value ? "recent" : "unavailable";
}

export function buildIntegrationHealth(input: HealthInput, checkedAt = new Date().toISOString()): ProviderHealth[] {
  return [
    {
      id: "emma-occ-roster",
      label: "Emma OCC roster",
      status: statusFromBoolean(input.latestImportReady),
      source: "Supabase",
      freshness: freshnessFromBoolean(input.latestImportReady),
      confidence: input.latestImportReady ? 95 : 35,
      detail: input.latestImportReady ? "Roster import is available for Mission Control." : "Import a roster to unlock full duty context.",
      checkedAt
    },
    {
      id: "google-calendar",
      label: "Google Calendar",
      status: input.calendarConnected ? "green" : "amber",
      source: "Google OAuth",
      freshness: input.calendarConnected ? "recent" : "fallback",
      confidence: input.calendarConnected ? 90 : 45,
      detail: input.calendarConnected
        ? `Connection active${input.latestCalendarLogStatus ? `; last sync status ${input.latestCalendarLogStatus}.` : "."}`
        : "OAuth route is preserved; reconnect to enable writeback.",
      checkedAt
    },
    {
      id: "ns-transit",
      label: "NS transit",
      status: input.nsStatus === "clear" ? "green" : input.nsStatus === "attention" ? "amber" : "amber",
      source: "NS public reference",
      freshness: input.nsStatus === "unavailable" || input.nsStatus === "needs-route" ? "fallback" : "recent",
      confidence: input.nsStatus === "clear" ? 82 : input.nsStatus === "attention" ? 68 : 40,
      detail: input.nsStatus === "clear" ? "No station-specific disruption language detected." : "Review commute panel before departure.",
      checkedAt
    },
    {
      id: "weather",
      label: "Weather",
      status: statusFromBoolean(input.weatherAvailable),
      source: "Weather provider",
      freshness: freshnessFromBoolean(input.weatherAvailable),
      confidence: input.weatherAvailable ? 78 : 30,
      detail: input.weatherAvailable ? "Weather readout available for walking buffer decisions." : "Weather provider unavailable; do not treat fallback as live.",
      checkedAt
    },
    {
      id: "traffic-placeholder",
      label: "Traffic provider",
      status: "amber",
      source: "Typed interface",
      freshness: "fallback",
      confidence: 20,
      detail: "Phase 1 placeholder only. Live traffic is scheduled for Phase 4.",
      checkedAt
    }
  ];
}
