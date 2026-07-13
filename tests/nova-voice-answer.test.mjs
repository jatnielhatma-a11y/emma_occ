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
    Date,
    Intl,
    Math,
    Number,
    Object,
    Promise,
    Set,
    String,
    process
  });
  return module.exports;
}

function fakeContext() {
  return {
    language: "en",
    today: "2026-07-13",
    generatedAt: "2026-07-13T08:00:00.000Z",
    duty: {
      todayLabel: "2026-07-13 - Late Shift 15:00-23:05",
      nextDutyLabel: "2026-07-13 - Late Shift 15:00-23:05",
      upcomingWorkingCount: 2,
      vacationOrRestCount: 1
    },
    commute: {
      routeLabel: "Home to work",
      status: "green",
      recommendation: "NS route clear",
      isLive: true,
      confidence: 0.82,
      incidents: [],
      checkedAt: "2026-07-13T08:00:00.000Z"
    },
    calendar: {
      connected: true,
      lastSyncLabel: "Last sync 13 Jul 2026, 08:00",
      sourceLabel: "Google Calendar snapshot"
    },
    email: { connected: true, actionableCount: null },
    weather: {
      label: "18C, Partly cloudy",
      risk: "green",
      source: "Weather provider",
      checkedAt: "2026-07-13T08:00:00.000Z"
    },
    conflicts: { count: 0, highest: null, risk: "green" },
    integrations: { fallbackCount: 0, unavailableCount: 0 },
    sources: [
      { label: "Roster", source: "Supabase", timestamp: "2026-07-13T08:00:00.000Z", freshness: "recent", confidence: 0.9 },
      { label: "Calendar", source: "Google Calendar", timestamp: "2026-07-13T08:00:00.000Z", freshness: "recent", confidence: 0.9 }
    ]
  };
}

class FakeQuery {
  constructor(table) {
    this.table = table;
  }
  select() {
    return this;
  }
  eq() {
    return this;
  }
  in() {
    return this;
  }
  is() {
    return this;
  }
  gte() {
    return this;
  }
  lte() {
    return this;
  }
  order() {
    return this;
  }
  limit() {
    return this;
  }
  maybeSingle() {
    if (this.table === "imports") {
      return Promise.resolve({ data: { id: "import-1", filename: "calendar", file_type: "calendar/snapshot", imported_at: "2026-07-13T08:00:00.000Z" } });
    }
    return Promise.resolve({ data: null });
  }
  then(resolve) {
    if (this.table === "duties") {
      return Promise.resolve({
        data: [
          {
            id: "duty-1",
            duty_date: "2026-07-13",
            start_time: "15:00",
            end_time: "23:05",
            duty_label: "Late Shift",
            original_duty_code: "L",
            location: "AMS",
            is_off: false
          }
        ]
      }).then(resolve);
    }
    if (this.table === "nova_life_domain_records") {
      return Promise.resolve({
        data: [
          {
            domain: "learning",
            title: "French refresh",
            detail: "",
            category: "learning_plan",
            status: "active",
            priority: 3,
            target_date: null,
            amount_cents: null,
            currency: "EUR",
            tags: ["learning"],
            sensitive: false,
            created_at: "2026-07-13T08:00:00.000Z"
          }
        ]
      }).then(resolve);
    }
    if (this.table === "notification_events") {
      return Promise.resolve({ count: 0 }).then(resolve);
    }
    return Promise.resolve({ data: [] }).then(resolve);
  }
}

function fakeSupabase() {
  return {
    from(table) {
      return new FakeQuery(table);
    }
  };
}

function loadVoiceAnswer(resilientFetch) {
  const mission = loadTsModule("lib/nova/mission-intelligence.ts");
  const life = loadTsModule("lib/nova/life-domains.ts");
  return loadTsModule("lib/nova/voice-answer.ts", {
    "@/lib/ai/context": { buildNovaOperationalContext: async () => fakeContext() },
    "@/lib/operations/resilience": { resilientFetch },
    "@/lib/roster/ledger": { shiftCodeDescription: (duty) => `${duty.original_duty_code} - ${duty.duty_label}` },
    "./mission-intelligence": mission,
    "./life-domains": life
  });
}

test("NOVA voice answers personal duty questions from app context", async () => {
  const previousKey = process.env.OPENAI_API_KEY;
  process.env.OPENAI_API_KEY = "";
  const { answerNovaVoiceCommand } = loadVoiceAnswer(async () => {
    throw new Error("web should not be called for personal duty questions");
  });

  const answer = await answerNovaVoiceCommand({
    supabase: fakeSupabase(),
    userId: "user-1",
    transcript: "What is my next duty?",
    allowWeb: true
  });

  assert.equal(answer.ok, true);
  assert.equal(answer.usedWeb, false);
  assert.match(answer.answer, /10-day duty ledger/i);
  assert.match(answer.answer, /L - Late Shift/i);
  process.env.OPENAI_API_KEY = previousKey;
});

test("NOVA voice can use public web lookup for general questions", async () => {
  const previousKey = process.env.OPENAI_API_KEY;
  process.env.OPENAI_API_KEY = "";
  const { answerNovaVoiceCommand } = loadVoiceAnswer(async (url) => {
    const value = String(url);
    if (value.includes("duckduckgo")) {
      return {
        ok: true,
        json: async () => ({
          Heading: "Amsterdam",
          AbstractText: "Amsterdam is the capital and most populous city of the Netherlands.",
          AbstractURL: "https://duckduckgo.com/Amsterdam"
        })
      };
    }
    if (value.includes("opensearch")) {
      return { ok: true, json: async () => ["Amsterdam", ["Amsterdam"]] };
    }
    return {
      ok: true,
      json: async () => ({
        extract: "Amsterdam is the capital city of the Netherlands.",
        content_urls: { desktop: { page: "https://en.wikipedia.org/wiki/Amsterdam" } }
      })
    };
  });

  const answer = await answerNovaVoiceCommand({
    supabase: fakeSupabase(),
    userId: "user-1",
    transcript: "What is Amsterdam?",
    allowWeb: true
  });

  assert.equal(answer.ok, true);
  assert.equal(answer.usedWeb, true);
  assert.match(answer.answer, /Amsterdam/i);
  assert.ok(answer.sources.some((source) => source.source === "Wikipedia" || source.source === "DuckDuckGo Instant Answer"));
  process.env.OPENAI_API_KEY = previousKey;
});
