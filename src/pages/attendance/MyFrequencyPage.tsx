import { CalendarDays, CheckCircle2, Loader2, TrendingUp, XCircle } from "lucide-react";
import { useCallback, useEffect, useState } from "react";
import { EmptyState } from "../../components/ui/EmptyState";
import { Input } from "../../components/ui/Input";
import { PageHeader } from "../../components/ui/PageHeader";
import { StatusBadge } from "../../components/ui/StatusBadge";
import { useToast } from "../../components/ui/Toast";
import { getApiErrorMessage } from "../../services/api";
import { attendanceService, type MyFrequency } from "../../services/attendanceService";
import {
  formatDate,
  fromMonthInput,
  getCurrentMonthYear,
  statusLabel,
  statusTone,
  toMonthInput,
} from "./attendanceUi";

const initialMonth = getCurrentMonthYear();

export function MyFrequencyPage() {
  const { showToast } = useToast();
  const [monthValue, setMonthValue] = useState(toMonthInput(initialMonth.month, initialMonth.year));
  const [data, setData] = useState<MyFrequency | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const loadFrequency = useCallback(async () => {
    const { month, year } = fromMonthInput(monthValue);
    setIsLoading(true);

    try {
      setData(await attendanceService.getMyFrequency(month, year));
    } catch (error) {
      showToast(getApiErrorMessage(error), "error");
    } finally {
      setIsLoading(false);
    }
  }, [monthValue, showToast]);

  useEffect(() => {
    loadFrequency();
  }, [loadFrequency]);

  const cards = [
    { icon: CalendarDays, label: "Treinos no mês", value: data?.totalTreinos ?? 0 },
    { icon: CheckCircle2, label: "Presenças", value: data?.presencas ?? 0 },
    { icon: XCircle, label: "Faltas", value: data?.faltas ?? 0 },
    { icon: TrendingUp, label: "Frequência", value: `${data?.percentual ?? 0}%` },
  ];

  return (
    <div className="space-y-8">
      <PageHeader title="Minha Frequência" description="Acompanhe sua presença nos treinos oficiais Pegasus." />

      <section className="rounded-2xl border border-blue-100 bg-white p-4 shadow-sm sm:rounded-3xl">
        <Input label="Mês" onChange={(event) => setMonthValue(event.target.value)} type="month" value={monthValue} />
      </section>

      <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {cards.map((card) => {
          const Icon = card.icon;
          return (
            <article className="panel p-5" key={card.label}>
              <div className="flex items-center justify-between gap-3">
                <div>
                  <p className="text-sm font-semibold text-slate-500">{card.label}</p>
                  <p className="mt-2 text-3xl font-black text-pegasus-navy">{card.value}</p>
                </div>
                <span className="grid h-12 w-12 place-items-center rounded-2xl bg-pegasus-ice text-pegasus-primary">
                  <Icon size={22} />
                </span>
              </div>
            </article>
          );
        })}
      </section>

      <section className="panel overflow-hidden">
        <div className="border-b border-blue-100 p-5">
          <h2 className="text-xl font-black text-pegasus-navy">Treinos do mês</h2>
          <p className="text-sm text-slate-500">Presenças, faltas e datas programadas.</p>
        </div>

        {isLoading ? (
          <div className="flex items-center gap-3 p-6 text-sm font-bold text-pegasus-primary">
            <Loader2 className="animate-spin" size={18} />
            Carregando frequência
          </div>
        ) : data?.details.length ? (
          <div className="divide-y divide-blue-50">
            {data.details.map((detail) => (
              <article className="flex flex-col gap-3 p-5 sm:flex-row sm:items-center sm:justify-between" key={detail.date}>
                <div>
                  <p className="font-black text-pegasus-navy">{formatDate(detail.date)}</p>
                  <p className="text-sm text-slate-500">
                    {detail.horario} · {detail.local}
                  </p>
                </div>
                <StatusBadge label={statusLabel(detail.status)} tone={statusTone(detail.status)} />
              </article>
            ))}
          </div>
        ) : (
          <div className="p-6">
            <EmptyState
              description="Não há treinos oficiais para o mês selecionado."
              icon={CalendarDays}
              title="Sem frequência no mês"
            />
          </div>
        )}
      </section>
    </div>
  );
}
