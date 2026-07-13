import { NextResponse } from "next/server";
import { taskWorkflowRequestSchema, workflowPatchForAction, workflowTableForItemType } from "@/lib/tasks/workflow";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export async function POST(request: Request) {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user }
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ ok: false, error: "Sign in required." }, { status: 401 });
  }

  const parsed = taskWorkflowRequestSchema.safeParse(await request.json().catch(() => ({})));
  if (!parsed.success) {
    return NextResponse.json({ ok: false, error: "Check the task action and try again." }, { status: 400 });
  }

  const { itemType, id, action } = parsed.data;
  const table = workflowTableForItemType(itemType);
  const patch = workflowPatchForAction(action);
  const { data, error } = await supabase.from(table).update(patch).eq("user_id", user.id).eq("id", id).select("id").maybeSingle();

  if (error) return NextResponse.json({ ok: false, error: error.message }, { status: 500 });
  if (!data) return NextResponse.json({ ok: false, error: "Item not found." }, { status: 404 });

  return NextResponse.json({ ok: true, id, action });
}
