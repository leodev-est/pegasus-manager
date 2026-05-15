import cron from "node-cron";
import { Prisma } from "@prisma/client";
import { randomUUID } from "crypto";
import { prisma } from "../../config/prisma";

export function startFinanceScheduler(): void {
  cron.schedule("0 9 1 * *", async () => {
    try {
      await generateMonthlyFees();
    } catch (err) {
      console.error("[Finance Scheduler] Erro ao gerar mensalidades:", err);
    }
  });
  console.log("[Finance Scheduler] Started (day 1 of month at 09:00 UTC)");
}

async function generateMonthlyFees(): Promise<void> {
  const setting = await prisma.trainingSetting.findFirst({ select: { monthlyFeeAmount: true } });
  const amount = Number(setting?.monthlyFeeAmount ?? 0);

  if (!amount || amount <= 0) {
    console.log("[Finance Scheduler] monthlyFeeAmount não configurado ou zero — nenhuma mensalidade gerada.");
    return;
  }

  const now = new Date();
  const year = now.getUTCFullYear();
  const mon = now.getUTCMonth();
  const refMonth = `${year}-${String(mon + 1).padStart(2, "0")}`;
  const dueDate = new Date(Date.UTC(year, mon, 10));

  const athletes = await prisma.athlete.findMany({
    where: { status: "ativo", monthlyPaymentStatus: { not: "isento" } },
    select: { id: true },
  });

  type Row = { athleteId: string | null };
  const existing = await prisma.$queryRaw<Row[]>`
    SELECT "athleteId" FROM "Payment"
    WHERE "referenceMonth" = ${refMonth} AND LOWER(category) = 'mensalidade'
  `;
  const existingIds = new Set(existing.map((r) => r.athleteId));

  let created = 0;
  for (const athlete of athletes) {
    if (existingIds.has(athlete.id)) continue;
    await prisma.$executeRaw`
      INSERT INTO "Payment" (id, "athleteId", description, amount, type, category, status, "dueDate", "referenceMonth", "updatedAt")
      VALUES (${randomUUID()}, ${athlete.id}, 'Mensalidade', ${new Prisma.Decimal(amount)}, 'receita', 'Mensalidade', 'pendente', ${dueDate}, ${refMonth}, NOW())
    `;
    created++;
  }

  console.log(`[Finance Scheduler] Mensalidades ${refMonth}: ${created} criada(s), ${athletes.length - created} já existia(m).`);
}
