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
    URLSearchParams,
    Number,
    Boolean
  });
  return module.exports;
}

const googleOauth = loadTsModule("lib/google/oauth.ts", {
  "../operations/resilience": { resilientFetch: async () => ({ ok: true, json: async () => ({}) }) }
});
const googleImport = loadTsModule("lib/calendar/google-import.ts", {
  "@/lib/google/oauth": googleOauth,
  "@/lib/operations/resilience": { resilientFetch: async () => ({ ok: true, json: async () => ({}) }) }
});

test("Google birthday events become special-date calendar items and NOVA reminders", () => {
  const item = googleImport.calendarEventToNovaItem({
    userId: "user-1",
    calendar: { id: "birthdays", summary: "Birthdays" },
    syncedAt: "2026-07-13T10:00:00.000Z",
    event: {
      id: "birthday-1",
      summary: "Sam birthday",
      eventType: "birthday",
      status: "confirmed",
      start: { date: "2026-08-02" },
      end: { date: "2026-08-03" },
      birthdayProperties: { type: "birthday" },
      htmlLink: "https://calendar.google.com/event"
    }
  });
  const task = googleImport.specialDateTaskFromCalendarItem(item);

  assert.equal(item.item_kind, "special_date");
  assert.equal(item.is_all_day, true);
  assert.equal(item.all_day_date, "2026-08-02");
  assert.equal(item.special_date_label, "birthday");
  assert.equal(task.title, "Sam birthday");
  assert.equal(task.due_date, "2026-08-02");
  assert.equal(task.source_kind, "special_date");
});

test("Google Tasks map to NOVA tasks with due dates and completion", () => {
  const task = googleImport.googleTaskToNovaTask({
    userId: "user-1",
    taskList: { id: "list-1", title: "Personal" },
    syncedAt: "2026-07-13T10:00:00.000Z",
    task: {
      id: "task-1",
      title: "Renew passport",
      notes: "Bring photo",
      status: "completed",
      due: "2026-09-01T00:00:00.000Z",
      completed: "2026-08-20T11:00:00.000Z"
    }
  });

  assert.equal(task.source_provider, "google_tasks");
  assert.equal(task.source_list_id, "list-1");
  assert.equal(task.title, "Renew passport");
  assert.equal(task.status, "completed");
  assert.equal(task.due_date, "2026-09-01");
  assert.equal(task.completed_at, "2026-08-20T11:00:00.000Z");
});

test("Google import window is bounded for operational freshness", () => {
  const window = googleImport.buildGoogleImportWindow(new Date("2026-07-13T00:00:00.000Z"));

  assert.equal(window.timeMin, "2026-06-13T00:00:00.000Z");
  assert.equal(window.timeMax, "2027-07-18T00:00:00.000Z");
});
