import type { ProviderResult } from "@/lib/providers/types";
import { resilientFetch } from "../operations/resilience";

export type NsLiveTrip = {
  provider: "ns-api";
  durationMinutes: number | null;
  plannedDurationMinutes: number | null;
  delayMinutes: number;
  transfers: number | null;
  cancelled: boolean;
  platformChanged: boolean;
  disruptions: string[];
};

type NsTripInput = {
  fromStation: string | null;
  toStation: string | null;
};

function readDurationMinutes(value: unknown) {
  return typeof value === "number" && Number.isFinite(value) ? Math.round(value) : null;
}

function collectLegDisruptions(legs: unknown[]) {
  return legs
    .flatMap((leg: any) => [leg?.disruptions, leg?.alerts, leg?.messages].flat())
    .filter(Boolean)
    .map((item: any) => item?.title || item?.message || item?.text || String(item))
    .filter(Boolean)
    .slice(0, 6);
}

export function hasNsApiConfig() {
  return Boolean(process.env.NS_API_KEY);
}

export async function fetchNsLiveTrip(input: NsTripInput): Promise<ProviderResult<NsLiveTrip>> {
  const retrievedAt = new Date().toISOString();
  const fromStation = input.fromStation?.trim();
  const toStation = input.toStation?.trim();

  if (!fromStation || !toStation) {
    return {
      data: null,
      source: {
        name: "NS API",
        retrievedAt,
        freshness: "unavailable",
        confidence: 0.1,
        isFallback: true,
        error: "Home and work station names are required."
      }
    };
  }

  if (!process.env.NS_API_KEY) {
    return {
      data: null,
      source: {
        name: "NS API",
        retrievedAt,
        freshness: "fallback",
        confidence: 0.3,
        isFallback: true,
        error: "NS_API_KEY is not configured."
      }
    };
  }

  try {
    const baseUrl = process.env.NS_API_BASE_URL || "https://gateway.apiportal.ns.nl/reisinformatie-api/api/v3";
    const url = new URL(`${baseUrl.replace(/\/$/, "")}/trips`);
    url.searchParams.set("fromStation", fromStation);
    url.searchParams.set("toStation", toStation);

    const response = await resilientFetch(url, {
      headers: {
        "Ocp-Apim-Subscription-Key": process.env.NS_API_KEY
      },
      next: { revalidate: 120 }
    }, {
      label: "NS API",
      timeoutMs: 7_000,
      attempts: 3
    });

    if (!response.ok) {
      return {
        data: null,
        source: {
          name: "NS API",
          retrievedAt,
          freshness: "unavailable",
          confidence: 0.25,
          isFallback: true,
          error: `NS API returned ${response.status}.`
        }
      };
    }

    const payload = await response.json();
    const trip = payload.trips?.[0] ?? payload.payload?.trips?.[0] ?? payload[0];
    const legs = Array.isArray(trip?.legs) ? trip.legs : [];
    const durationMinutes = readDurationMinutes(trip?.actualDurationInMinutes ?? trip?.durationInMinutes);
    const plannedDurationMinutes = readDurationMinutes(trip?.plannedDurationInMinutes);
    const delayMinutes =
      durationMinutes !== null && plannedDurationMinutes !== null ? Math.max(0, durationMinutes - plannedDurationMinutes) : 0;
    const cancelled = Boolean(trip?.cancelled || legs.some((leg: any) => leg?.cancelled));
    const platformChanged = legs.some((leg: any) => leg?.origin?.actualTrack && leg?.origin?.plannedTrack && leg.origin.actualTrack !== leg.origin.plannedTrack);

    return {
      data: {
        provider: "ns-api",
        durationMinutes,
        plannedDurationMinutes,
        delayMinutes,
        transfers: typeof trip?.transfers === "number" ? trip.transfers : legs.length ? Math.max(0, legs.length - 1) : null,
        cancelled,
        platformChanged,
        disruptions: collectLegDisruptions(legs)
      },
      source: {
        name: "NS API",
        retrievedAt,
        freshness: "live",
        confidence: durationMinutes ? 0.9 : 0.68,
        isFallback: false
      }
    };
  } catch (error) {
    return {
      data: null,
      source: {
        name: "NS API",
        retrievedAt,
        freshness: "unavailable",
        confidence: 0.25,
        isFallback: true,
        error: error instanceof Error ? error.message : "NS API request failed."
      }
    };
  }
}
