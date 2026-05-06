import cron from "node-cron";
import { prisma } from "../../config/prisma";
import { whatsAppService } from "./whatsapp.service";

function fmtDate(date: Date): string {
  return new Intl.DateTimeFormat("pt-BR", { timeZone: "UTC" }).format(date);
}

function addDays(date: Date, days: number): Date {
  const d = new Date(date);
  d.setUTCDate(d.getUTCDate() + days);
  return d;
}

function first(name: string): string {
  return name.split(" ")[0];
}

async function sendTrainingReminders(): Promise<void> {
  if (whatsAppService.getStatus() !== "connected") return;

  const tomorrow = addDays(new Date(), 1);
  const start = new Date(Date.UTC(tomorrow.getUTCFullYear(), tomorrow.getUTCMonth(), tomorrow.getUTCDate()));
  const end = new Date(Date.UTC(tomorrow.getUTCFullYear(), tomorrow.getUTCMonth(), tomorrow.getUTCDate() + 1));

  const trainings = await prisma.training.findMany({ where: { date: { gte: start, lt: end } } });
  if (trainings.length === 0) return;

  const athletes = await prisma.athlete.findMany({
    where: { status: "ativo", phone: { not: null } },
    select: { name: true, phone: true },
  });

  const dateLabel = fmtDate(tomorrow);
  for (const a of athletes) {
    if (!a.phone) continue;
    await whatsAppService.sendMessage(
      a.phone,
      `🏐 Olá ${first(a.name)}! Lembrete: treino *amanhã*, ${dateLabel}, das 17:30 às 19:00 em Jerusalém. Não falte!`,
    );
    await sleep(800);
  }
  console.log(`[Scheduler] Training reminders sent to ${athletes.length} athletes`);
}

async function sendPaymentAlerts(): Promise<void> {
  if (whatsAppService.getStatus() !== "connected") return;

  const today = new Date();
  const todayStart = new Date(Date.UTC(today.getUTCFullYear(), today.getUTCMonth(), today.getUTCDate()));
  const in3DaysEnd = new Date(Date.UTC(today.getUTCFullYear(), today.getUTCMonth(), today.getUTCDate() + 4));

  const payments = await prisma.payment.findMany({
    where: {
      status: { in: ["pendente", "atrasado"] },
      dueDate: { gte: todayStart, lt: in3DaysEnd },
    },
    include: { athlete: { select: { name: true, phone: true } } },
  });

  for (const payment of payments) {
    const { athlete } = payment;
    if (!athlete?.phone || !payment.dueDate) continue;

    const dueDate = payment.dueDate;
    const dueStart = new Date(Date.UTC(dueDate.getUTCFullYear(), dueDate.getUTCMonth(), dueDate.getUTCDate()));
    const isToday = dueStart.getTime() === todayStart.getTime();
    const dateLabel = fmtDate(dueDate);
    const amount = payment.amount != null ? ` — R$ ${Number(payment.amount).toFixed(2).replace(".", ",")}` : "";

    const message = isToday
      ? `⚠️ Olá ${first(athlete.name)}! Sua mensalidade vence *hoje* (${dateLabel})${amount}. Regularize para continuar ativo.`
      : `📅 Olá ${first(athlete.name)}! Sua mensalidade vence em *3 dias* (${dateLabel})${amount}. Não deixe atrasar!`;

    await whatsAppService.sendMessage(athlete.phone, message);
    await sleep(800);
  }
  if (payments.length > 0) {
    console.log(`[Scheduler] Payment alerts sent for ${payments.length} payments`);
  }
}

function sleep(ms: number): Promise<void> {
  return new Promise((r) => setTimeout(r, ms));
}

export function startWhatsAppScheduler(): void {
  // Daily at 10:00 UTC = 07:00 BRT (Brasília time UTC-3)
  cron.schedule("0 10 * * *", async () => {
    console.log("[Scheduler] Running daily WhatsApp jobs");
    await sendTrainingReminders();
    await sendPaymentAlerts();
  });
  console.log("[Scheduler] WhatsApp scheduler started (daily at 07:00 BRT)");
}
