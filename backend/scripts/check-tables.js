const { PrismaClient } = require('@prisma/client');
const dst = new PrismaClient({
  datasources: { db: { url: 'postgresql://neondb_owner:npg_5PKj2hVRWUqe@ep-winter-paper-acacg3fo-pooler.sa-east-1.aws.neon.tech/neondb?sslmode=require' } }
});
async function main() {
  const tables = await dst.$queryRaw`
    SELECT table_name FROM information_schema.tables
    WHERE table_schema = 'public' ORDER BY table_name;
  `;
  console.log('Tables in Neon:', tables.map(t => t.table_name));

  const migrations = await dst.$queryRaw`
    SELECT migration_name, finished_at FROM "_prisma_migrations" ORDER BY finished_at DESC LIMIT 10;
  `;
  console.log('\nLast migrations:', migrations);
}
main().catch(console.error).finally(() => dst.$disconnect());
