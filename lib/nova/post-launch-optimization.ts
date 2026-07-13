import { z } from "zod";

export const optimizationFocusSchema = z.enum([
  "usage_feedback",
  "commute_accuracy",
  "duty_risk",
  "memory_recommendations",
  "proactive_planning",
  "mobile_pwa_polish",
  "privacy_controls",
  "family_context",
  "monitoring_tuning"
]);

export const optimizationStatusSchema = z.enum(["observing", "tuning", "verified", "paused"]);
export const optimizationImpactSchema = z.enum(["low", "medium", "high"]);
export const optimizationFreshnessSchema = z.enum(["live", "recent", "manual", "fallback"]);

export const optimizationRecordSchema = z.object({
  focus: optimizationFocusSchema,
  title: z.string().trim().min(1).max(180),
  detail: z.string().trim().max(2500).default(""),
  status: optimizationStatusSchema.default("observing"),
  impact: optimizationImpactSchema.default("medium"),
  sourceFreshness: optimizationFreshnessSchema.default("manual"),
  usesPersonalData: z.boolean().default(true),
  privacyReviewed: z.boolean().default(false),
  consentRequired: z.boolean().default(true),
  consentGranted: z.boolean().default(false),
  automationEnabled: z.boolean().default(false),
  evidenceRefs: z.array(z.string().trim().min(1).max(180)).max(12).default([]),
  reviewedAt: z.string().trim().max(40).optional().nullable()
});

export type OptimizationFocus = z.infer<typeof optimizationFocusSchema>;
export type OptimizationRecord = z.input<typeof optimizationRecordSchema>;

export const release8RequiredFocuses: OptimizationFocus[] = [
  "usage_feedback",
  "commute_accuracy",
  "duty_risk",
  "memory_recommendations",
  "proactive_planning",
  "mobile_pwa_polish",
  "privacy_controls",
  "family_context",
  "monitoring_tuning"
];

export function optimizationGuardrail(record: Pick<OptimizationRecord, "status" | "sourceFreshness" | "impact" | "usesPersonalData" | "privacyReviewed" | "consentRequired" | "consentGranted" | "automationEnabled">) {
  if (record.automationEnabled && (!record.consentRequired || !record.consentGranted)) return "automation-consent-required";
  if (record.usesPersonalData && !record.privacyReviewed) return "privacy-review-required";
  if (record.sourceFreshness === "fallback" && record.impact === "high") return "source-verification-required";
  if (record.status === "paused") return "paused-for-review";
  if (record.status === "verified") return "verified-improvement";
  return "active-learning";
}

export function buildRelease8OptimizationSummary(records: OptimizationRecord[]) {
  const parsed = records.map((record) => optimizationRecordSchema.parse(record));
  const covered = new Set(parsed.map((record) => record.focus));
  const guardrails = parsed.map((record) => optimizationGuardrail(record));
  const blockers = guardrails.filter((item) => item === "automation-consent-required" || item === "privacy-review-required" || item === "source-verification-required");
  const verified = parsed.filter((record) => record.status === "verified");
  const tuning = parsed.filter((record) => record.status === "tuning");
  const privacyReady = parsed.filter((record) => record.usesPersonalData).every((record) => record.privacyReviewed);
  const allFocusesCovered = release8RequiredFocuses.every((focus) => covered.has(focus));

  return {
    totalRecords: parsed.length,
    requiredFocusCount: release8RequiredFocuses.length,
    coveredFocusCount: covered.size,
    allFocusesCovered,
    verifiedCount: verified.length,
    tuningCount: tuning.length,
    blockers: blockers.length,
    privacyReady,
    status:
      blockers.length > 0
        ? "review-required"
        : allFocusesCovered && privacyReady
          ? "learning-ready"
          : "observing",
    recommendationMode: blockers.length === 0 && privacyReady ? "advisory-ready" : "advisory-review"
  };
}

