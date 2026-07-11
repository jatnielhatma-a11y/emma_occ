import type { MissionState, Risk } from './types';
export function calculateRisk(bufferMinutes: number, delayedMinutes: number, severeWeather: boolean, cancelled: boolean): Risk {
  if (cancelled || delayedMinutes >= 8 || bufferMinutes <= 0) return 'RED';
  if (severeWeather || delayedMinutes >= 3 || bufferMinutes < 10) return 'AMBER';
  return 'GREEN';
}
export function missionState(risk: Risk): MissionState {
  if (risk === 'RED') return 'DELAYED';
  if (risk === 'AMBER') return 'AT RISK';
  return 'ON SCHEDULE';
}
export function confidenceScore(bufferMinutes: number, risk: Risk, liveSources: number): number {
  const riskPenalty = risk === 'RED' ? 35 : risk === 'AMBER' ? 15 : 0;
  const bufferBonus = Math.min(Math.max(bufferMinutes, 0), 15);
  const sourceBonus = Math.min(liveSources * 4, 16);
  return Math.max(20, Math.min(99, 68 + bufferBonus + sourceBonus - riskPenalty));
}
