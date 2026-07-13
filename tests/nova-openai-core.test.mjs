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

test("NOVA OpenAI memory migration uses RLS and avoids raw export storage", () => {
  const migration = readFileSync("supabase/migrations/20260714014500_nova_openai_memory.sql", "utf8");

  assert.match(migration, /create table if not exists public\.nova_ai_knowledge_items/i);
  assert.match(migration, /alter table public\.nova_ai_knowledge_items enable row level security/i);
  assert.match(migration, /to authenticated/i);
  assert.match(migration, /unique \(user_id, source_kind, source_identifier\)/i);
  assert.doesNotMatch(migration, /\braw_export\b/i);
});
