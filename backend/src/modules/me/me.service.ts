import { prisma } from "../../config/prisma";
import { AppError } from "../../middlewares/error.middleware";
import { attendanceService } from "../attendance/attendance.service";
import { formatEvaluation } from "../evaluations/evaluations.service";

function normalizeOptional(value: string | null | undefined) {
  if (value === undefined) return undefined;
  if (value === null) return null;

  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : null;
}

function startOfToday() {
  const now = new Date();
  return new Date(Date.UTC(now.getFullYear(), now.getMonth(), now.getDate()));
}

function formatUser(user: {
  active: boolean;
  avatarUrl: string | null;
  email: string | null;
  id: string;
  name: string;
  username: string;
  roles: Array<{ role: { name: string; permissions: Array<{ permission: { key: string } }> } }>;
}) {
  return {
    active: user.active,
    avatarUrl: user.avatarUrl,
    email: user.email,
    id: user.id,
    name: user.name,
    permissions: Array.from(
      new Set(
        user.roles.flatMap((userRole) =>
          userRole.role.permissions.map((rolePermission) => rolePermission.permission.key),
        ),
      ),
    ),
    roles: user.roles.map((userRole) => userRole.role.name),
    username: user.username,
  };
}

export const meService = {
  async getProfile(userId: string) {
    const user = await prisma.user.findUnique({
      where: { id: userId },
      include: {
        athlete: {
          include: {
            evaluations: {
              orderBy: { createdAt: "desc" as const },
              take: 3,
            },
            uniformDeliveries: {
              include: { uniformItem: { select: { id: true, name: true } } },
              orderBy: { deliveredAt: "desc" },
            },
          },
        },
        roles: {
          include: {
            role: {
              include: {
                permissions: {
                  include: {
                    permission: true,
                  },
                },
              },
            },
          },
        },
      },
    });

    if (!user) {
      throw new AppError("Usuário não encontrado", 404);
    }

    const athlete = user.athlete
      ? {
          ...user.athlete,
          evaluation: user.athlete.evaluations[0] ?? null,
          recentEvaluations: user.athlete.evaluations,
        }
      : null;
    const now = new Date();
    const threeMonthsAgo = new Date(Date.UTC(now.getFullYear(), now.getMonth() - 2, 1));

    const [payments, upcomingTrainings, totalFrequency, monthlyFrequency] = await Promise.all([
      athlete
        ? prisma.payment.findMany({
            where: { athleteId: athlete.id },
            orderBy: [{ dueDate: "desc" }, { createdAt: "desc" }],
            take: 12,
          })
        : [],
      prisma.training.findMany({
        where: { date: { gte: startOfToday() } },
        orderBy: { date: "asc" },
        take: 5,
      }),
      athlete ? attendanceService.getMyTotalFrequency(userId) : null,
      athlete
        ? prisma.trainingAttendance.findMany({
            where: {
              athleteId: athlete.id,
              training: { date: { gte: threeMonthsAgo } },
            },
            include: { training: { select: { id: true, date: true, title: true } } },
            orderBy: { training: { date: "asc" } },
          })
        : [],
    ]);

    return {
      athlete,
      evaluation: formatEvaluation(athlete?.evaluation ?? null),
      totalFrequency: totalFrequency
        ? {
            absences: totalFrequency.faltas,
            justified: totalFrequency.justificadas,
            percentage: totalFrequency.percentual,
            presences: totalFrequency.presencas,
            totalTrainings: totalFrequency.totalTreinos,
          }
        : null,
      monthlyAttendance: monthlyFrequency,
      payments: payments.map((payment) => ({
        ...payment,
        amount: Number(payment.amount),
      })),
      upcomingTrainings,
      user: formatUser(user),
    };
  },

  async getMyPayments(userId: string) {
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { athlete: { select: { id: true } } },
    });
    if (!user?.athlete) return [];
    const payments = await prisma.payment.findMany({
      where: { athleteId: user.athlete.id, type: "receita" },
      orderBy: { dueDate: "desc" },
    });
    return payments.map((p) => ({ ...p, amount: Number(p.amount) }));
  },

  async getMyEvaluationHistory(userId: string) {
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { athlete: { select: { id: true } } },
    });
    if (!user?.athlete) return [];
    const evals = await prisma.athleteEvaluation.findMany({
      where: { athleteId: user.athlete.id },
      orderBy: { createdAt: "asc" },
    });
    return evals.map((e) => ({
      ...formatEvaluation(e),
      createdAt: e.createdAt,
    }));
  },

  async updateAvatar(userId: string, buffer: Buffer, mimeType: string) {
    const base64 = buffer.toString("base64");
    const dataUrl = `data:${mimeType};base64,${base64}`;
    await prisma.user.update({ where: { id: userId }, data: { avatarUrl: dataUrl } });
    return { avatarUrl: dataUrl };
  },

  async updateProfile(userId: string, payload: { email?: string | null; phone?: string | null; birthDate?: string | null }) {
    const user = await prisma.user.findUnique({
      where: { id: userId },
      include: { athlete: true },
    });

    if (!user) {
      throw new AppError("Usuário não encontrado", 404);
    }

    const email = normalizeOptional(payload.email);
    const phone = normalizeOptional(payload.phone);

    await prisma.user.update({
      where: { id: userId },
      data: {
        email,
      },
    });

    if (user.athlete) {
      const athleteData: Record<string, unknown> = { email, phone };
      if (payload.birthDate !== undefined) {
        athleteData.birthDate = payload.birthDate ? new Date(payload.birthDate) : null;
      }
      await prisma.athlete.update({
        where: { id: user.athlete.id },
        data: athleteData,
      });
    }

    return this.getProfile(userId);
  },
};
