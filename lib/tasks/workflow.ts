import { z } from "zod";

export const taskWorkflowStatusSchema = z.enum(["new", "accepted", "in_progress", "done", "dismissed"]);
export const taskWorkflowActionSchema = z.enum(["accept", "start", "done"]);
export const taskWorkflowItemTypeSchema = z.enum(["task", "appointment"]);

export const taskWorkflowRequestSchema = z.object({
  itemType: taskWorkflowItemTypeSchema,
  id: z.string().uuid(),
  action: taskWorkflowActionSchema
});

export type TaskWorkflowStatus = z.infer<typeof taskWorkflowStatusSchema>;
export type TaskWorkflowAction = z.infer<typeof taskWorkflowActionSchema>;
export type TaskWorkflowItemType = z.infer<typeof taskWorkflowItemTypeSchema>;

export function workflowTableForItemType(itemType: TaskWorkflowItemType) {
  return itemType === "task" ? "nova_tasks" : "nova_calendar_items";
}

export function workflowPatchForAction(action: TaskWorkflowAction, now = new Date().toISOString()) {
  if (action === "accept") {
    return {
      workflow_status: "accepted",
      accepted_at: now,
      updated_at: now
    };
  }

  if (action === "start") {
    return {
      workflow_status: "in_progress",
      accepted_at: now,
      started_at: now,
      updated_at: now
    };
  }

  return {
    workflow_status: "done",
    accepted_at: now,
    started_at: now,
    done_at: now,
    updated_at: now
  };
}
