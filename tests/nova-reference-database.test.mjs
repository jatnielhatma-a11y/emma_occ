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
    Object,
    String,
    Array,
    Boolean
  });
  return module.exports;
}

const referenceDatabase = loadTsModule("lib/nova/reference-database.ts", {
  "@/lib/nova/openai-core": {}
});

const samplePayload = {
  kind: "nova_reference_database",
  version: "1.0",
  exportedAt: "2026-07-14T00:00:00.000Z",
  tables: {
    metadata: [
      { key: "database_name", value: "NOVA Reference Database" },
      { key: "privacy_notice", value: "Private reference data." }
    ],
    projects: [{ id: 1, name: "NOVA", project_type: "personal intelligence platform", status: "beta" }],
    product_requirements: [{ id: 1, project_id: 1, category: "Identity", requirement: "Reason Beyond Information" }],
    persons: [{ id: 1, full_name: "Example Person", preferred_name: "Example", sensitivity: "confidential" }],
    important_dates: [{ id: 1, title: "Example birthday", date_value: "2026-01-01", recurrence: "YEARLY" }],
    trips: [{ id: 1, name: "Example Mission", destination_country: "Netherlands", status: "confirmed" }]
  }
};

test("NOVA reference database payload is detected explicitly", () => {
  assert.equal(referenceDatabase.isNovaReferenceDatabasePayload(samplePayload), true);
  assert.equal(referenceDatabase.isNovaReferenceDatabasePayload({ conversations: [] }), false);
});

test("NOVA reference database becomes grouped private knowledge items", () => {
  const items = referenceDatabase.novaReferenceDatabaseToKnowledgeItems(samplePayload);

  assert.ok(items.length >= 3);
  assert.ok(items.every((item) => item.source_kind === "manual"));
  assert.ok(items.every((item) => item.metadata.importedFrom === "nova_reference_database_v1"));
  assert.ok(items.every((item) => item.metadata.rawDatabaseStored === false));
  assert.ok(items.some((item) => item.content_excerpt.includes("Reason Beyond Information")));
  assert.ok(items.some((item) => item.content_excerpt.includes("Example Mission")));
});

test("NOVA reference summary reports table counts without exposing raw database storage", () => {
  const summary = referenceDatabase.summarizeNovaReferenceDatabase(samplePayload);

  assert.equal(summary.databaseName, "NOVA Reference Database");
  assert.equal(summary.tableCounts.projects, 1);
  assert.equal(summary.tableCounts.trips, 1);
  assert.equal(summary.totalRows, 7);
});
