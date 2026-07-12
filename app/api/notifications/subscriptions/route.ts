import { NextResponse } from "next/server";
import { z } from "zod";
import { createSupabaseServerClient } from "@/lib/supabase/server";

const subscriptionSchema = z.object({
  endpoint: z.string().url(),
  subscription: z.record(z.unknown()),
  permission: z.enum(["granted", "denied", "default"]).default("default"),
  userAgent: z.string().max(500).optional()
});

const deleteSchema = z.object({
  endpoint: z.string().url()
});

export async function GET() {
  const supabase = createSupabaseServerClient();
  const {
    data: { user }
  } = await supabase.auth.getUser();

  if (!user) return NextResponse.json({ ok: false, error: "Sign in required." }, { status: 401 });

  const { data, error } = await supabase
    .from("notification_subscriptions")
    .select("id,endpoint,permission,is_active,last_seen_at,created_at")
    .eq("user_id", user.id)
    .order("last_seen_at", { ascending: false });

  if (error) return NextResponse.json({ ok: false, error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true, subscriptions: data ?? [], vapidPublicKey: process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY ?? null });
}

export async function POST(request: Request) {
  const supabase = createSupabaseServerClient();
  const {
    data: { user }
  } = await supabase.auth.getUser();

  if (!user) return NextResponse.json({ ok: false, error: "Sign in required." }, { status: 401 });

  const parsed = subscriptionSchema.safeParse(await request.json().catch(() => ({})));
  if (!parsed.success) return NextResponse.json({ ok: false, error: "Invalid subscription payload." }, { status: 400 });

  const payload = parsed.data;
  const { error } = await supabase.from("notification_subscriptions").upsert(
    {
      user_id: user.id,
      endpoint: payload.endpoint,
      subscription: payload.subscription,
      user_agent: payload.userAgent ?? null,
      permission: payload.permission,
      is_active: payload.permission === "granted",
      last_seen_at: new Date().toISOString()
    },
    { onConflict: "user_id,endpoint" }
  );

  if (error) return NextResponse.json({ ok: false, error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true });
}

export async function DELETE(request: Request) {
  const supabase = createSupabaseServerClient();
  const {
    data: { user }
  } = await supabase.auth.getUser();

  if (!user) return NextResponse.json({ ok: false, error: "Sign in required." }, { status: 401 });

  const parsed = deleteSchema.safeParse(await request.json().catch(() => ({})));
  if (!parsed.success) return NextResponse.json({ ok: false, error: "Invalid endpoint." }, { status: 400 });

  const { error } = await supabase
    .from("notification_subscriptions")
    .update({ is_active: false, permission: "denied" })
    .eq("user_id", user.id)
    .eq("endpoint", parsed.data.endpoint);

  if (error) return NextResponse.json({ ok: false, error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true });
}
