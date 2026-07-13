import type { ProviderResult } from "@/lib/providers/types";
import { resilientFetch } from "../operations/resilience";

export type GoogleRouteTravelMode = "DRIVE" | "BICYCLE" | "WALK" | "TRANSIT";

export type GoogleRouteSummary = {
  provider: "google-routes";
  mode: GoogleRouteTravelMode;
  durationMinutes: number | null;
  staticDurationMinutes: number | null;
  distanceMeters: number | null;
  delayMinutes: number;
  url: string | null;
};

type GoogleRouteInput = {
  origin: string | null;
  destination: string | null;
  mode: GoogleRouteTravelMode;
};

function parseDurationSeconds(value: unknown) {
  if (typeof value !== "string") return null;
  const match = value.match(/^(\d+)s$/);
  if (!match) return null;
  return Number(match[1]);
}

function minutesFromSeconds(seconds: number | null) {
  if (seconds === null) return null;
  return Math.max(1, Math.round(seconds / 60));
}

function routeUrl(origin: string, destination: string, mode: GoogleRouteTravelMode) {
  const params = new URLSearchParams({
    api: "1",
    origin,
    destination,
    travelmode: mode === "DRIVE" ? "driving" : mode === "BICYCLE" ? "bicycling" : mode === "TRANSIT" ? "transit" : "walking"
  });
  return `https://www.google.com/maps/dir/?${params.toString()}`;
}

export function hasGoogleRoutesConfig() {
  return Boolean(process.env.GOOGLE_MAPS_API_KEY);
}

export async function fetchGoogleRoute(input: GoogleRouteInput): Promise<ProviderResult<GoogleRouteSummary>> {
  const retrievedAt = new Date().toISOString();
  const origin = input.origin?.trim();
  const destination = input.destination?.trim();

  if (!origin || !destination) {
    return {
      data: null,
      source: {
        name: "Google Routes",
        retrievedAt,
        freshness: "unavailable",
        confidence: 0.1,
        isFallback: true,
        error: "Origin and destination are required."
      }
    };
  }

  if (!process.env.GOOGLE_MAPS_API_KEY) {
    return {
      data: {
        provider: "google-routes",
        mode: input.mode,
        durationMinutes: null,
        staticDurationMinutes: null,
        distanceMeters: null,
        delayMinutes: 0,
        url: routeUrl(origin, destination, input.mode)
      },
      source: {
        name: "Google Maps link",
        retrievedAt,
        freshness: "fallback",
        confidence: 0.35,
        isFallback: true,
        error: "GOOGLE_MAPS_API_KEY is not configured."
      }
    };
  }

  try {
    const response = await resilientFetch(
      process.env.GOOGLE_ROUTES_BASE_URL || "https://routes.googleapis.com/directions/v2:computeRoutes",
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "X-Goog-Api-Key": process.env.GOOGLE_MAPS_API_KEY,
          "X-Goog-FieldMask": "routes.duration,routes.staticDuration,routes.distanceMeters"
        },
        body: JSON.stringify({
          origin: { address: origin },
          destination: { address: destination },
          travelMode: input.mode,
          routingPreference: input.mode === "DRIVE" ? "TRAFFIC_AWARE_OPTIMAL" : undefined,
          departureTime: input.mode === "TRANSIT" ? new Date().toISOString() : undefined,
          computeAlternativeRoutes: true,
          languageCode: "en",
          units: "METRIC"
        }),
        next: { revalidate: 120 }
      },
      {
        label: "Google Routes",
        timeoutMs: 7_000,
        attempts: 3
      }
    );

    if (!response.ok) {
      return {
        data: {
          provider: "google-routes",
          mode: input.mode,
          durationMinutes: null,
          staticDurationMinutes: null,
          distanceMeters: null,
          delayMinutes: 0,
          url: routeUrl(origin, destination, input.mode)
        },
        source: {
          name: "Google Routes",
          retrievedAt,
          freshness: "unavailable",
          confidence: 0.25,
          isFallback: true,
          error: `Google Routes returned ${response.status}.`
        }
      };
    }

    const payload = await response.json();
    const route = payload.routes?.[0];
    const durationSeconds = parseDurationSeconds(route?.duration);
    const staticDurationSeconds = parseDurationSeconds(route?.staticDuration);
    const durationMinutes = minutesFromSeconds(durationSeconds);
    const staticDurationMinutes = minutesFromSeconds(staticDurationSeconds);
    const delayMinutes =
      durationMinutes !== null && staticDurationMinutes !== null ? Math.max(0, durationMinutes - staticDurationMinutes) : 0;

    return {
      data: {
        provider: "google-routes",
        mode: input.mode,
        durationMinutes,
        staticDurationMinutes,
        distanceMeters: typeof route?.distanceMeters === "number" ? route.distanceMeters : null,
        delayMinutes,
        url: routeUrl(origin, destination, input.mode)
      },
      source: {
        name: "Google Routes",
        retrievedAt,
        freshness: "live",
        confidence: durationMinutes ? 0.88 : 0.62,
        isFallback: false
      }
    };
  } catch (error) {
    return {
      data: {
        provider: "google-routes",
        mode: input.mode,
        durationMinutes: null,
        staticDurationMinutes: null,
        distanceMeters: null,
        delayMinutes: 0,
        url: routeUrl(origin, destination, input.mode)
      },
      source: {
        name: "Google Routes",
        retrievedAt,
        freshness: "unavailable",
        confidence: 0.25,
        isFallback: true,
        error: error instanceof Error ? error.message : "Google Routes request failed."
      }
    };
  }
}
