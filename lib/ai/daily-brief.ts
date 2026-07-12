import { novaDailyBriefSchema, type NovaDailyBrief, type NovaOperationalContext, type NovaRisk } from "./types";
import { resilientFetch } from "../operations/resilience";

const PROMPT_VERSION = "nova-ai-core-v1";

const translations = {
  en: {
    title: "Daily operations brief",
    allClear: "No material operational risk needs action right now.",
    review: "Review the highlighted items before relying on the current plan.",
    urgent: "Resolve the red operational item before continuing with the plan.",
    noNotify: "Suppressed notification: no material change or required action.",
    fallback: "AI provider unavailable; deterministic NOVA brief used."
  },
  es: {
    title: "Resumen operativo diario",
    allClear: "No hay un riesgo operativo material que requiera acción ahora.",
    review: "Revisa los puntos destacados antes de confiar en el plan actual.",
    urgent: "Resuelve el punto operativo rojo antes de continuar con el plan.",
    noNotify: "Notificación suprimida: no hay cambio material ni acción requerida.",
    fallback: "Proveedor de IA no disponible; se usó el resumen determinístico de NOVA."
  },
  fr: {
    title: "Brief opérationnel quotidien",
    allClear: "Aucun risque opérationnel important ne nécessite d’action pour le moment.",
    review: "Vérifie les points signalés avant de te fier au plan actuel.",
    urgent: "Résous l’élément opérationnel rouge avant de poursuivre le plan.",
    noNotify: "Notification supprimée : aucun changement important ni action requise.",
    fallback: "Fournisseur IA indisponible ; le brief déterministe NOVA a été utilisé."
  }
};

function riskWeight(risk: NovaRisk) {
  return risk === "green" ? 0 : risk === "amber" ? 1 : 2;
}

function highestRisk(risks: NovaRisk[]) {
  return risks.reduce<NovaRisk>((current, risk) => (riskWeight(risk) > riskWeight(current) ? risk : current), "green");
}

function statusSummary(status: NovaRisk, language: keyof typeof translations) {
  const text = translations[language];
  if (status === "green") return text.allClear;
  if (status === "red") return text.urgent;
  return text.review;
}

function shouldNotify(context: NovaOperationalContext, status: NovaRisk) {
  if (status === "red") return true;
  if (context.conflicts.count > 0) return true;
  if (context.commute.incidents.some((incident) => incident.severity !== "green")) return true;
  return false;
}

export function buildFallbackDailyBrief(context: NovaOperationalContext): NovaDailyBrief {
  const language = context.language in translations ? context.language : "en";
  const status = highestRisk([context.commute.status, context.weather.risk, context.conflicts.risk]);
  const notify = shouldNotify(context, status);
  const suppressedUpdates = notify ? [] : [translations[language].noNotify];

  const facts = [
    {
      label: "Today",
      value: context.duty.todayLabel,
      risk: "green" as const,
      sourceLabel: "Roster"
    },
    {
      label: "Next duty",
      value: context.duty.nextDutyLabel,
      risk: "green" as const,
      sourceLabel: "Roster"
    },
    {
      label: "Commute",
      value: `${context.commute.recommendation}${context.commute.isLive ? " (live)" : " (fallback)"}`,
      risk: context.commute.status,
      sourceLabel: "Route snapshot"
    },
    {
      label: "Weather",
      value: context.weather.label,
      risk: context.weather.risk,
      sourceLabel: context.weather.source
    },
    {
      label: "Calendar",
      value: context.calendar.lastSyncLabel,
      risk: context.calendar.connected ? ("green" as const) : ("amber" as const),
      sourceLabel: context.calendar.sourceLabel
    }
  ];

  const recommendations = [
    context.commute.status !== "green"
      ? {
          priority: status === "red" ? ("now" as const) : ("soon" as const),
          action: "Open Commute and refresh route intelligence before leaving.",
          reason: context.commute.incidents[0]?.title ?? "Commute provider data is fallback or route risk is elevated.",
          risk: context.commute.status
        }
      : {
          priority: "monitor" as const,
          action: "Continue with the planned duty and commute window.",
          reason: "No material route incident is currently highlighted.",
          risk: "green" as const
        },
    context.conflicts.count
      ? {
          priority: "soon" as const,
          action: "Review active roster conflicts.",
          reason: context.conflicts.highest ?? "A roster conflict is unresolved.",
          risk: context.conflicts.risk
        }
      : {
          priority: "monitor" as const,
          action: "No roster conflict action required.",
          reason: "No unresolved conflict is visible in the dashboard.",
          risk: "green" as const
        }
  ];

  return {
    title: translations[language].title,
    summary: `${statusSummary(status, language)} ${translations[language].fallback}`,
    status,
    confidence: Math.max(0.35, Math.min(0.9, (context.commute.confidence + (context.calendar.connected ? 0.8 : 0.45)) / 2)),
    shouldNotify: notify,
    facts,
    recommendations,
    suppressedUpdates,
    sources: context.sources
  };
}

