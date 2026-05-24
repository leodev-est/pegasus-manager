/**
 * Corrige retroativamente as mensalidades do primeiro mês de atletas aprovados
 * após o dia 15 que foram criadas com valor cheio (R$40) em vez de proporcional (R$20).
 *
 * Regra: aprovado dias 1-15 → valor cheio; aprovado dias 16-31 → 50% do valor cheio.
 *
 * Uso: node backend/scripts/fix-prorated-payments.js
 */

const { PrismaClient } = require('@prisma/client');

const db = new PrismaClient({
  datasources: { db: { url: process.env.DATABASE_URL || 'postgresql://neondb_owner:npg_5PKj2hVRWUqe@ep-winter-paper-acacg3fo-pooler.sa-east-1.aws.neon.tech/neondb?sslmode=require' } }
});

async function main() {
  // Valor padrão de mensalidade
  const setting = await db.trainingSetting.findFirst({ select: { monthlyFeeAmount: true } });
  const fullAmount = Number(setting?.monthlyFeeAmount ?? 0);

  if (!fullAmount || fullAmount <= 0) {
    console.error('❌ monthlyFeeAmount não configurado no TrainingSetting.');
    return;
  }

  const halfAmount = fullAmount / 2;
  console.log(`Valor cheio: R$${fullAmount} | Proporcional: R$${halfAmount}`);

  // Busca atletas com activatedAt definido e aprovados após dia 15 do mês de ativação
  const athletes = await db.$queryRaw`
    SELECT id, name, "activatedAt"
    FROM "Athlete"
    WHERE "activatedAt" IS NOT NULL
      AND EXTRACT(DAY FROM "activatedAt") > 15
    ORDER BY "activatedAt" DESC
  `;

  console.log(`\n${athletes.length} atleta(s) aprovado(s) após o dia 15 encontrado(s).\n`);

  let fixed = 0;
  let alreadyCorrect = 0;
  let notFound = 0;

  for (const athlete of athletes) {
    const activated = new Date(athlete.activatedAt);
    const refMonth = `${activated.getUTCFullYear()}-${String(activated.getUTCMonth() + 1).padStart(2, '0')}`;

    // Busca a mensalidade do mês de ativação
    const payments = await db.$queryRaw`
      SELECT id, amount, description
      FROM "Payment"
      WHERE "athleteId" = ${athlete.id}
        AND LOWER(category) = 'mensalidade'
        AND "referenceMonth" = ${refMonth}
      ORDER BY "createdAt" ASC
      LIMIT 1
    `;

    if (payments.length === 0) {
      console.log(`  ⚪ ${athlete.name} (${refMonth}): nenhuma mensalidade encontrada — pulando`);
      notFound++;
      continue;
    }

    const payment = payments[0];
    const currentAmount = Number(payment.amount);

    if (currentAmount === halfAmount) {
      console.log(`  ✓ ${athlete.name} (${refMonth}): já está correto (R$${halfAmount})`);
      alreadyCorrect++;
      continue;
    }

    // Corrige o valor para proporcional
    await db.$executeRaw`
      UPDATE "Payment"
      SET amount = ${halfAmount},
          description = 'Mensalidade (proporcional)',
          "updatedAt" = NOW()
      WHERE id = ${payment.id}
    `;

    console.log(`  ✅ ${athlete.name} (${refMonth}): R$${currentAmount} → R$${halfAmount} (corrigido)`);
    fixed++;
  }

  console.log(`\n─────────────────────────────────────`);
  console.log(`✅ Corrigidos:      ${fixed}`);
  console.log(`✓  Já corretos:     ${alreadyCorrect}`);
  console.log(`⚪ Sem mensalidade: ${notFound}`);
  console.log(`─────────────────────────────────────`);
}

main().catch(console.error).finally(() => db.$disconnect());
