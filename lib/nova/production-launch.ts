import { z } from "zod";

export const launchCheckSchema = z.enum([
  "automated_tests",
  "production_build",
  "e2e_flows",
  "live_integration_health",
  "fallback_verification",
  "notification_verification",
  "security_review",
  "privacy_review",
  "rollback_rehearsal",
  "device_validation",
  "accessibility",
  "performance",
  "backup_recovery",
  "release_notes",
  "production_deployment"
]);

export const launchCheckStatusSchema = z.enum(["passed", "attention", "blocked", "manual"]);

export const launchCheckRecordSchema = z.object({
  check: launchCheckSchema,
  title: z.string().trim().min(1).max(180),
  detail: z.string().trim().max(2500).default(""),
  status: launchCheckStatusSchema.default("manual"),
  critical: z.boolean().default(false),
  automated: z.boolean().default(false),
  evidenceRefs: z.array(z.string().trim().min(1).max(180)).max(12).default([]),
  checkedAt: z.string().trim().max(40).optional().nullable()
});

export type LaunchCheck = z.infer<typeof launchCheckSchema>;
export type LaunchCheckRecord = z.input<typeof launchCheckRecordSchema>;

const requiredChecks: LaunchCheck[] = [
  "automated_tests",
  "production_build",
  "e2e_flows",
  "live_integration_health",
  "fallback_verification",
  "notification_verification",
  "security_review",
  "privacy_review",
  "rollback_rehearsal",
  "device_validation",
  "accessibility",
  "performance",
  "backup_recovery",
  "release_notes",
  "production_deployment"
];

export function launchCheckGuardrail(record: Pick<LaunchCheckRecord, "status" | "critical" | "automated">) {
  if (record.status === "blocked" && record.critical) return "launch-blocker";
  if (record.status === "manual") return "manual-proof-required";
  if (record.status === "attention") return "watch-before-v1";
  if (record.status === "blocked") return "blocked-follow-up";
  return record.automated ? "verified-automated" : "verified-manual";
}

export function buildRelease7LaunchSummary(records: LaunchCheckRecord[]) {
  const parsed = records.map((record) => launchCheckRecordSchema.parse(record));
  const covered = new Set(parsed.map((record) => record.check));
  const blockers = parsed.filter((record) => launchCheckGuardrail(record) === "launch-blocker");
  const manualChecks = parsed.filter((record) => launchCheckGuardrail(record) === "manual-proof-required");
  const warnings = parsed.filter((record) => record.status === "attention" || record.status === "blocked");
  const requiredCovered = requiredChecks.every((check) => covered.has(check));
  const criticalPassed = parsed.filter((record) => record.critical).every((record) => record.status === "passed");

  return {
    totalChecks: parsed.length,
    requiredCheckCount: requiredChecks.length,
    coveredCheckCount: covered.size,
    requiredCovered,
    blockers: blockers.length,
    manualChecks: manualChecks.length,
    warnings: warnings.length,
    criticalPassed,
    productionLive: parsed.some((record) => record.check === "production_deployment" && record.status === "passed"),
    v1Ready: requiredCovered && blockers.length === 0 && manualChecks.length === 0 && warnings.length === 0 && criticalPassed,
    status:
      blockers.length > 0
        ? "blocked"
        : parsed.some((record) => record.check === "production_deployment" && record.status === "passed")
          ? "production-live-candidate"
          : "ready-to-deploy"
  };
}

