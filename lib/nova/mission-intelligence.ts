import { z } from "zod";

export const missionFocusSchema = z.enum([
  "mission_priorities",
  "predictive_windows",
  "voice_command",
  "command_router",
  "automation_drafts",
  "trend_intelligence",
  "next_best_action",
  "incident_learning"
]);

export const missionStatusSchema = z.enum(["ready", "monitoring", "needs-review", "paused"]);
export const missionFreshnessSchema = z.enum(["live", "recent", "manual", "fallback"]);
export const missionImpactSchema = z.enum(["low", "medium", "high"]);

export const missionRecordSchema = z.object({
  focus: missionFocusSchema,
  title: z.string().trim().min(1).max(180),
  detail: z.string().trim().max(2500).default(""),
  status: missionStatusSchema.default("monitoring"),
  impact: missionImpactSchema.default("medium"),
  sourceFreshness: missionFreshnessSchema.default("manual"),
  requiresApproval: z.boolean().default(true),
  approvalGranted: z.boolean().default(false),
  storesTranscript: z.boolean().default(false),
  explicitConsent: z.boolean().default(false),
  externalAction: z.boolean().default(false),
  reviewedAt: z.string().trim().max(40).optional().nullable()
});

export const missionCommandIntentSchema = z.enum([
  "daily_brief",
  "start_mission",
  "next_duty",
  "commute_status",
  "calendar_review",
  "notifications",
  "settings",
  "optimization",
  "privacy_review",
  "help",
  "unknown"
]);

export type MissionFocus = z.infer<typeof missionFocusSchema>;
export type MissionRecord = z.input<typeof missionRecordSchema>;
export type MissionCommandIntent = z.infer<typeof missionCommandIntentSchema>;

export type MissionCommandResult = {
  intent: MissionCommandIntent;
  label: string;
  response: string;
  route?: string;
  action?: "start_current_mission";
  direction?: "outbound" | "return";
  confidence: number;
  requiresConfirmation: boolean;
  safety: "local-route" | "advisory" | "review-required";
};

export const release9RequiredFocuses: MissionFocus[] = [
  "mission_priorities",
  "predictive_windows",
  "voice_command",
  "command_router",
  "automation_drafts",
  "trend_intelligence",
  "next_best_action",
  "incident_learning"
];

export function missionGuardrail(record: Pick<MissionRecord, "externalAction" | "requiresApproval" | "approvalGranted" | "storesTranscript" | "explicitConsent" | "sourceFreshness" | "impact" | "status">) {
  if (record.externalAction && !record.requiresApproval) return "approval-required";
  if (record.storesTranscript && !record.explicitConsent) return "transcript-consent-required";
  if (record.sourceFreshness === "fallback" && record.impact === "high") return "fresh-source-required";
  if (record.status === "paused") return "paused-for-review";
  if (record.status === "needs-review") return "human-review-required";
  if (record.externalAction && record.requiresApproval && !record.approvalGranted) return "protected-draft";
  return "mission-ready";
}

export function buildRelease9MissionSummary(records: MissionRecord[]) {
  const parsed = records.map((record) => missionRecordSchema.parse(record));
  const covered = new Set(parsed.map((record) => record.focus));
  const guardrails = parsed.map((record) => missionGuardrail(record));
  const blockers = guardrails.filter((item) => item !== "mission-ready" && item !== "protected-draft");
  const readyCount = parsed.filter((record) => record.status === "ready").length;
  const allFocusesCovered = release9RequiredFocuses.every((focus) => covered.has(focus));
  const transcriptStorageDisabled = parsed.every((record) => !record.storesTranscript);
  const externalActionsRequireApproval = parsed.filter((record) => record.externalAction).every((record) => record.requiresApproval);

  return {
    totalRecords: parsed.length,
    requiredFocusCount: release9RequiredFocuses.length,
    coveredFocusCount: covered.size,
    allFocusesCovered,
    readyCount,
    blockers: blockers.length,
    transcriptStorageDisabled,
    externalActionsRequireApproval,
    status:
      blockers.length > 0
        ? "review-required"
        : allFocusesCovered && transcriptStorageDisabled && externalActionsRequireApproval
          ? "voice-ready"
          : "monitoring",
    autonomyMode: blockers.length === 0 ? "advisory-autonomy" : "guarded-review"
  };
}

