import type { NovaDailyBrief, NovaRisk } from "@/lib/ai/types";
import type { NotificationPreferences } from "@/lib/settings/preferences";

export type NotificationEventType =
  | "leave_home"
  | "return_trip"
  | "delay_or_cancellation"
  | "platform_change"
  | "traffic_incident"
  | "severe_weather"
  | "buffer_risk"
  | "calendar_change"
  | "missed_departure_risk"
  | "arrival"
  | "gps_permission_lost"
  | "integration_failure"
  | "daily_brief"
  | "manual";

export type NotificationDecision = {
  shouldNotify: boolean;
  status: "pending" | "suppressed";
  reason: string | null;
  cooldownUntil: string | null;
  dedupeWindowMinutes: number;
};

export type NotificationCandidate = {
  eventType: NotificationEventType;
  severity: NovaRisk;
  title: string;
  body: string;
  actionLabel?: string | null;
  actionUrl?: string | null;
  dedupeKey?: string | null;
  sourceTable?: string | null;
  sourceId?: string | null;
};

function minutesFromTime(value: string) {
  const [hours, minutes] = value.split(":").map(Number);
  return hours * 60 + minutes;
}

export function isWithinQuietHours(now: Date, preferences: Pick<NotificationPreferences, "quietHoursStart" | "quietHoursEnd">) {
  const formatter = new Intl.DateTimeFormat("en-GB", {
    hour: "2-digit",
    minute: "2-digit",
    hourCycle: "h23",
    timeZone: process.env.APP_TIMEZONE || "Europe/Amsterdam"
  });
  const current = minutesFromTime(formatter.format(now));
  const start = minutesFromTime(preferences.quietHoursStart);
  const end = minutesFromTime(preferences.quietHoursEnd);
  if (start === end) return false;
  return start < end ? current >= start && current < end : current >= start || current < end;
}

function typeEnabled(eventType: NotificationEventType, preferences: NotificationPreferences) {
  if (eventType === "delay_or_cancellation") return preferences.delayOrCancellation;
  if (eventType === "platform_change") return preferences.platformChange;
  if (eventType === "severe_weather") return preferences.severeWeather;
  if (eventType === "integration_failure") return preferences.integrationFailure;
  if (eventType === "leave_home") return preferences.leaveHome;
  if (eventType === "return_trip") return preferences.returnTrip;
  if (eventType === "calendar_change") return preferences.syncFailures;
  return true;
}

export function decideNotification(input: {
  candidate: Pick<NotificationCandidate, "eventType" | "severity">;
  preferences: NotificationPreferences;
  now?: Date;
  recentDuplicateCreatedAt?: string | null;
  cooldownMinutes?: number;
}): NotificationDecision {
  const now = input.now ?? new Date();
  const cooldownMinutes = input.cooldownMinutes ?? 45;

  if (!typeEnabled(input.candidate.eventType, input.preferences)) {
    return { shouldNotify: false, status: "suppressed", reason: "Notification type is disabled.", cooldownUntil: null, dedupeWindowMinutes: cooldownMinutes };
  }

  if (input.candidate.severity === "green") {
    return { shouldNotify: false, status: "suppressed", reason: "No action required for green status.", cooldownUntil: null, dedupeWindowMinutes: cooldownMinutes };
  }

  if (input.recentDuplicateCreatedAt) {
    const duplicateAgeMs = now.getTime() - new Date(input.recentDuplicateCreatedAt).getTime();
    if (duplicateAgeMs < cooldownMinutes * 60_000) {
      const cooldownUntil = new Date(new Date(input.recentDuplicateCreatedAt).getTime() + cooldownMinutes * 60_000).toISOString();
      return { shouldNotify: false, status: "suppressed", reason: "Duplicate alert suppressed during cooldown.", cooldownUntil, dedupeWindowMinutes: cooldownMinutes };
    }
  }

  if (input.candidate.severity === "amber" && isWithinQuietHours(now, input.preferences)) {
    return {
      shouldNotify: false,
      status: "suppressed",
      reason: "Amber alert suppressed during quiet hours.",
      cooldownUntil: null,
      dedupeWindowMinutes: cooldownMinutes
    };
  }

  return { shouldNotify: true, status: "pending", reason: null, cooldownUntil: null, dedupeWindowMinutes: cooldownMinutes };
}

export function notificationFromDailyBrief(brief: NovaDailyBrief, sourceId?: string | null): NotificationCandidate {
  const firstAction = brief.recommendations[0];
  return {
    eventType: "daily_brief",
    severity: brief.status,
    title: brief.title,
    body: firstAction ? `${brief.summary} ${firstAction.action}` : brief.summary,
    actionLabel: firstAction ? "Open Mission Control" : null,
    actionUrl: "/dashboard",
    dedupeKey: `daily-brief-${sourceId ?? brief.title}-${brief.status}`,
    sourceTable: "ai_briefs",
    sourceId
  };
}
