import type { Task } from "@prisma/client";
import { prisma } from "../../config/prisma";
import { notificationsService } from "../notifications/notifications.service";
import type { TaskArea } from "./tasks.service";

type CommentLike = { id?: unknown; text?: unknown };

const MAX_MENTIONS = 10;

function normalize(value: string) {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase();
}

/** "@Gustavo", "@giu", "@Emilly" → normalized tokens. */
export function extractMentionTokens(text: string) {
  const tokens = new Set<string>();
  for (const match of text.matchAll(/@([\p{L}][\p{L}\p{M}'-]*)/gu)) {
    tokens.add(normalize(match[1]));
  }
  return tokens;
}

/** New comments in `after` that were not in `before` (by id). */
export function newComments(before: unknown, after: unknown): CommentLike[] {
  const beforeIds = new Set(
    (Array.isArray(before) ? (before as CommentLike[]) : []).map((comment) => String(comment.id)),
  );
  return (Array.isArray(after) ? (after as CommentLike[]) : []).filter(
    (comment) => !beforeIds.has(String(comment.id)),
  );
}

/**
 * Notifies the people mentioned with @ in the given comments. A mention matches a person's
 * first name or full name without spaces, only among active users who can see the card's area.
 * Never notifies the author. Best effort: errors don't break the request.
 */
export async function notifyMentions(
  task: Pick<Task, "id" | "title" | "area">,
  comments: CommentLike[],
  author: { id: string; name: string } | undefined,
) {
  const texts = comments.map((comment) => (typeof comment.text === "string" ? comment.text : "")).filter(Boolean);
  const tokens = new Set(texts.flatMap((text) => [...extractMentionTokens(text)]));
  if (tokens.size === 0) return;

  try {
    const area = task.area as TaskArea;
    const people = await prisma.user.findMany({
      where: {
        active: true,
        roles: {
          some: {
            role: {
              OR: [{ name: "Diretor" }, { permissions: { some: { permission: { key: `${area}:read` } } } }],
            },
          },
        },
      },
      select: { id: true, name: true },
    });

    const mentioned = people.filter((person) => {
      if (person.id === author?.id) return false;
      const first = normalize(person.name.split(/\s+/)[0] ?? "");
      const compact = normalize(person.name.replace(/\s+/g, ""));
      return tokens.has(first) || tokens.has(compact);
    });

    // Cap: a comment can't be used to ping the whole club.
    if (mentioned.length > MAX_MENTIONS) mentioned.length = MAX_MENTIONS;
    const preview = texts.join(" ").replace(/\s+/g, " ").trim();
    await Promise.all(
      mentioned.map((person) =>
        notificationsService
          .create({
            userId: person.id,
            type: area === "marketing" ? "marketing" : "sistema",
            title: "Você foi mencionado",
            message: `${author?.name ?? "Alguém"} em "${task.title}": ${preview.length > 140 ? `${preview.slice(0, 140)}…` : preview}`,
            meta: JSON.stringify({ action: "task_mention", taskId: task.id, area }),
          })
          .catch(() => null),
      ),
    );
  } catch {
    // Mentions are a convenience; never fail the comment because of them.
  }
}
