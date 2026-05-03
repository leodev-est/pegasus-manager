import { api } from "./api";

export type PaymentType = "receita" | "despesa";
export type MovementType = "entrada" | "saida";
export type FinanceStatus = "pago" | "pendente" | "atrasado";

export type FinanceSummary = {
  currentCash: number;
  monthlyRevenue: number;
  monthlyExpenses: number;
  monthlyBalance: number;
  pendingMonthlyPayments: number;
  overdueMonthlyPayments: number;
};

export type Payment = {
  id: string;
  athleteId: string | null;
  athleteName: string | null;
  description: string;
  amount: number;
  type: PaymentType;
  category: string | null;
  status: FinanceStatus;
  dueDate: string | null;
  paidAt: string | null;
  createdAt: string;
  updatedAt: string;
};

export type CashMovement = {
  id: string;
  description: string;
  amount: number;
  type: MovementType;
  category: string | null;
  date: string;
  responsible: string | null;
  notes: string | null;
  createdAt: string;
  updatedAt: string;
};

export type PaymentFilters = {
  status?: FinanceStatus | "todos";
  type?: PaymentType | "todos";
  month?: string;
  athleteId?: string;
};

export type PaymentPayload = {
  athleteId?: string;
  description: string;
  amount: number;
  type: PaymentType;
  category?: string;
  status: FinanceStatus;
  dueDate?: string;
  paidAt?: string;
};

export type MovementPayload = {
  description: string;
  amount: number;
  type: MovementType;
  category?: string;
  date: string;
  responsible?: string;
  notes?: string;
};

function cleanPaymentFilters(filters?: PaymentFilters) {
  return {
    status: filters?.status && filters.status !== "todos" ? filters.status : undefined,
    type: filters?.type && filters.type !== "todos" ? filters.type : undefined,
    month: filters?.month || undefined,
    athleteId: filters?.athleteId || undefined,
  };
}

export const financeService = {
  async getSummary(month?: string) {
    const { data } = await api.get<FinanceSummary>("/finance/summary", {
      params: { month },
    });
    return data;
  },
  async getPayments(filters?: PaymentFilters) {
    const { data } = await api.get<Payment[]>("/finance/payments", {
      params: cleanPaymentFilters(filters),
    });
    return data;
  },
  async createPayment(payload: PaymentPayload) {
    const { data } = await api.post<Payment>("/finance/payments", payload);
    return data;
  },
  async updatePayment(id: string, payload: Partial<PaymentPayload>) {
    const { data } = await api.patch<Payment>(`/finance/payments/${id}`, payload);
    return data;
  },
  async deletePayment(id: string) {
    await api.delete(`/finance/payments/${id}`);
  },
  async getMovements() {
    const { data } = await api.get<CashMovement[]>("/finance/movements");
    return data;
  },
  async createMovement(payload: MovementPayload) {
    const { data } = await api.post<CashMovement>("/finance/movements", payload);
    return data;
  },
  async updateMovement(id: string, payload: Partial<MovementPayload>) {
    const { data } = await api.patch<CashMovement>(`/finance/movements/${id}`, payload);
    return data;
  },
  async deleteMovement(id: string) {
    await api.delete(`/finance/movements/${id}`);
  },
};
