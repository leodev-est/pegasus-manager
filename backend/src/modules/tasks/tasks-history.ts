import type { Request } from "express";
import type { Task } from "@prisma/client";
import { auditService } from "../audit/audit.service";

/**
 * Histórico do card: cada mudança relevante vira uma linha no AuditLog (entity "Task").
 * Só o que interessa a quem acompanha o card — quem moveu, mudou prazo, responsáveis etc.
 */
export type TaskHistoryAction =
  | "create"
  | "move"
  | "due_date"
  | "assignees"
  | "format"
  | "edit"
  | "approve"
  | "reject"
  | "unschedule"
  | "publish"
  | "archive"
  | "unarchive"
  | "comment";

const ENTITY = "Task";

function dateKey(value: Date | null) {
  return value ? value.toISOString().slice(0, 10) : null;
}

export function logTaskEvent(
  request: Pick<Request, "user"> | null,
  task: Pick<Task, "id" | "title">,
  action: TaskHistoryAction,
  meta: Record<string, unknown> = {},
) {
  void auditService.log({
    userId: request?.user?.id ?? null,
    userName: request?.user?.name ?? null,
    action,
    entity: ENTITY,
    entityId: task.id,
    meta: { title: task.title, ...meta },
  });
}

/** Compares the card before and after an edit and logs one line per kind of change. */
export function logTaskChanges(request: Pick<Request, "user">, before: Task, after: Task) {
  if (before.status !== after.status) {
    logTaskEvent(request, after, "move", { from: before.status, to: after.status });
  }

  if (dateKey(before.dueDate) !== dateKey(after.dueDate)) {
    logTaskEvent(request, after, "due_date", { from: dateKey(before.dueDate), to: dateKey(after.dueDate) });
  }

  const added = after.assignedTo.filter((name) => !before.assignedTo.includes(name));
  const removed = before.assignedTo.filter((name) => !after.assignedTo.includes(name));
  if (added.length > 0 || removed.length > 0) {
    logTaskEvent(request, after, "assignees", { added, removed });
  }

  if ((before.format ?? null) !== (after.format ?? null)) {
    logTaskEvent(request, after, "format", { from: before.format, to: after.format });
  }

  const edited: string[] = [];
  if (before.title !== after.title) edited.push("título");
  if ((before.description ?? "") !== (after.description ?? "")) edited.push("descrição");
  if ((before.channel ?? null) !== (after.channel ?? null)) edited.push("canal");
  if (before.priority !== after.priority) edited.push("prioridade");
  if (JSON.stringify(before.labels) !== JSON.stringify(after.labels)) edited.push("etiquetas");
  if (JSON.stringify(before.checklist) !== JSON.stringify(after.checklist)) edited.push("checklist");
  if (before.stagesDone.join() !== after.stagesDone.join()) edited.push("etapas");
  if (edited.length > 0) {
    logTaskEvent(request, after, "edit", { fields: edited, ...(before.title !== after.title ? { from: before.title } : {}) });
  }
}

export async function listTaskHistory(taskId: string) {
  const rows = await auditService.list({ entity: ENTITY, entityId: taskId, limit: 100 });
  return rows.map((row) => ({
    id: row.id,
    action: row.action,
    userName: row.userName,
    meta: row.meta,
    createdAt: row.createdAt,
  }));
}
