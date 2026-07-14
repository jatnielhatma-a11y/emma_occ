import { NextResponse } from "next/server";
import { importChatGptExport, importKnowledgeItems } from "@/lib/nova/openai-core";
import { logNovaAiEvent } from "@/lib/nova/ai-database";
import { isNovaReferenceDatabasePayload, novaReferenceDatabaseToKnowledgeItems, summarizeNovaReferenceDatabase } from "@/lib/nova/reference-database";
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

  const importPayload = payload.export ?? payload;
  const isReferenceDatabase = isNovaReferenceDatabasePayload(importPayload);
  const result = isReferenceDatabase
    ? await importKnowledgeItems(supabase, user.id, novaReferenceDatabaseToKnowledgeItems(importPayload))
    : await importChatGptExport(supabase, user.id, importPayload);
  const referenceSummary = isReferenceDatabase ? summarizeNovaReferenceDatabase(importPayload) : null;

  await logNovaAiEvent(supabase, user.id, {
    eventType: "system",
    intent: isReferenceDatabase ? "nova_reference_database_import" : "chatgpt_export_import",
    status: "completed",
    generatedBy: "system",
    sourceCount: result.imported,
    metadata: isReferenceDatabase
      ? { imported: result.imported, rawDatabaseStored: false, referenceSummary }
      : { imported: result.imported, rawExportStored: false }
  });

  return NextResponse.json({ ok: true, importKind: isReferenceDatabase ? "nova_reference_database" : "chatgpt_export", ...result });
}
