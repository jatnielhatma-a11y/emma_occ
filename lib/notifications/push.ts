import webpush from "web-push";
import type { SupabaseClient } from "@supabase/supabase-js";

type PushSubscriptionRow = {
  id: string;
  endpoint: string;
  subscription: webpush.PushSubscription;
};

export type PushNotificationPayload = {
  title: string;
  body: string;
  url?: string | null;
};

export type PushDeliveryResult = {
  attempted: number;
  sent: number;
  failed: number;
  expired: number;
  skippedReason: string | null;
};

export function getVapidPublicKey() {
  return process.env.VAPID_PUBLIC_KEY || process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY || null;
}

export function hasPushConfig() {
  return Boolean(getVapidPublicKey() && process.env.VAPID_PRIVATE_KEY && process.env.VAPID_SUBJECT);
}

function configureWebPush() {
  if (!hasPushConfig()) return false;
  webpush.setVapidDetails(process.env.VAPID_SUBJECT!, getVapidPublicKey()!, process.env.VAPID_PRIVATE_KEY!);
  return true;
}

function isExpiredSubscription(statusCode?: number) {
  return statusCode === 404 || statusCode === 410;
}

export async function sendPushNotificationToUser(
  supabase: SupabaseClient,
  userId: string,
  payload: PushNotificationPayload
): Promise<PushDeliveryResult> {
  if (!configureWebPush()) {
    return { attempted: 0, sent: 0, failed: 0, expired: 0, skippedReason: "Push notification keys are not configured." };
  }

  const { data, error } = await supabase
    .from("notification_subscriptions")
    .select("id,endpoint,subscription")
    .eq("user_id", userId)
    .eq("is_active", true)
    .eq("permission", "granted");

  if (error) throw new Error(error.message);

  const subscriptions = (data ?? []) as PushSubscriptionRow[];
  if (!subscriptions.length) {
    return { attempted: 0, sent: 0, failed: 0, expired: 0, skippedReason: "No active push subscriptions are saved for this user." };
  }

  const body = JSON.stringify({
    title: payload.title,
    body: payload.body,
    url: payload.url || "/dashboard"
  });

  let sent = 0;
  let failed = 0;
  let expired = 0;
  const expiredIds: string[] = [];

  await Promise.all(
    subscriptions.map(async (item) => {
      try {
        await webpush.sendNotification(item.subscription, body, { TTL: 60 * 30 });
        sent += 1;
      } catch (error) {
        failed += 1;
        const statusCode = typeof error === "object" && error && "statusCode" in error ? Number(error.statusCode) : undefined;
        if (isExpiredSubscription(statusCode)) {
          expired += 1;
          expiredIds.push(item.id);
        }
      }
    })
  );

  if (expiredIds.length) {
    await supabase.from("notification_subscriptions").update({ is_active: false, permission: "denied" }).in("id", expiredIds);
  }

  return {
    attempted: subscriptions.length,
    sent,
    failed,
    expired,
    skippedReason: sent ? null : "Push delivery failed for all active subscriptions."
  };
}
