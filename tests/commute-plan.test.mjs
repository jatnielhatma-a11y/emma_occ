import test from "node:test";
import assert from "node:assert/strict";
import { createRequire } from "node:module";
import { readFileSync } from "node:fs";
import vm from "node:vm";
import ts from "typescript";

const require = createRequire(import.meta.url);

function loadPlannerModule(mocks = {}) {
  const source = readFileSync("lib/commute/route-planner.ts", "utf8");
  const transpiled = ts.transpileModule(source, {
    compilerOptions: {
      module: ts.ModuleKind.CommonJS,
      target: ts.ScriptTarget.ES2020
    }
  }).outputText;
  const module = { exports: {} };
  const customRequire = (id) => {
    if (id === "./ns-live") {
      return {
        fetchNsLiveTrip:
          mocks.fetchNsLiveTrip ??
          (async () => ({
            data: null,
            source: {
              name: "NS API",
              retrievedAt: "2026-07-12T08:00:00.000Z",
              freshness: "fallback",
              confidence: 0.3,
              isFallback: true,
              error: "NS_API_KEY is not configured."
            }
          }))
      };
    }
    if (id === "../maps/google-routes") {
      return {
        fetchGoogleRoute:
          mocks.fetchGoogleRoute ??
          (async ({ mode }) => ({
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
          }))
      };
    }
    if (id === "../ns-commute") {
      return {
        build9292PlannerUrl: () => "https://9292.nl/",
        buildGoogleMapsUrl: () => "https://www.google.com/maps/dir/",
        buildNsPlannerUrl: () => "https://www.ns.nl/reisplanner/",
        fetchNsCommuteStatus:
          mocks.fetchNsCommuteStatus ??
          (async () => ({
            source: "NS.nl",
            status: "clear",
            title: "NS clear",
            checkedAt: "2026-07-12T08:00:00.000Z",
            url: "https://www.ns.nl/",
            homeStation: "Almere Centrum",
            workStation: "Utrecht Centraal",
            homeAddress: "Lemmerstraat 18, Almere",
            workAddress: "Utrecht",
            toWorkUrl: "https://www.ns.nl/reisplanner/",
            toHomeUrl: "https://www.ns.nl/reisplanner/",
            alerts: [],
            options: []
          }))
      };
    }
    if (id === "../live-demo" || id === "../providers/types") return {};
    return require(id);
  };
  vm.runInNewContext(transpiled, {
    module,
    exports: module.exports,
    require: customRequire,
    Date,
    URLSearchParams,
    process,
    Promise,
    Math,
    Number,
    String,
    Boolean
  });
  return module.exports;
}

const commute = {
  home_address: "Lemmerstraat 18, Almere",
  work_address: "Admiraal Helfrichlaan 1, Utrecht",
  home_station: "Almere Centrum",
  work_station: "Utrecht Centraal"
};

test("fallback providers create an amber plan with labeled fallback incidents", async () => {
  const { buildPhase4CommutePlan } = loadPlannerModule();
  const plan = await buildPhase4CommutePlan({ commute });

  assert.equal(plan.status, "amber");
  assert.equal(plan.isLive, false);
  assert.ok(plan.incidents.some((incident) => incident.type === "provider_fallback"));
  assert.equal(plan.recommended.isLive, false);
});

test("live NS trip can become the recommended route", async () => {
  const { buildPhase4CommutePlan } = loadPlannerModule({
    fetchNsLiveTrip: async () => ({
      data: {
        provider: "ns-api",
        durationMinutes: 58,
        plannedDurationMinutes: 58,
        delayMinutes: 0,
        transfers: 0,
        cancelled: false,
        platformChanged: false,
        disruptions: []
      },
      source: {
        name: "NS API",
        retrievedAt: "2026-07-12T08:00:00.000Z",
        freshness: "live",
        confidence: 0.9,
        isFallback: false
      }
    })
  });

  const plan = await buildPhase4CommutePlan({ commute });

  assert.equal(plan.recommended.id, "ns-live");
  assert.equal(plan.recommended.isLive, true);
  assert.equal(plan.status, "green");
});

