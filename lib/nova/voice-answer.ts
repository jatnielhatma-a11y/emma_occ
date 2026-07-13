import { z } from "zod";
import { buildNovaOperationalContext } from "@/lib/ai/context";
import { resilientFetch } from "@/lib/operations/resilience";
import { shiftCodeDescription } from "@/lib/roster/ledger";
import { classifyMissionCommand } from "./mission-intelligence";
import { learningCapabilitySummary, savingsCapabilitySummary, type LifeDomainRecord } from "./life-domains";

type SupabaseLike = {
  from(table: string): any;
};

type VoiceDutyRow = {
  id: string;
  duty_date: string;
  start_time: string | null;
  end_time: string | null;
  duty_label: string;
  original_duty_code: string | null;
  location: string | null;
  is_off: boolean;
};

type VoiceLifeRecord = LifeDomainRecord & {
  createdAt?: string | null;
};

export const novaVoiceAnswerRequestSchema = z.object({
  transcript: z.string().trim().min(1).max(700),
  allowWeb: z.boolean().default(true)
});

export const novaVoiceAnswerSourceSchema = z.object({
  label: z.string(),
  source: z.string(),
  url: z.string().url().optional().nullable(),
  freshness: z.enum(["live", "recent", "fallback", "unavailable"]),
  detail: z.string().optional().nullable()
});

export const novaVoiceAnswerSchema = z.object({
  ok: z.literal(true),
  mode: z.enum(["command", "answer"]),
  title: z.string(),
  answer: z.string(),
  route: z.string().optional().nullable(),
  confidence: z.number().min(0).max(1),
  usedWeb: z.boolean(),
  generatedBy: z.enum(["openai", "fallback"]),
  sources: z.array(novaVoiceAnswerSourceSchema).max(10)
});

export type NovaVoiceAnswer = z.infer<typeof novaVoiceAnswerSchema>;
export type NovaVoiceAnswerSource = z.infer<typeof novaVoiceAnswerSourceSchema>;

function todayInTimezone() {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: process.env.APP_TIMEZONE || "Europe/Amsterdam",
    year: "numeric",
    month: "2-digit",
    day: "2-digit"
  }).format(new Date());
}

function addDays(date: string, days: number) {
  const next = new Date(`${date}T00:00:00.000Z`);
  next.setUTCDate(next.getUTCDate() + days);
  return next.toISOString().slice(0, 10);
}

function timeRange(duty: VoiceDutyRow) {
  if (duty.is_off) return "rest day";
  return `${duty.start_time?.slice(0, 5) ?? "--:--"}-${duty.end_time?.slice(0, 5) ?? "--:--"}`;
}

function formatDuty(duty: VoiceDutyRow) {
  return `${duty.duty_date}: ${shiftCodeDescription(duty)} (${timeRange(duty)})${duty.location ? ` at ${duty.location}` : ""}`;
}

function includesAny(text: string, terms: string[]) {
  return terms.some((term) => text.includes(term));
}

function isOperationalQuestion(normalized: string) {
  return includesAny(normalized, [
    "my duty",
    "next duty",
    "shift",
    "roster",
    "commute",
    "train",
    "ns",
    "calendar",
    "gmail",
    "email",
    "alert",
    "notification",
    "weather",
    "savings",
    "saving",
    "learning",
    "course",
    "nova",
    "app"
  ]);
}

function wantsWeb(normalized: string) {
  return includesAny(normalized, ["web", "search", "look up", "lookup", "internet", "online", "latest", "news", "who is", "what is", "where is", "define"]);
}

function source(label: string, sourceName: string, freshness: NovaVoiceAnswerSource["freshness"], detail?: string, url?: string | null): NovaVoiceAnswerSource {
  return {
    label,
    source: sourceName,
    freshness,
    detail,
    url: url ?? null
  };
}

