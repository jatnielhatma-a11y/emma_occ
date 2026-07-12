import { NextResponse } from "next/server";
import { buildNovaOperationalContext } from "@/lib/ai/context";
import { buildRelease4Recommendations, intelligenceRequestSchema, type IntelligenceRecord } from "@/lib/nova/intelligence";
import { createSupabaseServerClient } from "@/lib/supabase/server";

function toDatabaseRecord(record: IntelligenceRecord, userId: string) {
  return {
    user_id: userId,
    kind: record.kind,
    title: record.title,
    detail: record.detail,
    domain: record.domain,
    status: record.status,
    confidence: record.confidence,
    priority: record.priority,
    risk: record.risk,
    source_type: record.sourceType,
    source_refs: record.sourceRefs,
    automation_enabled: record.automationEnabled,
    requires_confirmation: record.requiresConfirmation,
    next_run_at: record.nextRunAt || null,
    metadata: record.metadata
  };
}

export async function POST(request: Request) {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user }
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ ok: false, error: "Sign in required." }, { status: 401 });
  }

  const payload = await request.json().catch(() => ({}));

  if (payload.action === "generateCandidates") {
    const context = await buildNovaOperationalContext(supabase, user.id);
    const candidates = buildRelease4Recommendations(context);
    const { error } = await supabase
      .from("nova_intelligence_records")
      .insert(candidates.map((record) => toDatabaseRecord(record, user.id)));

    if (error) return NextResponse.json({ ok: false, error: error.message }, { status: 500 });
    return NextResponse.json({ ok: true, count: candidates.length });
  }

  const parsed = intelligenceRequestSchema.safeParse(payload);
  if (!parsed.success) {
    return NextResponse.json({ ok: false, error: "Check the intelligence record details and try again." }, { status: 400 });
  }

  if (parsed.data.action === "archiveRecord") {
    const { error } = await supabase
      .from("nova_intelligence_records")
      .update({ archived_at: new Date().toISOString(), status: "archived" })
      .eq("user_id", user.id)
      .eq("id", parsed.data.id);

    if (error) return NextResponse.json({ ok: false, error: error.message }, { status: 500 });
    return NextResponse.json({ ok: true });
  }

  const { error } = await supabase.from("nova_intelligence_records").insert(toDatabaseRecord(parsed.data.record, user.id));
  if (error) return NextResponse.json({ ok: false, error: error.message }, { status: 500 });

  return NextResponse.json({ ok: true });
}
