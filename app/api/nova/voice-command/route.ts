import { NextResponse } from "next/server";
import { answerNovaVoiceCommand, novaVoiceAnswerRequestSchema } from "@/lib/nova/voice-answer";
import { classifyMissionCommand } from "@/lib/nova/mission-intelligence";
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

  const parsed = novaVoiceAnswerRequestSchema.safeParse(await request.json().catch(() => ({})));
  if (!parsed.success) {
    return NextResponse.json({ ok: false, error: "Ask NOVA a command or question first." }, { status: 400 });
  }

  const command = classifyMissionCommand(parsed.data.transcript);

  try {
    const answer = await answerNovaVoiceCommand({
      supabase,
      userId: user.id,
      transcript: parsed.data.transcript,
      allowWeb: parsed.data.allowWeb
    });

    await Promise.all([
      logNovaAiEvent(supabase, user.id, {
        eventType: answer.usedWeb ? "web_lookup" : "voice_command",
        intent: command.intent,
        status: answer.route ? "routed" : "completed",
        route: answer.route ?? null,
        confidence: answer.confidence,
        usedWeb: answer.usedWeb,
        generatedBy: answer.generatedBy,
        sourceCount: answer.sources.length,
        metadata: {
          mode: answer.mode,
          title: answer.title,
          action: command.action ?? null,
          transcriptStored: false
        }
      }),
      upsertNovaAiRuntimeState(supabase, user.id, {
        aiCoreStatus: "online",
        voiceEnabled: true,
        webLookupEnabled: parsed.data.allowWeb,
        lastVoiceCommandAt: new Date().toISOString(),
        metadata: { lastIntent: command.intent, lastRoute: answer.route ?? command.route ?? null }
      })
    ]);

    return NextResponse.json(answer);
  } catch (error) {
    const message = error instanceof Error ? error.message : "NOVA voice command failed.";
    await Promise.all([
      logNovaAiEvent(supabase, user.id, {
        eventType: "voice_command",
        intent: command.intent,
        status: "failed",
        route: command.route ?? null,
        confidence: command.confidence,
        error: message,
        metadata: { transcriptStored: false }
      }),
      upsertNovaAiRuntimeState(supabase, user.id, {
        aiCoreStatus: "degraded",
        voiceEnabled: true,
        webLookupEnabled: parsed.data.allowWeb,
        lastVoiceCommandAt: new Date().toISOString(),
        lastError: message,
        metadata: { lastIntent: command.intent }
      })
    ]);
    return NextResponse.json({ ok: false, error: "NOVA voice command failed." }, { status: 500 });
  }
}
