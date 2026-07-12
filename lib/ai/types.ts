import { z } from "zod";

export const novaRiskSchema = z.enum(["green", "amber", "red"]);
export type NovaRisk = z.infer<typeof novaRiskSchema>;

export const novaBriefSourceSchema = z.object({
  label: z.string(),
  source: z.string(),
  timestamp: z.string(),
  freshness: z.enum(["live", "recent", "stale", "fallback", "unavailable"]),
  confidence: z.number().min(0).max(1)
});

export const novaBriefFactSchema = z.object({
  label: z.string(),
  value: z.string(),
  risk: novaRiskSchema,
  sourceLabel: z.string()
});

export const novaBriefRecommendationSchema = z.object({
  priority: z.enum(["now", "soon", "monitor"]),
  action: z.string(),
  reason: z.string(),
  risk: novaRiskSchema
});

export const novaDailyBriefSchema = z.object({
  title: z.string(),
  summary: z.string(),
  status: novaRiskSchema,
  confidence: z.number().min(0).max(1),
  shouldNotify: z.boolean(),
  facts: z.array(novaBriefFactSchema).max(8),
  recommendations: z.array(novaBriefRecommendationSchema).max(5),
  suppressedUpdates: z.array(z.string()).max(5),
  sources: z.array(novaBriefSourceSchema).max(10)
});

export type NovaBriefSource = z.infer<typeof novaBriefSourceSchema>;
export type NovaBriefFact = z.infer<typeof novaBriefFactSchema>;
export type NovaBriefRecommendation = z.infer<typeof novaBriefRecommendationSchema>;
export type NovaDailyBrief = z.infer<typeof novaDailyBriefSchema>;

export type NovaOperationalContext = {
  language: "en" | "es" | "fr";
  today: string;
  generatedAt: string;
  duty: {
    todayLabel: string;
    nextDutyLabel: string;
    upcomingWorkingCount: number;
    vacationOrRestCount: number;
  };
  commute: {
    routeLabel: string;
    status: NovaRisk;
    recommendation: string;
    isLive: boolean;
    confidence: number;
    incidents: Array<{ title: string; detail: string; severity: NovaRisk; source: string }>;
    checkedAt: string | null;
  };
  calendar: {
    connected: boolean;
    lastSyncLabel: string;
    sourceLabel: string;
  };
  email: {
    connected: boolean;
    actionableCount: number | null;
  };
  weather: {
    label: string;
    risk: NovaRisk;
    source: string;
    checkedAt: string;
  };
  conflicts: {
    count: number;
    highest: string | null;
    risk: NovaRisk;
  };
  integrations: {
    fallbackCount: number;
    unavailableCount: number;
  };
  sources: NovaBriefSource[];
};
