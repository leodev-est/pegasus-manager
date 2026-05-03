import { Prisma } from "@prisma/client";
import { randomUUID } from "crypto";
import { prisma } from "../../config/prisma";
import { AppError } from "../../middlewares/error.middleware";
import { notificationsService } from "../notifications/notifications.service";

const paymentTypes = ["receita", "despesa"] as const;
const movementTypes = ["entrada", "saida"] as const;
const statusValues = ["pago", "pendente", "atrasado"] as const;

type PaymentType = (typeof paymentTypes)[number];
type MovementType = (typeof movementTypes)[number];
type PaymentStatus = (typeof statusValues)[number];

type PaymentPayload = {
  athleteId?: string | null;
  description?: string;
  amount?: number | string;
  type?: PaymentType;
  category?: string | null;
  status?: PaymentStatus;
  dueDate?: string | null;
  paidAt?: string | null;
};

type PaymentFilters = {
  status?: string;
  type?: string;
  month?: string;
  athleteId?: string;
};

type MovementPayload = {
  description?: string;
  amount?: number | string;
  type?: MovementType;
  category?: string | null;
  date?: string;
  responsible?: string | null;
  notes?: string | null;
};

type PaymentRow = {
  id: string;
  athleteId: string | null;
  athleteName: string | null;
  description: string;
  amount: Prisma.Decimal | number | string;
  type: PaymentType;
  category: string | null;
  status: PaymentStatus;
  dueDate: Date | null;
  paidAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
};

type MovementRow = {
  id: string;
  description: string;
  amount: Prisma.Decimal | number | string;
  type: MovementType;
  category: string | null;
  date: Date;
  responsible: string | null;
  notes: string | null;
  createdAt: Date;
  updatedAt: Date;
};

function normalizeOptional(value: string | null | undefined) {
  if (value === undefined) return undefined;
  if (value === null) return null;

  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : null;
}

function parseAmount(amount: number | string | undefined, required: boolean) {
  if (amount === undefined) {
    if (required) throw new AppError("Valor é obrigatório", 400);
    return undefined;
  }

  const value = Number(amount);

  if (!Number.isFinite(value) || value <= 0) {
    throw new AppError("Valor deve ser maior que zero", 400);
  }

  return value;
}

function parseDate(value: string | null | undefined, field: string, required = false) {
  if (value === undefined) {
    if (required) throw new AppError(`${field} é obrigatória`, 400);
    return undefined;
  }

  if (value === null || value === "") {
    if (required) throw new AppError(`${field} é obrigatória`, 400);
    return null;
  }

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    throw new AppError(`${field} invalida`, 400);
  }

  return date;
}

function parseMonth(month?: string) {
  if (!month) return undefined;

  if (!/^\d{4}-\d{2}$/.test(month)) {
    throw new AppError("Mês deve estar no formato YYYY-MM", 400);
  }

  const start = new Date(`${month}-01T00:00:00.000Z`);
  const end = new Date(start);
  end.setUTCMonth(end.getUTCMonth() + 1);

  return { start, end };
}

function validatePaymentType(type?: string) {
  if (type && !paymentTypes.includes(type as PaymentType)) {
    throw new AppError("Tipo deve ser receita ou despesa", 400);
  }
}

function validateMovementType(type?: string) {
  if (type && !movementTypes.includes(type as MovementType)) {
    throw new AppError("Tipo deve ser entrada ou saída", 400);
  }
}

function validateStatus(status?: string) {
  if (status && !statusValues.includes(status as PaymentStatus)) {
    throw new AppError("Status deve ser pago, pendente ou atrasado", 400);
  }
}

function requireDescription(description?: string) {
  if (!description?.trim()) {
    throw new AppError("Descrição é obrigatória", 400);
  }

  return description.trim();
}

function serializePayment(row: PaymentRow) {
  return {
    ...row,
    amount: Number(row.amount),
  };
}

function serializeMovement(row: MovementRow) {
  return {
    ...row,
    amount: Number(row.amount),
  };
}

async function findPaymentById(id: string) {
  const rows = await prisma.$queryRaw<PaymentRow[]>`
    SELECT p.*, a.name as "athleteName"
    FROM "Payment" p
    LEFT JOIN "Athlete" a ON a.id = p."athleteId"
    WHERE p.id = ${id}
  `;

  if (!rows[0]) {
    throw new AppError("Lançamento financeiro não encontrado", 404);
  }

  return serializePayment(rows[0]);
}

async function findMovementById(id: string) {
  const rows = await prisma.$queryRaw<MovementRow[]>`
    SELECT *
    FROM "CashMovement"
    WHERE id = ${id}
  `;

  if (!rows[0]) {
    throw new AppError("Movimentação de caixa não encontrada", 404);
  }

  return serializeMovement(rows[0]);
}

