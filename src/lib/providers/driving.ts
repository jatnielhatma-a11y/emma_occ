import type { DrivingRoute, TrafficCondition } from '../types';

function parseDuration(value?: string): number {
  if (!value) return 0;
  return Math.max(1, Math.ceil(Number(value.replace('s', '')) / 60));
}

function trafficCondition(delay: number): TrafficCondition {
  if (delay >= 15) return 'HEAVY';
  if (delay >= 6) return 'MODERATE';
  if (delay >= 0) return 'LIGHT';
  return 'UNKNOWN';
}

function fallbackRoute(from: string, to: string): DrivingRoute {
  return {
    from,
    to,
    durationMinutes: 50,
    normalDurationMinutes: 45,
    trafficDelayMinutes: 5,
    distanceMeters: 52000,
    condition: 'UNKNOWN',
    alternateRoutes: 0,
    warnings: ['Live Google traffic data unavailable; open Waze before departure.'],
    source: 'fallback',
  };
}

export async function getDrivingRoute(from: string, to: string): Promise<DrivingRoute> {
  const key = process.env.GOOGLE_MAPS_API_KEY;
  if (!key) return fallbackRoute(from, to);

  try {
    const response = await fetch('https://routes.googleapis.com/directions/v2:computeRoutes', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Goog-Api-Key': key,
        'X-Goog-FieldMask': 'routes.duration,routes.staticDuration,routes.distanceMeters,routes.warnings,routes.routeLabels',
      },
      body: JSON.stringify({
        origin: { address: from },
        destination: { address: to },
        travelMode: 'DRIVE',
        routingPreference: 'TRAFFIC_AWARE_OPTIMAL',
        computeAlternativeRoutes: true,
        languageCode: 'en',
        regionCode: 'nl',
        units: 'METRIC',
      }),
      cache: 'no-store',
    });

    if (!response.ok) throw new Error(`Google Routes ${response.status}`);
    const data = await response.json() as {
      routes?: Array<{
        duration?: string;
        staticDuration?: string;
        distanceMeters?: number;
        warnings?: string[];
      }>;
    };
    const route = data.routes?.[0];
    if (!route) throw new Error('No driving route');

    const durationMinutes = parseDuration(route.duration);
    const normalDurationMinutes = parseDuration(route.staticDuration) || durationMinutes;
    const trafficDelayMinutes = Math.max(0, durationMinutes - normalDurationMinutes);

    return {
      from,
      to,
      durationMinutes,
      normalDurationMinutes,
      trafficDelayMinutes,
      distanceMeters: route.distanceMeters ?? 0,
      condition: trafficCondition(trafficDelayMinutes),
      alternateRoutes: Math.max(0, (data.routes?.length ?? 1) - 1),
      warnings: route.warnings ?? [],
      source: 'live',
    };
  } catch {
    return fallbackRoute(from, to);
  }
}
