import { NextResponse } from "next/server";
import { z } from "zod";
import { decideNotification, notificationFromDailyBrief } from "@/lib/notifications/rules";
import { defaultNotificationPreferences, notificationPreferencesSchema } from "@/lib/settings/preferences";
import { createSupabaseServerClient } from "@/lib/supabase/server";

const candidateSchema = z.object({
  fromLatestBrief: z.boolean().optional(),
  eventType: z
    .enum([
      "leave_home",
      "return_trip",
      "delay_or_cancellation",
      "platform_change",
      "traffic_incident",
      "severe_weather",
      "buffer_risk",
      "calendar_change",
      "missed_departure_risk",
      "arrival",
      "gps_permission_lost",
      "integration_failure",
      "daily_brief",
      "manual"
    ])
    .optional(),
  severity: z.enum(["green", "amber", "red"]).optional(),
  title: z.string().max(180).optional(),
  body: z.string().max(1000).optional(),
  actionLabel: z.string().max(80).optional(),
  actionUrl: z.string().max(240).optional(),
  dedupeKey: z.string().max(180).optional()
});

const patchSchema = z.object({
  ids: z.array(z.string().uuid()).min(1).max(50),
  status: z.enum(["read"])
});

export async function GET() {
  const supabase = createSupabaseServerClient();
  const {
    data: { user }
  } = await supabase.auth.getUser();

  if (!user) return NextResponse.json({ ok: false, error: "Sign in required." }, { status: 401 });

  const { data, error } = await supabase
    .from("notification_events")
    .select("*")
    .eq("user_id", user.id)
    .order("created_at", { ascending: false })
    .limit(30);

  if (error) return NextResponse.json({ ok: false, error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true, events: data ?? [] });
}

export async function POST(request: Request) {
  const supabase = createSupabaseServerClient();
  const {
    data: { user }
  } = await supabase.auth.getUser();

  if (!user) return NextResponse.json({ ok: false, error: "Sign in required." }, { status: 401 });

  const parsed = candidateSchema.safeParse(await request.json().catch(() => ({})));
  if (!parsed.success) return NextResponse.json({ ok: false, error: "Invalid notification payload." }, { status: 400 });

  const [{ data: settings }, { data: latestBrief }] = await Promise.all([
    supabase.from("user_settings").select("notification_preferences").eq("user_id", user.id).maybeSingle(),
    supabase.from("ai_briefs").select("*").eq("user_id", user.id).order("created_at", { ascending: false }).limit(1).maybeSingle()
  ]);

  const preferences = notificationPreferencesSchema.parse(settings?.notification_preferences ?? defaultNotificationPreferences);
  const payload = parsed.data;

  if (payload.fromLatestBrief && !latestBrief) {
    return NextResponse.json({ ok: false, error: "Generate a daily brief before creating a brief alert." }, { status: 400 });
  }

  const candidate =
    payload.fromLatestBrief && latestBrief
      ? notificationFromDailyBrief(
          {
            title: latestBrief.title,
            summary: latestBrief.summary,
            status: latestBrief.status,
            confidence: Number(latestBrief.confidence ?? 0.5),
            shouldNotify: Boolean(latestBrief.should_notify),
            facts: latestBrief.facts ?? [],
            recommendations: latestBrief.recommendations ?? [],
            suppressedUpdates: latestBrief.suppressed_updates ?? [],
            sources: latestBrief.sources ?? []
          },
          latestBrief.id
        )
      : {
          eventType: payload.eventType ?? "manual",
          severity: payload.severity ?? "amber",
          title: payload.title ?? "NOVA alert",
          body: payload.body ?? "Review Mission Control for the latest operational status.",
          actionLabel: payload.actionLabel ?? "Open Mission Control",
          actionUrl: payload.actionUrl ?? "/dashboard",
          dedupeKey: payload.dedupeKey ?? null,
          sourceTable: null,
          sourceId: null
        };

  const { data: duplicate } = candidate.dedupeKey
    ? await supabase
        .from("notification_events")
        .select("id,created_at")
        .eq("user_id", user.id)
        .eq("dedupe_key", candidate.dedupeKey)
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle()
    : { data: null };

  const decision = decideNotification({
    candidate,
    preferences,
    recentDuplicateCreatedAt: duplicate?.created_at ?? null
  });

  const eventPayload = {
    user_id: user.id,
    channel: "in_app",
    event_type: candidate.eventType,
    severity: candidate.severity,
    title: candidate.title,
    body: candidate.body,
    action_label: candidate.actionLabel ?? null,
    action_url: candidate.actionUrl ?? null,
    source_table: candidate.sourceTable ?? null,
    source_id: candidate.sourceId ?? null,
    dedupe_key: candidate.dedupeKey ?? null,
    status: decision.status,
    should_notify: decision.shouldNotify,
    suppressed_reason: decision.reason,
    cooldown_until: decision.cooldownUntil,
    metadata: {
      phase: 7,
      source: payload.fromLatestBrief ? "daily_brief" : "manual",
      dedupeWindowMinutes: decision.dedupeWindowMinutes,
      duplicateEventId: duplicate?.id ?? null
    }
  };

  const { data: event, error } = duplicate?.id
    ? await supabase
        .from("notification_events")
        .update(eventPayload)
        .eq("user_id", user.id)
        .eq("id", duplicate.id)
        .select("*")
        .single()
    : await supabase.from("notification_events").insert(eventPayload).select("*").single();

  if (error) return NextResponse.json({ ok: false, error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true, event, decision });
}

export async function PATCH(request: Request) {
  const supabase = createSupabaseServerClient();
  const {
    data: { user }
  } = await supabase.auth.getUser();

  if (!user) return NextResponse.json({ ok: false, error: "Sign in required." }, { status: 401 });

  const parsed = patchSchema.safeParse(await request.json().catch(() => ({})));
  if (!parsed.success) return NextResponse.json({ ok: false, error: "Invalid notification update." }, { status: 400 });

  const { error } = await supabase
    .from("notification_events")
    .update({ status: "read", read_at: new Date().toISOString() })
    .eq("user_id", user.id)
    .in("id", parsed.data.ids);

  if (error) return NextResponse.json({ ok: false, error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true });
}
