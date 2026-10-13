import { prisma } from "../../config/prisma";
import { notificationsService } from "../notifications/notifications.service";
import { functionsForStep, type ContentStep } from "./marketing.shared";

type Payload = { title: string; message: string; meta?: string };

/** Notifica usuários ativos pelo NOME (é assim que os responsáveis são guardados). */
export async function notifyUsersByName(names: string[], payload: Payload, excludeUserId?: string) {
  const wanted = new Set(names.map((n) => n.trim().toLowerCase()).filter(Boolean));
  if (wanted.size === 0) return;

  const users = await prisma.user.findMany({ where: { active: true }, select: { id: true, name: true } });
  const targets = users.filter((u) => wanted.has(u.name.trim().toLowerCase()) && u.id !== excludeUserId);

  await Promise.all(
    targets.map((u) => notificationsService.create({ ...payload, type: "marketing", userId: u.id }).catch(() => null)),
  );
}

/** Notifica todos os usuários ativos com algum dos papéis (menos quem fez a ação). */
export async function notifyUsersByRole(roleNames: string[], payload: Payload, excludeUserId?: string) {
  const users = await prisma.user.findMany({
    where: {
      active: true,
      roles: { some: { role: { name: { in: roleNames } } } },
      ...(excludeUserId ? { id: { not: excludeUserId } } : {}),
    },
    select: { id: true },
  });

  await Promise.all(
    users.map((u) => notificationsService.create({ ...payload, type: "marketing", userId: u.id }).catch(() => null)),
  );
}

/** Notifica quem tem função ligada à etapa pendente (ex.: "edicao" quando algo vira "gravado"). */
export async function notifyUsersForStep(step: ContentStep, payload: Payload, excludeUserId?: string) {
  const fns = functionsForStep(step);
  if (fns.length === 0) return;

  const users = await prisma.user.findMany({
    where: { active: true, marketingFunctions: { hasSome: fns }, ...(excludeUserId ? { id: { not: excludeUserId } } : {}) },
    select: { id: true },
  });

  await Promise.all(
    users.map((u) => notificationsService.create({ ...payload, type: "marketing", userId: u.id }).catch(() => null)),
  );
}
