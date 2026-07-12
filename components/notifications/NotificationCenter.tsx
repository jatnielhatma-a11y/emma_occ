"use client";

import { Bell, BellRing, CheckCheck, RefreshCw } from "lucide-react";
import { useEffect, useState } from "react";
import { StatusBadge } from "@/components/dashboard/StatusBadge";

type NotificationEvent = {
  id: string;
  event_type: string;
  severity: "green" | "amber" | "red";
  title: string;
  body: string;
  action_label: string | null;
  action_url: string | null;
  status: "pending" | "suppressed" | "sent" | "read" | "failed";
  should_notify: boolean;
  suppressed_reason: string | null;
  created_at: string;
};

type NotificationCenterProps = {
  initialEvents: NotificationEvent[];
  subscriptionCount: number;
  vapidPublicKey: string | null;
};

function urlBase64ToUint8Array(base64String: string) {
  const padding = "=".repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, "+").replace(/_/g, "/");
  const rawData = window.atob(base64);
  const outputArray = new Uint8Array(rawData.length);
  for (let index = 0; index < rawData.length; index += 1) outputArray[index] = rawData.charCodeAt(index);
  return outputArray;
}

function formatTime(value: string) {
  return new Intl.DateTimeFormat("en-GB", {
    dateStyle: "medium",
    timeStyle: "short"
  }).format(new Date(value));
}

export function NotificationCenter({ initialEvents, subscriptionCount, vapidPublicKey }: NotificationCenterProps) {
  const [events, setEvents] = useState(initialEvents);
  const [permission, setPermission] = useState(typeof Notification === "undefined" ? "unsupported" : Notification.permission);
  const [status, setStatus] = useState("");
  const [isWorking, setIsWorking] = useState(false);

  useEffect(() => {
    setPermission(typeof Notification === "undefined" ? "unsupported" : Notification.permission);
  }, []);

  async function enablePush() {
    setIsWorking(true);
    setStatus("Checking browser permission...");
    try {
      if (!("serviceWorker" in navigator) || typeof Notification === "undefined" || !("PushManager" in window)) {
        setStatus("This browser does not support web push.");
        return;
      }
      if (!vapidPublicKey) {
        setStatus("Push subscription storage is ready. Add NEXT_PUBLIC_VAPID_PUBLIC_KEY to enable browser push.");
        return;
      }
      const nextPermission = await Notification.requestPermission();
      setPermission(nextPermission);
      if (nextPermission !== "granted") {
        setStatus("Notifications were not granted.");
        return;
      }
      const registration = await navigator.serviceWorker.register("/sw.js");
      const existing = await registration.pushManager.getSubscription();
      const subscription =
        existing ??
        (await registration.pushManager.subscribe({
          userVisibleOnly: true,
          applicationServerKey: urlBase64ToUint8Array(vapidPublicKey)
        }));
      const response = await fetch("/api/notifications/subscriptions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          endpoint: subscription.endpoint,
          subscription: subscription.toJSON(),
          permission: nextPermission,
          userAgent: navigator.userAgent
        })
      });
      const payload = await response.json();
      setStatus(payload.ok ? "Push subscription saved." : payload.error);
    } catch {
      setStatus("Could not enable push notifications.");
    } finally {
      setIsWorking(false);
    }
  }

  async function createDailyBriefAlert() {
    setIsWorking(true);
    setStatus("Creating alert...");
    const response = await fetch("/api/notifications/events", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ fromLatestBrief: true })
    });
    const payload = await response.json();
    if (payload.ok) {
      setEvents((current) => [payload.event, ...current.filter((event) => event.id !== payload.event.id)].slice(0, 30));
      setStatus(payload.decision?.reason ?? "Alert created.");
    } else {
      setStatus(payload.error ?? "Could not create alert.");
    }
    setIsWorking(false);
  }

  async function markAllRead() {
    const ids = events.filter((event) => event.status !== "read").map((event) => event.id);
    if (!ids.length) return;
    const response = await fetch("/api/notifications/events", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ids, status: "read" })
    });
    const payload = await response.json();
    if (payload.ok) {
      setEvents((current) => current.map((event) => ({ ...event, status: "read" })));
      setStatus("Alerts marked read.");
    } else {
      setStatus(payload.error ?? "Could not mark alerts read.");
    }
  }

  const pendingCount = events.filter((event) => event.status === "pending" || event.status === "sent").length;

  return (
    <section className="rounded-lg border border-occ-line bg-occ-panel p-5">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="flex items-start gap-3">
          <span className="grid h-10 w-10 place-items-center rounded-md bg-occ-panel2 text-occ-cyan">
            <BellRing size={20} />
          </span>
          <div>
            <p className="text-xs uppercase tracking-[0.18em] text-occ-cyan">Phase 6</p>
            <h1 className="mt-1 text-2xl font-semibold text-white">Notifications</h1>
            <p className="mt-1 text-sm text-zinc-500">{subscriptionCount} saved push subscription(s) · browser permission {permission}</p>
          </div>
        </div>
        <div className="flex flex-wrap gap-2">
          <StatusBadge tone={pendingCount ? "amber" : "green"}>{pendingCount} active</StatusBadge>
          <button type="button" onClick={enablePush} disabled={isWorking} className="focus-ring inline-flex items-center gap-2 rounded-md bg-occ-cyan px-3 py-2 text-sm font-semibold text-occ-ink disabled:opacity-60">
            <Bell size={15} />
            Enable
          </button>
          <button type="button" onClick={createDailyBriefAlert} disabled={isWorking} className="focus-ring inline-flex items-center gap-2 rounded-md border border-occ-line bg-occ-ink px-3 py-2 text-sm font-semibold text-white disabled:opacity-60">
            <RefreshCw size={15} />
            Brief alert
          </button>
          <button type="button" onClick={markAllRead} className="focus-ring inline-flex items-center gap-2 rounded-md border border-occ-line bg-occ-ink px-3 py-2 text-sm font-semibold text-white">
            <CheckCheck size={15} />
            Read
          </button>
        </div>
      </div>

      <div className="mt-5 divide-y divide-occ-line">
        {events.length ? (
          events.map((event) => (
            <div key={event.id} className="grid gap-3 py-3 sm:grid-cols-[1fr_auto] sm:items-start">
              <div>
                <div className="flex flex-wrap items-center gap-2">
                  <p className="font-medium text-white">{event.title}</p>
                  <StatusBadge tone={event.severity}>{event.severity}</StatusBadge>
                  <StatusBadge tone={event.status === "suppressed" ? "neutral" : event.status === "read" ? "green" : "amber"}>{event.status}</StatusBadge>
                </div>
                <p className="mt-1 text-sm text-zinc-500">{event.body}</p>
                {event.suppressed_reason ? <p className="mt-1 text-xs text-zinc-600">{event.suppressed_reason}</p> : null}
              </div>
              <div className="text-sm text-zinc-500 sm:text-right">
                <p>{formatTime(event.created_at)}</p>
                {event.action_url ? (
                  <a className="mt-2 inline-flex text-occ-cyan hover:text-white" href={event.action_url}>
                    {event.action_label ?? "Open"}
                  </a>
                ) : null}
              </div>
            </div>
          ))
        ) : (
          <p className="py-8 text-sm text-zinc-500">No notification events yet.</p>
        )}
      </div>
      {status ? <p className="mt-4 text-sm text-zinc-400">{status}</p> : null}
    </section>
  );
}
