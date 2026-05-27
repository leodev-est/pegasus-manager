import { Medal, TrendingUp } from "lucide-react";
import { useEffect, useState } from "react";
import { useTour } from "../../tours/useTour";
import { PageHeader } from "../../components/ui/PageHeader";
import { useToast } from "../../components/ui/Toast";
import { getApiErrorMessage, api } from "../../services/api";

const TOUR_STEPS = [
  {
    popover: {
      title: "🏆 Ranking de Frequência",
      description: "Atletas ativos ordenados por percentual de presença nos treinos. Um incentivo para manter a assiduidade alta.",
    },
  },
  {
    element: "[data-tour='ranking-podio']",
    popover: {
      title: "Pódio",
      description: "Os três atletas com maior frequência ganham destaque no pódio. O primeiro lugar tem anel dourado.",
      side: "bottom" as const,
    },
  },
  {
    element: "[data-tour='ranking-lista']",
    popover: {
      title: "Tabela completa",
      description: "Todos os atletas ordenados por percentual. A barra colorida indica a situação: verde (≥80%), amarelo (60-79%) e vermelho (<60%).",
      side: "top" as const,
    },
  },
];

type RankingEntry = {
  athlete: { id: string; name: string; category: string | null };
  presencas: number;
  justificadas: number;
  faltas: number;
  total: number;
  percentual: number | null;
};

function medalColor(position: number) {
  if (position === 1) return "text-amber-500";
  if (position === 2) return "text-slate-400";
  if (position === 3) return "text-amber-700";
  return "text-slate-300";
}

function percentualColor(p: number | null) {
  if (p === null) return "text-slate-400";
  if (p >= 80) return "text-emerald-600 dark:text-emerald-400";
  if (p >= 60) return "text-amber-600 dark:text-amber-400";
  return "text-rose-600 dark:text-rose-400";
}

function ProgressBar({ value }: { value: number | null }) {
  const pct = value ?? 0;
  const color =
    pct >= 80 ? "bg-emerald-500" : pct >= 60 ? "bg-amber-500" : "bg-rose-500";
  return (
    <div className="h-2 w-full overflow-hidden rounded-full bg-slate-100 dark:bg-slate-700">
      <div className={`h-full rounded-full transition-all ${color}`} style={{ width: `${pct}%` }} />
    </div>
  );
}

export function RankingFrequenciaPage() {
  const { showToast } = useToast();
  const [ranking, setRanking] = useState<RankingEntry[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useTour("ranking:v1", isLoading ? [] : TOUR_STEPS);

  useEffect(() => {
    async function load() {
      setIsLoading(true);
      try {
        const { data } = await api.get<RankingEntry[]>("/attendance/ranking");
        setRanking(data);
      } catch (error) {
        showToast(getApiErrorMessage(error), "error");
      } finally {
        setIsLoading(false);
      }
    }
    load();
  }, [showToast]);

  const withData = ranking.filter((r) => r.total > 0);
  const noData = ranking.filter((r) => r.total === 0);

  return (
    <div className="space-y-8">
      <PageHeader
        title="Ranking de Frequência"
        description="Atletas ativos ordenados por percentual de presença geral."
      />

      {isLoading ? (
        <div className="panel p-8 text-center text-sm font-semibold text-slate-500">
          Calculando ranking...
        </div>
      ) : ranking.length === 0 ? (
        <div className="panel p-8 text-center text-sm text-slate-500">
          Nenhum atleta ativo encontrado.
        </div>
      ) : (
        <>
          {/* Top 3 podium cards */}
          {withData.length >= 1 && (
            <section data-tour="ranking-podio" className="grid gap-4 sm:grid-cols-3">
              {withData.slice(0, 3).map((entry, i) => (
                <div
                  key={entry.athlete.id}
                  className={`panel p-5 text-center ${i === 0 ? "ring-2 ring-amber-400" : ""}`}
                >
                  <Medal className={`mx-auto mb-2 ${medalColor(i + 1)}`} size={28} />
                  <p className="font-bold text-pegasus-navy">{entry.athlete.name}</p>
                  <p className="text-xs text-slate-500">{entry.athlete.category ?? "—"}</p>
                  <p className={`mt-3 text-3xl font-black ${percentualColor(entry.percentual)}`}>
                    {entry.percentual ?? "—"}%
                  </p>
                  <p className="mt-1 text-xs text-slate-500">
                    {entry.presencas + entry.justificadas}/{entry.total} treinos
                  </p>
                </div>
              ))}
            </section>
          )}

          {/* Full table */}
          <div data-tour="ranking-lista" className="panel overflow-hidden">
            <div className="flex items-center gap-3 border-b border-blue-100 p-5 dark:border-slate-700">
              <TrendingUp className="text-pegasus-primary" size={20} />
              <div>
                <h2 className="font-bold text-pegasus-navy">Tabela completa</h2>
                <p className="text-sm text-slate-500">{ranking.length} atleta(s) ativo(s)</p>
              </div>
            </div>

            <div className="divide-y divide-blue-50 dark:divide-slate-700">
              {withData.map((entry, i) => (
                <div
                  key={entry.athlete.id}
                  className="grid grid-cols-[2rem_1fr_auto] items-center gap-4 px-5 py-4 sm:grid-cols-[2rem_1fr_120px_auto]"
                >
                  <span className={`text-center text-sm font-black ${medalColor(i + 1)}`}>
                    {i + 1}
                  </span>
                  <div className="min-w-0">
                    <p className="truncate font-semibold text-pegasus-navy">{entry.athlete.name}</p>
                    <p className="text-xs text-slate-500">{entry.athlete.category ?? "—"}</p>
                    <div className="mt-1.5 max-w-[200px]">
                      <ProgressBar value={entry.percentual} />
                    </div>
                  </div>
                  <div className="hidden text-xs text-slate-500 sm:block">
                    <p>{entry.presencas} pres. + {entry.justificadas} just.</p>
                    <p>{entry.faltas} falta(s) de {entry.total}</p>
                  </div>
                  <span className={`text-right text-lg font-black ${percentualColor(entry.percentual)}`}>
                    {entry.percentual ?? "—"}%
                  </span>
                </div>
              ))}

              {noData.map((entry) => (
                <div
                  key={entry.athlete.id}
                  className="grid grid-cols-[2rem_1fr_auto] items-center gap-4 px-5 py-3 opacity-50"
                >
                  <span className="text-center text-sm text-slate-300">—</span>
                  <p className="text-sm text-slate-500">{entry.athlete.name}</p>
                  <span className="text-right text-sm text-slate-400">Sem treinos</span>
                </div>
              ))}
            </div>
          </div>

          <div className="flex flex-wrap gap-4 text-xs text-slate-500">
            <span className="flex items-center gap-1.5">
              <span className="inline-block h-2 w-4 rounded-full bg-emerald-500" /> ≥ 80% — Ótimo
            </span>
            <span className="flex items-center gap-1.5">
              <span className="inline-block h-2 w-4 rounded-full bg-amber-500" /> 60–79% — Regular
            </span>
            <span className="flex items-center gap-1.5">
              <span className="inline-block h-2 w-4 rounded-full bg-rose-500" /> &lt; 60% — Atenção
            </span>
          </div>
        </>
      )}
    </div>
  );
}
