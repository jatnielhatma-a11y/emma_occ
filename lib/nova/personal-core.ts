import { z } from "zod";

export const personalCoreProfileSchema = z.object({
  preferredName: z.string().trim().max(120).default(""),
  familyContext: z.string().trim().max(2000).default(""),
  primaryLanguage: z.enum(["en", "es", "fr"]).default("en"),
  timezone: z.string().trim().min(1).max(80).default("Europe/Amsterdam")
});

export const memorySettingsSchema = z.object({
  memoryEnabled: z.boolean().default(false),
  allowAiSuggestions: z.boolean().default(false),
  retentionDays: z.number().int().min(1).max(3650).default(365),
  consentVersion: z.string().trim().max(40).default("nova-r2-privacy-v1")
});

export const personalCoreEntrySchema = z.object({
  kind: z.enum(["interest", "goal", "habit", "relationship", "timeline", "memory"]),
  title: z.string().trim().min(1).max(180),
  detail: z.string().trim().max(2000).default(""),
  category: z.string().trim().max(80).default("general"),
  sourceKind: z.enum(["manual", "calendar", "gmail", "roster", "system", "ai_suggestion"]).default("manual"),
  tags: z.array(z.string().trim().min(1).max(40)).max(12).default([])
});

export const personalCoreRequestSchema = z.discriminatedUnion("action", [
  z.object({
    action: z.literal("saveProfile"),
    profile: personalCoreProfileSchema
  }),
  z.object({
    action: z.literal("saveMemorySettings"),
    memorySettings: memorySettingsSchema
  }),
  z.object({
    action: z.literal("addEntry"),
    entry: personalCoreEntrySchema
  }),
  z.object({
    action: z.literal("archiveMemory"),
    id: z.string().uuid()
  })
]);

export type MemorySettings = z.infer<typeof memorySettingsSchema>;
export type PersonalCoreEntry = z.infer<typeof personalCoreEntrySchema>;

export type PersonalCoreCounts = {
  interests: number;
  goals: number;
  habits: number;
  relationships: number;
  timeline: number;
  memories: number;
};

export const defaultMemorySettings: MemorySettings = {
  memoryEnabled: false,
  allowAiSuggestions: false,
  retentionDays: 365,
  consentVersion: "nova-r2-privacy-v1"
};

export const emptyPersonalCoreCounts: PersonalCoreCounts = {
  interests: 0,
  goals: 0,
  habits: 0,
  relationships: 0,
  timeline: 0,
  memories: 0
};

export function canPersistMemory(settings: MemorySettings, entry: Pick<PersonalCoreEntry, "sourceKind">) {
  if (!settings.memoryEnabled) {
    return {
      allowed: false,
      reason: "Memory is disabled. Enable memory consent before saving personal memories."
    };
  }

  if (entry.sourceKind === "ai_suggestion" && !settings.allowAiSuggestions) {
    return {
      allowed: false,
      reason: "AI-suggested memories need separate permission before they can be saved."
    };
  }

  return { allowed: true, reason: "Memory can be saved with source attribution." };
}

export function buildPersonalCoreReadiness(settings: MemorySettings, counts: PersonalCoreCounts) {
  const lifeGraphCount = counts.interests + counts.goals + counts.habits + counts.relationships + counts.timeline;
  return {
    memoryStatus: settings.memoryEnabled ? "enabled" : "disabled",
    aiMemorySuggestions: settings.allowAiSuggestions ? "allowed" : "blocked",
    lifeGraphCount,
    hasPersonalContext: lifeGraphCount > 0 || counts.memories > 0,
    retentionLabel: `${settings.retentionDays} days`
  };
}

export function destinationForEntry(kind: PersonalCoreEntry["kind"]) {
  switch (kind) {
    case "interest":
      return "nova_interests";
    case "goal":
      return "nova_goals";
    case "habit":
      return "nova_habits";
    case "relationship":
      return "nova_relationships";
    case "timeline":
      return "nova_timeline_events";
    case "memory":
      return "nova_memory_items";
  }
}
