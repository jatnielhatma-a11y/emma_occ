import { z } from "zod";

export const novaCapabilitySchema = z.enum([
  "multi_device_sync",
  "voice",
  "vision",
  "collaboration",
  "developer_platform",
  "nova_intelligence"
]);

export const novaCapabilityStatusSchema = z.enum(["candidate", "enabled", "paused", "blocked", "archived"]);
export const novaPrivacyModeSchema = z.enum(["private", "family_scoped", "developer_scoped", "disabled"]);

export const novaCapabilityRecordSchema = z.object({
  capability: novaCapabilitySchema,
  title: z.string().trim().min(1).max(180),
  detail: z.string().trim().max(2500).default(""),
  status: novaCapabilityStatusSchema.default("candidate"),
  privacyMode: novaPrivacyModeSchema.default("private"),
  consentRequired: z.boolean().default(true),
  consentGranted: z.boolean().default(false),
  localOnly: z.boolean().default(false),
  syncEnabled: z.boolean().default(false),
  deviceScope: z.enum(["personal", "family", "collaborator", "developer"]).default("personal"),
  risk: z.enum(["green", "amber", "red"]).default("green"),
  confidence: z.number().min(0).max(1).default(0.5),
  sourceRefs: z.array(z.string().trim().min(1).max(120)).max(12).default([]),
  metadata: z.record(z.unknown()).default({})
});

export const novaIntelligenceRequestSchema = z.discriminatedUnion("action", [
  z.object({
    action: z.literal("addCapability"),
    record: novaCapabilityRecordSchema
  }),
  z.object({
    action: z.literal("seedRelease5")
  }),
  z.object({
    action: z.literal("archiveCapability"),
    id: z.string().uuid()
  })
]);

export type NovaCapability = z.infer<typeof novaCapabilitySchema>;
export type NovaCapabilityRecord = z.infer<typeof novaCapabilityRecordSchema>;
export type NovaCapabilityCounts = Record<NovaCapability, number>;

export const emptyNovaCapabilityCounts: NovaCapabilityCounts = {
  multi_device_sync: 0,
  voice: 0,
  vision: 0,
  collaboration: 0,
  developer_platform: 0,
  nova_intelligence: 0
};

export function buildNovaIntelligenceReadiness(counts: NovaCapabilityCounts) {
  const totalRecords = Object.values(counts).reduce((sum, count) => sum + count, 0);
  const activeCapabilityCount = Object.values(counts).filter((count) => count > 0).length;

  return {
    totalRecords,
    activeCapabilityCount,
    allCapabilitiesStarted: activeCapabilityCount === Object.keys(emptyNovaCapabilityCounts).length,
    syncStatus: counts.multi_device_sync > 0 ? "sync-ready" : "waiting-for-device",
    multimodalStatus: counts.voice > 0 && counts.vision > 0 ? "multimodal-ready" : "consent-required",
    platformStatus: counts.developer_platform > 0 ? "extension-governed" : "closed-by-default"
  };
}

export function capabilityGuardrail(record: Pick<NovaCapabilityRecord, "capability" | "privacyMode" | "consentRequired" | "consentGranted" | "syncEnabled">) {
  if ((record.capability === "voice" || record.capability === "vision") && record.consentRequired && !record.consentGranted) {
    return "explicit-consent-required";
  }
  if (record.capability === "developer_platform" && record.privacyMode !== "developer_scoped") {
    return "developer-scope-required";
  }
  if (record.capability === "collaboration" && record.privacyMode === "private") {
    return "sharing-disabled";
  }
  if (record.syncEnabled && record.privacyMode === "disabled") {
    return "sync-blocked";
  }
  return "ready-with-guardrails";
}

export function release5SeedRecords(): NovaCapabilityRecord[] {
  return [
    {
      capability: "multi_device_sync",
      title: "Personal device continuity",
      detail: "Keep NOVA state consistent across phone, desktop, and installed PWA contexts after sign-in.",
      status: "candidate",
      privacyMode: "private",
      consentRequired: true,
      consentGranted: false,
      localOnly: false,
      syncEnabled: false,
      deviceScope: "personal",
      risk: "green",
      confidence: 0.72,
      sourceRefs: ["Supabase Auth", "PWA"],
      metadata: { release: 5 }
    },
    {
      capability: "voice",
      title: "Push-to-talk mission assistant",
      detail: "Voice sessions require explicit start, transcript review, and user approval before saved context.",
      status: "candidate",
      privacyMode: "private",
      consentRequired: true,
      consentGranted: false,
      localOnly: true,
      syncEnabled: false,
      deviceScope: "personal",
      risk: "amber",
      confidence: 0.58,
      sourceRefs: ["User consent"],
      metadata: { alwaysListening: false }
    },
    {
      capability: "vision",
      title: "Reviewable vision intake",
      detail: "Images and documents are user-submitted, source-labeled, and reviewable before extraction is stored.",
      status: "candidate",
      privacyMode: "private",
      consentRequired: true,
      consentGranted: false,
      localOnly: true,
      syncEnabled: false,
      deviceScope: "personal",
      risk: "amber",
      confidence: 0.6,
      sourceRefs: ["User-submitted media"],
      metadata: { reviewBeforeStore: true }
    },
    {
      capability: "collaboration",
      title: "Family-scoped collaboration",
      detail: "Shared tasks and family context stay separated from private memory, health, finance, and location records.",
      status: "candidate",
      privacyMode: "family_scoped",
      consentRequired: true,
      consentGranted: false,
      localOnly: false,
      syncEnabled: false,
      deviceScope: "family",
      risk: "green",
      confidence: 0.67,
      sourceRefs: ["Family context"],
      metadata: { privateByDefault: true }
    },
    {
      capability: "developer_platform",
      title: "Scoped extension platform",
      detail: "Future plugins require explicit scopes, audit trails, and no service-role exposure.",
      status: "candidate",
      privacyMode: "developer_scoped",
      consentRequired: true,
      consentGranted: false,
      localOnly: false,
      syncEnabled: false,
      deviceScope: "developer",
      risk: "green",
      confidence: 0.74,
      sourceRefs: ["Extension registry"],
      metadata: { serviceRoleExposed: false }
    },
    {
      capability: "nova_intelligence",
      title: "Unified NOVA Intelligence",
      detail: "Coordinate approved operational, personal, life-domain, and advisory records without bypassing consent gates.",
      status: "candidate",
      privacyMode: "private",
      consentRequired: true,
      consentGranted: false,
      localOnly: false,
      syncEnabled: false,
      deviceScope: "personal",
      risk: "green",
      confidence: 0.82,
      sourceRefs: ["Release 1-4 context"],
      metadata: { bypassConsent: false }
    }
  ];
}
