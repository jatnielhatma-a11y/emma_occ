import { NextResponse } from "next/server";
import { z } from "zod";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

const savedLocationSchema = z.object({
  id: z.string().uuid().optional(),
  label: z.string().trim().min(1).max(120),
  kind: z.enum(["home", "work", "station", "custom"]),
  address: z.string().trim().max(240).optional(),
  latitude: z.number().min(-90).max(90).nullable().optional(),
  longitude: z.number().min(-180).max(180).nullable().optional(),
  radiusMeters: z.number().int().min(25).max(5000)
});

function defaultSavedLocations(userId: string) {
  return [
    {
      user_id: userId,
      label: "Home",
      kind: "home",
      address: "Lemmerstraat 18, 1324 BP Almere, Netherlands",
      radius_meters: 160,
      provider_source: "default"
    },
    {
      user_id: userId,
      label: "Work",
      kind: "work",
      address: "Admiraal Helfrichlaan 1, 3527 KV Utrecht, Netherlands",
      radius_meters: 180,
      provider_source: "default"
    },
    {
      user_id: userId,
      label: "Almere Centrum",
      kind: "station",
      address: "Almere Centrum, Almere, Netherlands",
      radius_meters: 350,
      provider_source: "default"
    },
    {
      user_id: userId,
      label: "Utrecht Centraal",
      kind: "station",
      address: "Utrecht Centraal, Utrecht, Netherlands",
      radius_meters: 350,
      provider_source: "default"
    }
  ];
}

async function ensureDefaultLocations(supabase: ReturnType<typeof createSupabaseServerClient>, userId: string) {
  const { count } = await supabase
    .from("saved_locations")
    .select("id", { count: "exact", head: true })
    .eq("user_id", userId)
    .is("deleted_at", null);

  if (count === 0) {
    await supabase.from("saved_locations").insert(defaultSavedLocations(userId));
  }
}

export async function GET() {
  const supabase = createSupabaseServerClient();
  const {
    data: { user }
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ ok: false, error: "Sign in required." }, { status: 401 });
  }

  await ensureDefaultLocations(supabase, user.id);

  const { data: locations = [], error } = await supabase
    .from("saved_locations")
    .select("id,label,kind,address,latitude,longitude,radius_meters,is_active,provider_source,updated_at")
    .eq("user_id", user.id)
    .is("deleted_at", null)
    .order("kind", { ascending: true })
    .order("label", { ascending: true });

  const { data: settings } = await supabase
    .from("user_settings")
    .select("location_preferences")
    .eq("user_id", user.id)
    .maybeSingle();

  if (error) {
    return NextResponse.json({ ok: false, error: error.message }, { status: 500 });
  }

  return NextResponse.json({
    ok: true,
    locations,
    locationEnabled: Boolean((settings?.location_preferences as { enabled?: boolean } | null)?.enabled)
  });
}

export async function POST(request: Request) {
  const supabase = createSupabaseServerClient();
  const {
    data: { user }
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ ok: false, error: "Sign in required." }, { status: 401 });
  }

  const parsed = savedLocationSchema.safeParse(await request.json().catch(() => ({})));
  if (!parsed.success) {
    return NextResponse.json({ ok: false, error: "Check the saved location details." }, { status: 400 });
  }

  const location = parsed.data;
  const payload = {
    user_id: user.id,
    label: location.label,
    kind: location.kind,
    address: location.address || null,
    latitude: location.latitude ?? null,
    longitude: location.longitude ?? null,
    radius_meters: location.radiusMeters,
    provider_source: "user",
    is_active: true,
    deleted_at: null
  };

  const query = location.id
    ? supabase.from("saved_locations").update(payload).eq("id", location.id).eq("user_id", user.id).select("id").single()
    : supabase.from("saved_locations").insert(payload).select("id").single();

  const { data, error } = await query;
  if (error) {
    return NextResponse.json({ ok: false, error: error.message }, { status: 500 });
  }

  return NextResponse.json({ ok: true, id: data.id });
}
