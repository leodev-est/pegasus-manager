import cron from "node-cron";
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
  const amountEnv = process.env.MONTHLY_FEE_AMOUNT;
  const amount = amountEnv ? Number(amountEnv) : 0;

  if (!amount || amount <= 0) {
    console.log("[Finance Scheduler] MONTHLY_FEE_AMOUNT não definido ou zero — nenhuma mensalidade gerada.");
    return;
  }

  const now = new Date();
  const year = now.getUTCFullYear();
  const month = now.getUTCMonth();

  const monthStart = new Date(Date.UTC(year, month, 1));
  const monthEnd = new Date(Date.UTC(year, month + 1, 0, 23, 59, 59, 999));
  const dueDate = new Date(Date.UTC(year, month, 10));

  const yearStr = String(year);
  const monthStr = String(month + 1).padStart(2, "0");
  const description = `Mensalidade ${yearStr}/${monthStr}`;

  const athletes = await prisma.athlete.findMany({
    where: {
      status: "ativo",
      monthlyPaymentStatus: { not: "isento" },
    },
    select: { id: true, name: true },
  });

  let created = 0;
  let skipped = 0;

  for (const athlete of athletes) {
    const existing = await prisma.payment.findFirst({
      where: {
        athleteId: athlete.id,
        category: "mensalidade",
        dueDate: {
          gte: monthStart,
          lte: monthEnd,
        },
      },
    });

    if (existing) {
      skipped++;
      continue;
    }

    await prisma.payment.create({
      data: {
        athleteId: athlete.id,
        description,
        amount: amount,
        type: "receita",
        category: "mensalidade",
        status: "pendente",
        dueDate,
      },
    });

    created++;
  }

  console.log(
    `[Finance Scheduler] Mensalidades ${yearStr}/${monthStr}: ${created} criada(s), ${skipped} já existia(m).`,
  );
}
