const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcrypt');

const db = new PrismaClient({
  datasources: { db: { url: 'postgresql://neondb_owner:npg_5PKj2hVRWUqe@ep-winter-paper-acacg3fo-pooler.sa-east-1.aws.neon.tech/neondb?sslmode=require' } }
});

async function main() {
  const username = 'atletateste';
  const password = 'Pegasus@2025!';
  const name = 'Atleta Teste';

  // Check if already exists
  const existing = await db.user.findFirst({ where: { username } });
  if (existing) {
    console.log('Usuário já existe:', existing.id);
    return;
  }

  const hash = await bcrypt.hash(password, 10);

  const user = await db.user.create({
    data: {
      username,
      name,
      password: hash,
      mustChangePassword: false,
      active: true,
    },
  });

  // Find Atleta role
  const atletaRole = await db.role.findFirst({ where: { name: { in: ['Atleta', 'atleta'] } } });
  if (!atletaRole) { console.error('Role Atleta não encontrada!'); return; }

  await db.userRole.create({ data: { userId: user.id, roleId: atletaRole.id } });

  console.log('✓ Usuário criado com sucesso!');
  console.log('  Usuário:', username);
  console.log('  Senha:  ', password);
  console.log('  Role:   ', atletaRole.name);
  console.log('  ID:     ', user.id);
}

main().catch(console.error).finally(() => db.$disconnect());
