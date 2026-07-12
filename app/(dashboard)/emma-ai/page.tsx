import { DailyBriefPanel } from "@/components/ai/DailyBriefPanel";
import { AiAssistantPanel } from "@/components/dashboard/AiAssistantPanel";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export default async function EmmaAiPage() {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user }
  } = await supabase.auth.getUser();

  const { data: latestAiBrief } = await supabase
    .from("ai_briefs")
    .select("*")
    .eq("user_id", user?.id)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  return (
    <div className="space-y-5">
      <DailyBriefPanel initialBrief={latestAiBrief as any} />
      <AiAssistantPanel />
    </div>
  );
}
