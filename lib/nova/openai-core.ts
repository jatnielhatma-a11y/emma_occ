import { z } from "zod";
import { buildNovaOperationalContext } from "@/lib/ai/context";
import { resilientFetch } from "@/lib/operations/resilience";

type SupabaseLike = {
  from(table: string): any;
};

export type KnowledgeItem = {
  id?: string;
  title: string;
  summary: string;
  content_excerpt: string;
  source_kind: "chatgpt_export" | "nova_chat" | "manual" | "web_search";
  source_identifier: string;
  source_created_at?: string | null;
  metadata?: Record<string, unknown>;
};

const stopWords = new Set([
  "about",
  "after",
  "again",
  "also",
  "and",
  "are",
  "best",
  "can",
  "could",
  "day",
  "for",
  "from",
  "have",
  "how",
  "into",
  "make",
  "my",
  "nova",
  "option",
  "options",
  "please",
  "should",
  "that",
  "the",
  "this",
  "through",
  "to",
  "use",
  "what",
  "when",
  "with",
  "you"
]);

export const novaChatRequestSchema = z.object({
  message: z.string().trim().min(1).max(4000),
  allowWeb: z.boolean().default(true),
  useImportedMemory: z.boolean().default(true),
  storeExchange: z.boolean().default(true)
});

export const novaChatAnswerSchema = z.object({
  ok: z.literal(true),
  answer: z.string(),
  generatedBy: z.enum(["openai", "fallback"]),
  usedWeb: z.boolean(),
  usedImportedMemory: z.boolean(),
  sourceCount: z.number().int().min(0),
  model: z.string().nullable()
});

export type NovaChatAnswer = z.infer<typeof novaChatAnswerSchema>;

function textFromPart(part: unknown) {
  if (typeof part === "string") return part;
  if (part && typeof part === "object" && "text" in part) return String((part as { text?: unknown }).text ?? "");
  return "";
}

function extractMessageText(message: any) {
  const parts = message?.content?.parts;
  if (Array.isArray(parts)) return parts.map(textFromPart).filter(Boolean).join("\n");
  if (typeof message?.content?.text === "string") return message.content.text;
  return "";
}

function isoFromUnixSeconds(value: unknown) {
  return typeof value === "number" ? new Date(value * 1000).toISOString() : null;
}

function excerpt(value: string, limit = 3200) {
  return value.replace(/\s+/g, " ").trim().slice(0, limit);
}

function tokensFromMessage(message: string) {
  return Array.from(
    new Set(
      message
        .toLowerCase()
        .replace(/[^a-z0-9\u00c0-\u024f]+/gi, " ")
        .split(/\s+/)
        .map((token) => token.trim())
        .filter((token) => token.length >= 3 && !stopWords.has(token))
    )
  );
}

function isNovaReferenceItem(item: KnowledgeItem) {
  return item.source_identifier.startsWith("nova_reference_database_v1:") || item.metadata?.importedFrom === "nova_reference_database_v1";
}

function knowledgeText(item: KnowledgeItem) {
  return `${item.title} ${item.summary} ${item.content_excerpt} ${item.source_identifier}`.toLowerCase();
}

function scoreKnowledgeItem(item: KnowledgeItem, tokens: string[]) {
  const haystack = knowledgeText(item);
  const tokenScore = tokens.reduce((score, token) => score + (haystack.includes(token) ? 3 : 0), 0);
  const referenceScore = isNovaReferenceItem(item) ? 4 : 0;
  const chatScore = item.source_kind === "nova_chat" ? 1 : 0;
  return tokenScore + referenceScore + chatScore;
}

export function selectRelevantKnowledgeItems(items: KnowledgeItem[], message: string, limit = 14) {
  const tokens = tokensFromMessage(message);
  const seen = new Set<string>();
  const ranked = [...items]
    .map((item, index) => ({ item, index, score: scoreKnowledgeItem(item, tokens) }))
    .sort((a, b) => b.score - a.score || a.index - b.index);

  const selected: KnowledgeItem[] = [];
  for (const candidate of ranked) {
    const key = `${candidate.item.source_kind}:${candidate.item.source_identifier}`;
    if (seen.has(key)) continue;
    if (candidate.score <= 0 && selected.length >= 6) continue;
    selected.push(candidate.item);
    seen.add(key);
    if (selected.length >= limit) break;
  }

  return selected;
}

