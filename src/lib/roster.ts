import type { Shift, ShiftLabel } from './types';
const OFF_CODES = new Set(['R', '-', '--']);
export function classifyShift(code: string, start?: string, end?: string): ShiftLabel {
  const normalized = code.trim().toUpperCase();
  if (normalized === 'VL') return 'Vacation';
  if (OFF_CODES.has(normalized)) return 'OFF Day';
  if (start === '15:00' && end === '23:05') return 'Late Shift';
  if (start === '23:00' && end === '07:05') return 'Night Shift';
  return 'Unknown';
}
export function makeShift(input: Omit<Shift, 'label' | 'commuteRequired'>): Shift {
  const label = classifyShift(input.code, input.start, input.end);
  return { ...input, label, commuteRequired: label === 'Late Shift' || label === 'Night Shift' };
}
export function nextActualDuty(items: Shift[]): Shift | undefined { return items.find((item) => item.commuteRequired); }
