import { NotificationCenter } from "@/components/notifications/NotificationCenter";
import { getVapidPublicKey } from "@/lib/notifications/push";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export default async function NotificationsPage() {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user }
  } = await supabase.auth.getUser();

  const [{ data: events = [] }, { count: subscriptionCount = 0 }] = await Promise.all([
    supabase
      .from("notification_events")
      .select("*")
      .eq("user_id", user?.id)
      .order("created_at", { ascending: false })
      .limit(30),
    supabase
      .from("notification_subscriptions")
      .select("id", { count: "exact", head: true })
      .eq("user_id", user?.id)
      .eq("is_active", true)
  ]);

  return (
    <div className="space-y-5">
      <NotificationCenter
        initialEvents={(events ?? []) as any}
        subscriptionCount={subscriptionCount ?? 0}
        vapidPublicKey={getVapidPublicKey()}
      />
    </div>
  );
}
