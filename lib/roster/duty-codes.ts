import type { AccountingDuty } from "./accounting";

export type DutyCodeDefinition = {
  code: string;
  label: string;
  description: string;
  category: "working" | "off" | "reserve" | "vacation" | "custom";
  aliases: string[];
};

export const DUTY_CODE_CATALOG: DutyCodeDefinition[] = [
  {
    code: "LATE",
    label: "Late Shift",
    description: "Late operational duty, normally 15:00-23:05 when roster times match the standard pattern.",
    category: "working",
    aliases: ["L", "LATE SHIFT", "AVOND", "LATE"]
  },
  {
    code: "NIGHT",
    label: "Night Shift",
    description: "Overnight operational duty, normally 23:00-07:05 when roster times match the standard pattern.",
    category: "working",
    aliases: ["N", "NIGHT SHIFT", "NACHT", "382G"]
  },
  {
    code: "OFF",
    label: "OFF Day",
    description: "Rostered non-working day with no duty hours.",
    category: "off",
    aliases: ["", "-", "OFF DAY", "REST", "REST DAY", "RUST"]
  },
  {
    code: "R",
    label: "OFF Day",
    description: "Roster rest day or released day with no planned working duty.",
    category: "off",
    aliases: ["R"]
  },
  {
    code: "*",
    label: "Reserve Duty",
    description: "Reserve or standby marker. Confirm the connected calendar event for the exact assignment and time.",
    category: "reserve",
    aliases: ["RESERVE", "STANDBY"]
  },
  {
    code: "VL",
    label: "Vacation",
    description: "Vacation or approved leave day. Counts as vacation in leave accounting.",
    category: "vacation",
    aliases: ["VAC", "VACATION", "VERLOF", "VAKANTIE", "ANNUAL LEAVE", "HOLIDAY"]
  }
];

function normalize(value: string | null | undefined) {
  return String(value ?? "").trim().toUpperCase();
}

function normalizedAliases(definition: DutyCodeDefinition) {
  return [definition.code, definition.label, ...definition.aliases].map(normalize);
}

export function findDutyCodeDefinition(codeOrLabel: string | null | undefined) {
  const normalized = normalize(codeOrLabel);
  if (!normalized) return null;
  return DUTY_CODE_CATALOG.find((definition) => normalizedAliases(definition).includes(normalized)) ?? null;
}

export function inferDutyCodeDefinition(duty: Pick<AccountingDuty, "duty_label" | "original_duty_code" | "start_time" | "end_time">) {
  const explicit = findDutyCodeDefinition(duty.original_duty_code) ?? findDutyCodeDefinition(duty.duty_label);
  if (explicit) return explicit;

  const start = duty.start_time?.slice(0, 5);
  const end = duty.end_time?.slice(0, 5);
  if (start === "15:00" && end === "23:05") return findDutyCodeDefinition("LATE");
  if (start === "23:00" && end === "07:05") return findDutyCodeDefinition("NIGHT");

  return null;
}

export function dutyCodeDescription(duty: Pick<AccountingDuty, "duty_label" | "original_duty_code" | "start_time" | "end_time">) {
  const code = (duty.original_duty_code ?? "").trim();
  const label = duty.duty_label.trim() || "Custom Duty";
  const definition = inferDutyCodeDefinition(duty);

  if (definition) {
    const displayCode = code || definition.code;
    return `${displayCode} - ${definition.label}: ${definition.description}`;
  }

  if (!code || code.toLowerCase() === label.toLowerCase()) return `${label}: Custom roster duty. Confirm against Google Calendar when times or labels change.`;
  return `${code} - ${label}: Custom roster duty. Confirm against Google Calendar when times or labels change.`;
}

export function canonicalDutyLabel(codeOrLabel: string | null | undefined, fallback = "Custom Duty") {
  return findDutyCodeDefinition(codeOrLabel)?.label ?? fallback;
}
