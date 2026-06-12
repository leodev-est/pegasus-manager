const { PrismaClient } = require('@prisma/client');
const dst = new PrismaClient({
  datasources: { db: { url: 'postgresql://neondb_owner:npg_5PKj2hVRWUqe@ep-winter-paper-acacg3fo-pooler.sa-east-1.aws.neon.tech/neondb?sslmode=require' } }
});

async function main() {
  // Find Railway athletes by name (no user link = Railway origin)
  const athletes = await dst.athlete.findMany({
    where: { user: null },
    select: { id: true, name: true, status: true }
  });
  console.log('Athletes without user link:', athletes.map(a => `${a.name} (${a.status}) [${a.id.slice(0,8)}]`));

  // Map username -> correct athlete name
  const mapping = [
    { username: 'leo',      athleteName: 'Leo' },
    { username: 'allef',    athleteName: 'Allef' },
    { username: 'giulia',   athleteName: 'Giulia' },
    { username: 'victoria', athleteName: 'Victoria' },
    { username: 'vito',     athleteName: 'Vito' },
  ];

  for (const { username, athleteName } of mapping) {
    const athlete = athletes.find(a => a.name.toLowerCase() === athleteName.toLowerCase());
    if (!athlete) { console.log(`⚠ Athlete "${athleteName}" not found`); continue; }

    // Get old athleteId from user
    const user = await dst.user.findFirst({ where: { username }, select: { id: true, athleteId: true } });
    if (!user) { console.log(`⚠ User "${username}" not found`); continue; }

    const oldAthleteId = user.athleteId;

    // Update user to point to correct athlete
    await dst.user.update({ where: { id: user.id }, data: { athleteId: athlete.id } });

    // Update athlete to point to user
    await dst.athlete.update({ where: { id: athlete.id }, data: { user: { connect: { id: user.id } } } });

    // Disconnect old seed athlete from user (if different)
    if (oldAthleteId && oldAthleteId !== athlete.id) {
      // The old seed athlete has no more user - it can stay or be deleted
      console.log(`  ✓ ${username}: ${oldAthleteId.slice(0,8)} → ${athlete.id.slice(0,8)} (${athleteName})`);
    } else {
      console.log(`  ✓ ${username} → ${athlete.id.slice(0,8)} (${athleteName})`);
    }
  }

  console.log('\nDone! Verifying...');
  const result = await dst.user.findMany({
    where: { username: { in: ['leo', 'allef', 'giulia', 'victoria', 'vito'] } },
    select: { username: true, athleteId: true, athlete: { select: { name: true, status: true } } }
  });
  result.forEach(u => console.log(`  ${u.username} → ${u.athlete?.name} (${u.athlete?.status})`));
}

main().catch(console.error).finally(() => dst.$disconnect());
