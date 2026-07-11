import { fallbackHomeWalk, fallbackOutboundTrain, fallbackReturnTrain, fallbackRoster, fallbackWorkWalk } from './fallback';
import { getRoster } from './providers/calendar';
import { getDrivingRoute } from './providers/driving';
import { getEmailAlerts } from './providers/gmail';
import { googleAuthConfigured } from './providers/google-auth';
import { getWalkingLeg } from './providers/maps';
import { getTrainLeg } from './providers/ns';
import { getWeatherRisk } from './providers/weather';
import { nextActualDuty } from './roster';
import { calculateRisk, confidenceScore, missionState } from './risk';
import type { CommuteDirection, IntegrationStatus, OpsSnapshot, Shift } from './types';

function status(name: string, source: 'live' | 'fallback' | 'unavailable', message: string): IntegrationStatus {
  return { name, source, message };
}

function amsterdamDateKey(value: Date): string {
  return new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Europe/Amsterdam', year: 'numeric', month: '2-digit', day: '2-digit',
  }).format(value);
}

function shiftDateKey(shift: Shift): string | null {
  if (shift.date === 'Today') return amsterdamDateKey(new Date());
  if (shift.date === 'Tomorrow') return amsterdamDateKey(new Date(Date.now() + 86400000));
  const parsed = new Date(shift.date);
  return Number.isNaN(parsed.getTime()) ? null : amsterdamDateKey(parsed);
}

function currentRosterStatus(roster: Shift[]): Shift | undefined {
  const today = amsterdamDateKey(new Date());
  return roster.find((shift) => shiftDateKey(shift) === today) ?? roster[0];
}

function clockMinutes(value?: string): number | null {
  if (!value) return null;
  const [hours, minutes] = value.split(':').map(Number);
  return Number.isFinite(hours) && Number.isFinite(minutes) ? hours * 60 + minutes : null;
}

function nowMinutes(): number {
  const parts = new Intl.DateTimeFormat('en-GB', {
    timeZone: 'Europe/Amsterdam', hour: '2-digit', minute: '2-digit', hour12: false,
  }).formatToParts(new Date());
  const hour = Number(parts.find((part) => part.type === 'hour')?.value ?? 0);
  const minute = Number(parts.find((part) => part.type === 'minute')?.value ?? 0);
  return hour * 60 + minute;
}

function directionFor(shift?: Shift): CommuteDirection {
  if (!shift?.commuteRequired) return 'none';
  const now = nowMinutes();
  const start = clockMinutes(shift.start);
  const end = clockMinutes(shift.end);
  if (start === null || end === null) return 'outbound';
  if (shift.label === 'Night Shift') return now < end || now >= start ? 'return' : 'outbound';
  return now >= start && now <= end ? 'return' : 'outbound';
}

function isNotificationRelevant(shift: Shift | undefined, direction: CommuteDirection, journeyMinutes: number): boolean {
  if (!shift?.commuteRequired || direction === 'none') return false;
  const now = nowMinutes();
  const start = clockMinutes(shift.start);
  const end = clockMinutes(shift.end);
  if (start === null || end === null) return false;
  if (direction === 'outbound') {
    const leave = (start - journeyMinutes + 1440) % 1440;
    const untilLeave = (leave - now + 1440) % 1440;
    return untilLeave >= 60 && untilLeave <= 90;
  }
  const untilEnd = (end - now + 1440) % 1440;
  return untilEnd >= 60 && untilEnd <= 90;
}

