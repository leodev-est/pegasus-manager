import cron from "node-cron";
import { prisma } from "../../config/prisma";
import { notificationsService } from "../notifications/notifications.service";

export function startPaymentNotificationScheduler(): void {
  cron.schedule("0 8 * * *", async () => {
    try {
      await notifyPayments();
    } catch (err) {
      console.error("[Payment Notification Scheduler] Erro:", err);
    }
  });
  console.log("[Payment Notification Scheduler] Started (daily at 08:00)");
}

async function notifyPayments(): Promise<void> {
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const in3Days = new Date(today);
  in3Days.setDate(in3Days.getDate() + 3);
  const in3DaysEnd = new Date(in3Days);
  in3DaysEnd.setHours(23, 59, 59, 999);

  const todayEnd = new Date(today);
  todayEnd.setHours(23, 59, 59, 999);

  // Vence em 3 dias
  const vencendoEm3 = await prisma.payment.findMany({
    where: {
      type: "receita",
      status: "pendente",
      dueDate: { gte: in3Days, lte: in3DaysEnd },
      athleteId: { not: null },
    },
    include: { athlete: { include: { user: true } } },
  });

  for (const p of vencendoEm3) {
    const userId = p.athlete?.user?.id;
    await notificationsService.createOnceTodayForUser(userId, {
      title: "Mensalidade vence em 3 dias",
      message: `Sua mensalidade de ${formatMonth(p.referenceMonth)} vence em 3 dias. Fique em dia com o clube!`,
      type: "financeiro",
    });
  }

  // Vence hoje
  const vencendoHoje = await prisma.payment.findMany({
    where: {
      type: "receita",
      status: "pendente",
      dueDate: { gte: today, lte: todayEnd },
      athleteId: { not: null },
    },
    include: { athlete: { include: { user: true } } },
  });

  for (const p of vencendoHoje) {
    const userId = p.athlete?.user?.id;
    await notificationsService.createOnceTodayForUser(userId, {
      title: "Mensalidade vence hoje",
      message: `Sua mensalidade de ${formatMonth(p.referenceMonth)} vence hoje. Regularize para continuar treinando!`,
      type: "financeiro",
    });
  }

  // Atrasadas
  const atrasadas = await prisma.payment.findMany({
    where: {
      type: "receita",
      status: "atrasado",
      athleteId: { not: null },
    },
    include: { athlete: { include: { user: true } } },
  });

  for (const p of atrasadas) {
    const userId = p.athlete?.user?.id;
    await notificationsService.createOnceTodayForUser(userId, {
      title: "Mensalidade em atraso",
      message: `Sua mensalidade de ${formatMonth(p.referenceMonth)} está atrasada. Entre em contato com o clube.`,
      type: "financeiro",
    });
  }

  console.log(
    `[Payment Notification Scheduler] ${vencendoEm3.length} vencendo em 3 dias, ${vencendoHoje.length} vencendo hoje, ${atrasadas.length} atrasadas.`,
  );
}

function formatMonth(ref: string | null): string {
  if (!ref) return "mensalidade";
  const [year, month] = ref.split("-");
  const date = new Date(Number(year), Number(month) - 1);
  return date.toLocaleDateString("pt-BR", { month: "long", year: "numeric" });
}