test("traffic delay downgrades the driving backup", async () => {
  const { buildPhase4CommutePlan } = loadPlannerModule({
    fetchNsLiveTrip: async () => ({
      data: {
        provider: "ns-api",
        durationMinutes: 58,
        plannedDurationMinutes: 58,
        delayMinutes: 0,
        transfers: 0,
        cancelled: false,
        platformChanged: false,
        disruptions: []
      },
      source: {
        name: "NS API",
        retrievedAt: "2026-07-12T08:00:00.000Z",
        freshness: "live",
        confidence: 0.9,
        isFallback: false
      }
    }),
    fetchGoogleRoute: async ({ mode }) => ({
      data: {
        provider: "google-routes",
        mode,
        durationMinutes: 92,
        staticDurationMinutes: 52,
        distanceMeters: 68000,
        delayMinutes: 40,
        url: "https://www.google.com/maps/dir/"
      },
      source: {
        name: "Google Routes",
        retrievedAt: "2026-07-12T08:00:00.000Z",
        freshness: "live",
        confidence: 0.88,
        isFallback: false
      }
    })
  });

  const plan = await buildPhase4CommutePlan({ commute });
  const drive = [plan.recommended, ...plan.backups].find((option) => option.id === "google-drive");

  assert.equal(drive.risk, "red");
  assert.ok(plan.incidents.some((incident) => incident.type === "traffic_delay" && incident.severity === "red"));
});

test("return trip reverses the commute route", async () => {
  const { buildPhase4CommutePlan } = loadPlannerModule({
    fetchNsLiveTrip: async () => ({
      data: {
        provider: "ns-api",
        durationMinutes: 61,
        plannedDurationMinutes: 61,
        delayMinutes: 0,
        transfers: 1,
        cancelled: false,
        platformChanged: false,
        disruptions: []
      },
      source: {
        name: "NS API",
        retrievedAt: "2026-07-12T18:00:00.000Z",
        freshness: "live",
        confidence: 0.9,
        isFallback: false
      }
    })
  });

  const plan = await buildPhase4CommutePlan({ commute, direction: "return" });

  assert.equal(plan.direction, "return");
  assert.match(plan.routeLabel, /Utrecht/);
  assert.match(plan.routeLabel, /Almere/);
});

test("NS cancellation, platform change, and disruption create actionable incidents", async () => {
  const { buildPhase4CommutePlan } = loadPlannerModule({
    fetchNsLiveTrip: async () => ({
      data: {
        provider: "ns-api",
        durationMinutes: 90,
        plannedDurationMinutes: 58,
        delayMinutes: 32,
        transfers: 1,
        cancelled: true,
        platformChanged: true,
        disruptions: ["Engineering works between Almere and Utrecht."]
      },
      source: {
        name: "NS API",
        retrievedAt: "2026-07-12T08:00:00.000Z",
        freshness: "live",
        confidence: 0.9,
        isFallback: false
      }
    })
  });

  const plan = await buildPhase4CommutePlan({ commute });

  assert.equal(plan.status, "red");
  assert.ok(plan.incidents.some((incident) => incident.type === "platform_change"));
  assert.ok(plan.incidents.some((incident) => /cancellation/i.test(incident.title)));
  assert.ok(plan.incidents.some((incident) => /engineering works/i.test(incident.detail)));
});

test("severe weather adds an explicit commute buffer incident", async () => {
  const { buildPhase4CommutePlan } = loadPlannerModule({
    fetchNsLiveTrip: async () => ({
      data: {
        provider: "ns-api",
        durationMinutes: 58,
        plannedDurationMinutes: 58,
        delayMinutes: 0,
        transfers: 0,
        cancelled: false,
        platformChanged: false,
        disruptions: []
      },
      source: {
        name: "NS API",
        retrievedAt: "2026-07-12T08:00:00.000Z",
        freshness: "live",
        confidence: 0.9,
        isFallback: false
      }
    })
  });

  const plan = await buildPhase4CommutePlan({
    commute,
    weather: {
      source: "Weather test",
      location: "Almere",
      tempC: "3",
      feelsLikeC: "-2",
      description: "Storm with heavy rain",
      windKmph: "52",
      humidity: "92",
      observedAt: "08:00"
    }
  });

  assert.ok(plan.incidents.some((incident) => incident.type === "weather_buffer" && /12 minutes/.test(incident.detail)));
});
