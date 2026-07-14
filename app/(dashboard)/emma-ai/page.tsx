import { DailyBriefPanel } from "@/components/ai/DailyBriefPanel";
import { AiAssistantPanel } from "@/components/dashboard/AiAssistantPanel";
import { NovaChatPanel } from "@/components/nova/NovaChatPanel";
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
  const { count: importedMemoryCount = 0 } = await supabase
    .from("nova_ai_knowledge_items")
    .select("id", { count: "exact", head: true })
    .eq("user_id", user?.id);

  return (
    <div className="space-y-5">
      <NovaChatPanel importedMemoryCount={importedMemoryCount ?? 0} />
      <DailyBriefPanel initialBrief={latestAiBrief as any} />
      <AiAssistantPanel />
    </div>
  );
}
