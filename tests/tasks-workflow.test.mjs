import test from "node:test";
import assert from "node:assert/strict";
import { createRequire } from "node:module";
import { readFileSync } from "node:fs";
import vm from "node:vm";
import ts from "typescript";

const require = createRequire(import.meta.url);

function loadTsModule(path) {
  const source = readFileSync(path, "utf8");
  const transpiled = ts.transpileModule(source, {
    compilerOptions: {
      module: ts.ModuleKind.CommonJS,
      target: ts.ScriptTarget.ES2020
    }
  }).outputText;
  const module = { exports: {} };
  vm.runInNewContext(transpiled, {
    module,
    exports: module.exports,
    require,
    Date
  });
  return module.exports;
}

test("NOVA workflow actions map to local task states", () => {
  const { workflowPatchForAction } = loadTsModule("lib/tasks/workflow.ts");
  const now = "2026-07-14T08:00:00.000Z";
  const normalize = (value) => JSON.parse(JSON.stringify(value));

  assert.deepEqual(normalize(workflowPatchForAction("accept", now)), {
    workflow_status: "accepted",
    accepted_at: now,
    updated_at: now
  });
  assert.deepEqual(normalize(workflowPatchForAction("start", now)), {
    workflow_status: "in_progress",
    accepted_at: now,
    started_at: now,
    updated_at: now
  });
  assert.deepEqual(normalize(workflowPatchForAction("done", now)), {
    workflow_status: "done",
    accepted_at: now,
    started_at: now,
    done_at: now,
    updated_at: now
  });
});

test("NOVA workflow routes update the right live-data table", () => {
  const { workflowTableForItemType, taskWorkflowRequestSchema } = loadTsModule("lib/tasks/workflow.ts");

  assert.equal(workflowTableForItemType("task"), "nova_tasks");
  assert.equal(workflowTableForItemType("appointment"), "nova_calendar_items");
  assert.equal(
    taskWorkflowRequestSchema.safeParse({
      itemType: "appointment",
      id: "7b1a7b89-f7ab-4fc0-a399-e2f3f1e40d4b",
      action: "start"
    }).success,
    true
  );
  assert.equal(
    taskWorkflowRequestSchema.safeParse({
      itemType: "birthday",
      id: "not-a-uuid",
      action: "complete"
    }).success,
    false
  );
});

test("NOVA workflow migration keeps Google data private and actionable", () => {
  const migration = readFileSync("supabase/migrations/20260714011500_nova_task_workflow.sql", "utf8");

  assert.match(migration, /alter table public\.nova_tasks/i);
  assert.match(migration, /alter table public\.nova_calendar_items/i);
  assert.match(migration, /workflow_status text not null default 'new'/i);
  assert.match(migration, /accepted_at timestamptz/i);
  assert.match(migration, /started_at timestamptz/i);
  assert.match(migration, /done_at timestamptz/i);
  assert.doesNotMatch(migration, /googleapis\.com\/calendar\/v3\/calendars\/.*\/events.*patch/i);
});
