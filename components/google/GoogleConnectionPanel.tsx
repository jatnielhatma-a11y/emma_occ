"use client";

import { CalendarCheck, CheckSquare, MailCheck, PlugZap, Unplug } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { StatusBadge } from "@/components/dashboard/StatusBadge";

type GoogleConnectionPanelProps = {
  configured: boolean;
  connected: boolean;
  services: {
    calendar?: boolean;
    calendarList?: boolean;
    gmail?: boolean;
    tasks?: boolean;
  };
  connectedAt?: string | null;
  lastSyncAt?: string | null;
  lastError?: string | null;
};

function formatTimestamp(value?: string | null) {
  if (!value) return "Never";
  return new Intl.DateTimeFormat(undefined, {
    dateStyle: "medium",
    timeStyle: "short"
  }).format(new Date(value));
}

export function GoogleConnectionPanel({ configured, connected, services, connectedAt, lastSyncAt, lastError }: GoogleConnectionPanelProps) {
  const router = useRouter();
  const [status, setStatus] = useState("");
  const [isDisconnecting, setIsDisconnecting] = useState(false);

  async function disconnect() {
    setIsDisconnecting(true);
    setStatus("");
    const response = await fetch("/api/auth/google/disconnect", { method: "POST" });
    const payload = await response.json();
    setIsDisconnecting(false);
    setStatus(payload.ok ? "Google disconnected." : payload.error);
    router.refresh();
  }

  return (
    <section className="rounded-lg border border-occ-line bg-occ-panel p-5">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <p className="text-xs uppercase tracking-[0.18em] text-occ-cyan">Google</p>
          <h2 className="mt-2 text-2xl font-semibold text-white">Calendar and Gmail connection</h2>
          <p className="mt-2 max-w-2xl text-sm text-zinc-400">
            NOVA uses Google OAuth with PKCE, encrypted token storage, and least-purpose service status. Gmail remains read-only.
          </p>
        </div>
        <StatusBadge tone={!configured ? "amber" : connected ? "green" : "neutral"}>
          {!configured ? "Config needed" : connected ? "Connected" : "Not connected"}
        </StatusBadge>
      </div>

      <div className="mt-5 grid gap-3 sm:grid-cols-4">
        <div className="rounded-md bg-occ-ink p-3">
          <div className="flex items-center gap-2 text-sm text-zinc-400">
            <CalendarCheck size={16} className="text-occ-cyan" />
            Calendar
          </div>
          <strong className="mt-2 block text-white">{services.calendar ? "Events connected" : "Not connected"}</strong>
          <p className="mt-1 text-xs text-zinc-500">{services.calendarList ? "All calendars visible" : "Primary/fallback only"}</p>
        </div>
        <div className="rounded-md bg-occ-ink p-3">
          <div className="flex items-center gap-2 text-sm text-zinc-400">
            <CheckSquare size={16} className="text-occ-cyan" />
            Tasks
          </div>
          <strong className="mt-2 block text-white">{services.tasks ? "Read-only connected" : "Reconnect needed"}</strong>
        </div>
        <div className="rounded-md bg-occ-ink p-3">
          <div className="flex items-center gap-2 text-sm text-zinc-400">
            <MailCheck size={16} className="text-occ-cyan" />
            Gmail
          </div>
          <strong className="mt-2 block text-white">{services.gmail ? "Read-only connected" : "Not connected"}</strong>
        </div>
        <div className="rounded-md bg-occ-ink p-3">
          <div className="flex items-center gap-2 text-sm text-zinc-400">
            <PlugZap size={16} className="text-occ-cyan" />
            Last sync
          </div>
          <strong className="mt-2 block text-white">{formatTimestamp(lastSyncAt)}</strong>
        </div>
      </div>

      {lastError ? <p className="mt-4 rounded-md border border-occ-red/40 bg-occ-red/10 p-3 text-sm text-red-100">{lastError}</p> : null}

      <div className="mt-5 flex flex-wrap items-center gap-3">
        <a href="/api/auth/google/start" className="focus-ring inline-flex items-center gap-2 rounded-md bg-occ-cyan px-4 py-2 font-semibold text-occ-ink">
          <CalendarCheck size={18} />
          {connected ? "Reconnect Google" : "Connect Google"}
        </a>
        <button
          type="button"
          onClick={disconnect}
          disabled={!connected || isDisconnecting}
          className="focus-ring inline-flex items-center gap-2 rounded-md border border-occ-line bg-occ-panel2 px-4 py-2 font-semibold text-white disabled:cursor-not-allowed disabled:opacity-50"
        >
          <Unplug size={18} />
          {isDisconnecting ? "Disconnecting..." : "Disconnect"}
        </button>
        <span className="text-sm text-zinc-500">Connected: {formatTimestamp(connectedAt)}</span>
        {status ? <span className="text-sm text-zinc-400">{status}</span> : null}
      </div>
    </section>
  );
}
