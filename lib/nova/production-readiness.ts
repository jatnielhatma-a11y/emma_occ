import { z } from "zod";

export const productionGateSchema = z.enum([
  "test_suite",
  "build",
  "e2e",
  "security",
  "monitoring",
  "fallback_behavior",
  "notifications",
  "rollback",
  "privacy_controls",
  "mobile_pwa",
  "commute_accuracy"
]);

export const productionGateStatusSchema = z.enum(["passed", "attention", "blocked", "manual"]);
export const productionGateSeveritySchema = z.enum(["critical", "high", "medium", "low"]);
export const productionGateStageSchema = z.enum(["automated", "live", "manual"]);

export const productionReadinessRecordSchema = z.object({
  gate: productionGateSchema,
  title: z.string().trim().min(1).max(180),
  detail: z.string().trim().max(2500).default(""),
  status: productionGateStatusSchema.default("manual"),
  severity: productionGateSeveritySchema.default("medium"),
  stage: productionGateStageSchema.default("manual"),
  sourceFreshness: z.enum(["live", "recent", "fallback", "manual", "unavailable"]).default("manual"),
  evidenceRefs: z.array(z.string().trim().min(1).max(160)).max(12).default([]),
  checkedAt: z.string().trim().max(40).optional().nullable(),
  metadata: z.record(z.unknown()).default({})
});

export type ProductionGate = z.infer<typeof productionGateSchema>;
export type ProductionGateStatus = z.infer<typeof productionGateStatusSchema>;
export type ProductionGateSeverity = z.infer<typeof productionGateSeveritySchema>;
export type ProductionReadinessRecord = z.input<typeof productionReadinessRecordSchema>;
export type ParsedProductionReadinessRecord = z.infer<typeof productionReadinessRecordSchema>;
export type ProductionGateCounts = Record<ProductionGate, number>;

export const emptyProductionGateCounts: ProductionGateCounts = {
  test_suite: 0,
  build: 0,
  e2e: 0,
  security: 0,
  monitoring: 0,
  fallback_behavior: 0,
  notifications: 0,
  rollback: 0,
  privacy_controls: 0,
  mobile_pwa: 0,
  commute_accuracy: 0
};

const requiredGateOrder: ProductionGate[] = [
  "test_suite",
  "build",
  "e2e",
  "security",
  "monitoring",
  "fallback_behavior",
  "notifications",
  "rollback",
  "privacy_controls",
  "mobile_pwa",
  "commute_accuracy"
];

export function productionGateGuardrail(record: Pick<ProductionReadinessRecord, "gate" | "status" | "severity" | "stage">) {
  if (record.status === "blocked" && (record.severity === "critical" || record.severity === "high")) return "release-blocker";
  if (record.gate === "fallback_behavior" && record.status !== "passed") return "fallback-label-review-required";
  if (record.gate === "notifications" && record.status !== "passed") return "notification-verification-required";
  if (record.gate === "rollback" && record.status !== "passed") return "rollback-test-required";
  if (record.stage === "manual" && record.status === "manual") return "manual-verification-required";
  if (record.status === "attention") return "watch-before-launch";
  return "ready";
}

export function buildProductionReadinessSummary(records: ProductionReadinessRecord[]) {
  const parsed = records.map((record) => productionReadinessRecordSchema.parse(record));
  const counts = parsed.reduce<ProductionGateCounts>(
    (next, record) => ({ ...next, [record.gate]: next[record.gate] + 1 }),
    { ...emptyProductionGateCounts }
  );
  const coveredGateCount = Object.values(counts).filter((count) => count > 0).length;
  const blockers = parsed.filter((record) => productionGateGuardrail(record) === "release-blocker");
  const manualChecks = parsed.filter((record) => productionGateGuardrail(record) === "manual-verification-required");
  const warnings = parsed.filter((record) => productionGateGuardrail(record).endsWith("required") || record.status === "attention");
  const criticalPassed = parsed.filter((record) => record.severity === "critical").every((record) => record.status === "passed");
  const requiredGatesCovered = requiredGateOrder.every((gate) => counts[gate] > 0);

  return {
    totalRecords: parsed.length,
    coveredGateCount,
    requiredGateCount: requiredGateOrder.length,
    requiredGatesCovered,
    blockers: blockers.length,
    manualChecks: manualChecks.length,
    warnings: warnings.length,
    criticalPassed,
    releaseCandidate: requiredGatesCovered && blockers.length === 0 && criticalPassed,
    launchStatus:
      blockers.length > 0
        ? "blocked"
        : requiredGatesCovered && criticalPassed && warnings.length === 0
          ? "launch-ready"
          : "candidate-with-follow-up",
    counts
  };
}

