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
    Map,
    String,
    Array,
    JSON,
    Object
  });
  return module.exports;
}

const openAiCore = loadTsModule("lib/nova/openai-core.ts", {
  "@/lib/ai/context": { buildNovaOperationalContext: async () => ({ duty: {}, commute: {}, calendar: {}, email: {}, weather: {}, conflicts: {} }) },
  "@/lib/operations/resilience": { resilientFetch: async () => ({ ok: false }) }
});

test("ChatGPT export conversations become private NOVA knowledge items", () => {
  const items = openAiCore.chatGptExportToKnowledgeItems([
    {
      id: "conv-1",
      title: "Travel planning",
      create_time: 1783980000,
      mapping: {
        a: { message: { author: { role: "user" }, content: { parts: ["Plan AMS airport commute"] } } },
        b: { message: { author: { role: "assistant" }, content: { parts: ["Use NS and leave buffer time."] } } }
      }
    }
  ]);

  assert.equal(items.length, 1);
  assert.equal(items[0].source_kind, "chatgpt_export");
  assert.equal(items[0].source_identifier, "conv-1");
  assert.match(items[0].summary, /AMS airport commute/);
  assert.match(items[0].content_excerpt, /assistant: Use NS/);
});

test("NOVA chat request schema keeps privacy switches explicit", () => {
  const parsed = openAiCore.novaChatRequestSchema.parse({ message: "Use my imported memory and search the web" });

  assert.equal(parsed.allowWeb, true);
  assert.equal(parsed.useImportedMemory, true);
  assert.equal(parsed.storeExchange, true);
  assert.equal(openAiCore.novaChatRequestSchema.safeParse({ message: "" }).success, false);
});

test("NOVA reference knowledge is selected for live cross-check decisions", () => {
  const selected = openAiCore.selectRelevantKnowledgeItems(
    [
      {
        title: "Old unrelated exchange",
        summary: "A casual note about coffee.",
        content_excerpt: "coffee",
        source_kind: "nova_chat",
        source_identifier: "nova-chat:old",
        source_created_at: "2026-07-12T08:00:00.000Z",
        metadata: {}
      },
      {
        title: "NOVA reference: trips, flights, accommodations, and ground transport",
        summary: "Trip to Curaçao and Alicante with hotel, rental car, and timing context.",
        content_excerpt: "Curaçao Wedding Mission 2026. Alicante & Murcia 2026. Hotel Nelva. Rental car.",
        source_kind: "manual",
        source_identifier: "nova_reference_database_v1:travel-missions",
        source_created_at: "2026-07-14T00:00:00.000Z",
        metadata: { importedFrom: "nova_reference_database_v1" }
      },
      {
        title: "NOVA reference: briefing cadence and behavior rules",
        summary: "Decision-focused daily brief rules with route, weather, schedule, and mission intelligence.",
        content_excerpt: "Cross-check domains and recommend best action and backup.",
        source_kind: "manual",
        source_identifier: "nova_reference_database_v1:briefing-rules",
        source_created_at: "2026-07-14T00:00:00.000Z",
        metadata: { importedFrom: "nova_reference_database_v1" }
      }
    ],
    "What is the best option for my Curacao travel mission?",
    2
  );

  assert.equal(selected.length, 2);
  assert.equal(selected[0].source_identifier, "nova_reference_database_v1:travel-missions");
  assert.ok(selected.some((item) => item.source_identifier === "nova_reference_database_v1:briefing-rules"));
});

test("NOVA OpenAI memory migration uses RLS and avoids raw export storage", () => {
  const migration = readFileSync("supabase/migrations/20260714014500_nova_openai_memory.sql", "utf8");

  assert.match(migration, /create table if not exists public\.nova_ai_knowledge_items/i);
  assert.match(migration, /alter table public\.nova_ai_knowledge_items enable row level security/i);
  assert.match(migration, /to authenticated/i);
  assert.match(migration, /unique \(user_id, source_kind, source_identifier\)/i);
  assert.doesNotMatch(migration, /\braw_export\b/i);
});
