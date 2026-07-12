import { NextResponse } from "next/server";
import { buildNovaOperationalContext } from "@/lib/ai/context";
import { generateDailyBrief } from "@/lib/ai/daily-brief";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export async function GET() {
  const supabase = createSupabaseServerClient();
  const {
    data: { user }
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ ok: false, error: "Sign in required." }, { status: 401 });
  }

  const { data: latestBrief } = await supabase
    .from("ai_briefs")
    .select("*")
    .eq("user_id", user.id)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  return NextResponse.json({ ok: true, brief: latestBrief });
}

export async function POST() {
  const supabase = createSupabaseServerClient();
  const {
    data: { user }
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ ok: false, error: "Sign in required." }, { status: 401 });
  }

  const context = await buildNovaOperationalContext(supabase, user.id);
  const result = await generateDailyBrief(context);

  const { data: savedBrief, error } = await supabase
    .from("ai_briefs")
    .upsert(
      {
        user_id: user.id,
        brief_date: context.today,
        language: context.language,
        status: result.brief.status,
        title: result.brief.title,
        summary: result.brief.summary,
        facts: result.brief.facts,
        recommendations: result.brief.recommendations,
        suppressed_updates: result.brief.suppressedUpdates,
        sources: result.brief.sources,
        should_notify: result.brief.shouldNotify,
        confidence: result.brief.confidence,
        generated_by: result.generatedBy,
        model: result.model,
        prompt_version: result.promptVersion
      },
      { onConflict: "user_id,brief_date,language" }
    )
    .select("*")
    .single();

  if (error) {
    return NextResponse.json({ ok: false, error: error.message, brief: result.brief }, { status: 500 });
  }

  return NextResponse.json({ ok: true, brief: savedBrief });
}