export function release6SeedRecords(checkedAt = new Date().toISOString()): ProductionReadinessRecord[] {
  return [
    {
      gate: "test_suite",
      title: "Unit and integration tests",
      detail: "The release gate requires npm test to pass before daily-use approval.",
      status: "passed",
      severity: "critical",
      stage: "automated",
      sourceFreshness: "recent",
      evidenceRefs: ["npm test"],
      checkedAt
    },
    {
      gate: "build",
      title: "Production build",
      detail: "The release gate requires npm run build to pass before launch.",
      status: "passed",
      severity: "critical",
      stage: "automated",
      sourceFreshness: "recent",
      evidenceRefs: ["npm run build"],
      checkedAt
    },
    {
      gate: "e2e",
      title: "End-to-end production flows",
      detail: "Critical flows for Google, NS, Weather, GPS, notifications, Supabase, and AI Core must be verified.",
      status: "passed",
      severity: "critical",
      stage: "automated",
      sourceFreshness: "recent",
      evidenceRefs: ["npm run test:e2e"],
      checkedAt
    },
    {
      gate: "security",
      title: "Critical security review",
      detail: "Dependency audit, OAuth scope review, token storage, and RLS coverage must have no critical blockers.",
      status: "passed",
      severity: "critical",
      stage: "automated",
      sourceFreshness: "recent",
      evidenceRefs: ["pnpm audit --audit-level low", "Supabase RLS review"],
      checkedAt
    },
    {
      gate: "monitoring",
      title: "Live integration monitoring",
      detail: "The health endpoint reports each live integration, fallback state, freshness label, and degraded status.",
      status: "attention",
      severity: "high",
      stage: "live",
      sourceFreshness: "live",
      evidenceRefs: ["/api/health"],
      checkedAt
    },
    {
      gate: "fallback_behavior",
      title: "Fallback labels",
      detail: "Fallback and unavailable data must remain visibly labeled before influencing duty or commute decisions.",
      status: "passed",
      severity: "critical",
      stage: "automated",
      sourceFreshness: "recent",
      evidenceRefs: ["phase7-hardening.test.mjs"],
      checkedAt
    },
    {
      gate: "notifications",
      title: "Notification dedupe and cooldowns",
      detail: "Duplicate alerts are suppressed and cooldowns reduce repeat notifications.",
      status: "passed",
      severity: "critical",
      stage: "automated",
      sourceFreshness: "recent",
      evidenceRefs: ["notifications-learning.test.mjs"],
      checkedAt
    },
    {
      gate: "rollback",
      title: "Rollback and recovery",
      detail: "Rollback, backup/recovery, and migration rollback procedures are documented and must be rehearsed before v1.0.",
      status: "manual",
      severity: "high",
      stage: "manual",
      sourceFreshness: "manual",
      evidenceRefs: ["docs/nova-release-6-production-readiness.md"],
      checkedAt
    },
    {
      gate: "privacy_controls",
      title: "Privacy controls",
      detail: "OAuth scopes, encrypted token storage, location-data deletion, and RLS ownership policies are reviewable.",
      status: "passed",
      severity: "critical",
      stage: "automated",
      sourceFreshness: "recent",
      evidenceRefs: ["supabase/migrations", "app/api/privacy/location-data"],
      checkedAt
    },
    {
      gate: "mobile_pwa",
      title: "Mobile and installed PWA behavior",
      detail: "iPhone, Android, desktop, and installed PWA behavior are tracked as a manual release gate.",
      status: "manual",
      severity: "medium",
      stage: "manual",
      sourceFreshness: "manual",
      evidenceRefs: ["public/manifest.webmanifest", "public/sw.js"],
      checkedAt
    },
    {
      gate: "commute_accuracy",
      title: "Planned-versus-actual commute accuracy",
      detail: "Commute outcomes can be recorded without continuous GPS or silent duty changes.",
      status: "manual",
      severity: "medium",
      stage: "manual",
      sourceFreshness: "manual",
      evidenceRefs: ["commute accuracy records"],
      checkedAt
    }
  ];
}