async function fetchWebLookup(query: string): Promise<{ snippets: string[]; sources: NovaVoiceAnswerSource[] }> {
  const snippets: string[] = [];
  const sources: NovaVoiceAnswerSource[] = [];
  const encoded = encodeURIComponent(query);

  try {
    const duck = await resilientFetch(`https://api.duckduckgo.com/?q=${encoded}&format=json&no_html=1&skip_disambig=1`, {}, {
      label: "DuckDuckGo instant answer",
      timeoutMs: 6_000,
      attempts: 1
    });
    if (duck.ok) {
      const payload = await duck.json();
      const abstract = String(payload.AbstractText ?? "").trim();
      const heading = String(payload.Heading ?? "").trim();
      const url = String(payload.AbstractURL ?? "").trim();
      if (abstract) {
        snippets.push(`${heading || "Web result"}: ${abstract}`);
        sources.push(source("Web", "DuckDuckGo Instant Answer", "recent", heading || "Public web result", url || null));
      }
    }
  } catch {
    sources.push(source("Web", "DuckDuckGo Instant Answer", "unavailable", "Public instant-answer lookup unavailable."));
  }

  try {
    const openSearch = await resilientFetch(`https://en.wikipedia.org/w/api.php?action=opensearch&limit=1&namespace=0&format=json&search=${encoded}`, {}, {
      label: "Wikipedia opensearch",
      timeoutMs: 6_000,
      attempts: 1
    });
    if (openSearch.ok) {
      const payload = await openSearch.json();
      const title = Array.isArray(payload?.[1]) ? payload[1][0] : null;
      if (title) {
        const summary = await resilientFetch(`https://en.wikipedia.org/api/rest_v1/page/summary/${encodeURIComponent(title)}`, {}, {
          label: "Wikipedia summary",
          timeoutMs: 6_000,
          attempts: 1
        });
        if (summary.ok) {
          const summaryPayload = await summary.json();
          const extract = String(summaryPayload.extract ?? "").trim();
          const pageUrl = String(summaryPayload.content_urls?.desktop?.page ?? "").trim();
          if (extract) {
            snippets.push(`${title}: ${extract}`);
            sources.push(source("Reference", "Wikipedia", "recent", title, pageUrl || null));
          }
        }
      }
    }
  } catch {
    sources.push(source("Reference", "Wikipedia", "unavailable", "Reference lookup unavailable."));
  }

  return { snippets: snippets.slice(0, 3), sources: sources.slice(0, 4) };
}

async function buildVoiceAppContext(supabase: SupabaseLike, userId: string) {
  const today = todayInTimezone();
  const end = addDays(today, 9);
  const operational = await buildNovaOperationalContext(supabase, userId);

  const [{ data: latestImport }, { data: lifeRecords = [] }, { count: notificationCount = 0 }] = await Promise.all([
    supabase
      .from("imports")
      .select("id,filename,file_type,imported_at")
      .eq("user_id", userId)
      .order("imported_at", { ascending: false })
      .limit(1)
      .maybeSingle(),
    supabase
      .from("nova_life_domain_records")
      .select("domain,title,detail,category,status,priority,target_date,amount_cents,currency,tags,sensitive,created_at")
      .eq("user_id", userId)
      .in("domain", ["finance", "learning"])
      .is("archived_at", null)
      .order("created_at", { ascending: false })
      .limit(20),
    supabase
      .from("notification_events")
      .select("id", { count: "exact", head: true })
      .eq("user_id", userId)
      .in("status", ["pending", "sent"])
  ]);

  let duties: VoiceDutyRow[] = [];
  if (latestImport?.id) {
    const { data = [] } = await supabase
      .from("duties")
      .select("id,duty_date,start_time,end_time,duty_label,original_duty_code,location,is_off")
      .eq("user_id", userId)
      .eq("import_id", latestImport.id)
      .gte("duty_date", today)
      .lte("duty_date", end)
      .order("duty_date", { ascending: true })
      .order("start_time", { ascending: true, nullsFirst: false })
      .limit(20);
    duties = (data ?? []) as VoiceDutyRow[];
  }

  const records = (lifeRecords ?? []).map((record: any) => ({
    domain: record.domain,
    title: record.title,
    detail: record.detail ?? "",
    category: record.category,
    status: record.status,
    priority: record.priority,
    targetDate: record.target_date,
    amountCents: record.amount_cents,
    currency: record.currency,
    tags: record.tags ?? [],
    sensitive: record.sensitive,
    createdAt: record.created_at
  })) as VoiceLifeRecord[];

  return {
    today,
    end,
    operational,
    latestImport,
    duties,
    lifeRecords: records,
    savings: savingsCapabilitySummary(records),
    learning: learningCapabilitySummary(records),
    notificationCount: notificationCount ?? 0
  };
}

