import { createSupabaseServerClient } from "@/lib/supabase/server";
import { StatusBadge } from "@/components/dashboard/StatusBadge";

export default async function SchedulePage() {
  const supabase = createSupabaseServerClient();
  const {
    data: { user }
  } = await supabase.auth.getUser();

  const { data: duties = [] } = await supabase
    .from("duties")
    .select("id,duty_date,start_time,end_time,duty_label,location,is_off,is_overnight")
    .eq("user_id", user?.id)
    .order("duty_date", { ascending: true })
    .limit(80);

  return (
    <section className="rounded-lg border border-occ-line bg-occ-panel p-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <p className="text-xs uppercase tracking-[0.18em] text-occ-cyan">Roster table</p>
          <h2 className="mt-2 text-2xl font-semibold text-white">Schedule</h2>
        </div>
        <StatusBadge tone="cyan">{duties?.length ?? 0} duties</StatusBadge>
      </div>

      <div className="mt-5 overflow-x-auto">
        <table className="w-full min-w-[720px] border-collapse text-left text-sm">
          <thead className="border-b border-occ-line text-zinc-500">
            <tr>
              <th className="py-3 pr-4 font-medium">Date</th>
              <th className="py-3 pr-4 font-medium">Duty</th>
              <th className="py-3 pr-4 font-medium">Start</th>
              <th className="py-3 pr-4 font-medium">End</th>
              <th className="py-3 pr-4 font-medium">Location</th>
              <th className="py-3 pr-4 font-medium">Flags</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-occ-line text-zinc-300">
            {(duties ?? []).map((duty: any) => (
              <tr key={duty.id}>
                <td className="py-3 pr-4">{duty.duty_date}</td>
                <td className="py-3 pr-4">{duty.duty_label}</td>
                <td className="py-3 pr-4">{duty.start_time?.slice(0, 5) ?? "-"}</td>
                <td className="py-3 pr-4">{duty.end_time?.slice(0, 5) ?? "-"}</td>
                <td className="py-3 pr-4">{duty.location ?? "n/a"}</td>
                <td className="py-3 pr-4">
                  {duty.is_off ? <StatusBadge tone="green">OFF</StatusBadge> : null}
                  {duty.is_overnight ? <StatusBadge tone="violet">Overnight</StatusBadge> : null}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  );
}