export function release7LaunchChecks(checkedAt = new Date().toISOString(), productionLive = false): LaunchCheckRecord[] {
  return [
    {
      check: "automated_tests",
      title: "Automated test suite",
      detail: "All unit and integration tests must pass before deployment.",
      status: "passed",
      critical: true,
      automated: true,
      evidenceRefs: ["pnpm test"],
      checkedAt
    },
    {
      check: "production_build",
      title: "Production build",
      detail: "The Next.js production build must pass before deployment.",
      status: "passed",
      critical: true,
      automated: true,
      evidenceRefs: ["pnpm build"],
      checkedAt
    },
    {
      check: "e2e_flows",
      title: "End-to-end flows",
      detail: "Critical fallback-labeled commute, notification, and AI brief flow must pass.",
      status: "passed",
      critical: true,
      automated: true,
      evidenceRefs: ["pnpm test:e2e"],
      checkedAt
    },
    {
      check: "live_integration_health",
      title: "Live integration health",
      detail: "Production health must report real status for Supabase, Google, Maps, NS, Weather, Notifications, and AI Core.",
      status: "attention",
      critical: true,
      automated: false,
      evidenceRefs: ["/api/health"],
      checkedAt
    },
    {
      check: "fallback_verification",
      title: "Fallback behavior",
      detail: "Fallback and unavailable data must remain labeled before operational use.",
      status: "passed",
      critical: true,
      automated: true,
      evidenceRefs: ["phase7-hardening.test.mjs"],
      checkedAt
    },
    {
      check: "notification_verification",
      title: "Notification dedupe and cooldowns",
      detail: "Duplicate notifications and cooldown behavior must be verified.",
      status: "passed",
      critical: true,
      automated: true,
      evidenceRefs: ["notifications-learning.test.mjs"],
      checkedAt
    },
    {
      check: "security_review",
      title: "Security review",
      detail: "Dependency audit, secrets handling, OAuth scopes, token encryption, and RLS posture must remain clear.",
      status: "passed",
      critical: true,
      automated: true,
      evidenceRefs: ["pnpm audit --audit-level low", "Supabase RLS tests"],
      checkedAt
    },
    {
      check: "privacy_review",
      title: "Privacy controls",
      detail: "Location deletion, memory consent, token revocation, and scoped records must remain visible and revocable.",
      status: "passed",
      critical: true,
      automated: true,
      evidenceRefs: ["app/api/privacy/location-data", "privacy tests"],
      checkedAt
    },
    {
      check: "rollback_rehearsal",
      title: "Rollback rehearsal",
      detail: "A previous production deployment must be identified and rollback procedure rehearsed before final v1.0 approval.",
      status: "manual",
      critical: true,
      automated: false,
      evidenceRefs: ["Vercel rollback runbook"],
      checkedAt
    },
    {
      check: "device_validation",
      title: "Real device validation",
      detail: "iPhone, Android, desktop, and installed PWA behavior require real-device validation.",
      status: "manual",
      critical: false,
      automated: false,
      evidenceRefs: ["manual device checklist"],
      checkedAt
    },
    {
      check: "accessibility",
      title: "Accessibility pass",
      detail: "Keyboard, contrast, reduced motion, and screen-reader basics need a manual launch review.",
      status: "manual",
      critical: false,
      automated: false,
      evidenceRefs: ["manual accessibility checklist"],
      checkedAt
    },
    {
      check: "performance",
      title: "Performance and GPS battery",
      detail: "Production performance and GPS battery impact need real-device observation.",
      status: "manual",
      critical: false,
      automated: false,
      evidenceRefs: ["manual performance checklist"],
      checkedAt
    },
    {
      check: "backup_recovery",
      title: "Backup and recovery",
      detail: "Supabase backup timestamp and recovery procedure must be recorded before final v1.0 approval.",
      status: "manual",
      critical: true,
      automated: false,
      evidenceRefs: ["backup runbook"],
      checkedAt
    },
    {
      check: "release_notes",
      title: "Release notes",
      detail: "Release notes must distinguish production-live candidate from final v1.0 approval.",
      status: "passed",
      critical: false,
      automated: true,
      evidenceRefs: ["docs/nova-release-7-production-launch.md"],
      checkedAt
    },
    {
      check: "production_deployment",
      title: "Production deployment",
      detail: productionLive ? "Release 7 has been deployed to production." : "Production deployment is pending.",
      status: productionLive ? "passed" : "manual",
      critical: true,
      automated: false,
      evidenceRefs: productionLive ? ["Vercel production deployment"] : ["pending deployment"],
      checkedAt
    }
  ];
}
