import { fallbackHomeWalk, fallbackRoster, fallbackTrain, fallbackWorkWalk } from './fallback';
import { getRoster } from './providers/calendar';
import { getEmailAlerts } from './providers/gmail';
import { googleAuthConfigured } from './providers/google-auth';
import { getWalkingLeg } from './providers/maps';
import { getTrainLeg } from './providers/ns';
import { getWeatherRisk } from './providers/weather';
import { nextActualDuty } from './roster';
import { calculateRisk, confidenceScore, missionState } from './risk';
import type { IntegrationStatus, OpsSnapshot, Shift } from './types';

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

export async function buildOpsSnapshot(): Promise<OpsSnapshot> {
  const [roster, outboundHome, outboundWork, train, weather, emails] = await Promise.all([
    getRoster(),
    getWalkingLeg('Lemmerstraat 18, Almere', 'Almere Centrum', fallbackHomeWalk),
    getWalkingLeg('Utrecht Centraal', 'Admiraal Helfrichlaan 1, Utrecht', fallbackWorkWalk),
    getTrainLeg(fallbackTrain),
    getWeatherRisk(),
    getEmailAlerts(),
  ]);

  const currentShift = currentRosterStatus(roster);
  const nextDuty = nextActualDuty(roster);
  const commuteRequired = Boolean(currentShift?.commuteRequired || nextDuty?.commuteRequired);
  const targetBuffer = commuteRequired ? 12 : 0;
  const bufferMinutes = Math.max(0, targetBuffer - train.delayedMinutes - weather.addedWalkingMinutes);
  const risk = commuteRequired
    ? calculateRisk(bufferMinutes, train.delayedMinutes, weather.severe, train.cancelled)
    : 'GREEN';
  const liveSources = [outboundHome.source, outboundWork.source, train.source, weather.source]
    .filter((value) => value === 'live').length;
  const confidence = commuteRequired ? confidenceScore(bufferMinutes, risk, liveSources) : 99;
  const decision = !commuteRequired
    ? 'No commute action required for OFF Day or Vacation.'
    : train.cancelled
      ? 'Planned train cancelled. Take the fastest NS alternative immediately.'
      : risk === 'RED'
        ? 'Arrival is threatened. Leave earlier or use the fastest recovery option.'
        : risk === 'AMBER'
          ? 'Plan remains viable, but monitor closely and avoid unnecessary stops.'
          : 'Continue as planned; the protected arrival buffer is intact.';

  const googleReady = googleAuthConfigured();
  return {
    generatedAt: new Date().toISOString(), roster, currentShift, nextDuty,
    walking: { outboundHome, outboundWork }, train, weather, emails,
    integrations: [
      status('Google Calendar', roster === fallbackRoster ? 'fallback' : 'live', googleReady ? 'Renewable OAuth configured; live roster enabled.' : 'Set Google client, secret, and refresh token.'),
      status('Google Maps', outboundHome.source === 'live' && outboundWork.source === 'live' ? 'live' : 'fallback', process.env.GOOGLE_MAPS_API_KEY ? 'Routes API configured.' : 'Set GOOGLE_MAPS_API_KEY for live walking times.'),
      status('NS', train.source, process.env.NS_API_KEY ? 'NS API configured.' : 'Set NS_API_KEY for live trains and platforms.'),
      status('Weather', weather.source, 'Open-Meteo live weather with a 10-minute cache.'),
      status('Gmail', googleReady ? 'live' : 'fallback', googleReady ? 'Renewable OAuth configured; actionable messages enabled.' : 'Set Google OAuth credentials for Gmail alerts.'),
    ],
    bufferMinutes, risk, mission: missionState(risk), confidence, decision,
  };
}
