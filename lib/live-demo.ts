import type { NormalizedDuty } from "./roster/types";
import { fetchNsCommuteStatus, type NsCommuteStatus } from "./ns-commute";
import { resilientFetch } from "./operations/resilience";

type LiveCalendarEvent = {
  summary: string;
  start: string;
  end: string;
  location?: string;
  transparency?: string;
};

export type LiveCalendarSnapshot = {
  generatedAt: string;
  timezone: string;
  source: string;
  events: LiveCalendarEvent[];
};

export type LiveWeather = {
  source: string;
  location: string;
  tempC: string;
  feelsLikeC: string;
  description: string;
  windKmph: string;
  humidity: string;
  observedAt: string;
};

export type LiveNsStatus = NsCommuteStatus;

function timeFromIso(value: string) {
  return value.slice(11, 16);
}

function dateFromIso(value: string) {
  return value.slice(0, 10);
}

function inferDutyLabel(summary: string) {
  const normalized = summary.toLowerCase();
  if (normalized.includes("off day") || normalized.includes("rest")) return "OFF Day";
  if (normalized.includes("night shift")) return "Night Shift";
  if (normalized.includes("late shift")) return "Late Shift";
  return "Custom Duty";
}

function dutyCodeFromSummary(summary: string) {
  const parts = summary.split(" - ");
  return parts[1]?.trim() ?? summary.trim();
}

function isOvernight(start: string, end: string) {
  return dateFromIso(end) > dateFromIso(start);
}

export function loadLiveCalendarSnapshot(): LiveCalendarSnapshot | null {
  const raw = process.env.LIVE_DEMO_CALENDAR_JSON;
  if (!raw) return null;

  try {
    return JSON.parse(raw) as LiveCalendarSnapshot;
  } catch {
    return null;
  }
}

export function calendarEventsToDuties(snapshot: LiveCalendarSnapshot | null): NormalizedDuty[] {
  if (!snapshot) return [];

  return snapshot.events
    .filter((event) => {
      const lower = event.summary.toLowerCase();
      return lower.includes("shift") || lower.includes("off day") || lower.includes("rest");
    })
    .map((event, index) => {
      const label = inferDutyLabel(event.summary);
      const off = label === "OFF Day";
      return {
        date: dateFromIso(event.start),
        startTime: off ? "" : timeFromIso(event.start),
        endTime: off ? "" : timeFromIso(event.end),
        originalDutyCode: dutyCodeFromSummary(event.summary),
        dutyLabel: label,
        location: event.location ?? "",
        notes: "Live Google Calendar session data",
        sourceFile: snapshot.source,
        sourceRow: index + 1,
        isOff: off,
        isOvernight: !off && isOvernight(event.start, event.end)
      };
    });
}

export async function fetchLiveWeather(): Promise<LiveWeather | null> {
  const location = process.env.WEATHER_LOCATION || "Amsterdam, Netherlands";
  const weatherUrl = `https://wttr.in/${encodeURIComponent(location)}?format=j1`;

  try {
    const response = await resilientFetch(weatherUrl, {
      next: { revalidate: 900 }
    }, {
      label: "Weather provider",
      timeoutMs: 5_000,
      attempts: 2
    });
    if (!response.ok) return null;
    const data = await response.json();
    const current = data.current_condition?.[0];
    if (!current) return null;

    return {
      source: "wttr.in / WorldWeatherOnline",
      location,
      tempC: current.temp_C,
      feelsLikeC: current.FeelsLikeC,
      description: current.weatherDesc?.[0]?.value?.trim() ?? "Current weather",
      windKmph: current.windspeedKmph,
      humidity: current.humidity,
      observedAt: current.observation_time
    };
  } catch {
    return null;
  }
}

export async function fetchNsStatus(): Promise<LiveNsStatus> {
  return fetchNsCommuteStatus({
    homeStation: process.env.NS_HOME_STATION,
    workStation: process.env.NS_WORK_STATION || "Utrecht Centraal",
    homeAddress: process.env.COMMUTE_HOME_ADDRESS,
    workAddress: process.env.COMMUTE_WORK_ADDRESS
  });
}
