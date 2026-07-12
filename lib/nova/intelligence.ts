import { z } from "zod";
import type { NovaOperationalContext, NovaRisk } from "@/lib/ai/types";

export const intelligenceKindSchema = z.enum(["prediction", "recommendation", "context_signal", "automation_rule", "daily_ai_routine"]);
export const intelligenceStatusSchema = z.enum(["candidate", "reviewed", "approved", "paused", "completed", "archived"]);
export const intelligenceSourceTypeSchema = z.enum(["manual", "ai", "integration", "fallback"]);

export const intelligenceRecordSchema = z.object({
  kind: intelligenceKindSchema,
  title: z.string().trim().min(1).max(180),
  detail: z.string().trim().max(2500).default(""),
  domain: z.string().trim().min(1).max(80).default("operations"),
  status: intelligenceStatusSchema.default("candidate"),
  confidence: z.number().min(0).max(1).default(0.5),
  priority: z.number().int().min(1).max(5).default(3),
  risk: z.enum(["green", "amber", "red"]).default("green"),
  sourceType: intelligenceSourceTypeSchema.default("manual"),
  sourceRefs: z.array(z.string().trim().min(1).max(120)).max(12).default([]),
  automationEnabled: z.boolean().default(false),
  requiresConfirmation: z.boolean().default(true),
  nextRunAt: z.string().trim().max(40).optional().nullable(),
  metadata: z.record(z.unknown()).default({})
});

export const intelligenceRequestSchema = z.discriminatedUnion("action", [
  z.object({
    action: z.literal("addRecord"),
    record: intelligenceRecordSchema
  }),
  z.object({
    action: z.literal("archiveRecord"),
    id: z.string().uuid()
  })
]);

export type IntelligenceKind = z.infer<typeof intelligenceKindSchema>;
export type IntelligenceRecord = z.infer<typeof intelligenceRecordSchema>;
export type IntelligenceCounts = Record<IntelligenceKind, number>;

export const emptyIntelligenceCounts: IntelligenceCounts = {
  prediction: 0,
  recommendation: 0,
  context_signal: 0,
  automation_rule: 0,
  daily_ai_routine: 0
};

export function buildIntelligenceReadiness(counts: IntelligenceCounts) {
  const totalRecords = Object.values(counts).reduce((sum, count) => sum + count, 0);
  const activeLayerCount = Object.values(counts).filter((count) => count > 0).length;

  return {
    totalRecords,
    activeLayerCount,
    allLayersStarted: activeLayerCount === Object.keys(emptyIntelligenceCounts).length,
    recommendationStatus: counts.recommendation > 0 || counts.daily_ai_routine > 0 ? "advisory-ready" : "waiting-for-signals",
    automationStatus: counts.automation_rule > 0 ? "approval-required" : "manual-only"
  };
}

export function automationGuardrail(record: Pick<IntelligenceRecord, "kind" | "automationEnabled" | "requiresConfirmation">) {
  if (record.kind !== "automation_rule") return "not-automation";
  if (!record.automationEnabled) return "disabled-by-default";
  if (record.requiresConfirmation) return "manual-confirmation-required";
  return "blocked-unconfirmed-automation";
}

function riskWeight(risk: NovaRisk) {
  return risk === "green" ? 0 : risk === "amber" ? 1 : 2;
}

function confidenceLabel(confidence: number) {
  if (confidence >= 0.75) return "high";
  if (confidence >= 0.5) return "medium";
  return "low";
}

export function buildRelease4Recommendations(context: NovaOperationalContext): IntelligenceRecord[] {
  const records: IntelligenceRecord[] = [];

  records.push({
    kind: "context_signal",
    title: "Operational context assembled",
    detail: `${context.sources.length} source labels available; ${context.integrations.fallbackCount} fallback and ${context.integrations.unavailableCount} unavailable sources.`,
    domain: "operations",
    status: "reviewed",
    confidence: Math.max(0.25, Math.min(0.95, 1 - context.integrations.unavailableCount * 0.2 - context.integrations.fallbackCount * 0.1)),
    priority: context.integrations.unavailableCount ? 2 : 4,
    risk: context.integrations.unavailableCount ? "amber" : "green",
    sourceType: context.integrations.unavailableCount ? "fallback" : "integration",
    sourceRefs: context.sources.map((source) => source.label),
    automationEnabled: false,
    requiresConfirmation: true,
    nextRunAt: null,
    metadata: { generatedAt: context.generatedAt }
  });

  if (riskWeight(context.commute.status) > 0 || context.commute.confidence < 0.65) {
    records.push({
      kind: "recommendation",
      title: "Review commute before departure",
      detail: `${context.commute.recommendation}. Confidence is ${confidenceLabel(context.commute.confidence)}.`,
      domain: "commute",
      status: "candidate",
      confidence: context.commute.confidence,
      priority: context.commute.status === "red" ? 1 : 2,
      risk: context.commute.status,
      sourceType: context.commute.isLive ? "integration" : "fallback",
      sourceRefs: ["Route", "NS", "Google Maps"],
      automationEnabled: false,
      requiresConfirmation: true,
      nextRunAt: null,
      metadata: { routeLabel: context.commute.routeLabel, checkedAt: context.commute.checkedAt }
    });
  }

  if (!context.calendar.connected || context.conflicts.count > 0) {
    records.push({
      kind: "prediction",
      title: context.conflicts.count > 0 ? "Planning conflict risk" : "Calendar freshness risk",
      detail: context.conflicts.highest ?? context.calendar.lastSyncLabel,
      domain: "calendar",
      status: "candidate",
      confidence: context.calendar.connected ? 0.72 : 0.45,
      priority: context.conflicts.count > 0 ? 1 : 3,
      risk: context.conflicts.risk === "green" && !context.calendar.connected ? "amber" : context.conflicts.risk,
      sourceType: context.calendar.connected ? "integration" : "fallback",
      sourceRefs: ["Calendar", "Roster"],
      automationEnabled: false,
      requiresConfirmation: true,
      nextRunAt: null,
      metadata: { conflictCount: context.conflicts.count }
    });
  }

  records.push({
    kind: "daily_ai_routine",
    title: "Daily mission brief",
    detail: "Generate a daily brief from verified duty, commute, weather, calendar, and integration-health context.",
    domain: "daily-ai",
    status: "approved",
    confidence: 0.8,
    priority: 3,
    risk: "green",
    sourceType: "ai",
    sourceRefs: ["OpenAI Responses API", "Deterministic fallback"],
    automationEnabled: false,
    requiresConfirmation: true,
    nextRunAt: null,
    metadata: { store: false, fallbackAvailable: true }
  });

  records.push({
    kind: "automation_rule",
    title: "Confirm before operational action",
    detail: "Automation candidates may prepare actions, but calendar, notification, commute, email, and memory changes require explicit confirmation.",
    domain: "automation",
    status: "approved",
    confidence: 1,
    priority: 1,
    risk: "green",
    sourceType: "manual",
    sourceRefs: ["Release 4 guardrail"],
    automationEnabled: false,
    requiresConfirmation: true,
    nextRunAt: null,
    metadata: { protectedActions: ["calendar", "notifications", "commute", "email", "memory"] }
  });

  return records;
}