function knowledgeItemsForPrompt(items: KnowledgeItem[]) {
  return items.map((item) => ({
    title: item.title,
    sourceKind: item.source_kind,
    sourceIdentifier: item.source_identifier,
    createdAt: item.source_created_at,
    referenceDatabase: isNovaReferenceItem(item),
    summary: item.summary,
    excerpt: excerpt(item.content_excerpt, isNovaReferenceItem(item) ? 2200 : 1400),
    metadata: item.metadata ?? {}
  }));
}

function buildNovaDecisionInstructions() {
  return [
    "You are NOVA AI, a private personal operations and decision-support assistant inside the user's NOVA dashboard.",
    "Use live NOVA app context first, then imported NOVA reference database and ChatGPT export memory, then public web search only when enabled and useful.",
    "Cross-check conflicts between live data and imported memory. Treat live calendar, duty, commute, weather, and health/status data as fresher than historical reference records.",
    "When the user asks for planning, decisions, risks, or options, answer with: current facts, cross-checks, predicted risks/opportunities, best option, backup option, and next action.",
    "Label uncertainty and fallback data clearly. Never imply a source is live if it came from imported memory.",
    "Do not claim access to the user's private ChatGPT account or private ChatGPT search history. Imported data is user-provided context only.",
    "Do not perform calendar, email, notification, commute, memory, financial, medical, or external actions without explicit confirmation. You may draft recommendations and decision options.",
    "Keep answers concise, practical, and mission-oriented."
  ].join(" ");
}

export function chatGptExportToKnowledgeItems(payload: unknown): KnowledgeItem[] {
  const conversations = Array.isArray(payload) ? payload : Array.isArray((payload as any)?.conversations) ? (payload as any).conversations : [];

  const items: Array<KnowledgeItem | null> = conversations
    .map((conversation: any, index: number) => {
      const mapping = conversation?.mapping && typeof conversation.mapping === "object" ? Object.values(conversation.mapping) : [];
      const lines = mapping
        .map((node: any) => {
          const message = node?.message;
          const role = message?.author?.role;
          const text = excerpt(extractMessageText(message), 1200);
          return role && text ? `${role}: ${text}` : "";
        })
        .filter(Boolean);

      if (!lines.length) return null;
      const title = excerpt(String(conversation?.title || `ChatGPT conversation ${index + 1}`), 180);
      const sourceIdentifier = String(conversation?.id || `${title}:${conversation?.create_time ?? index}`);
      const content = lines.join("\n");

      return {
        title,
        summary: excerpt(content, 900),
        content_excerpt: excerpt(content, 5000),
        source_kind: "chatgpt_export" as const,
        source_identifier: sourceIdentifier,
        source_created_at: isoFromUnixSeconds(conversation?.create_time),
        metadata: {
          importedFrom: "chatgpt_export",
          messageCount: lines.length
        }
      };
    });

  return items.filter((item): item is KnowledgeItem => Boolean(item));
}

async function fetchKnowledgeItems(supabase: SupabaseLike, userId: string, enabled: boolean, message: string) {
  if (!enabled) return [] as KnowledgeItem[];
  const { data = [] } = await supabase
    .from("nova_ai_knowledge_items")
    .select("id,title,summary,content_excerpt,source_kind,source_identifier,source_created_at,metadata")
    .eq("user_id", userId)
    .order("created_at", { ascending: false })
    .limit(80);
  return selectRelevantKnowledgeItems((data ?? []) as KnowledgeItem[], message);
}

function extractOutputText(payload: any) {
  if (typeof payload.output_text === "string") return payload.output_text;
  for (const item of payload.output ?? []) {
    for (const content of item.content ?? []) {
      if (content.type === "output_text" && typeof content.text === "string") return content.text;
    }
  }
  return null;
}

async function storeKnowledgeItem(supabase: SupabaseLike, userId: string, item: KnowledgeItem) {
  await supabase.from("nova_ai_knowledge_items").upsert(
    {
      user_id: userId,
      source_kind: item.source_kind,
      source_identifier: item.source_identifier,
      title: item.title,
      summary: item.summary,
      content_excerpt: item.content_excerpt,
      source_created_at: item.source_created_at ?? null,
      metadata: item.metadata ?? {},
      sensitive: true
    },
    { onConflict: "user_id,source_kind,source_identifier" }
  );
}

