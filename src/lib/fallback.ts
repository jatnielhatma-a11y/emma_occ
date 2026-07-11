import { makeShift } from './roster';
import type { EmailAlert, TrainLeg, WalkingLeg, WeatherRisk } from './types';
export const fallbackRoster = [
  makeShift({ date: 'Today', code: '382G', detail: 'Asd - NH Mcn', start: '23:00', end: '07:05' }),
  makeShift({ date: 'Tomorrow', code: '385U', detail: 'Noord + Oost Hc', start: '23:00', end: '07:05' }),
  makeShift({ date: 'Sunday', code: '386N', detail: 'Noord + Oost Mcn', start: '23:00', end: '07:05' }),
  makeShift({ date: 'Monday', code: 'R', detail: 'Rest Day' }),
  makeShift({ date: 'Tuesday', code: 'VL', detail: 'Vacation' }),
];
export const fallbackHomeWalk: WalkingLeg = { from: 'Lemmerstraat 18, Almere', to: 'Almere Centrum', durationMinutes: 18, distanceMeters: 1400, source: 'fallback' };
export const fallbackWorkWalk: WalkingLeg = { from: 'Utrecht Centraal', to: 'Admiraal Helfrichlaan 1, Utrecht', durationMinutes: 20, distanceMeters: 1600, source: 'fallback' };
export const fallbackTrain: TrainLeg = { from: 'Almere Centrum', to: 'Utrecht Centraal', departure: '21:51', arrival: '22:36', direct: true, delayedMinutes: 0, cancelled: false, source: 'fallback' };
export const fallbackWeather: WeatherRisk = { severe: false, precipitationMm: 0, windKph: 12, addedWalkingMinutes: 0, source: 'fallback' };
export const fallbackEmails: EmailAlert[] = [];
