import { Loader2, Star } from "lucide-react";
import { useEffect, useState } from "react";
import {
  CartesianGrid,
  Legend,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { EmptyState } from "../../components/ui/EmptyState";
import { PageHeader } from "../../components/ui/PageHeader";
import { profileService } from "../../services/profileService";
import type { AthleteEvaluation } from "../../services/evaluationService";
import { useTour } from "../../tours/useTour";

type EvalWithDate = AthleteEvaluation & { createdAt: string };

function formatDate(value: string) {
  return new Intl.DateTimeFormat("pt-BR", { day: "2-digit", month: "short", year: "2-digit" }).format(new Date(value));
}

const TOUR_STEPS = [
  {
    popover: {
      title: "⭐ Suas Avaliações",
      description: "O treinador avalia você periodicamente em quatro dimensões. Aqui você acompanha suas notas e como elas evoluem ao longo do tempo.",
    },
  },
  {
    element: "[data-tour='avaliacoes-notas']",
    popover: {
      title: "Notas atuais",
      description: "Estas são suas notas da última avaliação: Técnico (habilidades técnicas), Físico (condicionamento), Tático (leitura de jogo) e Mental (foco e consistência). Escala de 0 a 10.",
      side: "bottom" as const,
    },
  },
  {
    element: "[data-tour='avaliacoes-grafico']",
    popover: {
      title: "Gráfico de evolução",
      description: "O gráfico mostra como suas notas mudaram entre as avaliações. Cada linha colorida representa uma dimensão. Quanto mais avaliações, mais rico o histórico.",
      side: "top" as const,
    },
  },
  {
    element: "[data-tour='avaliacoes-historico']",
    popover: {
      title: "Histórico completo",
      description: "Aqui ficam todas as avaliações em ordem cronológica, com as notas individuais e os comentários do treinador sobre cada uma.",
      side: "top" as const,
    },
  },
];

export function MinhasAvaliacoesPage() {
  const [history, setHistory] = useState<EvalWithDate[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    profileService.getMyEvaluationHistory()
      .then((data) => setHistory(data as EvalWithDate[]))
      .catch(() => {})
      .finally(() => setIsLoading(false));
  }, []);

  useTour("avaliacoes:v1", isLoading ? [] : TOUR_STEPS);

  const latest = history[history.length - 1] ?? null;

  const chartData = history.map((e) => ({
    date: formatDate(e.createdAt),
    Técnico: e.technical,
    Físico: e.physical,
    Tático: e.tactical,
    Mental: e.mental,
  }));

  return (
    <div className="space-y-8">
      <PageHeader
        title="Minhas Avaliações"
        description="Evolução das suas notas ao longo do tempo."
      />

      {isLoading ? (
        <div className="flex items-center justify-center py-16">
          <Loader2 className="animate-spin text-pegasus-primary" size={28} />
        </div>
      ) : history.length === 0 ? (
        <EmptyState icon={Star} title="Sem avaliações" description="O treinador ainda não registrou avaliações para você." />
      ) : (
        <>
          <div data-tour="avaliacoes-notas" className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {(
              [
                { label: "Técnico", value: latest?.technical, color: "text-blue-600", bg: "bg-blue-50" },
                { label: "Físico", value: latest?.physical, color: "text-emerald-600", bg: "bg-emerald-50" },
                { label: "Tático", value: latest?.tactical, color: "text-orange-600", bg: "bg-orange-50" },
                { label: "Mental", value: latest?.mental, color: "text-violet-600", bg: "bg-violet-50" },
              ] as { label: string; value: number | null; color: string; bg: string }[]
            ).map((item) => (
              <div key={item.label} className={`panel p-5 text-center ${item.bg}`}>
                <p className="text-sm font-semibold text-slate-500">{item.label}</p>
                <p className={`mt-2 text-4xl font-black ${item.color}`}>
                  {item.value !== null && item.value !== undefined ? item.value : "—"}
                </p>
                <p className="mt-1 text-xs text-slate-400">/ 10</p>
              </div>
            ))}
          </div>

          {latest?.overall !== null && latest?.overall !== undefined && (
            <div className="panel p-6 text-center">
              <p className="text-sm font-semibold text-slate-500">Nota geral (última avaliação)</p>
              <p className="mt-2 text-5xl font-black text-pegasus-primary">{latest.overall}</p>
              {latest.coachNotes && (
                <p className="mt-3 text-sm text-slate-500 italic">"{latest.coachNotes}"</p>
              )}
            </div>
          )}

          {history.length > 1 && (
            <section data-tour="avaliacoes-grafico" className="panel p-6">
              <div className="mb-6 flex items-center gap-3">
                <Star className="text-pegasus-primary" size={20} />
                <div>
                  <h2 className="font-black text-pegasus-navy">Evolução</h2>
                  <p className="text-sm text-slate-500">Suas notas ao longo das avaliações</p>
                </div>
              </div>
              <ResponsiveContainer width="100%" height={260}>
                <LineChart data={chartData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                  <XAxis dataKey="date" tick={{ fontSize: 11 }} />
                  <YAxis domain={[0, 10]} tick={{ fontSize: 11 }} />
                  <Tooltip />
                  <Legend />
                  <Line type="monotone" dataKey="Técnico" stroke="#2563eb" strokeWidth={2} dot={{ r: 4 }} />
                  <Line type="monotone" dataKey="Físico" stroke="#16a34a" strokeWidth={2} dot={{ r: 4 }} />
                  <Line type="monotone" dataKey="Tático" stroke="#ea580c" strokeWidth={2} dot={{ r: 4 }} />
                  <Line type="monotone" dataKey="Mental" stroke="#7c3aed" strokeWidth={2} dot={{ r: 4 }} />
                </LineChart>
              </ResponsiveContainer>
            </section>
          )}

          <section data-tour="avaliacoes-historico" className="panel overflow-hidden">
            <div className="border-b border-blue-100 p-5">
              <h2 className="font-black text-pegasus-navy">Histórico ({history.length} avaliação{history.length !== 1 ? "ões" : ""})</h2>
            </div>
            <div className="divide-y divide-blue-50">
              {[...history].reverse().map((e) => (
                <div key={e.id} className="px-5 py-4">
                  <p className="mb-2 text-xs font-semibold text-slate-400">{formatDate(e.createdAt)}</p>
                  <div className="flex flex-wrap gap-3">
                    {(
                      [
                        { label: "Técnico", value: e.technical },
                        { label: "Físico", value: e.physical },
                        { label: "Tático", value: e.tactical },
                        { label: "Mental", value: e.mental },
                        { label: "Geral", value: e.overall },
                      ] as { label: string; value: number | null }[]
                    ).map((item) =>
                      item.value !== null && item.value !== undefined ? (
                        <span key={item.label} className="rounded-xl bg-pegasus-surface px-3 py-1.5 text-sm font-bold text-pegasus-navy">
                          {item.label}: {item.value}
                        </span>
                      ) : null
                    )}
                  </div>
                  {e.coachNotes && (
                    <p className="mt-2 text-sm text-slate-500 italic">"{e.coachNotes}"</p>
                  )}
                </div>
              ))}
            </div>
          </section>
        </>
      )}
    </div>
  );
}
