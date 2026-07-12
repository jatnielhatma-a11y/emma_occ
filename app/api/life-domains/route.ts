import { NextResponse } from "next/server";
import { lifeDomainRequestSchema } from "@/lib/nova/life-domains";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export async function POST(request: Request) {
  const supabase = createSupabaseServerClient();
  const {
    data: { user }
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ ok: false, error: "Sign in required." }, { status: 401 });
  }

  const parsed = lifeDomainRequestSchema.safeParse(await request.json().catch(() => ({})));
  if (!parsed.success) {
    return NextResponse.json({ ok: false, error: "Check the life-domain details and try again." }, { status: 400 });
  }

  if (parsed.data.action === "archiveRecord") {
    const { error } = await supabase
      .from("nova_life_domain_records")
      .update({ archived_at: new Date().toISOString(), status: "archived" })
      .eq("user_id", user.id)
      .eq("id", parsed.data.id);

    if (error) return NextResponse.json({ ok: false, error: error.message }, { status: 500 });
    return NextResponse.json({ ok: true });
  }

  const { record } = parsed.data;
  const { error } = await supabase.from("nova_life_domain_records").insert({
    user_id: user.id,
    domain: record.domain,
    title: record.title,
    detail: record.detail,
    category: record.category,
    status: record.status,
    priority: record.priority,
    target_date: record.targetDate || null,
    amount_cents: record.amountCents ?? null,
    currency: record.currency.toUpperCase(),
    tags: record.tags,
    sensitive: record.sensitive
  });

  if (error) return NextResponse.json({ ok: false, error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true });
}
