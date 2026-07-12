const OFF_CODES = new Set(["", "-", "rest", "off", "off day", "r"]);
const VACATION_CODES = new Set(["vl"]);

function normalizeText(value) {
  return String(value ?? "").trim();
}

function normalizeHeader(value) {
  return normalizeText(value).toLowerCase().replace(/[^a-z0-9]/g, "");
}

function parseTimeToMinutes(value) {
  const raw = normalizeText(value);
  if (!raw || raw === "-") return null;

  const compact = raw.replace(".", ":");
  const match = compact.match(/^(\d{1,2})(?::?(\d{2}))?$/);
  if (!match) return null;

  const hours = Number(match[1]);
  const minutes = Number(match[2] ?? "0");
  if (hours > 23 || minutes > 59) return null;

  return hours * 60 + minutes;
}

function minutesToTime(minutes) {
  if (minutes === null || minutes === undefined) return "";
  const safeMinutes = ((minutes % 1440) + 1440) % 1440;
  const hours = Math.floor(safeMinutes / 60);
  const mins = safeMinutes % 60;
  return `${String(hours).padStart(2, "0")}:${String(mins).padStart(2, "0")}`;
}

function normalizeDate(value) {
  const raw = normalizeText(value);
  if (!raw) return "";

  if (/^\d{4}-\d{2}-\d{2}$/.test(raw)) return raw;

  const slash = raw.match(/^(\d{1,2})[/-](\d{1,2})[/-](\d{2,4})$/);
  if (slash) {
    const day = slash[1].padStart(2, "0");
    const month = slash[2].padStart(2, "0");
    const year = slash[3].length === 2 ? `20${slash[3]}` : slash[3];
    return `${year}-${month}-${day}`;
  }

  const parsed = new Date(raw);
  if (!Number.isNaN(parsed.getTime())) {
    return parsed.toISOString().slice(0, 10);
  }

  return raw;
}

function addDays(date, days) {
  const next = new Date(`${date}T00:00:00.000Z`);
  next.setUTCDate(next.getUTCDate() + days);
  return next.toISOString().slice(0, 10);
}

function isOffDuty(dutyCode, dutyLabel, startTime, endTime) {
  const code = normalizeText(dutyCode).toLowerCase();
  const label = normalizeText(dutyLabel).toLowerCase();
  const noTimes = !normalizeText(startTime) && !normalizeText(endTime);
  return OFF_CODES.has(code) || VACATION_CODES.has(code) || (label.length > 0 && OFF_CODES.has(label)) || (code.length === 0 && noTimes);
}

function classifyDuty(input) {
  const dutyCode = normalizeText(input.dutyCode ?? input.originalDutyCode);
  const manualLabel = normalizeText(input.dutyLabel);
  const startMinutes = parseTimeToMinutes(input.startTime);
  const endMinutes = parseTimeToMinutes(input.endTime);
  const startTime = minutesToTime(startMinutes);
  const endTime = minutesToTime(endMinutes);
  const off = isOffDuty(dutyCode, manualLabel, input.startTime, input.endTime);
  const overnight = startMinutes !== null && endMinutes !== null && endMinutes <= startMinutes && !off;

  let dutyLabel = "Custom Duty";
  if (VACATION_CODES.has(dutyCode.toLowerCase()) || manualLabel.toLowerCase().includes("vacation") || manualLabel.toLowerCase().includes("verlof")) {
    dutyLabel = "Vacation";
  } else if (dutyCode === "*") {
    dutyLabel = manualLabel || "Reserve Duty";
  } else if (off) {
    dutyLabel = "OFF Day";
  } else if (startTime === "23:00" && endTime === "07:05") {
    dutyLabel = "Night Shift";
  } else if (startTime === "15:00" && endTime === "23:05") {
    dutyLabel = "Late Shift";
  } else if (manualLabel) {
    dutyLabel = manualLabel;
  }

  return {
    date: normalizeDate(input.date),
    startTime: off ? "" : startTime,
    endTime: off ? "" : endTime,
    originalDutyCode: dutyCode,
    dutyLabel,
    location: normalizeText(input.location),
    notes: normalizeText(input.notes),
    sourceFile: normalizeText(input.sourceFile),
    sourceRow: input.sourceRow ?? null,
    isOff: off,
    isOvernight: overnight
  };
}

function splitCsvLine(line) {
  const cells = [];
  let current = "";
  let inQuotes = false;

  for (let index = 0; index < line.length; index += 1) {
    const char = line[index];
    const next = line[index + 1];

    if (char === '"' && next === '"') {
      current += '"';
      index += 1;
    } else if (char === '"') {
      inQuotes = !inQuotes;
    } else if (char === "," && !inQuotes) {
      cells.push(current);
      current = "";
    } else {
      current += char;
    }
  }

  cells.push(current);
  return cells.map((cell) => cell.trim());
}

