import cron from "node-cron";
import { prisma } from "../../config/prisma";
import { emailService } from "../email/email.service";
import {
  isGenderSplitDate,
  loadTrainingSchedule,
  resolveTrainingTime,
  toTrainingDateKey,
  trainingGenderLabel,
  type TrainingGender,
} from "../../utils/trainingDates";
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

function sleep(ms: number): Promise<void> {
  return new Promise((r) => setTimeout(r, ms));
}

async function sendTrainingReminders(): Promise<void> {
  const tomorrow = addDays(new Date(), 1);
  const start = new Date(Date.UTC(tomorrow.getUTCFullYear(), tomorrow.getUTCMonth(), tomorrow.getUTCDate()));
  const end = new Date(Date.UTC(tomorrow.getUTCFullYear(), tomorrow.getUTCMonth(), tomorrow.getUTCDate() + 1));
  const tomorrowKey = toTrainingDateKey(tomorrow);

  const trainings = await prisma.training.findMany({ where: { date: { gte: start, lt: end } } });
  if (trainings.length === 0) return;

  const athletes = await prisma.athlete.findMany({
    where: { status: "ativo" },
    select: { name: true, phone: true, email: true, gender: true },
  });

  const dateLabel = fmtDate(tomorrow);
  const isWaConnected = whatsAppService.getStatus() === "connected";
  const schedule = await loadTrainingSchedule();
  const split = isGenderSplitDate(tomorrowKey);

  let processed = 0;
  for (const a of athletes) {
    const gender = (a.gender ?? null) as TrainingGender | null;
    // A partir do split, atleta sem turma definida não recebe lembrete automático
    // (evita mandar um horário errado até o cadastro ser corrigido pelo RH).
    if (split && !gender) continue;

    const time = resolveTrainingTime(tomorrowKey, gender, schedule);
    const turma = split ? ` (${trainingGenderLabel(gender)})` : "";
    const text = `Olá ${first(a.name)}! Lembrete: treino amanhã, ${dateLabel}${turma}, das ${time} em ${schedule.trainingLocation}. Não falte!`;
    let sent = false;
    if (isWaConnected && a.phone) {
      try {
        await whatsAppService.sendMessage(a.phone, `🏐 ${text}`);
        sent = true;
      } catch { /* fallthrough */ }
      await sleep(800);
    }
    if (!sent) {
      await emailService.sendFallback(a.email, "Lembrete de treino amanhã", text).catch(() => {});
    }
    processed++;
  }
  console.log(`[Scheduler] Training reminders processed for ${processed} athletes`);
}

async function sendPaymentAlerts(): Promise<void> {
  const today = new Date();
  const todayStart = new Date(Date.UTC(today.getUTCFullYear(), today.getUTCMonth(), today.getUTCDate()));
  const in3DaysEnd = new Date(Date.UTC(today.getUTCFullYear(), today.getUTCMonth(), today.getUTCDate() + 4));

  const payments = await prisma.payment.findMany({
    where: {
      status: { in: ["pendente", "atrasado"] },
      dueDate: { gte: todayStart, lt: in3DaysEnd },
    },
    include: { athlete: { select: { name: true, phone: true, email: true } } },
  });

  const isWaConnected = whatsAppService.getStatus() === "connected";

  for (const payment of payments) {
    const { athlete } = payment;
    if (!athlete || !payment.dueDate) continue;

    const dueDate = payment.dueDate;
    const dueStart = new Date(Date.UTC(dueDate.getUTCFullYear(), dueDate.getUTCMonth(), dueDate.getUTCDate()));
    const isToday = dueStart.getTime() === todayStart.getTime();
    const dateLabel = fmtDate(dueDate);
    const amount = payment.amount != null ? ` — R$ ${Number(payment.amount).toFixed(2).replace(".", ",")}` : "";

    const text = isToday
      ? `Olá ${first(athlete.name)}! Sua mensalidade vence hoje (${dateLabel})${amount}. Regularize para continuar ativo.`
      : `Olá ${first(athlete.name)}! Sua mensalidade vence em 3 dias (${dateLabel})${amount}. Não deixe atrasar!`;

    let sent = false;
    if (isWaConnected && athlete.phone) {
      try {
        await whatsAppService.sendMessage(athlete.phone, isToday ? `⚠️ ${text}` : `📅 ${text}`);
        sent = true;
      } catch { /* fallthrough */ }
      await sleep(800);
    }
    if (!sent) {
      await emailService.sendFallback(athlete.email, "Lembrete de mensalidade", text).catch(() => {});
    }
  }
  if (payments.length > 0) {
    console.log(`[Scheduler] Payment alerts processed for ${payments.length} payments`);
  }
}

async function sendTrainingDayConfirmationRequest(): Promise<void> {
  const todayKey = new Date().toISOString().slice(0, 10);
  const training = await prisma.training.findFirst({
    where: {
      date: {
        gte: new Date(`${todayKey}T00:00:00.000Z`),
        lt: new Date(`${todayKey}T23:59:59.999Z`),
      },
    },
  });
  if (!training) return;

  const athletes = await prisma.athlete.findMany({
    where: { status: "ativo" },
    select: { name: true, phone: true, email: true, gender: true },
  });

  const isWaConnected = whatsAppService.getStatus() === "connected";
  const schedule = await loadTrainingSchedule();
  const split = isGenderSplitDate(todayKey);

  let processed = 0;
  for (const a of athletes) {
    const gender = (a.gender ?? null) as TrainingGender | null;
    if (split && !gender) continue;

    const time = resolveTrainingTime(todayKey, gender, schedule);
    const turma = split ? ` (${trainingGenderLabel(gender)})` : "";
    const text = `Olá ${first(a.name)}! Tem treino hoje${turma} às ${time} em ${schedule.trainingLocation}. Você vai comparecer?`;
    let sent = false;
    if (isWaConnected && a.phone) {
      try {
        await whatsAppService.sendMessage(
          a.phone,
          `🏐 Olá ${first(a.name)}! Tem treino hoje${turma} às *${time}* em ${schedule.trainingLocation}.\n\nVocê vai comparecer? Responda *SIM* para confirmar sua presença ou *NÃO* caso não possa ir.`,
        );
        sent = true;
      } catch { /* fallthrough */ }
      await sleep(800);
    }
    if (!sent) {
      await emailService.sendFallback(a.email, "Treino hoje!", text).catch(() => {});
    }
    processed++;
  }
  console.log(`[Scheduler] Training day confirmation processed for ${processed} athletes`);
}

export function startWhatsAppScheduler(): void {
  // Daily at 10:00 UTC = 07:00 BRT (Brasília time UTC-3)
  cron.schedule("0 10 * * *", async () => {
    console.log("[Scheduler] Running daily WhatsApp jobs");
    await sendTrainingReminders();
    await sendPaymentAlerts();
  });

  // Saturdays at 12:30 UTC = 09:30 BRT — confirmation request (2h before warm-up)
  cron.schedule("30 12 * * 6", async () => {
    console.log("[Scheduler] Sending training day confirmation requests");
    await sendTrainingDayConfirmationRequest();
  });

  console.log("[Scheduler] WhatsApp scheduler started (daily at 07:00 BRT)");
}
