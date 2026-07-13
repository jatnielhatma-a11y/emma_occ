import { NextResponse } from "next/server";
import { answerNovaVoiceCommand, novaVoiceAnswerRequestSchema } from "@/lib/nova/voice-answer";
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

  const answer = await answerNovaVoiceCommand({
    supabase,
    userId: user.id,
    transcript: parsed.data.transcript,
    allowWeb: parsed.data.allowWeb
  });

  return NextResponse.json(answer);
}