function parseCsv(text) {
  const lines = String(text ?? "")
    .replace(/\r\n/g, "\n")
    .replace(/\r/g, "\n")
    .split("\n")
    .filter((line) => line.trim().length > 0);

  if (lines.length === 0) return [];

  const headers = splitCsvLine(lines[0]).map(normalizeHeader);
  return lines.slice(1).map((line, rowIndex) => {
    const cells = splitCsvLine(line);
    const row = {};
    headers.forEach((header, index) => {
      row[header] = cells[index] ?? "";
    });
    row.__sourceRow = rowIndex + 2;
    return row;
  });
}

function valueFromRow(row, aliases) {
  for (const alias of aliases) {
    const key = normalizeHeader(alias);
    if (Object.prototype.hasOwnProperty.call(row, key)) {
      return row[key];
    }
  }
  return "";
}

function normalizeRosterRows(rows, sourceFile = "") {
  return rows
    .map((row) =>
      classifyDuty({
        date: valueFromRow(row, ["date", "duty date", "day"]),
        startTime: valueFromRow(row, ["start time", "start", "from"]),
        endTime: valueFromRow(row, ["end time", "end", "to"]),
        dutyCode: valueFromRow(row, ["duty code", "code", "duty"]),
        dutyLabel: valueFromRow(row, ["duty label", "label", "type"]),
        location: valueFromRow(row, ["location", "station", "base"]),
        notes: valueFromRow(row, ["notes", "remark", "remarks"]),
        sourceFile,
        sourceRow: row.__sourceRow
      })
    )
    .filter((duty) => duty.date);
}

function parseRosterText(text, sourceFile = "") {
  return normalizeRosterRows(parseCsv(text), sourceFile);
}

function dateTimeMs(duty, which) {
  const time = which === "start" ? duty.startTime : duty.endTime;
  if (!duty.date || !time) return null;

  const date = which === "end" && duty.isOvernight ? addDays(duty.date, 1) : duty.date;
  const value = new Date(`${date}T${time}:00.000Z`).getTime();
  return Number.isNaN(value) ? null : value;
}

function workingMinutes(duty) {
  if (duty.isOff) return 0;
  const start = dateTimeMs(duty, "start");
  const end = dateTimeMs(duty, "end");
  if (start === null || end === null) return 0;
  return Math.max(0, Math.round((end - start) / 60000));
}