export function release8SeedRecords(reviewedAt = new Date().toISOString()): OptimizationRecord[] {
  return [
    {
      focus: "usage_feedback",
      title: "Real-world usage feedback",
      detail: "Collect useful-alert, missed-context, and daily-friction feedback as reviewable improvement notes.",
      status: "tuning",
      impact: "medium",
      sourceFreshness: "manual",
      usesPersonalData: true,
      privacyReviewed: true,
      consentRequired: true,
      consentGranted: true,
      evidenceRefs: ["docs/nova-release-8-post-launch-optimization.md"],
      reviewedAt
    },
    {
      focus: "commute_accuracy",
      title: "Commute prediction accuracy",
      detail: "Compare planned and actual commute outcomes to improve buffer recommendations without continuous GPS.",
      status: "tuning",
      impact: "high",
      sourceFreshness: "recent",
      usesPersonalData: true,
      privacyReviewed: true,
      consentRequired: true,
      consentGranted: true,
      evidenceRefs: ["commute accuracy loop"],
      reviewedAt
    },
    {
      focus: "duty_risk",
      title: "Duty-risk forecasting",
      detail: "Refine early warnings for late, night, reserve, vacation, off-day, and special roster cases.",
      status: "observing",
      impact: "high",
      sourceFreshness: "recent",
      usesPersonalData: true,
      privacyReviewed: true,
      consentRequired: true,
      consentGranted: true,
      evidenceRefs: ["roster edge-case tests"],
      reviewedAt
    },
    {
      focus: "memory_recommendations",
      title: "Memory recommendation review",
      detail: "Improve memory suggestions while keeping storage opt-in, inspectable, and removable.",
      status: "observing",
      impact: "medium",
      sourceFreshness: "manual",
      usesPersonalData: true,
      privacyReviewed: true,
      consentRequired: true,
      consentGranted: false,
      evidenceRefs: ["Release 2 memory guardrails"],
      reviewedAt
    },
    {
      focus: "proactive_planning",
      title: "Proactive daily planning",
      detail: "Tune daily brief recommendations from verified calendar, commute, weather, and duty context.",
      status: "tuning",
      impact: "medium",
      sourceFreshness: "recent",
      usesPersonalData: true,
      privacyReviewed: true,
      consentRequired: true,
      consentGranted: true,
      evidenceRefs: ["daily brief tests"],
      reviewedAt
    },
    {
      focus: "mobile_pwa_polish",
      title: "Mobile and PWA polish",
      detail: "Track phone-first layout, install behavior, notification permission copy, and touch ergonomics.",
      status: "observing",
      impact: "medium",
      sourceFreshness: "manual",
      usesPersonalData: false,
      privacyReviewed: true,
      consentRequired: false,
      consentGranted: false,
      evidenceRefs: ["manual device checklist"],
      reviewedAt
    },
    {
      focus: "privacy_controls",
      title: "Privacy controls refinement",
      detail: "Improve deletion, consent, source-attribution, token-revocation, and family-sharing boundaries.",
      status: "verified",
      impact: "high",
      sourceFreshness: "recent",
      usesPersonalData: true,
      privacyReviewed: true,
      consentRequired: true,
      consentGranted: true,
      evidenceRefs: ["privacy tests"],
      reviewedAt
    },
    {
      focus: "family_context",
      title: "Family context tuning",
      detail: "Make family-oriented recommendations more useful while keeping sensitive memory and location private by default.",
      status: "observing",
      impact: "medium",
      sourceFreshness: "manual",
      usesPersonalData: true,
      privacyReviewed: true,
      consentRequired: true,
      consentGranted: false,
      evidenceRefs: ["collaboration guardrails"],
      reviewedAt
    },
    {
      focus: "monitoring_tuning",
      title: "Monitoring noise reduction",
      detail: "Reduce duplicate or low-value operational alerts while preserving critical duty and commute warnings.",
      status: "tuning",
      impact: "high",
      sourceFreshness: "live",
      usesPersonalData: false,
      privacyReviewed: true,
      consentRequired: false,
      consentGranted: false,
      evidenceRefs: ["notification cooldown tests", "/api/health"],
      reviewedAt
    }
  ];
}
