import { StatusBadge } from "@/components/dashboard/StatusBadge";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export default async function ConflictsPage() {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user }
  } = await supabase.auth.getUser();

  const { data: conflicts = [] } = await supabase
    .from("conflict_logs")
    .select("id,severity,title,detail,conflict_type,created_at")
    .eq("user_id", user?.id)
    .order("created_at", { ascending: false })
    .limit(100);

  return (
    <section className="rounded-lg border border-occ-line bg-occ-panel p-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <p className="text-xs uppercase tracking-[0.18em] text-occ-cyan">Conflict detection</p>
          <h2 className="mt-2 text-2xl font-semibold text-white">Operational alerts</h2>
        </div>
        <StatusBadge tone={conflicts?.length ? "red" : "green"}>{conflicts?.length ?? 0} alerts</StatusBadge>
      </div>

      <div className="mt-5 space-y-3">
        {(conflicts ?? []).map((conflict: any) => (
          <article key={conflict.id} className="rounded-md border border-occ-line bg-occ-ink p-4">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <h3 className="font-semibold text-white">{conflict.title}</h3>
              <StatusBadge tone={conflict.severity === "Low" ? "neutral" : conflict.severity === "Medium" ? "amber" : "red"}>
                {conflict.severity}
              </StatusBadge>
            </div>
            <p className="mt-2 text-sm text-zinc-400">{conflict.detail}</p>
          </article>
        ))}
      </div>
    </section>
  );
}
