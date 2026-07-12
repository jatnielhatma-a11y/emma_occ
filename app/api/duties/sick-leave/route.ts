import { NextResponse } from "next/server";
import { z } from "zod";
import { createSupabaseServerClient } from "@/lib/supabase/server";

const sickLeaveSchema = z.object({
  dutyId: z.string().uuid(),
  isSickLeave: z.boolean()
});

export async function POST(request: Request) {
  const supabase = createSupabaseServerClient();
  const {
    data: { user }
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ ok: false, error: "Sign in required." }, { status: 401 });
  }

  const body = sickLeaveSchema.parse(await request.json());
  const { error } = await supabase
    .from("duties")
    .update({ is_sick_leave: body.isSickLeave })
    .eq("id", body.dutyId)
    .eq("user_id", user.id);

  if (error) {
    return NextResponse.json({ ok: false, error: error.message }, { status: 400 });
  }

  return NextResponse.json({ ok: true });
}
