/**
 * Remove todos os atletas de teste e seus dados associados.
 * Uso: node backend/scripts/cleanup-test-data.js
 */
const { PrismaClient } = require('@prisma/client');

const db = new PrismaClient({
  datasources: { db: { url: process.env.DATABASE_URL || 'postgresql://neondb_owner:npg_5PKj2hVRWUqe@ep-winter-paper-acacg3fo-pooler.sa-east-1.aws.neon.tech/neondb?sslmode=require' } }
});

// IDs confirmados pela inspeção
const TEST_ATHLETE_IDS = [
  '4e8e8205-f363-42b0-994c-ba57921fcbaf', // teste da silva jr
  '665ced47-6921-4688-a210-6f68dbd022e5', // Teste da silva
  '23523a0b-c8d2-4382-aa09-4753af5363a6', // Teste da Silva Jr
  'd4fc3086-8e0c-4fc6-b135-2ab63472d4e6', // Atleta Teste (tem pagamentos!)
];

async function main() {
  console.log('=== LIMPEZA DE DADOS DE TESTE ===\n');

  // 1. Payments (onDelete: SetNull no Athlete, então precisa deletar explicitamente)
  const delPayments = await db.payment.deleteMany({
    where: { athleteId: { in: TEST_ATHLETE_IDS } }
  });
  console.log(`Payments deletados: ${delPayments.count}`);

  // 2. TrainingAttendance
  const delAttendance = await db.trainingAttendance.deleteMany({
    where: { athleteId: { in: TEST_ATHLETE_IDS } }
  }).catch(() => ({ count: 0 }));
  console.log(`Presenças deletadas: ${delAttendance.count}`);

  // 3. AthleteEvaluation
  const delEval = await db.athleteEvaluation.deleteMany({
    where: { athleteId: { in: TEST_ATHLETE_IDS } }
  }).catch(() => ({ count: 0 }));
  console.log(`Avaliações deletadas: ${delEval.count}`);

  // 4. Injury (se existir)
  const delInjury = await db.injury.deleteMany({
    where: { athleteId: { in: TEST_ATHLETE_IDS } }
  }).catch(() => ({ count: 0 }));
  console.log(`Lesões deletadas: ${delInjury.count}`);

  // 5. TrainingPlan (se existir)
  const delPlan = await db.trainingPlan.deleteMany({
    where: { athleteId: { in: TEST_ATHLETE_IDS } }
  }).catch(() => ({ count: 0 }));
  console.log(`Planos deletados: ${delPlan.count}`);

  // 6. PaymentStatusHistory
  const delHistory = await db.paymentStatusHistory.deleteMany({
    where: { athleteId: { in: TEST_ATHLETE_IDS } }
  }).catch(() => ({ count: 0 }));
  console.log(`Histórico de status deletado: ${delHistory.count}`);

  // 7. Desvincula User antes de deletar o Athlete (para não violar FK)
  await db.user.updateMany({
    where: { athleteId: { in: TEST_ATHLETE_IDS } },
    data: { athleteId: null }
  });

  // 8. Users cujo nome contém "teste" (sem atleta vinculado ou já desvinculado)
  const testUsers = await db.user.findMany({
    where: {
      OR: [
        { username: { contains: 'teste', mode: 'insensitive' } },
        { name: { contains: 'Atleta Teste', mode: 'insensitive' } },
      ],
      athleteId: null,
    },
    select: { id: true, username: true, name: true }
  });
  console.log(`\nUsers de teste encontrados: ${testUsers.length}`);
  for (const u of testUsers) {
    console.log(`  ${u.username} — ${u.name}`);
  }
  if (testUsers.length > 0) {
    const userIds = testUsers.map(u => u.id);
    await db.notification.deleteMany({ where: { userId: { in: userIds } } }).catch(() => {});
    await db.pushSubscription.deleteMany({ where: { userId: { in: userIds } } }).catch(() => {});
    const delUsers = await db.user.deleteMany({ where: { id: { in: userIds } } });
    console.log(`Users deletados: ${delUsers.count}`);
  }

  // 9. Por fim, deleta os atletas
  const delAthletes = await db.athlete.deleteMany({
    where: { id: { in: TEST_ATHLETE_IDS } }
  });
  console.log(`\nAtletas deletados: ${delAthletes.count}`);

  // 10. Verificação final do caixa
  const result = await db.$queryRaw`
    SELECT COALESCE(SUM(CASE WHEN type = 'receita' THEN amount ELSE -amount END), 0) AS value
    FROM "Payment" WHERE status = 'pago'
  `;
  console.log(`\n✓ Caixa após limpeza: R$${result[0].value}`);

  const remaining = await db.payment.findMany({
    include: { athlete: { select: { name: true } } },
    orderBy: { createdAt: 'desc' }
  });
  console.log(`\nPayments restantes (${remaining.length}):`);
  for (const p of remaining) {
    const icon = p.status === 'pago' ? '✓' : '○';
    console.log(`  ${icon} [${p.type}] ${p.athlete?.name ?? 'sem atleta'} | ${p.description} | R$${p.amount} | ${p.status}`);
  }
}

main().catch(console.error).finally(() => db.$disconnect());