export function classifyMissionCommand(transcript: string): MissionCommandResult {
  const normalized = transcript.trim().toLowerCase();
  const has = (...terms: string[]) => terms.some((term) => normalized.includes(term));

  if (!normalized) {
    return unknownCommand("I did not hear a command. Tap the microphone and try again.");
  }

  if (has("help", "what can you do", "commands")) {
    return {
      intent: "help",
      label: "Voice command help",
      response: "You can ask for your daily brief, next duty, commute status, calendar, alerts, settings, privacy, or optimization.",
      confidence: 0.94,
      requiresConfirmation: false,
      safety: "advisory"
    };
  }

  if (has("brief", "mission brief", "daily plan", "start my day")) {
    return routeCommand("daily_brief", "Daily brief", "Opening your Mission Control brief.", "/dashboard", 0.93);
  }

  if (
    has("start current mission", "start mission", "begin mission", "start commute", "begin commute", "activate mission") ||
    ((has("start", "begin", "activate") && has("mission", "commute")))
  ) {
    const direction = has("home", "return", "back") ? "return" : "outbound";
    return {
      intent: "start_mission",
      label: "Start current mission",
      response: direction === "return" ? "Starting your return mission and opening commute control." : "Starting your outbound mission and opening commute control.",
      route: "/commute",
      action: "start_current_mission",
      direction,
      confidence: 0.95,
      requiresConfirmation: false,
      safety: "local-route"
    };
  }

  if (has("next duty", "next shift", "today's duty", "todays duty", "roster", "emma occ")) {
    return routeCommand("next_duty", "Next duty", "Opening Emma OCC duty status.", "/dashboard#emma-occ", 0.91);
  }

  if (has("commute", "train", "ns", "platform", "route", "travel home", "travel to work")) {
    return routeCommand("commute_status", "Commute status", "Opening commute intelligence and NS route options.", "/commute", 0.92);
  }

  if (has("calendar", "schedule", "agenda", "appointment")) {
    return routeCommand("calendar_review", "Calendar review", "Opening calendar sync and schedule review.", "/calendar-sync", 0.89);
  }

  if (has("alert", "notification", "warning", "alarm")) {
    return routeCommand("notifications", "Notifications", "Opening active alerts.", "/notifications", 0.89);
  }

  if (has("setting", "preference", "configure")) {
    return routeCommand("settings", "Settings", "Opening NOVA settings.", "/settings", 0.88);
  }

  if (has("optimize", "optimization", "improve", "feedback")) {
    return routeCommand("optimization", "Optimization", "Opening release optimization loops.", "/optimization", 0.88);
  }

  if (has("privacy", "memory", "delete location", "delete my location", "data")) {
    return routeCommand("privacy_review", "Privacy review", "Opening privacy and launch controls.", "/production-readiness", 0.87);
  }

  return unknownCommand("I heard you, but I could not match that to a safe NOVA command yet.");
}

function routeCommand(intent: Exclude<MissionCommandIntent, "help" | "unknown">, label: string, response: string, route: string, confidence: number): MissionCommandResult {
  return {
    intent,
    label,
    response,
    route,
    confidence,
    requiresConfirmation: false,
    safety: "local-route"
  };
}

function unknownCommand(response: string): MissionCommandResult {
  return {
    intent: "unknown",
    label: "Unknown command",
    response,
    confidence: 0.24,
    requiresConfirmation: true,
    safety: "review-required"
  };
}

export function release9SeedRecords(reviewedAt = new Date().toISOString()): MissionRecord[] {
  return [
    {
      focus: "mission_priorities",
      title: "Mission priorities",
      detail: "Rank duty readiness, commute reliability, calendar conflicts, family context, and urgent alerts before softer recommendations.",
      status: "ready",
      impact: "high",
      sourceFreshness: "recent",
      requiresApproval: false,
      reviewedAt
    },
    {
      focus: "predictive_windows",
      title: "Predictive windows",
      detail: "Surface watch windows for commute delays, weather risk, late shifts, night shifts, and calendar conflicts.",
      status: "monitoring",
      impact: "high",
      sourceFreshness: "recent",
      requiresApproval: true,
      approvalGranted: false,
      externalAction: true,
      reviewedAt
    },
    {
      focus: "voice_command",
      title: "Push-to-talk voice command",
      detail: "Enable a NOVA voice control surface with browser speech recognition, optional spoken replies, and no background listening.",
      status: "ready",
      impact: "medium",
      sourceFreshness: "live",
      requiresApproval: false,
      storesTranscript: false,
      explicitConsent: false,
      reviewedAt
    },
    {
      focus: "command_router",
      title: "Command router",
      detail: "Map brief, duty, commute, calendar, notification, settings, privacy, and optimization commands to trusted NOVA routes.",
      status: "ready",
      impact: "medium",
      sourceFreshness: "live",
      requiresApproval: false,
      reviewedAt
    },
    {
      focus: "automation_drafts",
      title: "Automation drafts",
      detail: "Prepare suggested actions but require confirmation before changing calendar, email, notification, commute, or memory state.",
      status: "monitoring",
      impact: "high",
      sourceFreshness: "manual",
      requiresApproval: true,
      approvalGranted: false,
      externalAction: true,
      reviewedAt
    },
    {
      focus: "trend_intelligence",
      title: "Trend intelligence",
      detail: "Review commute, duty, notification, and recommendation patterns without storing raw private provider data in voice logs.",
      status: "monitoring",
      impact: "medium",
      sourceFreshness: "recent",
      requiresApproval: true,
      reviewedAt
    },
    {
      focus: "next_best_action",
      title: "Next-best action",
      detail: "Prioritize the safest visible next step while keeping high-impact actions advisory until the user approves them.",
      status: "ready",
      impact: "high",
      sourceFreshness: "recent",
      requiresApproval: true,
      approvalGranted: false,
      externalAction: true,
      reviewedAt
    },
    {
      focus: "incident_learning",
      title: "Incident learning",
      detail: "Convert missed-train, delay, platform-change, weather, and route-closure outcomes into reviewable improvement notes.",
      status: "monitoring",
      impact: "high",
      sourceFreshness: "manual",
      requiresApproval: true,
      reviewedAt
    }
  ];
}
