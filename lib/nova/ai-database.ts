type SupabaseLike = {
  from(table: string): any;
};

type NovaAiEventInput = {
  eventType: "voice_command" | "text_command" | "daily_brief" | "mission_start" | "web_lookup" | "system";
  intent?: string | null;
  status?: "completed" | "failed" | "blocked" | "routed";
  route?: string | null;
  confidence?: number | null;
  usedWeb?: boolean;
  generatedBy?: "openai" | "fallback" | "system" | null;
  sourceCount?: number | null;
  error?: string | null;
  metadata?: Record<string, unknown>;
};

type NovaAiRuntimeStateInput = {
  aiCoreStatus?: "online" | "degraded" | "offline";
  voiceEnabled?: boolean;
  webLookupEnabled?: boolean;
  lastVoiceCommandAt?: string | null;
  lastDailyBriefAt?: string | null;
  lastMissionStartedAt?: string | null;
  lastError?: string | null;
  metadata?: Record<string, unknown>;
};

function clampConfidence(value?: number | null) {
  if (typeof value !== "number" || Number.isNaN(value)) return null;
  return Math.min(1, Math.max(0, value));
}

export async function logNovaAiEvent(supabase: SupabaseLike, userId: string, input: NovaAiEventInput) {
  try {
    await supabase.from("nova_ai_events").insert({
      user_id: userId,
      event_type: input.eventType,
      intent: input.intent ?? null,
      status: input.status ?? "completed",
      route: input.route ?? null,
      confidence: clampConfidence(input.confidence),
      used_web: Boolean(input.usedWeb),
      generated_by: input.generatedBy ?? null,
      source_count: input.sourceCount ?? null,
      error: input.error ?? null,
      metadata: input.metadata ?? {}
    });
  } catch {
    // AI telemetry must never block the user's operational flow.
  }
}

export async function upsertNovaAiRuntimeState(supabase: SupabaseLike, userId: string, input: NovaAiRuntimeStateInput) {
  try {
    await supabase
      .from("nova_ai_runtime_state")
      .upsert(
        {
          user_id: userId,
          ai_core_status: input.aiCoreStatus ?? "online",
          voice_enabled: input.voiceEnabled ?? true,
          web_lookup_enabled: input.webLookupEnabled ?? true,
          last_voice_command_at: input.lastVoiceCommandAt,
          last_daily_brief_at: input.lastDailyBriefAt,
          last_mission_started_at: input.lastMissionStartedAt,
          last_error: input.lastError ?? null,
          metadata: input.metadata ?? {}
        },
        { onConflict: "user_id" }
      );
  } catch {
    // Runtime state is useful for visibility, but should not break app actions.
  }
}
