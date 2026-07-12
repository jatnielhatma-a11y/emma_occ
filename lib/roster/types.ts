export type DutyLabel = "Night Shift" | "Late Shift" | "OFF Day" | "Custom Duty" | string;

export type NormalizedDuty = {
  date: string;
  startTime: string;
  endTime: string;
  originalDutyCode: string;
  dutyLabel: DutyLabel;
  location: string;
  notes: string;
  sourceFile: string;
  sourceRow: number | null;
  isOff: boolean;
  isOvernight: boolean;
};

export type ConflictSeverity = "Low" | "Medium" | "High" | "Critical";

export type RosterConflict = {
  severity: ConflictSeverity;
  conflictType: string;
  title: string;
  detail: string;
  duty?: NormalizedDuty;
};

export type ImportComparison = {
  added: NormalizedDuty[];
  changed: Array<{ before: NormalizedDuty; after: NormalizedDuty }>;
  removed: NormalizedDuty[];
  dateRange: {
    start: string | null;
    end: string | null;
  };
};
