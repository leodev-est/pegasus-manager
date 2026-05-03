import { Banknote, Clipboard, FileText, Loader2, Plus, WalletCards } from "lucide-react";
import { FormEvent, useCallback, useEffect, useMemo, useState } from "react";
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
import { athleteService, type Athlete } from "../../services/athleteService";
import {
  financeService,
  type CashMovement,
  type FinanceStatus,
  type FinanceSummary,
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
type FinanceTab = "resumo" | "mensalidades" | "caixa" | "relatorios";

const financeTabs: Array<{ label: string; value: FinanceTab }> = [
  { label: "Resumo", value: "resumo" },
  { label: "Mensalidades", value: "mensalidades" },
  { label: "Caixa", value: "caixa" },
  { label: "Relatórios", value: "relatorios" },
];

const emptyPayment: PaymentForm = {
  athleteId: "",
  description: "",
  amount: 0,
  type: "receita",
  category: "",
  status: "pago",
  dueDate: new Date().toISOString().slice(0, 10),
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
  });
  const [payments, setPayments] = useState<Payment[]>([]);
  const [movements, setMovements] = useState<CashMovement[]>([]);
  const [athletes, setAthletes] = useState<Athlete[]>([]);
  const [type, setType] = useState("todos");
  const [status, setStatus] = useState("todos");
  const [month, setMonth] = useState(currentMonth);
  const [activeTab, setActiveTab] = useState<FinanceTab>("resumo");
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [paymentModal, setPaymentModal] = useState(false);
  const [movementModal, setMovementModal] = useState(false);
  const [editingPayment, setEditingPayment] = useState<Payment | null>(null);
  const [editingMovement, setEditingMovement] = useState<CashMovement | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<DeleteTarget | null>(null);
  const [paymentForm, setPaymentForm] = useState<PaymentForm>(emptyPayment);
  const [movementForm, setMovementForm] = useState<MovementForm>(emptyMovement);

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
        "Gastos:",
        ...(monthExpenses.length > 0
          ? monthExpenses.map((expense) => `- ${expense.description}: ${formatCurrency(expense.amount)}`)
          : ["- Nenhum gasto registrado"]),
      ].join("\n"),
    [month, monthExpenses, summary],
  );

  const monthlyPayments = useMemo(() => payments.filter(isMonthlyPayment), [payments]);
  const cashPayments = useMemo(() => payments.filter((payment) => !isMonthlyPayment(payment)), [payments]);
  const visiblePayments = activeTab === "mensalidades" ? monthlyPayments : cashPayments;
  const visiblePaymentTitle = activeTab === "mensalidades" ? "Mensalidades" : "Lançamentos financeiros";
  const visiblePaymentDescription =
    activeTab === "mensalidades"
      ? `${monthlyPayments.length} mensalidade(s) encontrada(s).`
      : `${cashPayments.length} lançamento(s) encontrado(s).`;

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
          canCreate && activeTab === "mensalidades" ? (
            <Button onClick={() => openPaymentModal("receita", true)}>
              <Plus size={17} />
              Registrar mensalidade
            </Button>
          ) : canCreate && activeTab === "caixa" ? (
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

      <div className="flex flex-wrap gap-2 rounded-2xl border border-blue-100 bg-white p-2 shadow-sm">
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
      <section className="grid gap-5 md:grid-cols-2 xl:grid-cols-5">
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

      {activeTab === "mensalidades" || activeTab === "caixa" ? (
      <FilterBar>
        {activeTab === "caixa" ? (
          <Select label="Tipo" onChange={(event) => setType(event.target.value)} options={paymentTypeOptions} value={type} />
        ) : null}
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
        {activeTab === "relatorios" ? (
          <p className="mt-6 rounded-2xl border border-blue-100 bg-pegasus-ice p-4 text-sm font-semibold text-pegasus-primary">
            Exportação em PDF/Excel preparada para uma próxima etapa.
          </p>
        ) : null}
      </section>
      ) : null}

      {activeTab === "mensalidades" || activeTab === "caixa" ? (
      <section className="panel overflow-hidden">
        <div className="flex items-center gap-3 border-b border-blue-100 p-6">
          <FileText className="text-pegasus-primary" size={22} />
          <div>
            <h2 className="text-xl font-bold text-pegasus-navy">{visiblePaymentTitle}</h2>
            <p className="text-sm text-slate-500">{visiblePaymentDescription}</p>
          </div>
        </div>
        {isLoading ? (
          <div className="flex items-center gap-3 p-6 text-sm font-bold text-pegasus-primary">
            <Loader2 className="animate-spin" size={18} />
            Carregando financeiro
          </div>
        ) : visiblePayments.length > 0 ? (
          <>
            <div className="grid gap-3 p-4 md:hidden">
              {visiblePayments.map((payment) => (
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
                {visiblePayments.map((payment) => (
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
              title={activeTab === "mensalidades" ? "Nenhuma mensalidade encontrada" : "Nenhum lançamento encontrado"}
              description={
                activeTab === "mensalidades"
                  ? "Ajuste os filtros ou registre uma mensalidade."
                  : "Ajuste os filtros ou crie uma receita ou despesa."
              }
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
          {canCreate ? (
            <div className="flex w-full flex-col gap-3 sm:w-auto sm:flex-row sm:flex-wrap">
              <Button onClick={() => openMovementCreate("entrada")} variant="secondary">
                <Plus size={17} />
                Entrada
              </Button>
              <Button onClick={() => openMovementCreate("saida")} variant="secondary">
                <Plus size={17} />
                Saída
              </Button>
            </div>
          ) : null}
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
                ...athletes.map((athlete) => ({ label: athlete.name, value: athlete.id })),
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

