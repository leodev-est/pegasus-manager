/**
 * Script de migração de dados do Railway PostgreSQL → Neon PostgreSQL
 *
 * Uso:
 *   NEON_URL="postgresql://..." npx ts-node scripts/migrate-to-neon.ts
 *
 * O script lê todos os dados do Railway e insere no Neon, preservando todos os IDs.
 * Rodar uma vez, após executar `prisma migrate deploy` no Neon.
 */

import { PrismaClient, Prisma } from "@prisma/client";

const RAILWAY_URL =
  "postgresql://postgres:kzsDKbYJkvaPMDAWjeusTIfnxwObxYZo@tramway.proxy.rlwy.net:32111/railway?sslmode=require";

const NEON_URL = process.env.NEON_URL;

if (!NEON_URL) {
  console.error("❌ Defina a variável NEON_URL antes de rodar este script.");
  console.error("   Ex: NEON_URL='postgresql://...' npx ts-node scripts/migrate-to-neon.ts");
  process.exit(1);
}

const src = new PrismaClient({
  datasources: { db: { url: RAILWAY_URL } },
});

const dst = new PrismaClient({
  datasources: { db: { url: NEON_URL } },
});

type Decimal = Prisma.Decimal;

function dec(v: Decimal | null | undefined) {
  return v == null ? null : new Prisma.Decimal(v.toString());
}

async function step(name: string, fn: () => Promise<{ count: number } | unknown>) {
  process.stdout.write(`  → ${name}... `);
  try {
    const result = await fn();
    const count = (result as { count?: number })?.count ?? "✓";
    console.log(`${count}`);
  } catch (e: any) {
    console.log(`ERRO: ${e.message}`);
  }
}

