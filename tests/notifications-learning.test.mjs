import test from "node:test";
import assert from "node:assert/strict";
import { createRequire } from "node:module";
import { readFileSync } from "node:fs";
import vm from "node:vm";
import ts from "typescript";

const require = createRequire(import.meta.url);

function loadTsModule(path, mocks = {}) {
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
    String
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

test("suppresses green notification candidates", () => {
  const { decideNotification } = loadTsModule("lib/notifications/rules.ts", {
    "@/lib/ai/types": {},
    "@/lib/settings/preferences": {}
  });

  const decision = decideNotification({
    candidate: { eventType: "daily_brief", severity: "green" },
    preferences: notificationPreferences,
    now: new Date("2026-07-12T10:00:00.000Z")
  });

  assert.equal(decision.shouldNotify, false);
  assert.equal(decision.status, "suppressed");
});

test("suppresses duplicate amber alerts during cooldown", () => {
  const { decideNotification } = loadTsModule("lib/notifications/rules.ts", {
    "@/lib/ai/types": {},
    "@/lib/settings/preferences": {}
  });

  const decision = decideNotification({
    candidate: { eventType: "delay_or_cancellation", severity: "amber" },
    preferences: notificationPreferences,
    now: new Date("2026-07-12T10:20:00.000Z"),
    recentDuplicateCreatedAt: "2026-07-12T10:00:00.000Z",
    cooldownMinutes: 45
  });

  assert.equal(decision.shouldNotify, false);
  assert.match(decision.reason, /Duplicate/);
  assert.equal(decision.cooldownUntil, "2026-07-12T10:45:00.000Z");
});

test("allows red alerts during quiet hours", () => {
  const { decideNotification } = loadTsModule("lib/notifications/rules.ts", {
    "@/lib/ai/types": {},
    "@/lib/settings/preferences": {}
  });

  const decision = decideNotification({
    candidate: { eventType: "delay_or_cancellation", severity: "red" },
    preferences: notificationPreferences,
    now: new Date("2026-07-12T22:30:00.000Z")
  });

  assert.equal(decision.shouldNotify, true);
  assert.equal(decision.status, "pending");
});

test("calculates and blends walking speed samples", () => {
  const { calculateWalkingSpeedKmh, walkingSampleConfidence, blendWalkingSpeedPreference, routePreferenceDeltaForFeedback } = loadTsModule(
    "lib/learning/walking-speed.ts"
  );

  const sample = { distanceMeters: 1000, durationSeconds: 720, source: "manual" };
  const speed = calculateWalkingSpeedKmh(sample);
  const confidence = walkingSampleConfidence(sample);
  const learned = blendWalkingSpeedPreference(4.8, speed, confidence);

  assert.equal(speed, 5);
  assert.ok(confidence > 0.4);
  assert.ok(learned > 4.8);
  assert.equal(
    JSON.stringify(routePreferenceDeltaForFeedback("too_many_transfers")),
    JSON.stringify({
      minimizeTransfers: true,
      preferDirectTrains: true
    })
  );
});
