import { NextResponse } from "next/server";
import { answerNovaChat, novaChatRequestSchema } from "@/lib/nova/openai-core";
import { logNovaAiEvent, upsertNovaAiRuntimeState } from "@/lib/nova/ai-database";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export async function POST(request: Request) {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user }
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ ok: false, error: "Sign in required." }, { status: 401 });
  }

  const parsed = novaChatRequestSchema.safeParse(await request.json().catch(() => ({})));
  if (!parsed.success) {
    return NextResponse.json({ ok: false, error: "Ask NOVA a question first." }, { status: 400 });
  }

  const answer = await answerNovaChat({
    supabase,
    userId: user.id,
    message: parsed.data.message,
    allowWeb: parsed.data.allowWeb,
    useImportedMemory: parsed.data.useImportedMemory,
    storeExchange: parsed.data.storeExchange
  });

  await Promise.all([
    logNovaAiEvent(supabase, user.id, {
      eventType: answer.usedWeb ? "web_lookup" : "text_command",
      intent: "nova_chat",
      status: "completed",
      confidence: answer.generatedBy === "openai" ? 0.82 : 0.45,
      usedWeb: answer.usedWeb,
      generatedBy: answer.generatedBy,
      sourceCount: answer.sourceCount,
      metadata: {
        model: answer.model,
        usedImportedMemory: answer.usedImportedMemory,
        contentStored: parsed.data.storeExchange
      }
    }),
    upsertNovaAiRuntimeState(supabase, user.id, {
      aiCoreStatus: answer.generatedBy === "openai" ? "online" : "degraded",
      webLookupEnabled: parsed.data.allowWeb,
      lastVoiceCommandAt: new Date().toISOString(),
      metadata: { lastIntent: "nova_chat", model: answer.model, usedImportedMemory: answer.usedImportedMemory }
    })
  ]);

  return NextResponse.json(answer);
}
