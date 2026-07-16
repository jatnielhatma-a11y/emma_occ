import type { AccountingDuty } from "./accounting";

export type DutyCodeDefinition = {
  code: string;
  label: string;
  description: string;
  category: "working" | "off" | "reserve" | "vacation" | "custom" | "service";
  aliases: string[];
};

const SERVICE_DUTY_CODES: DutyCodeDefinition[] = [
  ["110L", "LMP 1"],
  ["111L", "LMP 2"],
  ["120L", "LMP 1"],
  ["121L", "LMP 2"],
  ["130L", "LMP 1"],
  ["340H", "Oost Mcn"],
  ["341H", "Oost Hc"],
  ["342A", "Asd - Flevo Mcn"],
  ["343A", "Asd - Flevo Hc"],
  ["344G", "NH - Hfdo Mcn"],
  ["345G", "NH - Hfdo Hc"],
  ["346R", "Rtd Mcn"],
  ["347R", "Rtd Hc"],
  ["348E", "Zuid Mcn"],
  ["349E", "Zuid Hc"],
  ["350U", "Ut Mcn"],
  ["351U", "Ut Hc"],
  ["352N", "Noord Mcn"],
  ["353N", "Noord Hc"],
  ["354X", "Gvc - Ledn Mcn"],
  ["355X", "Gvc - Ledn Hc"],
  ["360H", "Oost Mcn"],
  ["361H", "Oost Hc"],
  ["362A", "Asd - Flevo Mcn"],
  ["363A", "Asd - Flevo Hc"],
  ["364G", "NH - Hfdo Mcn"],
  ["365G", "NH - Hfdo Hc"],
  ["366R", "Rtd Mcn"],
  ["367R", "Rtd Hc"],
  ["368E", "Zuid Mcn"],
  ["369E", "Zuid Hc"],
  ["370U", "Ut Mcn"],
  ["371U", "Ut Hc"],
  ["372N", "Noord Mcn"],
  ["373N", "Noord Hc"],
  ["374X", "Gvc - Ledn Mcn"],
  ["375X", "Gvc - Ledn Hc"],
  ["380H", "Zuid + Ut Mcn"],
  ["381A", "Asd - NH Hc"],
  ["382G", "Asd - NH Mcn"],
  ["383R", "Rtd - Gvc Mcn"],
  ["384E", "Zuid + Ut Hc"],
  ["385U", "Noord + Oost Hc"],
  ["386N", "Noord + Oost Mcn"],
  ["387X", "Rtd - Gvc Hc"]
].map(([code, label]) => ({
  code,
  label,
  description: `Operational service code from the June 24, 2026 duty-code reference table: ${label}.`,
  category: "service" as const,
  aliases: []
}));

export const DUTY_CODE_CATALOG: DutyCodeDefinition[] = [
  ...SERVICE_DUTY_CODES,
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
    aliases: ["N", "NIGHT SHIFT", "NACHT"]
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
    if (definition.category === "service" && label.toLowerCase().includes(definition.label.toLowerCase()) && label.toLowerCase() !== definition.label.toLowerCase()) {
      return `${displayCode} - ${label}: ${definition.description}`;
    }
    return `${displayCode} - ${definition.label}: ${definition.description}`;
  }

  if (!code || code.toLowerCase() === label.toLowerCase()) return `${label}: Custom roster duty. Confirm against Google Calendar when times or labels change.`;
  return `${code} - ${label}: Custom roster duty. Confirm against Google Calendar when times or labels change.`;
}

export function canonicalDutyLabel(codeOrLabel: string | null | undefined, fallback = "Custom Duty") {
  return findDutyCodeDefinition(codeOrLabel)?.label ?? fallback;
}
