import test from "node:test";
import assert from "node:assert/strict";
import { createRequire } from "node:module";
import { readFileSync } from "node:fs";
import vm from "node:vm";
import ts from "typescript";

const require = createRequire(import.meta.url);

function loadExtractModule() {
  const source = readFileSync("lib/roster/extract.ts", "utf8");
  const transpiled = ts.transpileModule(source, {
    compilerOptions: {
      module: ts.ModuleKind.CommonJS,
      target: ts.ScriptTarget.ES2020
    }
  }).outputText;
  const module = { exports: {} };
  const localRequire = (specifier) => {
    if (specifier === "./core") return require("../lib/roster/core.js");
    return require(specifier);
  };
  vm.runInNewContext(transpiled, { module, exports: module.exports, require: localRequire, Buffer, process, TextEncoder });
  return module.exports;
}

const { extractRosterText, normalizeExtractedRosterText } = loadExtractModule();

test("normalizes fenced OCR CSV output", () => {
  const normalized = normalizeExtractedRosterText(
    ["```csv", "Date,Start time,End time,Duty code,Duty label,Location,Notes", "2026-07-10,23:00,07:05,382G,,Utrecht,Night duty", "```"].join("\n")
  );

  assert.match(normalized, /^Date,Start time,End time/);
  assert.match(normalized, /382G/);
});

test("imports pasted roster rows without an explicit header", () => {
  const result = extractRosterText("2026-07-10,23:00,07:05,382G,,Utrecht,Night duty", "manual");

  assert.equal(result.extractor, "text");
  assert.equal(result.duties.length, 1);
  assert.equal(result.duties[0].dutyLabel, "Night Shift");
  assert.equal(result.duties[0].location, "Utrecht");
});
