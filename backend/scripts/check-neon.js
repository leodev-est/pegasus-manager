const { PrismaClient } = require('@prisma/client');
const dst = new PrismaClient({
  datasources: { db: { url: 'postgresql://neondb_owner:npg_5PKj2hVRWUqe@ep-winter-paper-acacg3fo-pooler.sa-east-1.aws.neon.tech/neondb?sslmode=require' } }
});
async function main() {
  const userRoles = await dst.userRole.findMany({
    include: { user: { select: { username: true } }, role: { select: { name: true } } }
  });
  console.log('UserRoles:', userRoles.map(r => ({ user: r.user.username, role: r.role.name })));
  const users = await dst.user.findMany({ select: { username: true, id: true } });
  console.log('Users:', users.map(u => u.username));
}
main().catch(console.error).finally(() => dst.$disconnect());
