/**
 * Lista todas as receitas (type='receita') com amount=20
 * para identificar duplicatas criadas manualmente antes da regra proporcional.
 *
 * Uso: node backend/scripts/check-receitas-20.js
 */

const { PrismaClient } = require('@prisma/client');

const db = new PrismaClient({
  datasources: { db: { url: process.env.DATABASE_URL || 'postgresql://neondb_owner:npg_5PKj2hVRWUqe@ep-winter-paper-acacg3fo-pooler.sa-east-1.aws.neon.tech/neondb?sslmode=require' } }
});

async function main() {
  const receitas = await db.$queryRaw`
    SELECT
      p.id,
      p.description,
      p.amount,
      p.status,
      p."paidAt",
      p."referenceMonth",
      p."createdAt",
      p."athleteId",
      a.name AS "athleteName"
    FROM "Payment" p
    LEFT JOIN "Athlete" a ON a.id = p."athleteId"
    WHERE p.type = 'receita'
      AND p.amount = 20
    ORDER BY p."createdAt" DESC
  `;

  if (receitas.length === 0) {
    console.log('Nenhuma receita de R$20 encontrada.');
    return;
  }

  console.log(`\n${receitas.length} receita(s) de R$20 encontrada(s):\n`);
  for (const r of receitas) {
    console.log(`ID:           ${r.id}`);
    console.log(`Atleta:       ${r.athleteName ?? '(sem atleta)'}`);
    console.log(`Descrição:    ${r.description}`);
    console.log(`Status:       ${r.status}`);
    console.log(`Mês ref.:     ${r.referenceMonth ?? '-'}`);
    console.log(`Pago em:      ${r.paidAt ? new Date(r.paidAt).toLocaleDateString('pt-BR') : '-'}`);
    console.log(`Criado em:    ${new Date(r.createdAt).toLocaleDateString('pt-BR')}`);
    console.log('─────────────────────────────────────');
  }
}

main().catch(console.error).finally(() => db.$disconnect());