export async function importKnowledgeItems(supabase: SupabaseLike, userId: string, items: KnowledgeItem[], limit = 500) {
  const boundedItems = items.slice(0, limit);
  for (const item of boundedItems) {
    await storeKnowledgeItem(supabase, userId, item);
  }
  return { imported: boundedItems.length };
}

export async function importChatGptExport(supabase: SupabaseLike, userId: string, payload: unknown) {
  const items = chatGptExportToKnowledgeItems(payload).slice(0, 500);
  return importKnowledgeItems(supabase, userId, items);
}

function fallbackAnswer(message: string, knowledgeItems: KnowledgeItem[]): NovaChatAnswer {
  const memoryNote = knowledgeItems.length
    ? ` I can also see ${knowledgeItems.length} live Supabase reference item(s), including NOVA memory/reference records, but OpenAI generation is not available right now.`
    : "";

  return {
    ok: true,
    answer: `NOVA AI is connected to live app context and private Supabase reference memory, but the OpenAI response service is currently unavailable or not configured. I received: "${excerpt(message, 240)}".${memoryNote}`,
    generatedBy: "fallback",
    usedWeb: false,
    usedImportedMemory: knowledgeItems.length > 0,
    sourceCount: knowledgeItems.length,
    model: null
  };
}

export async function answerNovaChat({
  supabase,
  userId,
  message,
  allowWeb,
  useImportedMemory,
  storeExchange
}: {
  supabase: SupabaseLike;
  userId: string;
  message: string;
  allowWeb: boolean;
  useImportedMemory: boolean;
  storeExchange: boolean;
}): Promise<NovaChatAnswer> {
  const [operationalContext, knowledgeItems] = await Promise.all([
    buildNovaOperationalContext(supabase, userId),
    fetchKnowledgeItems(supabase, userId, useImportedMemory, message)
  ]);
  const fallback = fallbackAnswer(message, knowledgeItems);

  if (!process.env.OPENAI_API_KEY) return fallback;

  try {
    const model = process.env.OPENAI_MODEL || "gpt-5.2";
    const response = await resilientFetch("https://api.openai.com/v1/responses", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${process.env.OPENAI_API_KEY}`,
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        model,
        store: false,
        tools: allowWeb ? [{ type: "web_search" }] : undefined,
        instructions: buildNovaDecisionInstructions(),
        input: [
          {
            role: "user",
            content: JSON.stringify({
              message,
              operationalContext,
              liveReferenceMode: {
                enabled: useImportedMemory,
                source: "Supabase nova_ai_knowledge_items",
                selectedItemCount: knowledgeItems.length,
                novaReferenceItemCount: knowledgeItems.filter(isNovaReferenceItem).length,
                priority: "Cross-check live app data against selected private reference records before recommending decisions."
              },
              importedMemory: knowledgeItemsForPrompt(knowledgeItems)
            })
          }
        ]
      })
    }, {
      label: "OpenAI NOVA chat",
      timeoutMs: 20_000,
      attempts: 2
    });

    if (!response.ok) return fallback;
    const payload = await response.json();
    const output = extractOutputText(payload);
    if (!output) return fallback;

    const answer = novaChatAnswerSchema.parse({
      ok: true,
      answer: output,
      generatedBy: "openai",
      usedWeb: allowWeb,
      usedImportedMemory: knowledgeItems.length > 0,
      sourceCount: knowledgeItems.length + 1,
      model
    });

    if (storeExchange) {
      await storeKnowledgeItem(supabase, userId, {
        source_kind: "nova_chat",
        source_identifier: `nova-chat:${Date.now()}`,
        title: excerpt(message, 180),
        summary: excerpt(`user: ${message}\nnova: ${answer.answer}`, 900),
        content_excerpt: excerpt(`user: ${message}\nnova: ${answer.answer}`, 5000),
        source_created_at: new Date().toISOString(),
        metadata: {
          generatedBy: answer.generatedBy,
          model: answer.model,
          usedWeb: answer.usedWeb,
          referenceItemsUsed: knowledgeItems.length,
          novaReferenceItemsUsed: knowledgeItems.filter(isNovaReferenceItem).length
        }
      });
    }

    return answer;
  } catch {
    return fallback;
  }
}
