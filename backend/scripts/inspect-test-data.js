/**
 * Inspeciona dados do atleta teste e saldo do caixa.
 * Uso: node backend/scripts/inspect-test-data.js
 */
const { PrismaClient } = require('@prisma/client');

const db = new PrismaClient({
  datasources: { db: { url: process.env.DATABASE_URL || 'postgresql://neondb_owner:npg_5PKj2hVRWUqe@ep-winter-paper-acacg3fo-pooler.sa-east-1.aws.neon.tech/neondb?sslmode=require' } }
});

async function main() {
  // 1. Atletas de teste
  const testAthletes = await db.athlete.findMany({
    where: {
      OR: [
        { name: { contains: 'teste', mode: 'insensitive' } },
        { name: { contains: 'test', mode: 'insensitive' } },
      ]
    },
    include: {
      user: { select: { id: true, username: true, name: true } },
      payments: { select: { id: true, description: true, amount: true, type: true, status: true, paidAt: true } },
    }
  });

  console.log(`\n=== ATLETAS DE TESTE (${testAthletes.length}) ===`);
  for (const a of testAthletes) {
    console.log(`\nAtleta: ${a.name} (ID: ${a.id}) — status: ${a.status}`);
    console.log(`  User vinculado: ${a.user ? `${a.user.username} (${a.user.id})` : 'nenhum'}`);
    console.log(`  Payments: ${a.payments.length}`);
    for (const p of a.payments) {
      console.log(`    - [${p.type}] ${p.description} R$${p.amount} (${p.status})`);
    }
  }

  // 2. CashMovements
  const movements = await db.cashMovement.findMany({ orderBy: { date: 'desc' } });
  console.log(`\n=== CASH MOVEMENTS (${movements.length}) ===`);
  for (const m of movements) {
    console.log(`  [${m.type}] ${m.description} R$${m.amount} — ${new Date(m.date).toLocaleDateString('pt-BR')}`);
  }

  // 3. Saldo calculado: pagamentos do tipo receita/despesa (Payments pagos)
  const paidPayments = await db.payment.groupBy({
    by: ['type'],
    where: { status: 'pago' },
    _sum: { amount: true },
  });
  console.log('\n=== PAYMENTS PAGOS POR TIPO ===');
  for (const g of paidPayments) {
    console.log(`  ${g.type}: R$${g._sum.amount}`);
  }

  // 4. Saldo via CashMovements
  const cashByType = await db.cashMovement.groupBy({
    by: ['type'],
    _sum: { amount: true },
  });
  console.log('\n=== CASH MOVEMENTS POR TIPO ===');
  for (const g of cashByType) {
    console.log(`  ${g.type}: R$${g._sum.amount}`);
  }

  // 5. Payments sem athleteId ou vinculados a atleta teste
  const testIds = testAthletes.map(a => a.id);
  if (testIds.length > 0) {
    const testPayments = await db.payment.findMany({
      where: { athleteId: { in: testIds } }
    });
    console.log(`\n=== PAYMENTS DOS ATLETAS TESTE (${testPayments.length}) ===`);
    for (const p of testPayments) {
      console.log(`  [${p.type}] ${p.description} R$${p.amount} (${p.status})`);
    }
  }
}

main().catch(console.error).finally(() => db.$disconnect());
