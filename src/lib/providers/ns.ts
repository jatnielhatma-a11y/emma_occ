import type { CommuteDirection, TrainLeg } from '../types';

function time(value: string | undefined, fallback: string): string {
  if (!value) return fallback;
  return new Date(value).toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit', timeZone: 'Europe/Amsterdam' });
}

export async function getTrainLeg(fallback: TrainLeg, direction: CommuteDirection = 'outbound'): Promise<TrainLeg> {
  const key = process.env.NS_API_KEY;
  if (!key || direction === 'none') return fallback;
  const outbound = direction === 'outbound';
  const from = outbound ? 'Almere Centrum' : 'Utrecht Centraal';
  const to = outbound ? 'Utrecht Centraal' : 'Almere Centrum';
  try {
    const base = process.env.NS_TRIPS_BASE_URL ?? 'https://gateway.apiportal.ns.nl/reisinformatie-api/api/v3/trips';
    const url = new URL(base);
    url.searchParams.set('fromStation', from);
    url.searchParams.set('toStation', to);
    url.searchParams.set('searchForArrival', 'false');
    const response = await fetch(url, { headers: { 'Ocp-Apim-Subscription-Key': key }, cache: 'no-store' });
    if (!response.ok) throw new Error(`NS ${response.status}`);
    const data = await response.json() as { trips?: Array<Record<string, unknown>> };
    const trips = (data.trips ?? []) as any[];
    const trip = trips.find((candidate) => (candidate?.transfers ?? 99) === 0) ?? trips[0];
    const legs = trip?.legs ?? [];
    const first = legs[0];
    const last = legs[legs.length - 1];
    if (!first || !last) throw new Error('No NS trip');
    const plannedArrival = last.destination?.plannedDateTime ?? '';
    const actualArrival = last.destination?.actualDateTime ?? plannedArrival;
    const actualDeparture = first.origin?.actualDateTime ?? first.origin?.plannedDateTime ?? '';
    const delayMs = new Date(actualArrival).getTime() - new Date(plannedArrival).getTime();
    const durationMinutes = actualDeparture && actualArrival
      ? Math.max(0, Math.round((new Date(actualArrival).getTime() - new Date(actualDeparture).getTime()) / 60000))
      : fallback.durationMinutes;
    return {
      from, to,
      departure: time(actualDeparture, fallback.departure),
      arrival: time(actualArrival, fallback.arrival),
      platform: first.origin?.actualTrack ?? first.origin?.plannedTrack ?? fallback.platform,
      arrivalPlatform: last.destination?.actualTrack ?? last.destination?.plannedTrack ?? fallback.arrivalPlatform,
      exitSide: outbound ? fallback.exitSide : undefined,
      direct: (trip?.transfers ?? 0) === 0,
      transfers: trip?.transfers ?? 0,
      durationMinutes,
      delayedMinutes: Math.max(0, Math.round(delayMs / 60000)),
      cancelled: Boolean(trip?.cancelled || legs.some((leg: any) => leg.cancelled)),
      source: 'live',
    };
  } catch {
    return fallback;
  }
}
