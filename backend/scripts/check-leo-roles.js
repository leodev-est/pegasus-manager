const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcrypt');
const dst = new PrismaClient({
  datasources: { db: { url: 'postgresql://neondb_owner:npg_5PKj2hVRWUqe@ep-winter-paper-acacg3fo-pooler.sa-east-1.aws.neon.tech/neondb?sslmode=require' } }
});
async function main() {
  // Check leo's roles
  const leo = await dst.user.findFirst({
    where: { username: 'leo' },
    include: { roles: { include: { role: true } } }
  });
  console.log('Leo ID:', leo.id);
  console.log('Leo mustChangePassword:', leo.mustChangePassword);
  console.log('Leo roles:', leo.roles.map(r => r.role.name));

  // Test password hash
  const passwords = ['Pegasus@2025!', 'Pegasus@Temp!2025'];
  for (const p of passwords) {
    const ok = await bcrypt.compare(p, leo.password);
    console.log(`Password "${p}": ${ok ? '✓ CORRECT' : '✗ wrong'}`);
  }
}
main().catch(console.error).finally(() => dst.$disconnect());
