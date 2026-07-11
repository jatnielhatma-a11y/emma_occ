import { fallbackHomeWalk, fallbackRoster, fallbackTrain, fallbackWorkWalk } from './fallback';
import { getRoster } from './providers/calendar';
import { getEmailAlerts } from './providers/gmail';
import { getWalkingLeg } from './providers/maps';
import { getTrainLeg } from './providers/ns';
import { getWeatherRisk } from './providers/weather';
import { nextActualDuty } from './roster';
import { calculateRisk, confidenceScore, missionState } from './risk';
import type { IntegrationStatus, OpsSnapshot } from './types';

function status(name: string, source: 'live' | 'fallback' | 'unavailable', message: string): IntegrationStatus { return { name, source, message }; }

export async function buildOpsSnapshot(): Promise<OpsSnapshot> {
  const [roster, outboundHome, outboundWork, train, weather, emails] = await Promise.all([
    getRoster(),
    getWalkingLeg('Lemmerstraat 18, Almere', 'Almere Centrum', fallbackHomeWalk),
    getWalkingLeg('Utrecht Centraal', 'Admiraal Helfrichlaan 1, Utrecht', fallbackWorkWalk),
    getTrainLeg(fallbackTrain),
    getWeatherRisk(),
    getEmailAlerts(),
  ]);
  const nextDuty = nextActualDuty(roster);
  const currentShift = roster[0];
  const targetBuffer = 12;
  const bufferMinutes = Math.max(0, targetBuffer - train.delayedMinutes - weather.addedWalkingMinutes);
  const risk = calculateRisk(bufferMinutes, train.delayedMinutes, weather.severe, train.cancelled);
  const liveSources = [outboundHome.source, outboundWork.source, train.source, weather.source].filter((value) => value === 'live').length;
  const confidence = confidenceScore(bufferMinutes, risk, liveSources);
  const decision = train.cancelled ? 'Planned train cancelled. Take the fastest NS alternative immediately.' : risk === 'RED' ? 'Arrival is threatened. Leave earlier or use the fastest recovery option.' : risk === 'AMBER' ? 'Plan remains viable, but monitor closely and avoid unnecessary stops.' : 'Continue as planned; the protected arrival buffer is intact.';
  return {
    generatedAt: new Date().toISOString(), roster, currentShift, nextDuty,
    walking: { outboundHome, outboundWork }, train, weather, emails,
    integrations: [
      status('Google Calendar', roster === fallbackRoster ? 'fallback' : 'live', process.env.GOOGLE_ACCESS_TOKEN ? 'OAuth token configured; live attempt enabled.' : 'Set GOOGLE_ACCESS_TOKEN for live roster.'),
      status('Google Maps', outboundHome.source === 'live' && outboundWork.source === 'live' ? 'live' : 'fallback', process.env.GOOGLE_MAPS_API_KEY ? 'Routes API configured.' : 'Set GOOGLE_MAPS_API_KEY for live walking times.'),
      status('NS', train.source, process.env.NS_API_KEY ? 'NS API configured.' : 'Set NS_API_KEY for live trains and platforms.'),
      status('Weather', weather.source, 'Open-Meteo live weather with a 10-minute cache.'),
      status('Gmail', process.env.GOOGLE_ACCESS_TOKEN ? 'live' : 'fallback', process.env.GOOGLE_ACCESS_TOKEN ? 'OAuth token configured; actionable messages enabled.' : 'Set GOOGLE_ACCESS_TOKEN for Gmail alerts.'),
    ],
    bufferMinutes, risk, mission: missionState(risk), confidence, decision,
  };
}
