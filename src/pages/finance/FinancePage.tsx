import { Banknote, BarChart2, Clipboard, FileDown, FileText, Loader2, Plus, WalletCards } from "lucide-react";
import { FormEvent, useCallback, useEffect, useMemo, useState } from "react";
import { useTour } from "../../tours/useTour";
import { Bar, BarChart, CartesianGrid, Legend, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { useAuth } from "../../auth/AuthContext";
import { ActionButtons } from "../../components/ui/ActionButtons";
import { Button } from "../../components/ui/Button";
import { ConfirmDialog } from "../../components/ui/ConfirmDialog";
import { EmptyState } from "../../components/ui/EmptyState";
import { FilterBar } from "../../components/ui/FilterBar";
import { Input } from "../../components/ui/Input";
import { Modal } from "../../components/ui/Modal";
import { PageHeader } from "../../components/ui/PageHeader";
import { Select } from "../../components/ui/Select";
import { StatusBadge, type StatusTone } from "../../components/ui/StatusBadge";
import { Table } from "../../components/ui/Table";
import { Textarea } from "../../components/ui/Textarea";
import { useToast } from "../../components/ui/Toast";
import { getApiErrorMessage } from "../../services/api";
import { exportToCSV } from "../../utils/exportUtils";
import { athleteService, type Athlete } from "../../services/athleteService";
import { reportsService, type MonthlyReport } from "../../services/reportsService";
import {
  financeService,
  type CashMovement,
  type ChartDataPoint,
  type FinanceStatus,
  type FinanceSummary,
  type MensalidadeEntry,
  type MovementPayload,
  type MovementType,
  type Payment,
  type PaymentPayload,
  type PaymentType,
} from "../../services/financeService";

type PaymentForm = PaymentPayload;
type MovementForm = MovementPayload;
type DeleteTarget =
  | { kind: "payment"; id: string; description: string }
  | { kind: "movement"; id: string; description: string };

const currentMonth = new Date().toISOString().slice(0, 7);
type FinanceTab = "resumo" | "mensalidades" | "caixa" | "relatorios" | "graficos";

const TOUR_STEPS = [
  {
    popover: {
      title: "💰 Financeiro",
      description: "Controle completo de receitas, despesas, mensalidades, caixa e relatórios financeiros do clube.",
    },
  },
  {
    element: "[data-tour='finance-tabs']",
    popover: {
      title: "Abas",
      description: "Navegue entre Resumo (visão geral), Mensalidades (por atleta), Caixa (movimentações avulsas), Relatórios (PDF/texto) e Gráficos.",
      side: "bottom" as const,
    },
  },
  {
    element: "[data-tour='finance-resumo']",
    popover: {
      title: "Resumo financeiro",
      description: "Valores consolidados do mês: caixa atual, receitas, despesas e pendências de mensalidade.",
      side: "bottom" as const,
    },
  },
];

const financeTabs: Array<{ label: string; value: FinanceTab }> = [
  { label: "Resumo", value: "resumo" },
  { label: "Mensalidades", value: "mensalidades" },
  { label: "Caixa", value: "caixa" },
  { label: "Relatórios", value: "relatorios" },
  { label: "Gráficos", value: "graficos" },
];

const emptyPayment: PaymentForm = {
  athleteId: "",
  description: "",
  amount: 0,
  type: "receita",
  category: "",
  status: "pago",
  dueDate: defaultDueDate(),
  paidAt: new Date().toISOString().slice(0, 10),
};

const emptyMovement: MovementForm = {
  description: "",
  amount: 0,
  type: "entrada",
  category: "",
  date: new Date().toISOString().slice(0, 10),
  responsible: "",
  notes: "",
};

const paymentTypeOptions = [
  { label: "Todos os tipos", value: "todos" },
  { label: "Receita", value: "receita" },
  { label: "Despesa", value: "despesa" },
];

const movementTypeOptions = [
  { label: "Entrada", value: "entrada" },
  { label: "Saída", value: "saida" },
];

const statusOptions = [
  { label: "Todos os status", value: "todos" },
  { label: "Pago", value: "pago" },
  { label: "Pendente", value: "pendente" },
  { label: "Atrasado", value: "atrasado" },
];

function formatCurrency(value: number) {
  return new Intl.NumberFormat("pt-BR", { currency: "BRL", style: "currency" }).format(value);
}

function formatDate(value?: string | null) {
  if (!value) return "-";
  return new Intl.DateTimeFormat("pt-BR", { timeZone: "UTC" }).format(new Date(value));
}

function badgeTone(value: string): StatusTone {
  if (["pago", "receita", "entrada"].includes(value)) return "success";
  if (value === "pendente") return "warning";
  if (["atrasado", "despesa", "saida"].includes(value)) return "danger";
  return "neutral";
}

function label(value: string) {
  const labels: Record<string, string> = {
    entrada: "Entrada",
    saida: "Saída",
    receita: "Receita",
    despesa: "Despesa",
    pago: "Pago",
    pendente: "Pendente",
    atrasado: "Atrasado",
  };

  if (labels[value]) return labels[value];

  return value.charAt(0).toUpperCase() + value.slice(1);
}

function defaultDueDate() {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-10`;
}

function formatChartMonth(value: string) {
  const [year, m] = value.split("-");
  return new Date(Number(year), Number(m) - 1, 1).toLocaleDateString("pt-BR", { month: "short", year: "2-digit" });
}

function formatChartCurrency(value: number) {
  if (value >= 1000) return `R$${(value / 1000).toFixed(0)}k`;
  return `R$${value}`;
}

function normalizePayload<T extends Record<string, unknown>>(payload: T) {
  return Object.fromEntries(
    Object.entries(payload).map(([key, value]) => [key, value === "" ? undefined : value]),
  ) as T;
}

function paymentToForm(payment: Payment): PaymentForm {
  return {
    athleteId: payment.athleteId ?? "",
    description: payment.description,
    amount: payment.amount,
    type: payment.type,
    category: payment.category ?? "",
    status: payment.status,
    dueDate: payment.dueDate?.slice(0, 10) ?? "",
    paidAt: payment.paidAt?.slice(0, 10) ?? "",
  };
}

function movementToForm(movement: CashMovement): MovementForm {
  return {
    description: movement.description,
    amount: movement.amount,
    type: movement.type,
    category: movement.category ?? "",
    date: movement.date.slice(0, 10),
    responsible: movement.responsible ?? "",
    notes: movement.notes ?? "",
  };
}

function isInMonth(value: string | null | undefined, month: string) {
  return Boolean(value?.startsWith(month));
}

function isMonthlyPayment(payment: Payment) {
  return Boolean(
    payment.athleteId ||
      payment.category?.toLowerCase().includes("mensalidade") ||
      payment.description.toLowerCase().includes("mensalidade"),
  );
}

export function FinancePage() {
  const { hasPermission } = useAuth();
  const { showToast } = useToast();
  const canCreate = hasPermission(["finance:create"]);
  const canUpdate = hasPermission(["finance:update"]);
  const canDelete = hasPermission(["finance:delete"]);
  const [summary, setSummary] = useState<FinanceSummary>({
    currentCash: 0,
    monthlyRevenue: 0,
    monthlyExpenses: 0,
    monthlyBalance: 0,
    pendingMonthlyPayments: 0,
    overdueMonthlyPayments: 0,
    mensalidadesTotalEsperado: 0,
    mensalidadesTotalRecebido: 0,
    mensalidadesTotalPendente: 0,
    mensalidadesTaxaAdimplencia: 0,
    mensalidadesPaidCount: 0,
    mensalidadesTotalCount: 0,
  });
  const [payments, setPayments] = useState<Payment[]>([]);
  const [movements, setMovements] = useState<CashMovement[]>([]);
  const [athletes, setAthletes] = useState<Athlete[]>([]);
  const [type, setType] = useState("todos");
  const [status, setStatus] = useState("todos");
  const [month, setMonth] = useState(currentMonth);
  const [activeTab, setActiveTab] = useState<FinanceTab>("resumo");
  const [chartData, setChartData] = useState<ChartDataPoint[]>([]);
  const [isLoadingChart, setIsLoadingChart] = useState(false);
  const [mensalidades, setMensalidades] = useState<MensalidadeEntry[]>([]);
  const [mensalidadeMonth, setMensalidadeMonth] = useState(currentMonth);
  const [mensalidadeStatus, setMensalidadeStatus] = useState("todos");
  const [isLoadingMensalidades, setIsLoadingMensalidades] = useState(false);
  const [updatingMensalidadeId, setUpdatingMensalidadeId] = useState<string | null>(null);
  const [reports, setReports] = useState<MonthlyReport[]>([]);
  const [isLoadingReports, setIsLoadingReports] = useState(false);
  const [isGeneratingReport, setIsGeneratingReport] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [paymentModal, setPaymentModal] = useState(false);
  const [movementModal, setMovementModal] = useState(false);
  const [editingPayment, setEditingPayment] = useState<Payment | null>(null);
  const [editingMovement, setEditingMovement] = useState<CashMovement | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<DeleteTarget | null>(null);
  const [paymentForm, setPaymentForm] = useState<PaymentForm>(emptyPayment);
  const [movementForm, setMovementForm] = useState<MovementForm>(emptyMovement);

  useTour("financeiro:v1", isLoading ? [] : TOUR_STEPS);

  const loadFinance = useCallback(async () => {
    setIsLoading(true);

    try {
      const [summaryData, paymentsData, movementsData, athletesData] = await Promise.all([
        financeService.getSummary(month),
        financeService.getPayments({
          month,
          status: status as FinanceStatus | "todos",
          type: type as PaymentType | "todos",
        }),
        financeService.getMovements(),
        athleteService.getAll(),
      ]);

      setSummary(summaryData);
      setPayments(paymentsData);
      setMovements(movementsData);
      setAthletes(athletesData);
    } catch (error) {
      showToast(getApiErrorMessage(error), "error");
    } finally {
      setIsLoading(false);
    }
  }, [month, showToast, status, type]);

  useEffect(() => {
    loadFinance();
  }, [loadFinance]);

  useEffect(() => {
    if (activeTab !== "graficos") return;
    setIsLoadingChart(true);
    financeService.getChartData(6).then(setChartData).catch(() => {}).finally(() => setIsLoadingChart(false));
  }, [activeTab]);

  const loadMensalidades = useCallback(async () => {
    setIsLoadingMensalidades(true);
    try {
      const data = await financeService.getMensalidades(
        mensalidadeMonth,
        mensalidadeStatus !== "todos" ? mensalidadeStatus : undefined,
      );
      setMensalidades(data);
    } catch (error) {
      showToast(getApiErrorMessage(error), "error");
    } finally {
      setIsLoadingMensalidades(false);
    }
  }, [mensalidadeMonth, mensalidadeStatus, showToast]);

  useEffect(() => {
    if (activeTab === "mensalidades") loadMensalidades();
  }, [activeTab, loadMensalidades]);

  const monthExpenses = useMemo(() => {
    const paymentExpenses = payments
      .filter((payment) => payment.type === "despesa" && payment.status === "pago")
      .filter((payment) => isInMonth(payment.paidAt ?? payment.dueDate ?? payment.createdAt, month))
      .map((payment) => ({ description: payment.description, amount: payment.amount }));
    const movementExpenses = movements
      .filter((movement) => movement.type === "saida" && isInMonth(movement.date, month))
      .map((movement) => ({ description: movement.description, amount: movement.amount }));

    return [...paymentExpenses, ...movementExpenses];
  }, [month, movements, payments]);

  const demonstrationText = useMemo(
    () =>
      [
        `Demonstrativo Financeiro Pegasus - ${month}`,
        `Caixa atual: ${formatCurrency(summary.currentCash)}`,
        `Entradas do mês: ${formatCurrency(summary.monthlyRevenue)}`,
        `Saídas do mês: ${formatCurrency(summary.monthlyExpenses)}`,
        `Saldo do mês: ${formatCurrency(summary.monthlyBalance)}`,
        "",
        ...(summary.mensalidadesTotalCount > 0
          ? [
              "Mensalidades:",
              `- Total esperado: ${formatCurrency(summary.mensalidadesTotalEsperado)}`,
              `- Total recebido: ${formatCurrency(summary.mensalidadesTotalRecebido)}`,
              `- Total pendente: ${formatCurrency(summary.mensalidadesTotalPendente)}`,
              `- Taxa de adimplência: ${summary.mensalidadesTaxaAdimplencia}% (${summary.mensalidadesPaidCount}/${summary.mensalidadesTotalCount})`,
              "",
            ]
          : []),
        "Gastos:",
        ...(monthExpenses.length > 0
          ? monthExpenses.map((expense) => `- ${expense.description}: ${formatCurrency(expense.amount)}`)
          : ["- Nenhum gasto registrado"]),
      ].join("\n"),
    [month, monthExpenses, summary],
  );

  const payableAthletes = useMemo(
    () => athletes.filter((a) => a.status === "ativo" && a.monthlyPaymentStatus !== "isento"),
    [athletes],
  );

  const cashPayments = useMemo(() => payments.filter((payment) => !isMonthlyPayment(payment)), [payments]);

  async function markAsPaid(id: string) {
    setUpdatingMensalidadeId(id);
    setMensalidades((prev) =>
      prev.map((m) =>
        m.id === id ? { ...m, status: "pago" as FinanceStatus, paidAt: new Date().toISOString() } : m,
      ),
    );
    try {
      await financeService.payMensalidade(id);
      await loadMensalidades();
    } catch (error) {
      showToast(getApiErrorMessage(error), "error");
      await loadMensalidades();
    } finally {
      setUpdatingMensalidadeId(null);
    }
  }

  const loadReports = useCallback(async () => {
    setIsLoadingReports(true);
    try {
      const data = await reportsService.list();
      setReports(data);
    } catch {
      // Silently fail
    } finally {
      setIsLoadingReports(false);
    }
  }, []);

  useEffect(() => {
    if (activeTab === "relatorios") loadReports();
  }, [activeTab, loadReports]);

  async function generateReport() {
    setIsGeneratingReport(true);
    try {
      await reportsService.generate();
      await loadReports();
      showToast("Relatório gerado com sucesso.", "success");
    } catch (error) {
      showToast(getApiErrorMessage(error), "error");
    } finally {
      setIsGeneratingReport(false);
    }
  }

  async function undoPayment(id: string) {
    setUpdatingMensalidadeId(id);
    setMensalidades((prev) =>
      prev.map((m) => (m.id === id ? { ...m, status: "pendente" as FinanceStatus, paidAt: null } : m)),
    );
    try {
      await financeService.undoMensalidade(id);
      await loadMensalidades();
    } catch (error) {
      showToast(getApiErrorMessage(error), "error");
      await loadMensalidades();
    } finally {
      setUpdatingMensalidadeId(null);
    }
  }

  function openPaymentModal(paymentType: PaymentType, monthly = false) {
    setEditingPayment(null);
    setPaymentForm({
      ...emptyPayment,
      type: paymentType,
      category: monthly ? "Mensalidade" : "",
      description: monthly ? "Mensalidade" : "",
      status: paymentType === "despesa" ? "pendente" : "pago",
      paidAt: paymentType === "despesa" ? "" : emptyPayment.paidAt,
    });
    setPaymentModal(true);
  }

  function openPaymentEdit(payment: Payment) {
    setEditingPayment(payment);
    setPaymentForm(paymentToForm(payment));
    setPaymentModal(true);
  }

  function openMovementCreate(typeValue: MovementType) {
    setEditingMovement(null);
    setMovementForm({ ...emptyMovement, type: typeValue });
    setMovementModal(true);
  }

  function openMovementEdit(movement: CashMovement) {
    setEditingMovement(movement);
    setMovementForm(movementToForm(movement));
    setMovementModal(true);
  }

  async function handlePaymentSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setIsSaving(true);

    try {
      const payload = normalizePayload(paymentForm);

      if (editingPayment) {
        await financeService.updatePayment(editingPayment.id, payload);
        showToast("Lançamento atualizado com sucesso.", "success");
      } else {
        await financeService.createPayment(payload);
        showToast("Lançamento criado com sucesso.", "success");
      }

      setPaymentModal(false);
      await loadFinance();
    } catch (error) {
      showToast(getApiErrorMessage(error), "error");
    } finally {
      setIsSaving(false);
    }
  }

  async function handleMovementSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setIsSaving(true);

    try {
      const payload = normalizePayload(movementForm);

      if (editingMovement) {
        await financeService.updateMovement(editingMovement.id, payload);
        showToast("Movimentação atualizada com sucesso.", "success");
      } else {
        await financeService.createMovement(payload);
        showToast("Movimentação criada com sucesso.", "success");
      }

      setMovementModal(false);
      await loadFinance();
    } catch (error) {
      showToast(getApiErrorMessage(error), "error");
    } finally {
      setIsSaving(false);
    }
  }

  async function confirmDelete() {
    if (!deleteTarget) return;
    setIsSaving(true);

    try {
      if (deleteTarget.kind === "payment") {
        await financeService.deletePayment(deleteTarget.id);
      } else {
        await financeService.deleteMovement(deleteTarget.id);
      }

      showToast("Registro excluído com sucesso.", "success");
      setDeleteTarget(null);
      await loadFinance();
    } catch (error) {
      showToast(getApiErrorMessage(error), "error");
    } finally {
      setIsSaving(false);
    }
  }

  async function copyDemonstration() {
    await navigator.clipboard.writeText(demonstrationText);
    showToast("Demonstrativo copiado.", "success");
  }

  return (
    <div className="space-y-8">
      <PageHeader
        title="Financeiro"
        description="Controle de receitas, despesas, mensalidades e caixa do projeto."
        action={
          canCreate && activeTab === "caixa" ? (
            <div className="flex w-full flex-col gap-3 sm:w-auto sm:flex-row sm:flex-wrap">
              <Button onClick={() => openPaymentModal("receita")}>
                <Plus size={17} />
                Criar receita
              </Button>
              <Button onClick={() => openPaymentModal("despesa")} variant="secondary">
                <Plus size={17} />
                Criar despesa
              </Button>
            </div>
          ) : null
        }
      />

      <div data-tour="finance-tabs" className="flex flex-wrap gap-2 rounded-2xl border border-blue-100 bg-white p-2 shadow-sm">
        {financeTabs.map((tab) => (
          <button
            className={`rounded-xl px-4 py-2 text-sm font-bold transition ${
              activeTab === tab.value
                ? "bg-pegasus-primary text-white shadow-sm"
                : "text-slate-600 hover:bg-pegasus-ice hover:text-pegasus-primary"
            }`}
            key={tab.value}
            onClick={() => {
              setActiveTab(tab.value);
              if (tab.value !== "caixa") setType("todos");
            }}
            type="button"
          >
            {tab.label}
          </button>
        ))}
      </div>

      {activeTab === "resumo" ? (
      <section data-tour="finance-resumo" className="grid gap-5 md:grid-cols-2 xl:grid-cols-5">
        {[
          ["Caixa atual", summary.currentCash],
          ["Receitas do mês", summary.monthlyRevenue],
          ["Despesas do mês", summary.monthlyExpenses],
          ["Saldo do mês", summary.monthlyBalance],
        ].map(([labelText, value]) => (
          <article key={labelText} className="panel p-5">
            <div className="flex items-center justify-between gap-4">
              <div>
                <p className="text-sm font-semibold text-slate-500">{labelText}</p>
                <strong className="mt-2 block text-2xl font-black text-pegasus-navy">
                  {formatCurrency(Number(value))}
                </strong>
              </div>
              <span className="rounded-2xl bg-pegasus-ice p-3 text-pegasus-primary">
                <Banknote size={22} />
              </span>
            </div>
          </article>
        ))}
        <article className="panel p-5">
          <p className="text-sm font-semibold text-slate-500">Pendências</p>
          <strong className="mt-2 block text-2xl font-black text-pegasus-navy">
            {summary.pendingMonthlyPayments + summary.overdueMonthlyPayments}
          </strong>
          <p className="mt-2 text-xs font-semibold text-slate-500">
            {summary.pendingMonthlyPayments} pendente(s), {summary.overdueMonthlyPayments} atrasada(s)
          </p>
        </article>
      </section>
      ) : null}

      {activeTab === "caixa" ? (
      <FilterBar>
        <Select label="Tipo" onChange={(event) => setType(event.target.value)} options={paymentTypeOptions} value={type} />
        <Select label="Status" onChange={(event) => setStatus(event.target.value)} options={statusOptions} value={status} />
        <Input label="Mês" onChange={(event) => setMonth(event.target.value)} type="month" value={month} />
      </FilterBar>
      ) : null}

      {activeTab === "resumo" || activeTab === "relatorios" ? (
      <section className="panel p-6">
        <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
          <div>
            <h2 className="text-xl font-bold text-pegasus-navy">Demonstrativo do mês</h2>
            <p className="mt-1 text-sm text-slate-500">
              Entradas, saídas e gastos consolidados para copiar e compartilhar.
            </p>
          </div>
          <Button onClick={copyDemonstration} variant="secondary" className="w-full sm:w-auto">
            <Clipboard size={17} />
            Copiar demonstrativo
          </Button>
        </div>
        <div className="mt-6 grid gap-4 md:grid-cols-3">
          <div className="rounded-2xl border border-blue-100 bg-pegasus-surface p-4">
            <p className="text-sm font-semibold text-slate-500">Total de entradas</p>
            <strong className="mt-2 block text-xl text-pegasus-navy">{formatCurrency(summary.monthlyRevenue)}</strong>
          </div>
          <div className="rounded-2xl border border-blue-100 bg-pegasus-surface p-4">
            <p className="text-sm font-semibold text-slate-500">Total de saídas</p>
            <strong className="mt-2 block text-xl text-pegasus-navy">{formatCurrency(summary.monthlyExpenses)}</strong>
          </div>
          <div className="rounded-2xl border border-blue-100 bg-pegasus-surface p-4">
            <p className="text-sm font-semibold text-slate-500">Saldo final</p>
            <strong className="mt-2 block text-xl text-pegasus-navy">{formatCurrency(summary.monthlyBalance)}</strong>
          </div>
        </div>
        {summary.mensalidadesTotalCount > 0 ? (
          <>
            <p className="mt-6 text-sm font-bold text-pegasus-navy">Mensalidades do mês</p>
            <div className="mt-3 grid gap-4 sm:grid-cols-2 md:grid-cols-4">
              <div className="rounded-2xl border border-blue-100 bg-pegasus-surface p-4">
                <p className="text-sm font-semibold text-slate-500">Total esperado</p>
                <strong className="mt-2 block text-xl text-pegasus-navy">{formatCurrency(summary.mensalidadesTotalEsperado)}</strong>
              </div>
              <div className="rounded-2xl border border-emerald-100 bg-emerald-50 p-4">
                <p className="text-sm font-semibold text-emerald-700">Total recebido</p>
                <strong className="mt-2 block text-xl text-emerald-800">{formatCurrency(summary.mensalidadesTotalRecebido)}</strong>
              </div>
              <div className="rounded-2xl border border-amber-100 bg-amber-50 p-4">
                <p className="text-sm font-semibold text-amber-700">Total pendente</p>
                <strong className="mt-2 block text-xl text-amber-800">{formatCurrency(summary.mensalidadesTotalPendente)}</strong>
              </div>
              <div className="rounded-2xl border border-blue-100 bg-pegasus-surface p-4">
                <p className="text-sm font-semibold text-slate-500">Taxa de adimplência</p>
                <strong className={`mt-2 block text-xl ${summary.mensalidadesTaxaAdimplencia >= 80 ? "text-emerald-700" : summary.mensalidadesTaxaAdimplencia >= 50 ? "text-amber-700" : "text-rose-700"}`}>
                  {summary.mensalidadesTaxaAdimplencia}%
                </strong>
                <p className="mt-1 text-xs text-slate-400">{summary.mensalidadesPaidCount}/{summary.mensalidadesTotalCount} pagos</p>
              </div>
            </div>
          </>
        ) : null}
        <div className="mt-6">
          <p className="text-sm font-bold text-pegasus-navy">Gastos</p>
          <div className="mt-3 space-y-2">
            {monthExpenses.length > 0 ? (
              monthExpenses.map((expense, index) => (
                <div className="flex justify-between rounded-2xl bg-white px-4 py-3 text-sm" key={`${expense.description}-${index}`}>
                  <span className="font-semibold text-slate-600">{expense.description}</span>
                  <strong className="text-pegasus-navy">{formatCurrency(expense.amount)}</strong>
                </div>
              ))
            ) : (
              <p className="rounded-2xl bg-white px-4 py-3 text-sm text-slate-500">Nenhum gasto registrado no mês.</p>
            )}
          </div>
        </div>
      </section>
      ) : null}

      {activeTab === "relatorios" ? (
      <section className="panel overflow-hidden">
        <div className="flex items-center justify-between gap-3 border-b border-blue-100 p-6">
          <div className="flex items-center gap-3">
            <FileText className="text-pegasus-primary" size={22} />
            <div>
              <h2 className="text-xl font-bold text-pegasus-navy">Relatórios Mensais</h2>
              <p className="text-sm text-slate-500">PDF gerado automaticamente no 1º dia de cada mês.</p>
            </div>
          </div>
          <Button onClick={generateReport} disabled={isGeneratingReport} variant="secondary">
            {isGeneratingReport ? <Loader2 className="animate-spin" size={17} /> : <FileDown size={17} />}
            Gerar agora
          </Button>
        </div>
        {isLoadingReports ? (
          <div className="flex items-center gap-3 p-6 text-sm font-bold text-pegasus-primary">
            <Loader2 className="animate-spin" size={18} />
            Carregando relatórios...
          </div>
        ) : reports.length === 0 ? (
          <div className="p-6">
            <EmptyState icon={FileText} title="Nenhum relatório gerado" description="Clique em 'Gerar agora' para criar o relatório do mês atual." />
          </div>
        ) : (
          <div className="divide-y divide-blue-50">
            {reports.map((r) => (
              <div key={r.id} className="flex items-center justify-between gap-4 px-6 py-4">
                <div>
                  <p className="font-bold text-pegasus-navy">{r.fileName}</p>
                  <p className="text-xs text-slate-500">
                    Gerado em {new Date(r.generatedAt).toLocaleDateString("pt-BR")} · {(r.fileSize / 1024).toFixed(1)} KB
                  </p>
                </div>
                <Button
                  variant="secondary"
                  className="h-8 px-3 text-xs"
                  onClick={() => reportsService.download(r.id, r.fileName)}
                >
                  <FileDown size={13} />
                  Download
                </Button>
              </div>
            ))}
          </div>
        )}
      </section>
      ) : null}

      {activeTab === "mensalidades" ? (
      <section className="space-y-4">
        <div className="panel p-5">
          <div className="flex flex-wrap items-end gap-4">
            <Input
              label="Mês"
              onChange={(e) => setMensalidadeMonth(e.target.value)}
              type="month"
              value={mensalidadeMonth}
            />
            <Select
              label="Status"
              onChange={(e) => setMensalidadeStatus(e.target.value)}
              options={statusOptions}
              value={mensalidadeStatus}
            />
          </div>
          {mensalidades.length > 0 ? (
            <div className="mt-4 flex flex-wrap gap-3 text-sm font-semibold">
              <span className="rounded-full bg-emerald-50 px-3 py-1 text-emerald-700">
                {mensalidades.filter((m) => m.status === "pago").length} pago(s)
              </span>
              <span className="rounded-full bg-amber-50 px-3 py-1 text-amber-700">
                {mensalidades.filter((m) => m.status !== "pago").length} pendente(s)
              </span>
              <span className="rounded-full bg-pegasus-ice px-3 py-1 text-pegasus-navy">
                {mensalidades.length} total
              </span>
            </div>
          ) : null}
        </div>

        <div className="panel overflow-hidden">
          <div className="flex items-center gap-3 border-b border-blue-100 p-6">
            <FileText className="text-pegasus-primary" size={22} />
            <div>
              <h2 className="text-xl font-bold text-pegasus-navy">Mensalidades</h2>
              <p className="text-sm text-slate-500">
                {isLoadingMensalidades ? "Carregando..." : `${mensalidades.length} atleta(s) no mês.`}
              </p>
            </div>
            <div className="ml-auto">
              <Button
                onClick={() =>
                  exportToCSV(
                    "mensalidades",
                    ["Atleta", "Valor", "Status", "Data pagamento"],
                    mensalidades.map((m) => [
                      m.athleteName,
                      m.amount,
                      m.status,
                      m.paidAt ? m.paidAt.slice(0, 10) : "-",
                    ]),
                  )
                }
                variant="secondary"
              >
                <FileDown size={17} />
                Exportar CSV
              </Button>
            </div>
          </div>

          {isLoadingMensalidades ? (
            <div className="flex items-center gap-3 p-6 text-sm font-bold text-pegasus-primary">
              <Loader2 className="animate-spin" size={18} />
              Carregando mensalidades
            </div>
          ) : mensalidades.length > 0 ? (
            <>
              <div className="grid gap-3 p-4 md:hidden">
                {mensalidades.map((m) => (
                  <article key={m.id} className="rounded-2xl border border-blue-100 bg-white p-4 shadow-sm">
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <h3 className="font-bold text-pegasus-navy">{m.athleteName}</h3>
                        {m.description?.toLowerCase().includes("proporcional") && (
                          <span className="mt-1 inline-block rounded-full bg-violet-100 px-2 py-0.5 text-xs font-semibold text-violet-700">
                            Proporcional (1º mês)
                          </span>
                        )}
                        <p className="mt-1 text-sm text-slate-500">
                          {m.paidAt ? formatDate(m.paidAt) : "Não pago"}
                        </p>
                      </div>
                      <div className="flex flex-col items-end gap-2">
                        <strong className="text-pegasus-navy">{formatCurrency(m.amount)}</strong>
                        <StatusBadge label={label(m.status)} tone={badgeTone(m.status)} />
                      </div>
                    </div>
                    <div className="mt-4 border-t border-blue-50 pt-3">
                      {m.status === "pago" ? (
                        <Button
                          className="h-8 px-3 text-xs"
                          disabled={updatingMensalidadeId === m.id}
                          onClick={() => undoPayment(m.id)}
                          variant="secondary"
                        >
                          {updatingMensalidadeId === m.id ? <Loader2 className="animate-spin" size={13} /> : null}
                          Desfazer
                        </Button>
                      ) : (
                        <Button
                          className="h-8 px-3 text-xs"
                          disabled={updatingMensalidadeId === m.id}
                          onClick={() => markAsPaid(m.id)}
                        >
                          {updatingMensalidadeId === m.id ? <Loader2 className="animate-spin" size={13} /> : null}
                          Marcar como Pago
                        </Button>
                      )}
                    </div>
                  </article>
                ))}
              </div>
              <div className="hidden md:block">
                <Table
                  headers={["Nome", "Valor", "Status", "Data pagamento", "Ações"]}
                  minWidth="760px"
                >
                  {mensalidades.map((m) => (
                    <tr key={m.id} className="bg-white">
                      <td className="px-6 py-4">
                        <p className="font-bold text-pegasus-navy">{m.athleteName}</p>
                        {m.description?.toLowerCase().includes("proporcional") && (
                          <span className="mt-0.5 inline-block rounded-full bg-violet-100 px-2 py-0.5 text-xs font-semibold text-violet-700">
                            Proporcional (1º mês)
                          </span>
                        )}
                      </td>
                      <td className="px-6 py-4 text-slate-600">{formatCurrency(m.amount)}</td>
                      <td className="px-6 py-4">
                        <StatusBadge label={label(m.status)} tone={badgeTone(m.status)} />
                      </td>
                      <td className="px-6 py-4 text-slate-600">
                        {m.paidAt ? formatDate(m.paidAt) : "-"}
                      </td>
                      <td className="px-6 py-4">
                        {m.status === "pago" ? (
                          <Button
                            className="h-8 px-3 text-xs"
                            disabled={updatingMensalidadeId === m.id}
                            onClick={() => undoPayment(m.id)}
                            variant="secondary"
                          >
                            {updatingMensalidadeId === m.id ? <Loader2 className="animate-spin" size={13} /> : null}
                            Desfazer
                          </Button>
                        ) : (
                          <Button
                            className="h-8 px-3 text-xs"
                            disabled={updatingMensalidadeId === m.id}
                            onClick={() => markAsPaid(m.id)}
                          >
                            {updatingMensalidadeId === m.id ? <Loader2 className="animate-spin" size={13} /> : null}
                            Marcar como Pago
                          </Button>
                        )}
                      </td>
                    </tr>
                  ))}
                </Table>
              </div>
            </>
          ) : (
            <div className="p-6">
              <EmptyState
                icon={FileText}
                title="Nenhum atleta ativo encontrado"
                description="Não há atletas ativos não-isentos para o período selecionado."
              />
            </div>
          )}
        </div>
      </section>
      ) : null}

      {activeTab === "caixa" ? (
      <section className="panel overflow-hidden">
        <div className="flex items-center justify-between gap-3 border-b border-blue-100 p-6">
          <div className="flex items-center gap-3">
            <FileText className="text-pegasus-primary" size={22} />
            <div>
              <h2 className="text-xl font-bold text-pegasus-navy">Lançamentos financeiros</h2>
              <p className="text-sm text-slate-500">{cashPayments.length} lançamento(s) encontrado(s).</p>
            </div>
          </div>
          <Button
            onClick={() =>
              exportToCSV(
                "lancamentos",
                ["Atleta", "Descrição", "Valor", "Tipo", "Categoria", "Status", "Vencimento", "Data Pagamento"],
                cashPayments.map((p) => [
                  p.athleteName ?? "-",
                  p.description,
                  p.amount,
                  p.type,
                  p.category ?? "-",
                  p.status,
                  p.dueDate ? p.dueDate.slice(0, 10) : "-",
                  p.paidAt ? p.paidAt.slice(0, 10) : "-",
                ]),
              )
            }
            variant="secondary"
          >
            <FileDown size={17} />
            Exportar CSV
          </Button>
        </div>
        {isLoading ? (
          <div className="flex items-center gap-3 p-6 text-sm font-bold text-pegasus-primary">
            <Loader2 className="animate-spin" size={18} />
            Carregando financeiro
          </div>
        ) : cashPayments.length > 0 ? (
          <>
            <div className="grid gap-3 p-4 md:hidden">
              {cashPayments.map((payment) => (
                <article key={payment.id} className="rounded-2xl border border-blue-100 bg-white p-4 shadow-sm">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <h3 className="font-bold text-pegasus-navy">{payment.description}</h3>
                      <p className="mt-1 text-sm text-slate-500">{formatDate(payment.paidAt ?? payment.dueDate ?? payment.createdAt)}</p>
                    </div>
                    <strong className="text-right text-pegasus-navy">{formatCurrency(payment.amount)}</strong>
                  </div>
                  <div className="mt-4 flex flex-wrap gap-2">
                    <StatusBadge label={label(payment.type)} tone={badgeTone(payment.type)} />
                    <StatusBadge label={label(payment.status)} tone={badgeTone(payment.status)} />
                  </div>
                  <div className="mt-4 grid gap-2 text-sm text-slate-600">
                    <p><strong className="text-pegasus-navy">Atleta:</strong> {payment.athleteName ?? "-"}</p>
                    <p><strong className="text-pegasus-navy">Categoria:</strong> {payment.category ?? "-"}</p>
                  </div>
                  <div className="mt-4 border-t border-blue-50 pt-3">
                    <ActionButtons
                      canDelete={canDelete}
                      canEdit={canUpdate}
                      onDelete={() => setDeleteTarget({ kind: "payment", id: payment.id, description: payment.description })}
                      onEdit={() => openPaymentEdit(payment)}
                    />
                  </div>
                </article>
              ))}
            </div>
            <div className="hidden md:block">
              <Table
                headers={["Data", "Descrição", "Atleta", "Tipo", "Categoria", "Valor", "Status", "Ações"]}
                minWidth="1040px"
              >
                {cashPayments.map((payment) => (
                  <tr key={payment.id} className="bg-white">
                    <td className="px-6 py-4 text-slate-600">{formatDate(payment.paidAt ?? payment.dueDate ?? payment.createdAt)}</td>
                    <td className="px-6 py-4 font-bold text-pegasus-navy">{payment.description}</td>
                    <td className="px-6 py-4 text-slate-600">{payment.athleteName ?? "-"}</td>
                    <td className="px-6 py-4">
                      <StatusBadge label={label(payment.type)} tone={badgeTone(payment.type)} />
                    </td>
                    <td className="px-6 py-4 text-slate-600">{payment.category ?? "-"}</td>
                    <td className="px-6 py-4 font-bold text-pegasus-navy">{formatCurrency(payment.amount)}</td>
                    <td className="px-6 py-4">
                      <StatusBadge label={label(payment.status)} tone={badgeTone(payment.status)} />
                    </td>
                    <td className="px-6 py-4">
                      <ActionButtons
                        canDelete={canDelete}
                        canEdit={canUpdate}
                        onDelete={() => setDeleteTarget({ kind: "payment", id: payment.id, description: payment.description })}
                        onEdit={() => openPaymentEdit(payment)}
                      />
                    </td>
                  </tr>
                ))}
              </Table>
            </div>
          </>
        ) : (
          <div className="p-6">
            <EmptyState
              icon={FileText}
              title="Nenhum lançamento encontrado"
              description="Ajuste os filtros ou crie uma receita ou despesa."
            />
          </div>
        )}
      </section>
      ) : null}

      {activeTab === "caixa" ? (
      <section className="panel overflow-hidden">
        <div className="flex flex-col gap-4 border-b border-blue-100 p-6 md:flex-row md:items-center md:justify-between">
          <div className="flex items-center gap-3">
            <WalletCards className="text-pegasus-primary" size={22} />
            <div>
              <h2 className="text-xl font-bold text-pegasus-navy">Movimentações de caixa</h2>
              <p className="text-sm text-slate-500">{movements.length} movimentação(ões) registrada(s).</p>
            </div>
          </div>
          <div className="flex w-full flex-col gap-3 sm:w-auto sm:flex-row sm:flex-wrap">
            <Button
              onClick={() =>
                exportToCSV(
                  "movimentacoes-caixa",
                  ["Descrição", "Valor", "Tipo", "Categoria", "Data", "Responsável"],
                  movements.map((m) => [
                    m.description,
                    m.amount,
                    m.type,
                    m.category ?? "-",
                    m.date ? m.date.slice(0, 10) : "-",
                    m.responsible ?? "-",
                  ]),
                )
              }
              variant="secondary"
            >
              <FileDown size={17} />
              Exportar CSV
            </Button>
            {canCreate ? (
              <>
                <Button onClick={() => openMovementCreate("entrada")} variant="secondary">
                  <Plus size={17} />
                  Entrada
                </Button>
                <Button onClick={() => openMovementCreate("saida")} variant="secondary">
                  <Plus size={17} />
                  Saída
                </Button>
              </>
            ) : null}
          </div>
        </div>
        {movements.length > 0 ? (
          <>
            <div className="grid gap-3 p-4 md:hidden">
              {movements.map((movement) => (
                <article key={movement.id} className="rounded-2xl border border-blue-100 bg-white p-4 shadow-sm">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <h3 className="font-bold text-pegasus-navy">{movement.description}</h3>
                      <p className="mt-1 text-sm text-slate-500">{formatDate(movement.date)}</p>
                    </div>
                    <strong className="text-right text-pegasus-navy">{formatCurrency(movement.amount)}</strong>
                  </div>
                  <div className="mt-4 flex flex-wrap gap-2">
                    <StatusBadge label={label(movement.type)} tone={badgeTone(movement.type)} />
                    {movement.category ? <span className="rounded-full bg-pegasus-surface px-3 py-1 text-xs font-bold text-slate-600">{movement.category}</span> : null}
                  </div>
                  <p className="mt-4 text-sm text-slate-600"><strong className="text-pegasus-navy">Responsável:</strong> {movement.responsible ?? "-"}</p>
                  <div className="mt-4 border-t border-blue-50 pt-3">
                    <ActionButtons
                      canDelete={canDelete}
                      canEdit={canUpdate}
                      onDelete={() => setDeleteTarget({ kind: "movement", id: movement.id, description: movement.description })}
                      onEdit={() => openMovementEdit(movement)}
                    />
                  </div>
                </article>
              ))}
            </div>
            <div className="hidden md:block">
              <Table headers={["Data", "Descrição", "Tipo", "Categoria", "Responsável", "Valor", "Ações"]} minWidth="940px">
                {movements.map((movement) => (
                  <tr key={movement.id} className="bg-white">
                    <td className="px-6 py-4 text-slate-600">{formatDate(movement.date)}</td>
                    <td className="px-6 py-4 font-bold text-pegasus-navy">{movement.description}</td>
                    <td className="px-6 py-4">
                      <StatusBadge label={label(movement.type)} tone={badgeTone(movement.type)} />
                    </td>
                    <td className="px-6 py-4 text-slate-600">{movement.category ?? "-"}</td>
                    <td className="px-6 py-4 text-slate-600">{movement.responsible ?? "-"}</td>
                    <td className="px-6 py-4 font-bold text-pegasus-navy">{formatCurrency(movement.amount)}</td>
                    <td className="px-6 py-4">
                      <ActionButtons
                        canDelete={canDelete}
                        canEdit={canUpdate}
                        onDelete={() => setDeleteTarget({ kind: "movement", id: movement.id, description: movement.description })}
                        onEdit={() => openMovementEdit(movement)}
                      />
                    </td>
                  </tr>
                ))}
              </Table>
            </div>
          </>
        ) : (
          <div className="p-6">
          <EmptyState icon={WalletCards} title="Nenhuma movimentação de caixa" description="Registre entradas ou saídas avulsas para compor o caixa." />
        </div>
      )}
    </section>
      ) : null}

      {activeTab === "graficos" ? (
        <section className="space-y-6">
          {isLoadingChart ? (
            <div className="panel flex items-center gap-3 p-6 text-sm font-bold text-pegasus-primary">
              <Loader2 className="animate-spin" size={18} />
              Carregando gráficos
            </div>
          ) : chartData.length === 0 ? (
            <EmptyState icon={BarChart2} title="Sem dados" description="Não há dados financeiros para exibir nos gráficos." />
          ) : (
            <>
              <article className="panel p-6">
                <h3 className="mb-4 text-lg font-black text-pegasus-navy">Receita: Esperado vs Pago</h3>
                <ResponsiveContainer height={280} width="100%">
                  <BarChart data={chartData}>
                    <CartesianGrid stroke="#e2e8f0" strokeDasharray="3 3" />
                    <XAxis dataKey="month" tick={{ fontSize: 12 }} tickFormatter={formatChartMonth} />
                    <YAxis tick={{ fontSize: 12 }} tickFormatter={formatChartCurrency} />
                    <Tooltip formatter={(value: number) => formatCurrency(value)} labelFormatter={formatChartMonth} />
                    <Legend />
                    <Bar dataKey="expected" fill="#94a3b8" name="Esperado" radius={[4, 4, 0, 0]} />
                    <Bar dataKey="paid" fill="#1e3a5f" name="Pago" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </article>

              <article className="panel p-6">
                <h3 className="mb-4 text-lg font-black text-pegasus-navy">Inadimplência por mês (qtd)</h3>
                <ResponsiveContainer height={240} width="100%">
                  <LineChart data={chartData}>
                    <CartesianGrid stroke="#e2e8f0" strokeDasharray="3 3" />
                    <XAxis dataKey="month" tick={{ fontSize: 12 }} tickFormatter={formatChartMonth} />
                    <YAxis allowDecimals={false} tick={{ fontSize: 12 }} />
                    <Tooltip labelFormatter={formatChartMonth} />
                    <Line dataKey="overdueCount" dot={{ r: 4 }} name="Em atraso" stroke="#ef4444" strokeWidth={2} />
                  </LineChart>
                </ResponsiveContainer>
              </article>

              <article className="panel p-6">
                <h3 className="mb-4 text-lg font-black text-pegasus-navy">Evolução de mensalidades</h3>
                <ResponsiveContainer height={280} width="100%">
                  <BarChart data={chartData}>
                    <CartesianGrid stroke="#e2e8f0" strokeDasharray="3 3" />
                    <XAxis dataKey="month" tick={{ fontSize: 12 }} tickFormatter={formatChartMonth} />
                    <YAxis tick={{ fontSize: 12 }} tickFormatter={formatChartCurrency} />
                    <Tooltip formatter={(value: number) => formatCurrency(value)} labelFormatter={formatChartMonth} />
                    <Legend />
                    <Bar dataKey="paid" fill="#22c55e" name="Pago" stackId="a" />
                    <Bar dataKey="pending" fill="#f59e0b" name="Pendente" stackId="a" />
                    <Bar dataKey="overdue" fill="#ef4444" name="Atrasado" radius={[4, 4, 0, 0]} stackId="a" />
                  </BarChart>
                </ResponsiveContainer>
              </article>
            </>
          )}
        </section>
      ) : null}

      <Modal
        isOpen={paymentModal}
        onClose={() => setPaymentModal(false)}
        title={editingPayment ? "Editar lançamento" : "Novo lançamento"}
      >
        <form className="grid gap-4" onSubmit={handlePaymentSubmit}>
          <div className="grid gap-4 md:grid-cols-2">
            <Select
              disabled={isSaving}
              label="Tipo"
              onChange={(event) => setPaymentForm({ ...paymentForm, type: event.target.value as PaymentType })}
              options={paymentTypeOptions.filter((option) => option.value !== "todos")}
              value={paymentForm.type}
            />
            <Input disabled={isSaving} label="Descrição" onChange={(event) => setPaymentForm({ ...paymentForm, description: event.target.value })} required value={paymentForm.description} />
            <Input disabled={isSaving} label="Valor" min="0" onChange={(event) => setPaymentForm({ ...paymentForm, amount: Number(event.target.value) })} required step="0.01" type="number" value={paymentForm.amount} />
            <Input disabled={isSaving} label="Categoria" onChange={(event) => setPaymentForm({ ...paymentForm, category: event.target.value })} value={paymentForm.category} />
            <Select
              disabled={isSaving}
              label="Status"
              onChange={(event) => setPaymentForm({ ...paymentForm, status: event.target.value as FinanceStatus })}
              options={statusOptions.filter((option) => option.value !== "todos")}
              value={paymentForm.status}
            />
            <Select
              disabled={isSaving}
              label="Atleta"
              onChange={(event) => setPaymentForm({ ...paymentForm, athleteId: event.target.value })}
              options={[
                { label: "Sem atleta vinculado", value: "" },
                ...payableAthletes.map((athlete) => ({ label: athlete.name, value: athlete.id })),
              ]}
              value={paymentForm.athleteId}
            />
            <Input disabled={isSaving} label="Vencimento" onChange={(event) => setPaymentForm({ ...paymentForm, dueDate: event.target.value })} type="date" value={paymentForm.dueDate} />
            <Input disabled={isSaving} label="Pagamento" onChange={(event) => setPaymentForm({ ...paymentForm, paidAt: event.target.value })} type="date" value={paymentForm.paidAt} />
          </div>
          <div className="flex flex-col gap-3 sm:flex-row">
            <Button disabled={isSaving} type="submit">
              {isSaving ? <Loader2 className="animate-spin" size={17} /> : null}
              {editingPayment ? "Salvar alterações" : "Salvar lançamento"}
            </Button>
            <Button disabled={isSaving} onClick={() => setPaymentModal(false)} variant="secondary">
              Cancelar
            </Button>
          </div>
        </form>
      </Modal>

      <Modal
        isOpen={movementModal}
        onClose={() => setMovementModal(false)}
        title={editingMovement ? "Editar movimentação" : "Nova movimentação de caixa"}
      >
        <form className="grid gap-4" onSubmit={handleMovementSubmit}>
          <div className="grid gap-4 md:grid-cols-2">
            <Select
              disabled={isSaving}
              label="Tipo"
              onChange={(event) => setMovementForm({ ...movementForm, type: event.target.value as MovementType })}
              options={movementTypeOptions}
              value={movementForm.type}
            />
            <Input disabled={isSaving} label="Descrição" onChange={(event) => setMovementForm({ ...movementForm, description: event.target.value })} required value={movementForm.description} />
            <Input disabled={isSaving} label="Valor" min="0" onChange={(event) => setMovementForm({ ...movementForm, amount: Number(event.target.value) })} required step="0.01" type="number" value={movementForm.amount} />
            <Input disabled={isSaving} label="Data" onChange={(event) => setMovementForm({ ...movementForm, date: event.target.value })} required type="date" value={movementForm.date} />
            <Input disabled={isSaving} label="Categoria" onChange={(event) => setMovementForm({ ...movementForm, category: event.target.value })} value={movementForm.category} />
            <Input disabled={isSaving} label="Responsável" onChange={(event) => setMovementForm({ ...movementForm, responsible: event.target.value })} value={movementForm.responsible} />
          </div>
          <Textarea disabled={isSaving} label="Observações" onChange={(event) => setMovementForm({ ...movementForm, notes: event.target.value })} value={movementForm.notes} />
          <div className="flex flex-col gap-3 sm:flex-row">
            <Button disabled={isSaving} type="submit">
              {isSaving ? <Loader2 className="animate-spin" size={17} /> : null}
              {editingMovement ? "Salvar alterações" : "Salvar movimentação"}
            </Button>
            <Button disabled={isSaving} onClick={() => setMovementModal(false)} variant="secondary">
              Cancelar
            </Button>
          </div>
        </form>
      </Modal>

      <ConfirmDialog
        confirmLabel={isSaving ? "Excluindo..." : "Excluir registro"}
        description={`Deseja excluir "${deleteTarget?.description ?? "este registro"}"?`}
        isOpen={Boolean(deleteTarget)}
        onClose={() => setDeleteTarget(null)}
        onConfirm={confirmDelete}
        title="Confirmar exclusão"
      />

    </div>
  );
}