function deterministicAnswer(transcript: string, app: Awaited<ReturnType<typeof buildVoiceAppContext>>, web: { snippets: string[]; sources: NovaVoiceAnswerSource[] }, command = classifyMissionCommand(transcript)): NovaVoiceAnswer {
  const normalized = transcript.toLowerCase();
  const appSources = [
    source("NOVA app", "Supabase", app.latestImport ? "recent" : "unavailable", app.latestImport ? `Latest roster import ${app.latestImport.filename}` : "No roster import loaded."),
    ...app.operational.sources.slice(0, 4).map((item) => source(item.label, item.source, item.freshness === "stale" ? "fallback" : item.freshness, item.timestamp))
  ];

  if (command.route && includesAny(normalized, ["open", "show", "go to", "navigate"])) {
    return novaVoiceAnswerSchema.parse({
      ok: true,
      mode: "command",
      title: command.label,
      answer: command.response,
      route: command.route,
      confidence: command.confidence,
      usedWeb: false,
      generatedBy: "fallback",
      sources: appSources.slice(0, 5)
    });
  }

  if (command.intent === "start_mission") {
    return novaVoiceAnswerSchema.parse({
      ok: true,
      mode: "command",
      title: command.label,
      answer: command.response,
      route: command.route,
      confidence: command.confidence,
      usedWeb: false,
      generatedBy: "fallback",
      sources: appSources.slice(0, 5)
    });
  }

  if (includesAny(normalized, ["duty", "shift", "roster", "ledger"])) {
    const dutyText = app.duties.length
      ? `Your 10-day duty ledger runs ${app.today} through ${app.end}. First rows: ${app.duties.slice(0, 5).map(formatDuty).join("; ")}.`
      : "I do not see roster rows in the 10-day duty ledger yet.";
    return novaVoiceAnswerSchema.parse({
      ok: true,
      mode: "answer",
      title: "Duty ledger",
      answer: dutyText,
      route: "/dashboard#emma-occ",
      confidence: app.duties.length ? 0.86 : 0.45,
      usedWeb: false,
      generatedBy: "fallback",
      sources: appSources.slice(0, 5)
    });
  }

  if (includesAny(normalized, ["commute", "train", "ns", "route", "platform"])) {
    const incidents = app.operational.commute.incidents.map((incident) => `${incident.title}: ${incident.detail}`).join(" ");
    return novaVoiceAnswerSchema.parse({
      ok: true,
      mode: "answer",
      title: "Commute",
      answer: `${app.operational.commute.recommendation}. Status is ${app.operational.commute.status}. ${incidents || "No active incident is highlighted in NOVA right now."}`,
      route: "/commute",
      confidence: app.operational.commute.confidence,
      usedWeb: false,
      generatedBy: "fallback",
      sources: appSources.slice(0, 5)
    });
  }

  if (includesAny(normalized, ["weather"])) {
    return novaVoiceAnswerSchema.parse({
      ok: true,
      mode: "answer",
      title: "Weather",
      answer: `${app.operational.weather.label}. Weather risk is ${app.operational.weather.risk}.`,
      route: "/dashboard",
      confidence: 0.78,
      usedWeb: false,
      generatedBy: "fallback",
      sources: appSources.slice(0, 5)
    });
  }

  if (includesAny(normalized, ["calendar", "agenda", "schedule"])) {
    return novaVoiceAnswerSchema.parse({
      ok: true,
      mode: "answer",
      title: "Calendar",
      answer: `${app.operational.calendar.lastSyncLabel}. Source: ${app.operational.calendar.sourceLabel}. NOVA has ${app.operational.calendar.upcomingAppointments} upcoming appointment(s), ${app.operational.calendar.openTasks} open task(s), and ${app.operational.calendar.upcomingSpecialDates} special date(s) from Google data.`,
      route: "/calendar-sync",
      confidence: app.operational.calendar.connected ? 0.82 : 0.42,
      usedWeb: false,
      generatedBy: "fallback",
      sources: appSources.slice(0, 5)
    });
  }

  if (includesAny(normalized, ["saving", "savings", "finance"])) {
    return novaVoiceAnswerSchema.parse({
      ok: true,
      mode: "answer",
      title: "NOVA Savings",
      answer: `Savings is active. You have ${app.savings.activeGoals} active savings goal(s), with a total target of EUR ${(app.savings.totalTargetCents / 100).toFixed(0)}. No bank connection is used.`,
      route: "/life-domains",
      confidence: 0.84,
      usedWeb: false,
      generatedBy: "fallback",
      sources: [source("NOVA Savings", "Supabase life-domain records", "recent", app.savings.privacyMode), ...appSources.slice(0, 3)]
    });
  }

  if (includesAny(normalized, ["learning", "course", "study", "certification", "skill"])) {
    return novaVoiceAnswerSchema.parse({
      ok: true,
      mode: "answer",
      title: "NOVA Learning",
      answer: `Learning is active. You have ${app.learning.activePlans} active learning plan(s) and ${app.learning.completedRecords} completed learning record(s). Recommendations remain reviewable.`,
      route: "/life-domains",
      confidence: 0.84,
      usedWeb: false,
      generatedBy: "fallback",
      sources: [source("NOVA Learning", "Supabase life-domain records", "recent", app.learning.recommendationMode), ...appSources.slice(0, 3)]
    });
  }

  if (web.snippets.length) {
    return novaVoiceAnswerSchema.parse({
      ok: true,
      mode: "answer",
      title: "Web answer",
      answer: `${web.snippets[0]} Source freshness is public web/recent; verify before making operational decisions.`,
      route: null,
      confidence: 0.64,
      usedWeb: true,
      generatedBy: "fallback",
      sources: [...web.sources, ...appSources.slice(0, 2)].slice(0, 8)
    });
  }

  return novaVoiceAnswerSchema.parse({
    ok: true,
    mode: command.route ? "command" : "answer",
    title: command.label,
    answer: command.response,
    route: command.route ?? null,
    confidence: command.confidence,
    usedWeb: false,
    generatedBy: "fallback",
    sources: appSources.slice(0, 5)
  });
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

const responseJsonSchema = {
  type: "object",
  additionalProperties: false,
  required: ["ok", "mode", "title", "answer", "route", "confidence", "usedWeb", "generatedBy", "sources"],
  properties: {
    ok: { type: "boolean", const: true },
    mode: { type: "string", enum: ["command", "answer"] },
    title: { type: "string" },
    answer: { type: "string" },
    route: { type: ["string", "null"] },
    confidence: { type: "number", minimum: 0, maximum: 1 },
    usedWeb: { type: "boolean" },
    generatedBy: { type: "string", enum: ["openai", "fallback"] },
    sources: {
      type: "array",
      maxItems: 10,
      items: {
        type: "object",
        additionalProperties: false,
        required: ["label", "source", "url", "freshness", "detail"],
        properties: {
          label: { type: "string" },
          source: { type: "string" },
          url: { type: ["string", "null"] },
          freshness: { type: "string", enum: ["live", "recent", "fallback", "unavailable"] },
          detail: { type: ["string", "null"] }
        }
      }
    }
  }
};

async function generateOpenAiAnswer(
  transcript: string,
  app: Awaited<ReturnType<typeof buildVoiceAppContext>>,
  web: { snippets: string[]; sources: NovaVoiceAnswerSource[] },
  fallback: NovaVoiceAnswer,
  useOpenAiWeb = false
) {
  if (!process.env.OPENAI_API_KEY) return fallback;

  try {
    const response = await resilientFetch("https://api.openai.com/v1/responses", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${process.env.OPENAI_API_KEY}`,
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        model: process.env.OPENAI_MODEL || "gpt-5.2",
        store: false,
        tools: useOpenAiWeb ? [{ type: "web_search_preview" }] : undefined,
        instructions:
          "You are NOVA Mission Voice. Answer the user's spoken request using authenticated NOVA app context first. For public non-personal questions, use provided public web evidence and web search when available. Be concise, operational, and accurate. Do not invent data. Label fallback/unavailable sources. Return JSON only.",
        input: [
          {
            role: "user",
            content: JSON.stringify({
              transcript,
              appContext: {
                today: app.today,
                duty: app.operational.duty,
                commute: app.operational.commute,
                calendar: app.operational.calendar,
                email: app.operational.email,
                weather: app.operational.weather,
                conflicts: app.operational.conflicts,
                notifications: app.notificationCount,
                dutyLedger10Days: app.duties.map(formatDuty),
                savings: app.savings,
                learning: app.learning
              },
              webEvidence: web.snippets,
              fallback
            })
          }
        ],
        text: {
          format: {
            type: "json_schema",
            name: "nova_voice_answer",
            strict: true,
            schema: responseJsonSchema
          }
        }
      })
    }, {
      label: "OpenAI NOVA voice answer",
      timeoutMs: 15_000,
      attempts: 2
    });

    if (!response.ok) return fallback;
    const payload = await response.json();
    const outputText = extractOutputText(payload);
    if (!outputText) return fallback;

    const parsed = novaVoiceAnswerSchema.parse(JSON.parse(outputText));
    return { ...parsed, generatedBy: "openai" as const };
  } catch {
    return fallback;
  }
}

export async function answerNovaVoiceCommand({
  supabase,
  userId,
  transcript,
  allowWeb = true
}: {
  supabase: SupabaseLike;
  userId: string;
  transcript: string;
  allowWeb?: boolean;
}): Promise<NovaVoiceAnswer> {
  const normalized = transcript.trim().toLowerCase();
  const command = classifyMissionCommand(transcript);
  const app = await buildVoiceAppContext(supabase, userId);
  const shouldUseWeb = allowWeb && wantsWeb(normalized) && !isOperationalQuestion(normalized);
  const web = shouldUseWeb ? await fetchWebLookup(transcript) : { snippets: [], sources: [] };
  const fallback = deterministicAnswer(transcript, app, web, command);

  return generateOpenAiAnswer(transcript, app, web, fallback, shouldUseWeb);
}
