import test from "node:test";
import assert from "node:assert/strict";
import { createRequire } from "node:module";
import { readFileSync } from "node:fs";
import vm from "node:vm";
import ts from "typescript";

const require = createRequire(import.meta.url);

function loadTsModule(path, mocks = {}, extraGlobals = {}) {
  const source = readFileSync(path, "utf8");
  const transpiled = ts.transpileModule(source, {
    compilerOptions: {
      module: ts.ModuleKind.CommonJS,
      target: ts.ScriptTarget.ES2020
    }
  }).outputText;
  const module = { exports: {} };
  const customRequire = (id) => mocks[id] ?? require(id);
  vm.runInNewContext(transpiled, {
    module,
    exports: module.exports,
    require: customRequire,
    process,
    Date,
    Intl,
    Math,
    Number,
    String,
    Boolean,
    Promise,
    URLSearchParams,
    ...extraGlobals
  });
  return module.exports;
}

const notificationPreferences = {
  conflicts: true,
  syncFailures: true,
  leaveHome: true,
  returnTrip: true,
  delayOrCancellation: true,
  platformChange: true,
  severeWeather: true,
  integrationFailure: true,
  quietHoursStart: "23:00",
  quietHoursEnd: "07:00"
};

test("phase 7 e2e gate covers fallback-labeled integrations across commute, notification, and AI brief flow", async () => {
  const planner = loadTsModule("lib/commute/route-planner.ts", {
    "./ns-live": {
      fetchNsLiveTrip: async () => ({
        data: null,
        source: {
          name: "NS API",
          retrievedAt: "2026-07-12T08:00:00.000Z",
          freshness: "fallback",
          confidence: 0.3,
          isFallback: true,
          error: "NS_API_KEY is not configured."
        }
      })
    },
    "../maps/google-routes": {
      fetchGoogleRoute: async ({ mode }) => ({
        data: {
          provider: "google-routes",
          mode,
          durationMinutes: null,
          staticDurationMinutes: null,
          distanceMeters: null,
          delayMinutes: 0,
          url: "https://www.google.com/maps/dir/"
        },
        source: {
          name: "Google Maps link",
          retrievedAt: "2026-07-12T08:00:00.000Z",
          freshness: "fallback",
          confidence: 0.35,
          isFallback: true,
          error: "GOOGLE_MAPS_API_KEY is not configured."
        }
      })
    },
    "../ns-commute": {
      build9292PlannerUrl: () => "https://9292.nl/",
      buildGoogleMapsUrl: () => "https://www.google.com/maps/dir/",
      buildNsPlannerUrl: () => "https://www.ns.nl/reisplanner/",
      fetchNsCommuteStatus: async () => ({
        source: "NS.nl",
        status: "attention",
        title: "Engineering works",
        checkedAt: "2026-07-12T08:00:00.000Z",
        url: "https://www.ns.nl/",
        alerts: [{ title: "Engineering works", detail: "Route closure requires review.", severity: "warning" }],
        options: []
      })
    },
    "../live-demo": {},
    "../providers/types": {}
  });

  const notificationRules = loadTsModule("lib/notifications/rules.ts", {
    "@/lib/ai/types": {},
    "@/lib/settings/preferences": {}
  });
  const dailyBriefTypes = loadTsModule("lib/ai/types.ts");
  const dailyBrief = loadTsModule("lib/ai/daily-brief.ts", {
    "./types": dailyBriefTypes,
    "../operations/resilience": { resilientFetch: fetch }
  });

  const plan = await planner.buildPhase4CommutePlan({
    commute: {
      home_address: "Lemmerstraat 18, Almere",
      work_address: "Admiraal Helfrichlaan 1, Utrecht",
      home_station: "Almere Centrum",
      work_station: "Utrecht Centraal"
    }
  });
  const decision = notificationRules.decideNotification({
    candidate: { eventType: "delay_or_cancellation", severity: plan.status },
    preferences: notificationPreferences,
    now: new Date("2026-07-12T08:30:00.000Z")
  });
  const brief = dailyBrief.buildFallbackDailyBrief({
    language: "en",
    today: "2026-07-12",
    generatedAt: "2026-07-12T08:30:00.000Z",
    duty: {
      todayLabel: "Late Shift 15:00-23:05",
      nextDutyLabel: "Night Shift 23:00-07:05",
      upcomingWorkingCount: 2,
      vacationOrRestCount: 1
    },
    commute: {
      routeLabel: plan.routeLabel,
      status: plan.status,
      recommendation: plan.recommended.title,
      isLive: plan.isLive,
      confidence: plan.confidence,
      incidents: plan.incidents,
      checkedAt: plan.generatedAt
    },
    calendar: {
      connected: false,
      lastSyncLabel: "Calendar not connected",
      sourceLabel: "Fallback roster snapshot"
    },
    email: {
      connected: false,
      actionableCount: null
    },
    weather: {
      label: "Weather unavailable",
      risk: "amber",
      source: "Weather provider",
      checkedAt: plan.generatedAt
    },
    conflicts: {
      count: 0,
      highest: null,
      risk: "green"
    },
    integrations: {
      fallbackCount: plan.sources.filter((source) => source.freshness === "fallback").length,
      unavailableCount: 0
    },
    sources: plan.sources.map((source) => ({
      label: source.name,
      source: source.name,
      timestamp: source.checkedAt,
      freshness: source.freshness,
      confidence: source.confidence
    }))
  });

  assert.equal(plan.isLive, false);
  assert.ok(plan.incidents.some((incident) => incident.type === "provider_fallback"));
  assert.equal(decision.status, "pending");
  assert.equal(decision.dedupeWindowMinutes, 45);
  assert.equal(brief.status, "amber");
  assert.ok(brief.facts.some((fact) => fact.label === "Commute" && /fallback/i.test(fact.value)));
});