function detectConflicts(duties, options = {}) {
  const minRestMinutes = options.minRestMinutes ?? 10 * 60;
  const maxWeeklyMinutes = options.maxWeeklyMinutes ?? 60 * 60;
  const conflicts = [];
  const sorted = [...duties].sort((a, b) => {
    const aStart = dateTimeMs(a, "start") ?? new Date(`${a.date}T00:00:00.000Z`).getTime();
    const bStart = dateTimeMs(b, "start") ?? new Date(`${b.date}T00:00:00.000Z`).getTime();
    return aStart - bStart;
  });

  const seen = new Map();
  for (const duty of sorted) {
    const key = [duty.date, duty.startTime, duty.endTime, duty.originalDutyCode].join("|");
    if (seen.has(key)) {
      conflicts.push({
        severity: "Medium",
        conflictType: "duplicate_duty",
        title: "Duplicate roster duty",
        detail: `${duty.date} appears more than once with the same code and times.`,
        duty
      });
    }
    seen.set(key, duty);

    if (!duty.isOff && (!duty.startTime || !duty.endTime)) {
      conflicts.push({
        severity: "High",
        conflictType: "missing_time",
        title: "Missing duty time",
        detail: `${duty.date} has a working duty without a start or end time.`,
        duty
      });
    }

    if (!duty.dutyLabel) {
      conflicts.push({
        severity: "Medium",
        conflictType: "missing_label",
        title: "Missing duty label",
        detail: `${duty.date} could not be labeled.`,
        duty
      });
    }

    if (duty.isOvernight) {
      conflicts.push({
        severity: "Low",
        conflictType: "overnight_duty",
        title: "Duty crosses midnight",
        detail: `${duty.date} ends on the following calendar day.`,
        duty
      });
    }
  }

  for (let index = 1; index < sorted.length; index += 1) {
    const previous = sorted[index - 1];
    const current = sorted[index];
    if (previous.isOff || current.isOff) continue;

    const previousEnd = dateTimeMs(previous, "end");
    const currentStart = dateTimeMs(current, "start");
    if (previousEnd === null || currentStart === null) continue;

    if (currentStart < previousEnd) {
      conflicts.push({
        severity: "Critical",
        conflictType: "overlapping_duties",
        title: "Overlapping duties",
        detail: `${current.date} starts before the previous duty ends.`,
        duty: current
      });
    } else if ((currentStart - previousEnd) / 60000 < minRestMinutes) {
      conflicts.push({
        severity: "High",
        conflictType: "too_little_rest",
        title: "Too little rest between shifts",
        detail: `${current.date} has less than ${Math.round(minRestMinutes / 60)} hours rest before duty.`,
        duty: current
      });
    }
  }

  const weeklyTotals = new Map();
  for (const duty of sorted) {
    const date = new Date(`${duty.date}T00:00:00.000Z`);
    if (Number.isNaN(date.getTime())) continue;
    const weekStart = new Date(date);
    weekStart.setUTCDate(date.getUTCDate() - ((date.getUTCDay() + 6) % 7));
    const weekKey = weekStart.toISOString().slice(0, 10);
    weeklyTotals.set(weekKey, (weeklyTotals.get(weekKey) ?? 0) + workingMinutes(duty));
  }

  for (const [weekKey, total] of weeklyTotals.entries()) {
    if (total > maxWeeklyMinutes) {
      conflicts.push({
        severity: "Critical",
        conflictType: "excessive_weekly_hours",
        title: "Excessive weekly working hours",
        detail: `Week of ${weekKey} totals ${Math.round(total / 60)} working hours.`
      });
    }
  }

  let consecutiveNights = 0;
  for (const duty of sorted) {
    consecutiveNights = duty.dutyLabel === "Night Shift" ? consecutiveNights + 1 : 0;
    if (consecutiveNights >= 3) {
      conflicts.push({
        severity: "High",
        conflictType: "multiple_nights_in_row",
        title: "Multiple night shifts in a row",
        detail: `${duty.date} is part of ${consecutiveNights} consecutive night shifts.`,
        duty
      });
    }
  }

  return conflicts;
}

function dutyComparisonKey(duty) {
  return duty.date;
}

function dutySignature(duty) {
  return [
    duty.startTime,
    duty.endTime,
    duty.originalDutyCode,
    duty.dutyLabel,
    duty.location,
    duty.notes
  ].join("|");
}

function compareImports(previousDuties, nextDuties) {
  const previous = new Map(previousDuties.map((duty) => [dutyComparisonKey(duty), duty]));
  const next = new Map(nextDuties.map((duty) => [dutyComparisonKey(duty), duty]));
  const changed = [];
  const added = [];
  const removed = [];
  const dates = [];

  for (const duty of nextDuties) {
    dates.push(duty.date);
    const oldDuty = previous.get(dutyComparisonKey(duty));
    if (!oldDuty) {
      added.push(duty);
    } else if (dutySignature(oldDuty) !== dutySignature(duty)) {
      changed.push({ before: oldDuty, after: duty });
    }
  }

  for (const duty of previousDuties) {
    dates.push(duty.date);
    if (!next.has(dutyComparisonKey(duty))) {
      removed.push(duty);
    }
  }

  const sortedDates = dates.filter(Boolean).sort();
  return {
    added,
    changed,
    removed,
    dateRange: {
      start: sortedDates[0] ?? null,
      end: sortedDates[sortedDates.length - 1] ?? null
    }
  };
}

function summarizeDuties(duties, conflicts = []) {
  const workingMinutesTotal = duties.reduce((total, duty) => total + workingMinutes(duty), 0);
  return {
    totalDuties: duties.length,
    workingHours: Math.round((workingMinutesTotal / 60) * 10) / 10,
    restDays: duties.filter((duty) => duty.isOff).length,
    nightShifts: duties.filter((duty) => duty.dutyLabel === "Night Shift").length,
    lateShifts: duties.filter((duty) => duty.dutyLabel === "Late Shift").length,
    conflicts: conflicts.length
  };
}

function buildCalendarFingerprint(duty) {
  return [
    duty.date,
    duty.startTime,
    duty.endTime,
    duty.dutyLabel,
    duty.originalDutyCode,
    duty.location
  ].join("|");
}

module.exports = {
  addDays,
  buildCalendarFingerprint,
  classifyDuty,
  compareImports,
  detectConflicts,
  normalizeDate,
  parseCsv,
  parseRosterText,
  parseTimeToMinutes,
  summarizeDuties,
  workingMinutes
};
