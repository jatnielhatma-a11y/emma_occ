import type { TrainLeg } from '../types';
export async function getTrainLeg(fallback: TrainLeg): Promise<TrainLeg> {
  const key = process.env.NS_API_KEY;
  if (!key) return fallback;
  try {
    const base = process.env.NS_TRIPS_BASE_URL ?? 'https://gateway.apiportal.ns.nl/reisinformatie-api/api/v3/trips';
    const url = new URL(base);
    url.searchParams.set('fromStation', 'Almere Centrum');
    url.searchParams.set('toStation', 'Utrecht Centraal');
    url.searchParams.set('searchForArrival', 'false');
    const response = await fetch(url, { headers: { 'Ocp-Apim-Subscription-Key': key }, cache: 'no-store' });
    if (!response.ok) throw new Error(`NS ${response.status}`);
    const data = await response.json() as { trips?: Array<Record<string, unknown>> };
    const trip = data.trips?.[0] as any;
    const leg = trip?.legs?.[0];
    if (!leg) throw new Error('No NS trip');
    const plannedArrival = leg.destination?.plannedDateTime ?? '';
    const actualArrival = leg.destination?.actualDateTime ?? plannedArrival;
    const delayMs = new Date(actualArrival).getTime() - new Date(plannedArrival).getTime();
    const actualDeparture = leg.origin?.actualDateTime ?? leg.origin?.plannedDateTime ?? '';
    return {
      from: 'Almere Centrum', to: 'Utrecht Centraal',
      departure: actualDeparture ? new Date(actualDeparture).toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit', timeZone: 'Europe/Amsterdam' }) : fallback.departure,
      arrival: actualArrival ? new Date(actualArrival).toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit', timeZone: 'Europe/Amsterdam' }) : fallback.arrival,
      platform: leg.origin?.actualTrack ?? leg.origin?.plannedTrack,
      direct: (trip?.transfers ?? 0) === 0,
      delayedMinutes: Math.max(0, Math.round(delayMs / 60000)),
      cancelled: Boolean(leg.cancelled), source: 'live',
    };
  } catch { return fallback; }
}
