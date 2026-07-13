import { NextResponse } from "next/server";
import { importChatGptExport } from "@/lib/nova/openai-core";
import { logNovaAiEvent } from "@/lib/nova/ai-database";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export async function POST(request: Request) {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user }
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ ok: false, error: "Sign in required." }, { status: 401 });
  }

  const payload = await request.json().catch(() => null);
  if (!payload) {
    return NextResponse.json({ ok: false, error: "Upload a ChatGPT conversations JSON export." }, { status: 400 });
  }

  const result = await importChatGptExport(supabase, user.id, payload.export ?? payload);
  await logNovaAiEvent(supabase, user.id, {
    eventType: "system",
    intent: "chatgpt_export_import",
    status: "completed",
    generatedBy: "system",
    sourceCount: result.imported,
    metadata: { imported: result.imported, rawExportStored: false }
  });

  return NextResponse.json({ ok: true, ...result });
}
