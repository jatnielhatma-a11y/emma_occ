import test from "node:test";
import assert from "node:assert/strict";
import { createRequire } from "node:module";
import { readFileSync } from "node:fs";
import vm from "node:vm";
import ts from "typescript";

const require = createRequire(import.meta.url);

function loadEmmaAnswersModule() {
  const source = readFileSync("lib/emma/answers.ts", "utf8");
  const transpiled = ts.transpileModule(source, {
    compilerOptions: {
      module: ts.ModuleKind.CommonJS,
      target: ts.ScriptTarget.ES2020
    }
  }).outputText;
  const module = { exports: {} };
  vm.runInNewContext(transpiled, { module, exports: module.exports, require });
  return module.exports;
}

const { answerFromRoster, buildEmmaContextSummary } = loadEmmaAnswersModule();

const context = {
  today: "2026-07-07",
  duties: [
    {
      duty_date: "2026-07-07",
      start_time: null,
      end_time: null,
      duty_label: "OFF Day",
      location: null,
      is_off: true,
      is_overnight: false
    },
    {
      duty_date: "2026-07-10",
      start_time: "23:00",
      end_time: "07:05",
      duty_label: "Night Shift",
      location: "Utrecht",
      is_off: false,
      is_overnight: true
    }
  ],
  conflicts: [
    {
      severity: "Low",
      title: "Duty crosses midnight",
      detail: "2026-07-10 ends on the following calendar day.",
      conflictType: "overnight_duty"
    }
  ]
};

test("Emma answers next duty from roster context", () => {
  const answer = answerFromRoster("What is my next duty?", context);
  assert.match(answer, /2026-07-10/);
  assert.match(answer, /Night Shift/);
});

test("Emma summarizes bounded roster context", () => {
  const summary = buildEmmaContextSummary(context);
  assert.equal(summary.dutyCount, 2);
  assert.equal(summary.nightShifts, 1);
  assert.equal(summary.conflicts, 1);
});