async function main() {
  console.log("\n🚀 Iniciando migração Railway → Neon\n");

  // ── 1. Sem dependências ───────────────────────────────────────────────────
  console.log("Tabelas sem dependências:");

  await step("Permission", async () => {
    const rows = await src.permission.findMany();
    return dst.permission.createMany({ data: rows, skipDuplicates: true });
  });

  await step("Role", async () => {
    const rows = await src.role.findMany();
    return dst.role.createMany({ data: rows, skipDuplicates: true });
  });

  await step("TrainingSetting", async () => {
    const rows = await src.trainingSetting.findMany();
    for (const row of rows) {
      await dst.trainingSetting.upsert({
        where: { id: row.id },
        create: { ...row, monthlyFeeAmount: dec(row.monthlyFeeAmount)! },
        update: { ...row, monthlyFeeAmount: dec(row.monthlyFeeAmount)! },
      });
    }
    return { count: rows.length };
  });

  await step("Training", async () => {
    const rows = await src.training.findMany();
    return dst.training.createMany({ data: rows, skipDuplicates: true });
  });

  await step("Game", async () => {
    const rows = await src.game.findMany();
    return dst.game.createMany({ data: rows, skipDuplicates: true });
  });

  await step("Task", async () => {
    const rows = await src.task.findMany();
    return dst.task.createMany({ data: rows, skipDuplicates: true });
  });

  await step("School", async () => {
    const rows = await src.school.findMany();
    return dst.school.createMany({ data: rows, skipDuplicates: true });
  });

  await step("Spreadsheet", async () => {
    const rows = await src.spreadsheet.findMany();
    return dst.spreadsheet.createMany({ data: rows, skipDuplicates: true });
  });

  await step("Formation", async () => {
    const rows = await src.formation.findMany();
    return dst.formation.createMany({ data: rows, skipDuplicates: true });
  });

  await step("CashMovement", async () => {
    const rows = await src.cashMovement.findMany();
    return dst.cashMovement.createMany({
      data: rows.map((r) => ({ ...r, amount: dec(r.amount)! })),
      skipDuplicates: true,
    });
  });

  await step("AnnouncementTemplate", async () => {
    const rows = await src.announcementTemplate.findMany();
    return dst.announcementTemplate.createMany({ data: rows, skipDuplicates: true });
  });

  await step("ScheduledAnnouncement", async () => {
    const rows = await src.scheduledAnnouncement.findMany();
    return dst.scheduledAnnouncement.createMany({ data: rows, skipDuplicates: true });
  });

  await step("Suggestion", async () => {
    const rows = await src.suggestion.findMany();
    return dst.suggestion.createMany({ data: rows, skipDuplicates: true });
  });

  await step("MonthlyReport", async () => {
    const rows = await src.monthlyReport.findMany();
    return dst.monthlyReport.createMany({ data: rows, skipDuplicates: true });
  });

  await step("AuditLog", async () => {
    const rows = await src.auditLog.findMany();
    return dst.auditLog.createMany({ data: rows, skipDuplicates: true });
  });

  await step("UniformItem", async () => {
    const rows = await src.uniformItem.findMany();
    return dst.uniformItem.createMany({ data: rows, skipDuplicates: true });
  });

  // ── 2. Atletas e Usuários (inter-dependência via athleteId opcional) ───────
  console.log("\nAtletas e Usuários:");

  // Atletas sem userId — inserir primeiro
  await step("Athlete", async () => {
    const rows = await src.athlete.findMany();
    return dst.athlete.createMany({ data: rows, skipDuplicates: true });
  });

  // Usuários referenciam Athlete via athleteId (opcional)
  await step("User", async () => {
    const rows = await src.user.findMany();
    return dst.user.createMany({ data: rows, skipDuplicates: true });
  });

  await step("RolePermission", async () => {
    const rows = await src.rolePermission.findMany();
    return dst.rolePermission.createMany({ data: rows, skipDuplicates: true });
  });

  await step("UserRole", async () => {
    const rows = await src.userRole.findMany();
    return dst.userRole.createMany({ data: rows, skipDuplicates: true });
  });

  await step("PushSubscription", async () => {
    const rows = await src.pushSubscription.findMany();
    return dst.pushSubscription.createMany({ data: rows, skipDuplicates: true });
  });

  await step("Notification", async () => {
    const rows = await src.notification.findMany();
    return dst.notification.createMany({ data: rows, skipDuplicates: true });
  });

  // ── 3. Dependem de Atleta ─────────────────────────────────────────────────
  console.log("\nDependem de Atleta:");

  await step("AthleteApplication", async () => {
    const rows = await src.athleteApplication.findMany();
    return dst.athleteApplication.createMany({ data: rows, skipDuplicates: true });
  });

  await step("AthleteEvaluation", async () => {
    const rows = await src.athleteEvaluation.findMany();
    return dst.athleteEvaluation.createMany({ data: rows, skipDuplicates: true });
  });

  await step("Payment", async () => {
    const rows = await src.payment.findMany();
    return dst.payment.createMany({
      data: rows.map((r) => ({ ...r, amount: dec(r.amount)! })),
      skipDuplicates: true,
    });
  });

  await step("PaymentStatusHistory", async () => {
    const rows = await src.paymentStatusHistory.findMany();
    return dst.paymentStatusHistory.createMany({ data: rows, skipDuplicates: true });
  });

  await step("JerseyAssignment", async () => {
    const rows = await src.jerseyAssignment.findMany();
    return dst.jerseyAssignment.createMany({ data: rows, skipDuplicates: true });
  });

  await step("UniformDelivery", async () => {
    const rows = await src.uniformDelivery.findMany();
    return dst.uniformDelivery.createMany({ data: rows, skipDuplicates: true });
  });

  // ── 4. Dependem de Training e Atleta ──────────────────────────────────────
  console.log("\nDependem de Training + Atleta:");

  await step("TrainingAttendance", async () => {
    const rows = await src.trainingAttendance.findMany();
    return dst.trainingAttendance.createMany({ data: rows, skipDuplicates: true });
  });

  await step("TrainingFeedback", async () => {
    const rows = await src.trainingFeedback.findMany();
    return dst.trainingFeedback.createMany({ data: rows, skipDuplicates: true });
  });

  // ── 5. Dependem de Game ───────────────────────────────────────────────────
  console.log("\nDependem de Game:");

  await step("GameSet", async () => {
    const rows = await src.gameSet.findMany();
    return dst.gameSet.createMany({ data: rows, skipDuplicates: true });
  });

  await step("GameConvocation", async () => {
    const rows = await src.gameConvocation.findMany();
    return dst.gameConvocation.createMany({ data: rows, skipDuplicates: true });
  });

  console.log("\n✅ Migração concluída!\n");
}

main()
  .catch((e) => {
    console.error("\n❌ Erro fatal:", e);
    process.exit(1);
  })
  .finally(async () => {
    await src.$disconnect();
    await dst.$disconnect();
  });
