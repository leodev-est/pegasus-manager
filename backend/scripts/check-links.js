const { PrismaClient } = require('@prisma/client');
const dst = new PrismaClient({
  datasources: { db: { url: 'postgresql://neondb_owner:npg_5PKj2hVRWUqe@ep-winter-paper-acacg3fo-pooler.sa-east-1.aws.neon.tech/neondb?sslmode=require' } }
});
async function main() {
  // Users with athleteId set
  const users = await dst.user.findMany({
    select: { username: true, athleteId: true },
    where: { athleteId: { not: null } }
  });
  console.log('Users linked to athletes:', users);

  // Athletes linked to users (via user relation)
  const athletes = await dst.athlete.findMany({
    where: { status: 'ativo' },
    select: { name: true, id: true, user: { select: { username: true } } }
  });
  console.log('\nAtivo athletes and their user links:');
  athletes.forEach(a => console.log(`  ${a.name} (${a.id.slice(0,8)}) → user: ${a.user?.username ?? 'NONE'}`));
}
main().catch(console.error).finally(() => dst.$disconnect());
