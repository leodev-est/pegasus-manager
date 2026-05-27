import { CreditCard, Loader2 } from "lucide-react";
import { useEffect, useState } from "react";
import { EmptyState } from "../../components/ui/EmptyState";
import { PageHeader } from "../../components/ui/PageHeader";
import { profileService } from "../../services/profileService";

type MyPayment = {
  id: string;
  description: string;
  amount: number;
  status: string;
  dueDate: string | null;
  paidAt: string | null;
  referenceMonth: string | null;
};

type StatusTone = "success" | "danger" | "warning" | "neutral";

const STATUS_MAP: Record<string, { label: string; tone: StatusTone }> = {
  pago: { label: "Pago", tone: "success" },
  pendente: { label: "Pendente", tone: "neutral" },
  atrasado: { label: "Atrasado", tone: "danger" },
  isento: { label: "Isento", tone: "warning" },
};

const STATUS_COLORS: Record<StatusTone, string> = {
  success: "bg-emerald-100 text-emerald-700",
  danger: "bg-rose-100 text-rose-700",
  warning: "bg-amber-100 text-amber-700",
  neutral: "bg-slate-100 text-slate-600",
};

function formatCurrency(value: number) {
  return new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(value);
}

function formatDate(value: string | null) {
  if (!value) return "-";
  return new Intl.DateTimeFormat("pt-BR").format(new Date(value));
}

function formatMonth(value: string | null) {
  if (!value) return "-";
  const [year, month] = value.split("-").map(Number);
  return new Date(year, month - 1).toLocaleDateString("pt-BR", { month: "long", year: "numeric" });
}

export function MinhasMensalidadesPage() {
  const [payments, setPayments] = useState<MyPayment[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    profileService.getMyPayments()
      .then(setPayments)
      .catch(() => {})
      .finally(() => setIsLoading(false));
  }, []);

  const paid = payments.filter((p) => p.status === "pago");
  const totalPaidYear = paid
    .filter((p) => p.paidAt && new Date(p.paidAt).getFullYear() === new Date().getFullYear())
    .reduce((acc, p) => acc + Number(p.amount), 0);
  const next = payments.find((p) => p.status === "pendente" || p.status === "atrasado");

  return (
    <div className="space-y-8">
      <PageHeader
        title="Minhas Mensalidades"
        description="Histórico de pagamentos das suas mensalidades."
      />

      {isLoading ? (
        <div className="flex items-center justify-center py-16">
          <Loader2 className="animate-spin text-pegasus-primary" size={28} />
        </div>
      ) : (
        <>
          {/* Summary cards */}
          <div className="grid gap-4 sm:grid-cols-3">
            <div className="panel p-5 text-center">
              <p className="text-sm font-semibold text-slate-500">Total pago no ano</p>
              <p className="mt-2 text-3xl font-black text-emerald-600">{formatCurrency(totalPaidYear)}</p>
            </div>
            <div className="panel p-5 text-center">
              <p className="text-sm font-semibold text-slate-500">Mensalidades pagas</p>
              <p className="mt-2 text-3xl font-black text-pegasus-navy">{paid.length}</p>
            </div>
            <div className="panel p-5 text-center">
              <p className="text-sm font-semibold text-slate-500">Próximo vencimento</p>
              <p className="mt-2 text-lg font-black text-pegasus-navy">
                {next?.dueDate ? formatDate(next.dueDate as unknown as string) : "—"}
              </p>
              {next && (
                <span className={`mt-1 inline-block rounded-full px-2.5 py-0.5 text-xs font-bold ${
                  STATUS_COLORS[STATUS_MAP[next.status]?.tone ?? "neutral"]
                }`}>
                  {STATUS_MAP[next.status]?.label ?? next.status}
                </span>
              )}
            </div>
          </div>

          {/* History table */}
          {payments.length === 0 ? (
            <EmptyState icon={CreditCard} title="Nenhuma mensalidade" description="Sem registros de mensalidade ainda." />
          ) : (
            <section className="panel overflow-hidden">
              <div className="border-b border-blue-100 p-5">
                <h2 className="font-black text-pegasus-navy">Histórico</h2>
              </div>
              <div className="divide-y divide-blue-50">
                {payments.map((payment) => (
                  <div key={payment.id} className="flex flex-col gap-2 px-5 py-4 sm:flex-row sm:items-center sm:justify-between">
                    <div className="min-w-0">
                      <p className="font-semibold text-pegasus-navy">
                        {payment.referenceMonth ? formatMonth(payment.referenceMonth) : payment.description}
                      </p>
                      <p className="text-xs text-slate-400">
                        Venc.: {formatDate(payment.dueDate as unknown as string)}
                        {payment.paidAt ? ` · Pago em: ${formatDate(payment.paidAt as unknown as string)}` : ""}
                      </p>
                    </div>
                    <div className="flex shrink-0 items-center gap-3">
                      <span className="font-bold text-pegasus-navy">{formatCurrency(Number(payment.amount))}</span>
                      <span className={`rounded-full px-2.5 py-0.5 text-xs font-bold ${
                        STATUS_COLORS[STATUS_MAP[payment.status]?.tone ?? "neutral"]
                      }`}>
                        {STATUS_MAP[payment.status]?.label ?? payment.status}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </section>
          )}
        </>
      )}
    </div>
  );
}