async function notifyOverduePayment(payment: ReturnType<typeof serializePayment>) {
  if (payment.status !== "atrasado" || !payment.athleteId) return;

  const user = await prisma.user.findUnique({
    where: { athleteId: payment.athleteId },
    select: { id: true },
  });

  await notificationsService.createForUser(user?.id, {
    message: "Sua mensalidade está atrasada.",
    title: "Mensalidade atrasada",
    type: "financeiro",
  });
}

export const financeService = {
  async getSummary(month = new Date().toISOString().slice(0, 7)) {
    const monthRange = parseMonth(month) ?? parseMonth(new Date().toISOString().slice(0, 7));

    const [paymentRows, movementRows] = await Promise.all([
      prisma.$queryRaw<PaymentRow[]>`
        SELECT p.*, a.name as "athleteName"
        FROM "Payment" p
        LEFT JOIN "Athlete" a ON a.id = p."athleteId"
      `,
      prisma.$queryRaw<MovementRow[]>`
        SELECT *
        FROM "CashMovement"
      `,
    ]);

    const payments = paymentRows.map(serializePayment);
    const movements = movementRows.map(serializeMovement);
    const isInMonth = (date?: Date | null) =>
      Boolean(date && monthRange && date >= monthRange.start && date < monthRange.end);
    const paymentDate = (payment: ReturnType<typeof serializePayment>) =>
      payment.paidAt ?? payment.dueDate ?? payment.createdAt;

    const currentCash =
      payments.reduce((sum, payment) => {
        if (payment.status !== "pago") return sum;
        return sum + (payment.type === "receita" ? payment.amount : -payment.amount);
      }, 0) +
      movements.reduce(
        (sum, movement) => sum + (movement.type === "entrada" ? movement.amount : -movement.amount),
        0,
      );

    const monthlyRevenue =
      payments
        .filter((payment) => payment.status === "pago" && payment.type === "receita")
        .filter((payment) => isInMonth(paymentDate(payment)))
        .reduce((sum, payment) => sum + payment.amount, 0) +
      movements
        .filter((movement) => movement.type === "entrada" && isInMonth(movement.date))
        .reduce((sum, movement) => sum + movement.amount, 0);

    const monthlyExpenses =
      payments
        .filter((payment) => payment.status === "pago" && payment.type === "despesa")
        .filter((payment) => isInMonth(paymentDate(payment)))
        .reduce((sum, payment) => sum + payment.amount, 0) +
      movements
        .filter((movement) => movement.type === "saida" && isInMonth(movement.date))
        .reduce((sum, movement) => sum + movement.amount, 0);

    return {
      currentCash,
      monthlyRevenue,
      monthlyExpenses,
      monthlyBalance: monthlyRevenue - monthlyExpenses,
      pendingMonthlyPayments: payments.filter(
        (payment) => payment.athleteId && payment.status === "pendente",
      ).length,
      overdueMonthlyPayments: payments.filter(
        (payment) => payment.athleteId && payment.status === "atrasado",
      ).length,
    };
  },

  async findPayments(filters: PaymentFilters) {
    validateStatus(filters.status);
    validatePaymentType(filters.type);
    const conditions: Prisma.Sql[] = [];
    const monthRange = parseMonth(filters.month);

    if (filters.status) conditions.push(Prisma.sql`p.status = ${filters.status}`);
    if (filters.type) conditions.push(Prisma.sql`p.type = ${filters.type}`);
    if (filters.athleteId) conditions.push(Prisma.sql`p."athleteId" = ${filters.athleteId}`);
    if (monthRange) {
      conditions.push(Prisma.sql`(
        (p."paidAt" >= ${monthRange.start} AND p."paidAt" < ${monthRange.end})
        OR (p."dueDate" >= ${monthRange.start} AND p."dueDate" < ${monthRange.end})
        OR (p."createdAt" >= ${monthRange.start} AND p."createdAt" < ${monthRange.end})
      )`);
    }

    const where = conditions.length
      ? Prisma.sql`WHERE ${Prisma.join(conditions, " AND ")}`
      : Prisma.empty;

    const rows = await prisma.$queryRaw<PaymentRow[]>`
      SELECT p.*, a.name as "athleteName"
      FROM "Payment" p
      LEFT JOIN "Athlete" a ON a.id = p."athleteId"
      ${where}
      ORDER BY COALESCE(p."paidAt", p."dueDate", p."createdAt") DESC
    `;

    return rows.map(serializePayment);
  },

  async createPayment(payload: PaymentPayload) {
    const description = requireDescription(payload.description);
    const amount = parseAmount(payload.amount, true);
    const type = payload.type ?? "receita";
    const status = payload.status ?? "pendente";

    validatePaymentType(type);
    validateStatus(status);

    const rows = await prisma.$queryRaw<PaymentRow[]>`
      INSERT INTO "Payment" (
        "id", "athleteId", "description", "amount", "type", "category", "status",
        "dueDate", "paidAt", "updatedAt"
      )
      VALUES (
        ${randomUUID()}, ${normalizeOptional(payload.athleteId)}, ${description}, ${amount}, ${type},
        ${normalizeOptional(payload.category)}, ${status}, ${parseDate(payload.dueDate, "Vencimento")},
        ${parseDate(payload.paidAt, "Data de pagamento")}, NOW()
      )
      RETURNING *, NULL::text as "athleteName"
    `;

    const payment = await findPaymentById(rows[0].id);
    await notifyOverduePayment(payment);
    return payment;
  },

  async updatePayment(id: string, payload: PaymentPayload) {
    await findPaymentById(id);

    const updates: Prisma.Sql[] = [];

    if (payload.description !== undefined) {
      updates.push(Prisma.sql`"description" = ${requireDescription(payload.description)}`);
    }
    if (payload.amount !== undefined) {
      updates.push(Prisma.sql`"amount" = ${parseAmount(payload.amount, false)}`);
    }
    if (payload.type !== undefined) {
      validatePaymentType(payload.type);
      updates.push(Prisma.sql`"type" = ${payload.type}`);
    }
    if (payload.category !== undefined) {
      updates.push(Prisma.sql`"category" = ${normalizeOptional(payload.category)}`);
    }
    if (payload.status !== undefined) {
      validateStatus(payload.status);
      updates.push(Prisma.sql`"status" = ${payload.status}`);
    }
    if (payload.athleteId !== undefined) {
      updates.push(Prisma.sql`"athleteId" = ${normalizeOptional(payload.athleteId)}`);
    }
    if (payload.dueDate !== undefined) {
      updates.push(Prisma.sql`"dueDate" = ${parseDate(payload.dueDate, "Vencimento")}`);
    }
    if (payload.paidAt !== undefined) {
      updates.push(Prisma.sql`"paidAt" = ${parseDate(payload.paidAt, "Data de pagamento")}`);
    }

    if (updates.length === 0) {
      return findPaymentById(id);
    }

    await prisma.$executeRaw`
      UPDATE "Payment"
      SET ${Prisma.join(updates, ", ")}, "updatedAt" = NOW()
      WHERE id = ${id}
    `;

    const payment = await findPaymentById(id);
    await notifyOverduePayment(payment);
    return payment;
  },

  async deletePayment(id: string) {
    await findPaymentById(id);
    await prisma.$executeRaw`DELETE FROM "Payment" WHERE id = ${id}`;
  },

  async findMovements() {
    const rows = await prisma.$queryRaw<MovementRow[]>`
      SELECT *
      FROM "CashMovement"
      ORDER BY "date" DESC, "createdAt" DESC
    `;

    return rows.map(serializeMovement);
  },

  async createMovement(payload: MovementPayload) {
    const description = requireDescription(payload.description);
    const amount = parseAmount(payload.amount, true);
    const type = payload.type ?? "entrada";

    validateMovementType(type);

    const rows = await prisma.$queryRaw<MovementRow[]>`
      INSERT INTO "CashMovement" (
        "id", "description", "amount", "type", "category", "date", "responsible", "notes",
        "updatedAt"
      )
      VALUES (
        ${randomUUID()}, ${description}, ${amount}, ${type}, ${normalizeOptional(payload.category)},
        ${parseDate(payload.date, "Data", true)}, ${normalizeOptional(payload.responsible)},
        ${normalizeOptional(payload.notes)}, NOW()
      )
      RETURNING *
    `;

    return serializeMovement(rows[0]);
  },

  async updateMovement(id: string, payload: MovementPayload) {
    await findMovementById(id);

    const updates: Prisma.Sql[] = [];

    if (payload.description !== undefined) {
      updates.push(Prisma.sql`"description" = ${requireDescription(payload.description)}`);
    }
    if (payload.amount !== undefined) {
      updates.push(Prisma.sql`"amount" = ${parseAmount(payload.amount, false)}`);
    }
    if (payload.type !== undefined) {
      validateMovementType(payload.type);
      updates.push(Prisma.sql`"type" = ${payload.type}`);
    }
    if (payload.category !== undefined) {
      updates.push(Prisma.sql`"category" = ${normalizeOptional(payload.category)}`);
    }
    if (payload.date !== undefined) {
      updates.push(Prisma.sql`"date" = ${parseDate(payload.date, "Data", true)}`);
    }
    if (payload.responsible !== undefined) {
      updates.push(Prisma.sql`"responsible" = ${normalizeOptional(payload.responsible)}`);
    }
    if (payload.notes !== undefined) {
      updates.push(Prisma.sql`"notes" = ${normalizeOptional(payload.notes)}`);
    }

    if (updates.length === 0) {
      return findMovementById(id);
    }

    await prisma.$executeRaw`
      UPDATE "CashMovement"
      SET ${Prisma.join(updates, ", ")}, "updatedAt" = NOW()
      WHERE id = ${id}
    `;

    return findMovementById(id);
  },

  async deleteMovement(id: string) {
    await findMovementById(id);
    await prisma.$executeRaw`DELETE FROM "CashMovement" WHERE id = ${id}`;
  },
};


