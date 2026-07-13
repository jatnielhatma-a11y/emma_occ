import { z } from "zod";

export const lifeDomainSchema = z.enum(["finance", "home", "travel", "health", "learning"]);

export const lifeDomainRecordSchema = z.object({
  domain: lifeDomainSchema,
  title: z.string().trim().min(1).max(180),
  detail: z.string().trim().max(2500).default(""),
  category: z.string().trim().min(1).max(80).default("general"),
  status: z.enum(["active", "planned", "paused", "completed", "archived"]).default("active"),
  priority: z.number().int().min(1).max(5).default(3),
  targetDate: z.string().trim().max(20).optional().nullable(),
  amountCents: z.number().int().min(0).max(100000000000).optional().nullable(),
  currency: z.string().trim().length(3).default("EUR"),
  tags: z.array(z.string().trim().min(1).max(40)).max(12).default([]),
  sensitive: z.boolean().default(false)
});

export const lifeDomainRequestSchema = z.discriminatedUnion("action", [
  z.object({
    action: z.literal("addRecord"),
    record: lifeDomainRecordSchema
  }),
  z.object({
    action: z.literal("archiveRecord"),
    id: z.string().uuid()
  })
]);

export type LifeDomain = z.infer<typeof lifeDomainSchema>;
export type LifeDomainRecord = z.infer<typeof lifeDomainRecordSchema>;

export type LifeDomainCounts = Record<LifeDomain, number>;

export type LifeDomainStoredRecord = LifeDomainRecord & {
  id?: string;
  createdAt?: string | null;
};

export const emptyLifeDomainCounts: LifeDomainCounts = {
  finance: 0,
  home: 0,
  travel: 0,
  health: 0,
  learning: 0
};

export function buildLifeDomainReadiness(counts: LifeDomainCounts) {
  const activeDomainCount = Object.values(counts).filter((count) => count > 0).length;
  const totalRecords = Object.values(counts).reduce((sum, count) => sum + count, 0);

  return {
    activeDomainCount,
    totalRecords,
    allDomainsStarted: activeDomainCount === Object.keys(emptyLifeDomainCounts).length,
    recommendationStatus: totalRecords > 0 ? "context-ready" : "waiting-for-context"
  };
}

export function savingsCapabilitySummary(records: Array<Pick<LifeDomainRecord, "domain" | "category" | "status" | "amountCents">>) {
  const savings = records.filter((record) => record.domain === "finance" && record.category === "savings_goal" && record.status !== "archived");
  const active = savings.filter((record) => record.status === "active" || record.status === "planned");
  const totalTargetCents = active.reduce((sum, record) => sum + (record.amountCents ?? 0), 0);

  return {
    active: true,
    activeGoals: active.length,
    totalTargetCents,
    status: active.length > 0 ? "savings-active" : "ready-for-first-goal",
    privacyMode: "manual-no-bank-connection"
  };
}

export function learningCapabilitySummary(records: Array<Pick<LifeDomainRecord, "domain" | "category" | "status">>) {
  const learning = records.filter((record) => record.domain === "learning" && record.status !== "archived");
  const activePlans = learning.filter((record) => record.category === "learning_plan" && (record.status === "active" || record.status === "planned"));
  const completed = learning.filter((record) => record.status === "completed");

  return {
    active: true,
    activePlans: activePlans.length,
    completedRecords: completed.length,
    status: learning.length > 0 ? "learning-active" : "ready-for-first-plan",
    recommendationMode: "reviewable"
  };
}

export function domainPrivacyNote(domain: LifeDomain) {
  switch (domain) {
    case "finance":
      return "Finance stores planning metadata only. No bank connection is active in Release 3.";
    case "home":
      return "Home records stay user-scoped and manually curated.";
    case "travel":
      return "Travel records do not alter Emma OCC commute planning in Release 3.";
    case "health":
      return "Health records are sensitive personal notes and are not medical advice.";
    case "learning":
      return "Learning records can support future recommendations after explicit review.";
  }
}
