import { NextResponse } from "next/server";
import {
  canPersistMemory,
  defaultMemorySettings,
  destinationForEntry,
  memorySettingsSchema,
  personalCoreRequestSchema
} from "@/lib/nova/personal-core";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export async function POST(request: Request) {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user }
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ ok: false, error: "Sign in required." }, { status: 401 });
  }

  const parsed = personalCoreRequestSchema.safeParse(await request.json().catch(() => ({})));
  if (!parsed.success) {
    return NextResponse.json({ ok: false, error: "Check the personal-core details and try again." }, { status: 400 });
  }

  if (parsed.data.action === "saveProfile") {
    const { profile } = parsed.data;
    const { error } = await supabase.from("nova_personal_profiles").upsert(
      {
        user_id: user.id,
        preferred_name: profile.preferredName,
        family_context: profile.familyContext,
        primary_language: profile.primaryLanguage,
        timezone: profile.timezone
      },
      { onConflict: "user_id" }
    );

    if (error) return NextResponse.json({ ok: false, error: error.message }, { status: 500 });
    return NextResponse.json({ ok: true });
  }

  if (parsed.data.action === "saveMemorySettings") {
    const { memorySettings } = parsed.data;
    const { error } = await supabase.from("nova_memory_settings").upsert(
      {
        user_id: user.id,
        memory_enabled: memorySettings.memoryEnabled,
        allow_ai_suggestions: memorySettings.allowAiSuggestions,
        retention_days: memorySettings.retentionDays,
        consent_version: memorySettings.consentVersion,
        consented_at: memorySettings.memoryEnabled ? new Date().toISOString() : null,
        last_reviewed_at: new Date().toISOString()
      },
      { onConflict: "user_id" }
    );

    if (error) return NextResponse.json({ ok: false, error: error.message }, { status: 500 });
    return NextResponse.json({ ok: true });
  }

  if (parsed.data.action === "archiveMemory") {
    const { error } = await supabase
      .from("nova_memory_items")
      .update({ archived_at: new Date().toISOString() })
      .eq("user_id", user.id)
      .eq("id", parsed.data.id);

    if (error) return NextResponse.json({ ok: false, error: error.message }, { status: 500 });
    return NextResponse.json({ ok: true });
  }

  const { entry } = parsed.data;
  const table = destinationForEntry(entry.kind);

  if (entry.kind === "memory") {
    const { data: storedSettings } = await supabase.from("nova_memory_settings").select("*").eq("user_id", user.id).maybeSingle();
    const settings = memorySettingsSchema.parse({
      memoryEnabled: Boolean(storedSettings?.memory_enabled),
      allowAiSuggestions: Boolean(storedSettings?.allow_ai_suggestions),
      retentionDays: storedSettings?.retention_days ?? defaultMemorySettings.retentionDays,
      consentVersion: storedSettings?.consent_version ?? defaultMemorySettings.consentVersion
    });
    const permission = canPersistMemory(settings, entry);

    if (!permission.allowed) {
      return NextResponse.json({ ok: false, error: permission.reason }, { status: 403 });
    }
  }

  const basePayload = {
    user_id: user.id,
    title: entry.title,
    tags: entry.tags
  };

  const payload =
    entry.kind === "memory"
      ? {
          ...basePayload,
          body: entry.detail,
          memory_type: entry.category,
          source_kind: entry.sourceKind,
          created_by: entry.sourceKind === "ai_suggestion" ? "ai" : "user"
        }
      : entry.kind === "relationship"
        ? {
            user_id: user.id,
            display_name: entry.title,
            relationship_type: entry.category,
            context_note: entry.detail,
            tags: entry.tags
          }
        : entry.kind === "timeline"
          ? {
              ...basePayload,
              detail: entry.detail,
              event_type: entry.category,
              source_kind: entry.sourceKind
            }
          : {
              ...basePayload,
              detail: entry.detail,
              category: entry.category
            };

  const { error } = await supabase.from(table).insert(payload as any);
  if (error) return NextResponse.json({ ok: false, error: error.message }, { status: 500 });

  return NextResponse.json({ ok: true });
}
