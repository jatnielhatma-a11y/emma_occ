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
    Array,
    Boolean,
    Math,
    Number,
    Object,
    String
  });
  return module.exports;
}

function loadLifeDomains() {
  return loadTsModule("lib/nova/life-domains.ts");
}

test("Release 3 life-domain schema accepts every planned domain", () => {
  const { lifeDomainRecordSchema } = loadLifeDomains();
  const domains = ["finance", "home", "travel", "health", "learning"];

  for (const domain of domains) {
    const parsed = lifeDomainRecordSchema.parse({ domain, title: `${domain} record` });
    assert.equal(parsed.domain, domain);
    assert.equal(parsed.status, "active");
    assert.equal(parsed.priority, 3);
    assert.equal(parsed.currency, "EUR");
  }
});

test("life-domain readiness reports coverage and recommendation state", () => {
  const { buildLifeDomainReadiness } = loadLifeDomains();
  const readiness = buildLifeDomainReadiness({
    finance: 1,
    home: 0,
    travel: 2,
    health: 0,
    learning: 3
  });

  assert.equal(readiness.activeDomainCount, 3);
  assert.equal(readiness.totalRecords, 6);
  assert.equal(readiness.allDomainsStarted, false);
  assert.equal(readiness.recommendationStatus, "context-ready");
});

test("privacy notes keep finance and health inside Release 3 boundaries", () => {
  const { domainPrivacyNote } = loadLifeDomains();

  assert.match(domainPrivacyNote("finance"), /No bank connection/i);
  assert.match(domainPrivacyNote("health"), /not medical advice/i);
});

test("savings and learning capabilities are active without bank automation", () => {
  const { learningCapabilitySummary, savingsCapabilitySummary } = loadLifeDomains();
  const records = [
    {
      domain: "finance",
      category: "savings_goal",
      status: "active",
      amountCents: 250000,
      title: "Family buffer",
      detail: "",
      priority: 2,
      targetDate: null,
      currency: "EUR",
      tags: [],
      sensitive: true
    },
    {
      domain: "learning",
      category: "learning_plan",
      status: "active",
      amountCents: null,
      title: "French refresh",
      detail: "",
      priority: 3,
      targetDate: null,
      currency: "EUR",
      tags: [],
      sensitive: false
    }
  ];

  const savings = savingsCapabilitySummary(records);
  const learning = learningCapabilitySummary(records);

  assert.equal(savings.active, true);
  assert.equal(savings.activeGoals, 1);
  assert.equal(savings.totalTargetCents, 250000);
  assert.equal(savings.privacyMode, "manual-no-bank-connection");
  assert.equal(learning.active, true);
  assert.equal(learning.activePlans, 1);
  assert.equal(learning.recommendationMode, "reviewable");
});
