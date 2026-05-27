import { CalendarDays, CheckCircle2, Loader2, TrendingUp, XCircle } from "lucide-react";
import { useCallback, useEffect, useState } from "react";
import { useTour } from "../../tours/useTour";
import { EmptyState } from "../../components/ui/EmptyState";
import { Input } from "../../components/ui/Input";
import { PageHeader } from "../../components/ui/PageHeader";
import { StatusBadge } from "../../components/ui/StatusBadge";
import { useToast } from "../../components/ui/Toast";
import { getApiErrorMessage } from "../../services/api";
import { attendanceService, type MyFrequency, type TotalFrequency } from "../../services/attendanceService";
import {
  formatDate,
  fromMonthInput,
  getCurrentMonthYear,
  statusLabel,
  statusTone,
  toMonthInput,
} from "./attendanceUi";

const initialMonth = getCurrentMonthYear();

const TOUR_STEPS = [
  {
    popover: {
      title: "📅 Minha Frequência",
      description: "Acompanhe sua presença nos treinos do Pegasus. Veja o percentual geral e o detalhe mês a mês.",
    },
  },
  {
    element: "[data-tour='freq-geral']",
    popover: {
      title: "Frequência geral",
      description: "Percentual calculado sobre todos os treinos desde que você entrou. A meta é manter acima de 80%.",
      side: "bottom" as const,
    },
  },
  {
    element: "[data-tour='freq-mes']",
    popover: {
      title: "Detalhe por mês",
      description: "Selecione o mês para ver presenças, faltas e justificadas. A lista abaixo mostra cada treino individualmente.",
      side: "top" as const,
    },
  },
];

function PercentBar({ value }: { value: number }) {
  const color = value >= 80 ? "bg-emerald-500" : value >= 60 ? "bg-amber-500" : "bg-rose-500";
  return (
    <div className="h-2 w-full overflow-hidden rounded-full bg-slate-100 dark:bg-slate-700">
      <div className={`h-full rounded-full transition-all ${color}`} style={{ width: `${value}%` }} />
    </div>
  );
}

export function MyFrequencyPage() {
  const { showToast } = useToast();
  const [monthValue, setMonthValue] = useState(toMonthInput(initialMonth.month, initialMonth.year));
  const [data, setData] = useState<MyFrequency | null>(null);
  const [total, setTotal] = useState<TotalFrequency | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isTotalLoading, setIsTotalLoading] = useState(true);

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

  useEffect(() => {
    attendanceService.getMyTotalFrequency()
      .then(setTotal)
      .catch(() => {})
      .finally(() => setIsTotalLoading(false));
  }, []);

  useTour("minha-freq:v1", isLoading ? [] : TOUR_STEPS);

  const totalPct = total?.percentual ?? 0;
  const monthlyPct = data?.percentual ?? 0;

  return (
    <div className="space-y-8">
      <PageHeader title="Minha Frequência" description="Acompanhe sua presença nos treinos oficiais Pegasus." />

      {/* Total geral */}
      <section data-tour="freq-geral" className="panel p-6">
        <div className="mb-4 flex items-center gap-2">
          <TrendingUp className="text-pegasus-primary" size={20} />
          <h2 className="font-black text-pegasus-navy">Frequência Geral (todos os treinos)</h2>
        </div>

        {isTotalLoading ? (
          <div className="flex items-center gap-2 text-sm text-slate-500"><Loader2 className="animate-spin" size={16} /> Calculando...</div>
        ) : (
          <div className="grid gap-6 sm:grid-cols-2">
            <div>
              <div className="mb-2 flex items-end justify-between">
                <span className="text-sm font-semibold text-slate-500">Aproveitamento geral</span>
                <span className={`text-2xl font-black ${totalPct >= 80 ? "text-emerald-600" : totalPct >= 60 ? "text-amber-600" : "text-rose-600"}`}>
                  {totalPct}%
                </span>
              </div>
              <PercentBar value={totalPct} />
              <p className="mt-2 text-xs text-slate-500">
                {total?.presencas ?? 0} presenças + {total?.justificadas ?? 0} justificadas de {total?.totalTreinos ?? 0} treinos
              </p>
            </div>
            <div className="grid grid-cols-3 gap-3">
              {[
                { label: "Presenças", value: total?.presencas ?? 0, color: "text-emerald-600" },
                { label: "Justificadas", value: total?.justificadas ?? 0, color: "text-amber-600" },
                { label: "Faltas", value: total?.faltas ?? 0, color: "text-rose-600" },
              ].map((item) => (
                <div key={item.label} className="rounded-xl bg-slate-50 p-3 text-center dark:bg-slate-700/50">
                  <p className={`text-2xl font-black ${item.color}`}>{item.value}</p>
                  <p className="mt-1 text-xs text-slate-500">{item.label}</p>
                </div>
              ))}
            </div>
          </div>
        )}
      </section>

      {/* Filtro por mês */}
      <section className="rounded-2xl border border-blue-100 bg-white p-4 shadow-sm dark:border-slate-700 dark:bg-slate-800 sm:rounded-3xl">
        <Input label="Mês" onChange={(event) => setMonthValue(event.target.value)} type="month" value={monthValue} />
      </section>

      {/* Cards do mês */}
      <section data-tour="freq-mes" className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {[
          { icon: CalendarDays, label: "Treinos no mês", value: data?.totalTreinos ?? 0 },
          { icon: CheckCircle2, label: "Presenças", value: data?.presencas ?? 0 },
          { icon: XCircle, label: "Faltas", value: data?.faltas ?? 0 },
          { icon: TrendingUp, label: "Frequência", value: `${monthlyPct}%` },
        ].map((card) => {
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

      {/* Detalhe do mês */}
      <section className="panel overflow-hidden">
        <div className="border-b border-blue-100 p-5 dark:border-slate-700">
          <h2 className="text-xl font-black text-pegasus-navy">Treinos do mês</h2>
          <p className="text-sm text-slate-500">Presenças, faltas e datas programadas.</p>
        </div>

        {isLoading ? (
          <div className="flex items-center gap-3 p-6 text-sm font-bold text-pegasus-primary">
            <Loader2 className="animate-spin" size={18} />
            Carregando frequência
          </div>
        ) : data?.details.length ? (
          <div className="divide-y divide-blue-50 dark:divide-slate-700">
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
