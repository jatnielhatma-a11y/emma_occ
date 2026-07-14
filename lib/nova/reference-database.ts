import type { KnowledgeItem } from "@/lib/nova/openai-core";

type Row = Record<string, unknown>;
type ReferenceTables = Record<string, Row[]>;

export type NovaReferenceDatabasePayload = {
  kind?: string;
  source?: string;
  version?: string;
  exportedAt?: string;
  tables?: ReferenceTables;
};

const referenceSource = "nova_reference_database_v1";

const groupedSections = [
  {
    id: "identity-projects",
    title: "NOVA reference: identity, projects, and product requirements",
    tables: ["metadata", "projects", "product_requirements"]
  },
  {
    id: "personal-network",
    title: "NOVA reference: people, aliases, relationships, and roles",
    tables: ["persons", "aliases", "relationships", "organizations", "person_roles"]
  },
  {
    id: "personal-context",
    title: "NOVA reference: preferences, skills, routines, and important dates",
    tables: ["preferences", "skills", "person_skills", "routines", "important_dates"]
  },
  {
    id: "travel-missions",
    title: "NOVA reference: trips, flights, accommodations, and ground transport",
    tables: ["trips", "flights", "accommodations", "ground_transport"]
  },
  {
    id: "event-timeline",
    title: "NOVA reference: events and mission timeline",
    tables: ["events", "event_timeline"]
  },
  {
    id: "places-and-organizations",
    title: "NOVA reference: addresses, locations, businesses, and organizations",
    tables: ["addresses", "locations", "businesses", "organizations"]
  },
  {
    id: "briefing-rules",
    title: "NOVA reference: briefing cadence and behavior rules",
    tables: ["briefing_rules"]
  },
  {
    id: "audit-and-conflicts",
    title: "NOVA reference: audit notes and source conflicts",
    tables: ["audit_notes", "source_conflicts"]
  }
];

function rowsFor(payload: NovaReferenceDatabasePayload, tableName: string) {
  return Array.isArray(payload.tables?.[tableName]) ? payload.tables[tableName] : [];
}

function cleanText(value: unknown) {
  if (value === null || value === undefined || value === "") return "";
  return String(value).replace(/\s+/g, " ").trim();
}

function rowLabel(row: Row) {
  return cleanText(row.title ?? row.name ?? row.full_name ?? row.key ?? row.id ?? "record");
}

function formatRow(row: Row) {
  return Object.entries(row)
    .filter(([, value]) => cleanText(value))
    .map(([key, value]) => `${key}: ${cleanText(value)}`)
    .join("; ");
}

function formatTable(tableName: string, rows: Row[]) {
  if (!rows.length) return "";
  const body = rows.map((row) => `- ${rowLabel(row)} | ${formatRow(row)}`).join("\n");
  return `## ${tableName}\n${body}`;
}

function excerpt(value: string, limit: number) {
  return value.replace(/\s+/g, " ").trim().slice(0, limit);
}

function metadataValue(payload: NovaReferenceDatabasePayload, key: string) {
  const row = rowsFor(payload, "metadata").find((item) => cleanText(item.key) === key);
  return cleanText(row?.value);
}

export function isNovaReferenceDatabasePayload(payload: unknown): payload is NovaReferenceDatabasePayload {
  if (!payload || typeof payload !== "object") return false;
  const candidate = payload as NovaReferenceDatabasePayload;
  return candidate.kind === "nova_reference_database" && Boolean(candidate.tables && typeof candidate.tables === "object");
}

export function summarizeNovaReferenceDatabase(payload: NovaReferenceDatabasePayload) {
  const tables = payload.tables ?? {};
  const tableCounts = Object.fromEntries(Object.entries(tables).map(([tableName, rows]) => [tableName, Array.isArray(rows) ? rows.length : 0]));
  const totalRows = Object.values(tableCounts).reduce((sum, count) => sum + count, 0);

  return {
    source: referenceSource,
    version: payload.version || metadataValue(payload, "version") || "unknown",
    databaseName: metadataValue(payload, "database_name") || "NOVA Reference Database",
    timezone: metadataValue(payload, "default_timezone") || "Europe/Amsterdam",
    privacyNotice: metadataValue(payload, "privacy_notice") || "Private NOVA reference data.",
    tableCounts,
    totalRows
  };
}

export function novaReferenceDatabaseToKnowledgeItems(payload: NovaReferenceDatabasePayload): KnowledgeItem[] {
  const summary = summarizeNovaReferenceDatabase(payload);
  const sourceCreatedAt = payload.exportedAt || metadataValue(payload, "created_at") || new Date().toISOString();

  const items: KnowledgeItem[] = [];

  for (const section of groupedSections) {
    const sectionBlocks = section.tables
      .map((tableName) => formatTable(tableName, rowsFor(payload, tableName)))
      .filter(Boolean);

    if (!sectionBlocks.length) continue;

    const content = [
      `Source: ${summary.databaseName}`,
      `Version: ${summary.version}`,
      `Timezone: ${summary.timezone}`,
      `Privacy: ${summary.privacyNotice}`,
      "",
      ...sectionBlocks
    ].join("\n");

    items.push({
      title: section.title,
      summary: excerpt(content, 900),
      content_excerpt: excerpt(content, 5000),
      source_kind: "manual",
      source_identifier: `${referenceSource}:${section.id}`,
      source_created_at: sourceCreatedAt,
      metadata: {
        importedFrom: referenceSource,
        section: section.id,
        tables: section.tables,
        version: summary.version,
        privateReference: true,
        rawDatabaseStored: false
      }
    });
  }

  return items;
}
