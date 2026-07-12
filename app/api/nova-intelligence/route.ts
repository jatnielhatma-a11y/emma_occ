import { NextResponse } from "next/server";
import { novaIntelligenceRequestSchema, release5SeedRecords, type NovaCapabilityRecord } from "@/lib/nova/nova-intelligence";
import { createSupabaseServerClient } from "@/lib/supabase/server";

function toDatabaseRecord(record: NovaCapabilityRecord, userId: string) {
  return {
    user_id: userId,
    capability: record.capability,
    title: record.title,
    detail: record.detail,
    status: record.status,
    privacy_mode: record.privacyMode,
    consent_required: record.consentRequired,
    consent_granted: record.consentGranted,
    local_only: record.localOnly,
    sync_enabled: record.syncEnabled,
    device_scope: record.deviceScope,
    risk: record.risk,
    confidence: record.confidence,
    source_refs: record.sourceRefs,
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

  const parsed = novaIntelligenceRequestSchema.safeParse(await request.json().catch(() => ({})));
  if (!parsed.success) {
    return NextResponse.json({ ok: false, error: "Check the NOVA Intelligence details and try again." }, { status: 400 });
  }

  if (parsed.data.action === "seedRelease5") {
    const records = release5SeedRecords();
    const { error } = await supabase.from("nova_capability_records").insert(records.map((record) => toDatabaseRecord(record, user.id)));
    if (error) return NextResponse.json({ ok: false, error: error.message }, { status: 500 });
    return NextResponse.json({ ok: true, count: records.length });
  }

  if (parsed.data.action === "archiveCapability") {
    const { error } = await supabase
      .from("nova_capability_records")
      .update({ archived_at: new Date().toISOString(), status: "archived" })
      .eq("user_id", user.id)
      .eq("id", parsed.data.id);

    if (error) return NextResponse.json({ ok: false, error: error.message }, { status: 500 });
    return NextResponse.json({ ok: true });
  }

  const { error } = await supabase.from("nova_capability_records").insert(toDatabaseRecord(parsed.data.record, user.id));
  if (error) return NextResponse.json({ ok: false, error: error.message }, { status: 500 });

  return NextResponse.json({ ok: true });
}