export async function buildOpsSnapshot(): Promise<OpsSnapshot> {
  const roster = await getRoster();
  const currentShift = currentRosterStatus(roster);
  const nextDuty = nextActualDuty(roster);
  const activeShift = currentShift?.commuteRequired ? currentShift : nextDuty;
  const direction = directionFor(activeShift);
  const outbound = direction !== 'return';
  const home = 'Lemmerstraat 18, Almere';
  const work = 'Admiraal Helfrichlaan 1, Utrecht';
  const drivingFrom = outbound ? home : work;
  const drivingTo = outbound ? work : home;

  const [homeToStation, stationToWork, workToStation, stationToHome, weather, emails, driving] = await Promise.all([
    getWalkingLeg(home, 'Almere Centrum', fallbackHomeWalk),
    getWalkingLeg('Utrecht Centraal', work, fallbackWorkWalk),
    getWalkingLeg(work, 'Utrecht Centraal', { ...fallbackWorkWalk, from: work, to: 'Utrecht Centraal' }),
    getWalkingLeg('Almere Centrum', home, { ...fallbackHomeWalk, from: 'Almere Centrum', to: home }),
    getWeatherRisk(),
    getEmailAlerts(),
    getDrivingRoute(drivingFrom, drivingTo),
  ]);

  const fallbackTrain = outbound ? fallbackOutboundTrain : fallbackReturnTrain;
  const train = await getTrainLeg(fallbackTrain, direction);
  const first = outbound ? homeToStation : workToStation;
  const last = outbound ? stationToWork : stationToHome;
  const commuteRequired = direction !== 'none';
  const targetBuffer = commuteRequired ? 12 : 0;
  const bufferMinutes = Math.max(0, targetBuffer - train.delayedMinutes - weather.addedWalkingMinutes);
  const risk = commuteRequired ? calculateRisk(bufferMinutes, train.delayedMinutes, weather.severe, train.cancelled) : 'GREEN';
  const liveSources = [first.source, last.source, train.source, weather.source].filter((value) => value === 'live').length;
  const confidence = commuteRequired ? confidenceScore(bufferMinutes, risk, liveSources) : 99;
  const journeyMinutes = first.durationMinutes + (train.durationMinutes ?? 46) + last.durationMinutes + targetBuffer + weather.addedWalkingMinutes;
  const notificationRelevant = isNotificationRelevant(activeShift, direction, journeyMinutes);
  const decision = !commuteRequired
    ? 'No commute action required for OFF Day, Rest Day, or Vacation.'
    : train.cancelled
      ? 'Planned NS service is cancelled. Use the fastest direct alternative, then the best one-transfer option via Hilversum or Weesp.'
      : risk === 'RED'
        ? 'Arrival is threatened. Leave earlier and switch to the fastest viable NS alternative.'
        : risk === 'AMBER'
          ? 'Plan remains viable, but monitor NS platform and delay changes closely.'
          : `${outbound ? 'Outbound' : 'Return'} plan is stable; preserve the 10–15 minute buffer.`;

  const googleReady = googleAuthConfigured();
  return {
    generatedAt: new Date().toISOString(), roster, currentShift, nextDuty, direction, notificationRelevant,
    walking: { first, last, outboundHome: homeToStation, outboundWork: stationToWork }, train, driving, weather, emails,
    integrations: [
      status('Google Calendar', roster === fallbackRoster ? 'fallback' : 'live', googleReady ? 'Renewable OAuth configured; roster-first mission selection enabled.' : 'Connect Google Calendar for live roster selection.'),
      status('Google Maps', first.source === 'live' && last.source === 'live' ? 'live' : 'fallback', process.env.GOOGLE_MAPS_API_KEY ? 'Routes API is primary for walking, traffic-aware driving ETA, and alternative routes.' : 'Set GOOGLE_MAPS_API_KEY for live walking and driving intelligence.'),
      status('Road Traffic', driving.source, driving.source === 'live' ? `Traffic-aware ETA active; ${driving.alternateRoutes} alternate route(s) available.` : 'Live driving ETA unavailable; Waze remains the navigation fallback.'),
      status('Waze', 'live', 'Deep-link navigation enabled; Waze supplies in-app incidents, hazards, and rerouting.'),
      status('NS', train.source, process.env.NS_API_KEY ? 'Official NS journey data is primary; direct services are preferred.' : 'Set NS_API_KEY. Baseline uses 21:51–22:37, platform 2 → 1.'),
      status('9292', 'fallback', 'Backup reference when official NS journey data is unavailable.'),
      status('Weather', weather.source, 'Live weather adds walking or driving caution for rain, wind, snow, or severe conditions.'),
      status('Gmail', googleReady ? 'live' : 'fallback', googleReady ? 'Renewable OAuth configured; actionable messages enabled.' : 'Set Google OAuth credentials for Gmail alerts.'),
    ],
    bufferMinutes, risk, mission: missionState(risk), confidence, decision,
  };
}
