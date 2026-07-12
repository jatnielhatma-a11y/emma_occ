import { readFileSync } from "node:fs";
import { join } from "node:path";
import { NextResponse } from "next/server";
import { z } from "zod";
import { answerFromRoster, buildEmmaContextSummary, type EmmaContext } from "@/lib/emma/answers";
import { calendarEventsToDuties, loadLiveCalendarSnapshot } from "@/lib/live-demo";
import { detectConflicts, parseRosterText } from "@/lib/roster/core";
import { createSupabaseServerClient } from "@/lib/supabase/server";

const promptSchema = z.object({
  prompt: z.string().min(2).max(1000)
});

async function openAiAnswer(prompt: string, context: EmmaContext) {
  if (!process.env.OPENAI_API_KEY) return null;

  const response = await fetch("https://api.openai.com/v1/responses", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${process.env.OPENAI_API_KEY}`,
      "Content-Type": "application/json"
    },
    body: JSON.stringify({
      model: process.env.OPENAI_MODEL || "gpt-5.2",
      input: [
        {
          role: "system",
          content:
            "You are Emma, an operations control roster assistant. Answer only from the provided roster and conflict JSON. If data is missing, say so. Be concise and operational."
        },
        {
          role: "user",
          content: JSON.stringify({ question: prompt, context })
        }
      ]
    })
  });

  if (!response.ok) return null;
  const data = await response.json();
  return data.output_text ?? null;
}

export async function POST(request: Request) {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user }
  } = await supabase.auth.getUser();

  const { prompt } = promptSchema.parse(await request.json());
  const today = new Date().toISOString().slice(0, 10);

  if (!user) {
    const snapshot = loadLiveCalendarSnapshot();
    const liveDuties = calendarEventsToDuties(snapshot);
    const csv = readFileSync(join(process.cwd(), "data/demo-roster.csv"), "utf8");
    const demoDuties = liveDuties.length ? liveDuties : parseRosterText(csv, "demo-roster.csv");
    const demoConflicts = detectConflicts(demoDuties);
    const context: EmmaContext = {
      today,
      duties: demoDuties.map((duty) => ({
        duty_date: duty.date,
        start_time: duty.startTime || null,
        end_time: duty.endTime || null,
        duty_label: duty.dutyLabel,
        location: duty.location || null,
        is_off: duty.isOff,
        is_overnight: duty.isOvernight
      })),
      conflicts: demoConflicts.map((conflict) => ({
        severity: conflict.severity,
        title: conflict.title,
        detail: conflict.detail,
        conflictType: conflict.conflictType
      }))
    };

    const answer = (await openAiAnswer(prompt, context)) ?? answerFromRoster(prompt, context);
    return NextResponse.json({ ok: true, answer, contextSummary: buildEmmaContextSummary(context), demo: true });
  }

  const { data: duties = [] } = await supabase
    .from("duties")
    .select("duty_date,start_time,end_time,duty_label,location,is_off,is_overnight")
    .eq("user_id", user.id)
    .gte("duty_date", today)
    .order("duty_date", { ascending: true })
    .limit(90);

  const { data: conflicts = [] } = await supabase
    .from("conflict_logs")
    .select("severity,title,detail,conflict_type")
    .eq("user_id", user.id)
    .is("resolved_at", null)
    .order("created_at", { ascending: false })
    .limit(20);

  const context: EmmaContext = {
    today,
    duties: (duties ?? []) as EmmaContext["duties"],
    conflicts: (conflicts ?? []).map((conflict: any) => ({
      severity: conflict.severity,
      title: conflict.title,
      detail: conflict.detail,
      conflictType: conflict.conflict_type
    }))
  };

  const answer = (await openAiAnswer(prompt, context)) ?? answerFromRoster(prompt, context);
  const contextSummary = buildEmmaContextSummary(context);

  await supabase.from("ai_queries").insert({
    user_id: user.id,
    prompt,
    answer,
    context_summary: contextSummary
  });

  return NextResponse.json({ ok: true, answer, contextSummary });
}
