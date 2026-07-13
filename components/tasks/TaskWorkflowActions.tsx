"use client";

import { Check, CheckCheck, Loader2, Play } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";
import clsx from "clsx";
import type { TaskWorkflowAction, TaskWorkflowItemType, TaskWorkflowStatus } from "@/lib/tasks/workflow";

type TaskWorkflowActionsProps = {
  id: string;
  itemType: TaskWorkflowItemType;
  workflowStatus?: TaskWorkflowStatus | null;
};

const buttonClass =
  "focus-ring inline-flex h-8 items-center gap-1 rounded-md border border-occ-line bg-occ-panel2 px-2 text-xs font-semibold text-zinc-200 transition hover:border-occ-cyan/50 hover:text-white disabled:cursor-not-allowed disabled:opacity-50";

export function TaskWorkflowActions({ id, itemType, workflowStatus = "new" }: TaskWorkflowActionsProps) {
  const router = useRouter();
  const [pendingAction, setPendingAction] = useState<TaskWorkflowAction | null>(null);
  const [error, setError] = useState("");
  const status = workflowStatus ?? "new";

  async function applyAction(action: TaskWorkflowAction) {
    setPendingAction(action);
    setError("");

    const response = await fetch("/api/tasks/workflow", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id, itemType, action })
    });
    const payload = await response.json().catch(() => ({}));

    setPendingAction(null);
    if (!response.ok || !payload.ok) {
      setError(payload.error ?? "Action failed.");
      return;
    }

    router.refresh();
  }

  if (status === "done") {
    return (
      <div className="flex items-center justify-end gap-2">
        <span className="inline-flex h-8 items-center gap-1 rounded-md border border-occ-green/40 bg-occ-green/10 px-2 text-xs font-semibold text-green-200">
          <CheckCheck size={14} />
          Done
        </span>
      </div>
    );
  }

  const canAccept = status === "new";
  const canStart = status === "new" || status === "accepted";
  const canDone = status === "new" || status === "accepted" || status === "in_progress";

  return (
    <div className="space-y-2 sm:text-right">
      <div className="flex flex-wrap gap-2 sm:justify-end">
        {canAccept ? (
          <button type="button" onClick={() => applyAction("accept")} disabled={Boolean(pendingAction)} className={buttonClass}>
            {pendingAction === "accept" ? <Loader2 size={14} className="animate-spin" /> : <Check size={14} />}
            Accept
          </button>
        ) : null}
        {canStart ? (
          <button type="button" onClick={() => applyAction("start")} disabled={Boolean(pendingAction)} className={buttonClass}>
            {pendingAction === "start" ? <Loader2 size={14} className="animate-spin" /> : <Play size={14} />}
            Start
          </button>
        ) : null}
        {canDone ? (
          <button
            type="button"
            onClick={() => applyAction("done")}
            disabled={Boolean(pendingAction)}
            className={clsx(buttonClass, "border-occ-green/40 text-green-100 hover:border-occ-green/70")}
          >
            {pendingAction === "done" ? <Loader2 size={14} className="animate-spin" /> : <CheckCheck size={14} />}
            Done
          </button>
        ) : null}
      </div>
      {error ? <p className="text-xs text-red-200">{error}</p> : null}
    </div>
  );
}
