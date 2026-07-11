import type { WalkingLeg } from '../types';
function parseDuration(value?: string): number { if (!value) return 0; return Math.ceil(Number(value.replace('s', '')) / 60); }
export async function getWalkingLeg(from: string, to: string, fallback: WalkingLeg): Promise<WalkingLeg> {
  const key = process.env.GOOGLE_MAPS_API_KEY;
  if (!key) return fallback;
  try {
    const response = await fetch('https://routes.googleapis.com/directions/v2:computeRoutes', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'X-Goog-Api-Key': key, 'X-Goog-FieldMask': 'routes.duration,routes.distanceMeters' },
      body: JSON.stringify({ origin: { address: from }, destination: { address: to }, travelMode: 'WALK', languageCode: 'en', regionCode: 'nl', units: 'METRIC' }),
      cache: 'no-store',
    });
    if (!response.ok) throw new Error(`Maps ${response.status}`);
    const data = await response.json() as { routes?: Array<{ duration?: string; distanceMeters?: number }> };
    const route = data.routes?.[0];
    if (!route) throw new Error('No walking route');
    return { from, to, durationMinutes: parseDuration(route.duration), distanceMeters: route.distanceMeters ?? 0, source: 'live' };
  } catch { return fallback; }
}
