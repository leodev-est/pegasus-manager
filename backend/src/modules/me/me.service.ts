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
  email: string | null;
  id: string;
  name: string;
  username: string;
  roles: Array<{ role: { name: string; permissions: Array<{ permission: { key: string } }> } }>;
}) {
  return {
    active: user.active,
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
            evaluation: true,
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

    const athlete = user.athlete;
    const [payments, upcomingTrainings, totalFrequency] = await Promise.all([
      athlete
        ? prisma.payment.findMany({
            where: { athleteId: athlete.id },
            orderBy: [{ dueDate: "desc" }, { createdAt: "desc" }],
            take: 12,
          })
        : [],
      prisma.training.findMany({
        where: {
          date: {
            gte: startOfToday(),
          },
        },
        orderBy: { date: "asc" },
        take: 5,
      }),
      athlete ? attendanceService.getMyTotalFrequency(userId) : null,
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
      payments: payments.map((payment) => ({
        ...payment,
        amount: Number(payment.amount),
      })),
      upcomingTrainings,
      user: formatUser(user),
    };
  },

  async updateProfile(userId: string, payload: { email?: string | null; phone?: string | null }) {
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
      await prisma.athlete.update({
        where: { id: user.athlete.id },
        data: {
          email,
          phone,
        },
      });
    }

    return this.getProfile(userId);
  },
};
