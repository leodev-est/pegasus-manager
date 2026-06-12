const { PrismaClient } = require('@prisma/client');
const dst = new PrismaClient({
  datasources: { db: { url: 'postgresql://neondb_owner:npg_5PKj2hVRWUqe@ep-winter-paper-acacg3fo-pooler.sa-east-1.aws.neon.tech/neondb?sslmode=require' } }
});
async function main() {
  const counts = await dst.athlete.groupBy({ by: ['status'], _count: { id: true } });
  console.log('Status counts:', counts);
  const sample = await dst.athlete.findMany({ take: 5, select: { name: true, status: true, activatedAt: true } });
  console.log('Sample athletes:', sample);
}
main().catch(console.error).finally(() => dst.$disconnect());
