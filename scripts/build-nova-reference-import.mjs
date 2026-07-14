import { existsSync, mkdirSync, writeFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { spawnSync } from "node:child_process";

const inputPath = resolve(process.argv[2] ?? "");
const outputPath = resolve(process.argv[3] ?? "work/nova-reference-import.json");

const tables = [
  "metadata",
  "persons",
  "aliases",
  "addresses",
  "relationships",
  "organizations",
  "person_roles",
  "businesses",
  "skills",
  "person_skills",
  "preferences",
  "important_dates",
  "trips",
  "flights",
  "accommodations",
  "ground_transport",
  "events",
  "event_timeline",
  "routines",
  "locations",
  "projects",
  "product_requirements",
  "briefing_rules",
  "source_conflicts",
  "audit_notes"
];

if (!inputPath || !existsSync(inputPath)) {
  console.error("Usage: node scripts/build-nova-reference-import.mjs /path/to/NOVA_reference_database_v1.sqlite [output.json]");
  process.exit(1);
}

function readTable(tableName) {
  const result = spawnSync("sqlite3", ["-json", inputPath, `select * from ${tableName};`], {
    encoding: "utf8",
    maxBuffer: 10 * 1024 * 1024
  });

  if (result.status !== 0) {
    throw new Error(result.stderr || `Failed to read ${tableName}`);
  }

  return result.stdout.trim() ? JSON.parse(result.stdout) : [];
}

const payload = {
  kind: "nova_reference_database",
  source: "nova_reference_database_v1.sqlite",
  version: "1.0",
  exportedAt: new Date().toISOString(),
  tables: Object.fromEntries(tables.map((tableName) => [tableName, readTable(tableName)]))
};

mkdirSync(dirname(outputPath), { recursive: true });
writeFileSync(outputPath, `${JSON.stringify(payload, null, 2)}\n`);

const counts = Object.fromEntries(Object.entries(payload.tables).map(([tableName, rows]) => [tableName, rows.length]));
console.log(`Created ${outputPath}`);
console.log(JSON.stringify({ tables: counts, totalRows: Object.values(counts).reduce((sum, count) => sum + count, 0) }, null, 2));
