"use client";

import { CalendarCheck, RefreshCw } from "lucide-react";
import { useState } from "react";

type CalendarSyncClientProps = {
  connected: boolean;
  planCount: number;
  latestImportId?: string | null;
};

export function CalendarSyncClient({ connected, planCount, latestImportId }: CalendarSyncClientProps) {
  const [status, setStatus] = useState("");
  const [isSyncing, setIsSyncing] = useState(false);

  async function syncCalendar() {
    setIsSyncing(true);
    setStatus("");
    const response = await fetch("/api/calendar/sync", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ importId: latestImportId })
    });
    const payload = await response.json();
    setIsSyncing(false);
    setStatus(payload.ok ? `Synced ${payload.results?.filter((item: any) => item.ok).length ?? 0} calendar item(s).` : payload.error);
  }

  return (
    <div className="mt-5 flex flex-wrap items-center gap-3">
      <a
        href="/api/auth/google/start"
        className="focus-ring inline-flex items-center gap-2 rounded-md bg-occ-cyan px-4 py-2 font-semibold text-occ-ink"
      >
        <CalendarCheck size={18} />
        {connected ? "Reconnect Google" : "Connect Google"}
      </a>
      <button
        type="button"
        onClick={syncCalendar}
        disabled={!connected || !latestImportId || isSyncing}
        className="focus-ring inline-flex items-center gap-2 rounded-md border border-occ-line bg-occ-panel2 px-4 py-2 font-semibold text-white disabled:cursor-not-allowed disabled:opacity-50"
      >
        <RefreshCw size={18} />
        {isSyncing ? "Syncing..." : `Sync ${planCount} item(s)`}
      </button>
      {status ? <span className="text-sm text-zinc-400">{status}</span> : null}
    </div>
  );
}
