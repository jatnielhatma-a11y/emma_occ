import type { ImportComparison, NormalizedDuty, RosterConflict } from "./types";

export function addDays(date: string, days: number): string;
export function buildCalendarFingerprint(duty: NormalizedDuty): string;
export function classifyDuty(input: Record<string, unknown>): NormalizedDuty;
export function compareImports(previousDuties: NormalizedDuty[], nextDuties: NormalizedDuty[]): ImportComparison;
export function detectConflicts(duties: NormalizedDuty[], options?: Record<string, number>): RosterConflict[];
export function normalizeDate(value: unknown): string;
export function parseCsv(text: string): Array<Record<string, string | number>>;
export function parseRosterText(text: string, sourceFile?: string): NormalizedDuty[];
export function parseTimeToMinutes(value: unknown): number | null;
export function summarizeDuties(
  duties: NormalizedDuty[],
  conflicts?: RosterConflict[]
): {
  totalDuties: number;
  workingHours: number;
  restDays: number;
  nightShifts: number;
  lateShifts: number;
  conflicts: number;
};
export function workingMinutes(duty: NormalizedDuty): number;