const responseJsonSchema = {
  type: "object",
  additionalProperties: false,
  required: ["title", "summary", "status", "confidence", "shouldNotify", "facts", "recommendations", "suppressedUpdates", "sources"],
  properties: {
    title: { type: "string" },
    summary: { type: "string" },
    status: { type: "string", enum: ["green", "amber", "red"] },
    confidence: { type: "number", minimum: 0, maximum: 1 },
    shouldNotify: { type: "boolean" },
    facts: {
      type: "array",
      maxItems: 8,
      items: {
        type: "object",
        additionalProperties: false,
        required: ["label", "value", "risk", "sourceLabel"],
        properties: {
          label: { type: "string" },
          value: { type: "string" },
          risk: { type: "string", enum: ["green", "amber", "red"] },
          sourceLabel: { type: "string" }
        }
      }
    },
    recommendations: {
      type: "array",
      maxItems: 5,
      items: {
        type: "object",
        additionalProperties: false,
        required: ["priority", "action", "reason", "risk"],
        properties: {
          priority: { type: "string", enum: ["now", "soon", "monitor"] },
          action: { type: "string" },
          reason: { type: "string" },
          risk: { type: "string", enum: ["green", "amber", "red"] }
        }
      }
    },
    suppressedUpdates: { type: "array", maxItems: 5, items: { type: "string" } },
    sources: {
      type: "array",
      maxItems: 10,
      items: {
        type: "object",
        additionalProperties: false,
        required: ["label", "source", "timestamp", "freshness", "confidence"],
        properties: {
          label: { type: "string" },
          source: { type: "string" },
          timestamp: { type: "string" },
          freshness: { type: "string", enum: ["live", "recent", "stale", "fallback", "unavailable"] },
          confidence: { type: "number", minimum: 0, maximum: 1 }
        }
      }
    }
  }
};

function extractOutputText(payload: any) {
  if (typeof payload.output_text === "string") return payload.output_text;
  for (const item of payload.output ?? []) {
    for (const content of item.content ?? []) {
      if (content.type === "output_text" && typeof content.text === "string") return content.text;
    }
  }
  return null;
}

export async function generateDailyBrief(context: NovaOperationalContext): Promise<{
  brief: NovaDailyBrief;
  generatedBy: "openai" | "fallback";
  model: string | null;
  promptVersion: string;
}> {
  const model = process.env.OPENAI_MODEL || "gpt-5.2";
  const fallback = buildFallbackDailyBrief(context);

  if (!process.env.OPENAI_API_KEY) {
    return { brief: fallback, generatedBy: "fallback", model: null, promptVersion: PROMPT_VERSION };
  }

  try {
    const response = await resilientFetch("https://api.openai.com/v1/responses", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${process.env.OPENAI_API_KEY}`,
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        model,
        store: false,
        instructions:
          "You are NOVA AI Core. Produce a concise personal operations brief from the provided verified JSON only. Separate facts from recommendations. Do not invent provider status. If data is fallback or unavailable, say so. Use the requested language.",
        input: [
          {
            role: "user",
            content: JSON.stringify({ task: "daily-brief", promptVersion: PROMPT_VERSION, context })
          }
        ],
        text: {
          format: {
            type: "json_schema",
            name: "nova_daily_brief",
            strict: true,
            schema: responseJsonSchema
          }
        }
      })
    }, {
      label: "OpenAI daily brief",
      timeoutMs: 15_000,
      attempts: 2
    });

    if (!response.ok) {
      return { brief: fallback, generatedBy: "fallback", model: null, promptVersion: PROMPT_VERSION };
    }

    const payload = await response.json();
    const outputText = extractOutputText(payload);
    if (!outputText) {
      return { brief: fallback, generatedBy: "fallback", model: null, promptVersion: PROMPT_VERSION };
    }

    const parsed = novaDailyBriefSchema.parse(JSON.parse(outputText));
    return { brief: parsed, generatedBy: "openai", model, promptVersion: PROMPT_VERSION };
  } catch {
    return { brief: fallback, generatedBy: "fallback", model: null, promptVersion: PROMPT_VERSION };
  }
}
