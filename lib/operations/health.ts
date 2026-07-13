import { hasGoogleOAuthConfig } from "@/lib/google/oauth";
import { hasGoogleTokenEncryptionKey } from "@/lib/google/token-crypto";
import { hasGoogleRoutesConfig } from "@/lib/maps/google-routes";
import { hasNsApiConfig } from "@/lib/commute/ns-live";
import { createSupabaseAdminClient, hasSupabaseAdminConfig } from "@/lib/supabase/admin";
import { errorMessage } from "./logger";
import { resilientFetch } from "./resilience";

type HealthStatus = "ok" | "degraded" | "down";
type HealthFreshness = "live" | "recent" | "fallback" | "unavailable";

export type IntegrationHealthCheck = {
  id: string;
  label: string;
  status: HealthStatus;
  freshness: HealthFreshness;
  checkedAt: string;
  detail: string;
};

export type ProductionHealthReport = {
  ok: boolean;
  status: HealthStatus;
  checkedAt: string;
  version: string;
  checks: IntegrationHealthCheck[];
  releaseGate: {
    monitoringReady: boolean;
    liveIntegrationsReportStatus: boolean;
    fallbackLabelsRequired: boolean;
  };
};

function configured(value: boolean): HealthStatus {
  return value ? "ok" : "degraded";
}

function check(id: string, label: string, status: HealthStatus, detail: string, freshness: HealthFreshness, checkedAt: string): IntegrationHealthCheck {
  return { id, label, status, freshness, checkedAt, detail };
}

function aggregateStatus(checks: IntegrationHealthCheck[]): HealthStatus {
  if (checks.some((item) => item.status === "down")) return "down";
  if (checks.some((item) => item.status === "degraded")) return "degraded";
  return "ok";
}

export async function buildProductionHealthReport(): Promise<ProductionHealthReport> {
  const checkedAt = new Date().toISOString();
  const checks: IntegrationHealthCheck[] = [];

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabasePublishableKey = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  const supabaseConfigured = Boolean(supabaseUrl && supabasePublishableKey);
  if (!supabaseConfigured) {
    checks.push(check("supabase", "Supabase", "down", "Supabase URL or publishable key is not configured.", "unavailable", checkedAt));
  } else {
    try {
      const authHealth = await resilientFetch(
        `${supabaseUrl!.replace(/\/$/, "")}/auth/v1/health`,
        {
          headers: {
            apikey: supabasePublishableKey!
          }
        },
        {
          label: "Supabase Auth health",
          timeoutMs: 5_000,
          attempts: 2
        }
      );

      let dataApiDetail = "Supabase admin key is missing; hourly background sync is disabled until configured.";
      let supabaseStatus: HealthStatus = authHealth.ok ? "degraded" : "down";
      if (hasSupabaseAdminConfig()) {
        const supabase = createSupabaseAdminClient();
        const { error } = await supabase.from("imports").select("id", { count: "exact", head: true }).limit(1);
        dataApiDetail = error ? `Database probe failed: ${error.message}` : "Database probe succeeded.";
        supabaseStatus = authHealth.ok && !error ? "ok" : "down";
      }

      checks.push(
        check(
          "supabase",
          "Supabase",
          supabaseStatus,
          authHealth.ok ? `Auth health endpoint responded. ${dataApiDetail}` : `Auth health endpoint returned ${authHealth.status}.`,
          authHealth.ok ? "live" : "unavailable",
          checkedAt
        )
      );
    } catch (error) {
      checks.push(check("supabase", "Supabase", "down", errorMessage(error), "unavailable", checkedAt));
    }
  }

  checks.push(
    check(
      "google-oauth",
      "Google Calendar and Gmail OAuth",
      configured(hasGoogleOAuthConfig() && hasGoogleTokenEncryptionKey()),
      hasGoogleOAuthConfig() && hasGoogleTokenEncryptionKey()
        ? "OAuth credentials and encrypted token storage are configured."
        : "OAuth or token encryption configuration is incomplete.",
      hasGoogleOAuthConfig() ? "recent" : "fallback",
      checkedAt
    ),
    check(
      "google-routes",
      "Google Maps Routes",
      configured(hasGoogleRoutesConfig()),
      hasGoogleRoutesConfig() ? "Routes API key is configured." : "Routes will fall back to Google Maps planner links.",
      hasGoogleRoutesConfig() ? "recent" : "fallback",
      checkedAt
    ),
    check(
      "ns",
      "NS",
      configured(hasNsApiConfig()),
      hasNsApiConfig() ? "NS API key is configured." : "NS planner/status fallback remains labeled as fallback.",
      hasNsApiConfig() ? "recent" : "fallback",
      checkedAt
    ),
    check(
      "weather",
      "Weather",
      "ok",
      `Weather location is ${process.env.WEATHER_LOCATION || "Amsterdam, Netherlands"}. Provider failures return unavailable, not live.`,
      "recent",
      checkedAt
    ),
    check(
      "notifications",
      "Notifications",
      configured(Boolean(process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY && process.env.VAPID_PRIVATE_KEY && process.env.VAPID_SUBJECT)),
      process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY && process.env.VAPID_PRIVATE_KEY && process.env.VAPID_SUBJECT
        ? "Push notification keys are configured."
        : "In-app alerts work; push delivery requires VAPID configuration.",
      process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY ? "recent" : "fallback",
      checkedAt
    ),
    check(
      "ai-core",
      "AI Core",
      configured(Boolean(process.env.OPENAI_API_KEY)),
      process.env.OPENAI_API_KEY ? "AI provider key is configured." : "Deterministic NOVA fallback brief is active.",
      process.env.OPENAI_API_KEY ? "recent" : "fallback",
      checkedAt
    )
  );

  const status = aggregateStatus(checks);
  return {
    ok: status !== "down",
    status,
    checkedAt,
    version: process.env.NEXT_PUBLIC_APP_VERSION || "1.0.0-rc.2",
    checks,
    releaseGate: {
      monitoringReady: true,
      liveIntegrationsReportStatus: true,
      fallbackLabelsRequired: true
    }
  };
}
