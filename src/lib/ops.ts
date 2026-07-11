export type Risk = 'GREEN' | 'AMBER' | 'RED';
export type MissionState = 'ON SCHEDULE' | 'AT RISK' | 'DELAYED';

export type Shift = {
  date: string;
  label: 'Late Shift' | 'Night Shift' | 'OFF Day' | 'Vacation';
  code: string;
  detail: string;
  start?: string;
  end?: string;
};

export const roster: Shift[] = [
  { date: 'Today', label: 'Night Shift', code: '382G', detail: 'Asd - NH Mcn', start: '23:00', end: '07:05' },
  { date: 'Tomorrow', label: 'Night Shift', code: '385U', detail: 'Noord + Oost Hc', start: '23:00', end: '07:05' },
  { date: 'Sunday', label: 'Night Shift', code: '386N', detail: 'Noord + Oost Mcn', start: '23:00', end: '07:05' },
  { date: 'Monday', label: 'OFF Day', code: 'R', detail: 'Rest Day' },
  { date: 'Tuesday', label: 'Vacation', code: 'VL', detail: 'Vacation' },
];

export const timeline = [
  { time: '21:51', event: 'Depart Almere Centrum', state: 'complete' },
  { time: '22:36', event: 'Arrive Utrecht Centraal', state: 'current' },
  { time: '22:36–22:56', event: 'Walk to Admiraal Helfrichlaan 1', state: 'planned' },
  { time: '22:56', event: 'Estimated arrival at work', state: 'target' },
  { time: '23:00', event: 'Shift starts', state: 'target' },
];

export function getRisk(bufferMinutes: number, delayMinutes: number): Risk {
  if (delayMinutes >= 8 || bufferMinutes <= 0) return 'RED';
  if (delayMinutes >= 3 || bufferMinutes < 10) return 'AMBER';
  return 'GREEN';
}

export function getMissionState(risk: Risk): MissionState {
  if (risk === 'RED') return 'DELAYED';
  if (risk === 'AMBER') return 'AT RISK';
  return 'ON SCHEDULE';
}
