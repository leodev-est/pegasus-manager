const { PrismaClient } = require('@prisma/client');
const dst = new PrismaClient({
  datasources: { db: { url: 'postgresql://neondb_owner:npg_5PKj2hVRWUqe@ep-winter-paper-acacg3fo-pooler.sa-east-1.aws.neon.tech/neondb?sslmode=require' } }
});
async function main() {
  const leos = await dst.user.findMany({
    where: { OR: [{ username: 'leo' }, { name: { contains: 'Leo', mode: 'insensitive' } }] },
    select: { id: true, username: true, name: true, password: true, mustChangePassword: true, createdAt: true }
  });
  console.log('Leo users:', JSON.stringify(leos.map(u => ({
    ...u, password: u.password.substring(0, 20) + '...'
  })), null, 2));
}
main().catch(console.error).finally(() => dst.$disconnect());
