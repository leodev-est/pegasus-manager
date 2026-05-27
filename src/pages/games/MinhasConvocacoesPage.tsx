import { Calendar, MapPin, Trophy } from "lucide-react";
import { useEffect, useState } from "react";
import { useTour } from "../../tours/useTour";

const TOUR_STEPS = [
  {
    popover: {
      title: "🏆 Minhas Convocações",
      description: "Veja os jogos para os quais você foi convocado(a). Aqui você acompanha datas, locais e a contagem regressiva para cada jogo.",
    },
  },
  {
    element: "[data-tour='convocacoes-lista']",
    popover: {
      title: "Jogos convocados",
      description: "Cada card mostra o adversário, data, local e quanto tempo falta para o jogo. Fique de olho nos que estão mais próximos!",
      side: "bottom" as const,
    },
  },
];
import { PageHeader } from "../../components/ui/PageHeader";
import { useToast } from "../../components/ui/Toast";
import { gameConvocationService, type MyConvocation } from "../../services/gameConvocationService";

function formatDate(dateStr: string) {
  return new Date(dateStr).toLocaleDateString("pt-BR", {
    weekday: "long",
    day: "2-digit",
    month: "long",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    timeZone: "UTC",
  });
}

function daysUntil(dateStr: string) {
  const diff = new Date(dateStr).getTime() - Date.now();
  return Math.ceil(diff / (1000 * 60 * 60 * 24));
}

function CountdownBadge({ dateStr }: { dateStr: string }) {
  const days = daysUntil(dateStr);
  if (days <= 0) return null;
  if (days === 1)
    return (
      <span className="rounded-full bg-rose-100 px-2.5 py-0.5 text-xs font-bold text-rose-600 dark:bg-rose-900/30 dark:text-rose-400">
        Amanhã!
      </span>
    );
  if (days <= 7)
    return (
      <span className="rounded-full bg-amber-100 px-2.5 py-0.5 text-xs font-bold text-amber-700 dark:bg-amber-900/30 dark:text-amber-400">
        Em {days} dias
      </span>
    );
  return (
    <span className="rounded-full bg-blue-100 px-2.5 py-0.5 text-xs font-bold text-blue-600 dark:bg-blue-900/30 dark:text-blue-400">
      Em {days} dias
    </span>
  );
}

export function MinhasConvocacoesPage() {
  const { showToast } = useToast();
  const [convocacoes, setConvocacoes] = useState<MyConvocation[]>([]);
  const [loading, setLoading] = useState(true);

  useTour("minhas-convocacoes:v1", loading ? [] : TOUR_STEPS);

  useEffect(() => {
    gameConvocationService
      .getMyConvocations()
      .then(setConvocacoes)
      .catch(() => showToast("Erro ao carregar convocações", "error"))
      .finally(() => setLoading(false));
  }, [showToast]);

  return (
    <div className="space-y-6">
      <PageHeader
        title="Minhas Convocações"
        description="Jogos em que você foi convocado."
      />

      {loading ? (
        <div className="panel p-12 text-center text-sm text-slate-500">Carregando...</div>
      ) : convocacoes.length === 0 ? (
        <div className="panel flex flex-col items-center gap-3 p-14 text-center">
          <Trophy className="text-slate-200" size={40} />
          <p className="font-semibold text-slate-500">Você não tem convocações futuras.</p>
          <p className="text-sm text-slate-400">
            Quando o treinador te convocar para um jogo, ele aparecerá aqui.
          </p>
        </div>
      ) : (
        <div data-tour="convocacoes-lista" className="space-y-3">
          {convocacoes.map((conv) => (
            <div key={conv.id} className="panel p-4">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div className="flex items-center gap-3">
                  <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-pegasus-primary/10">
                    <Trophy className="text-pegasus-primary" size={20} />
                  </div>
                  <div>
                    <p className="font-black text-pegasus-navy">vs {conv.game.opponent}</p>
                    <div className="mt-0.5 flex flex-wrap items-center gap-2">
                      <span className="flex items-center gap-1 text-xs text-slate-500">
                        <Calendar size={11} />
                        {formatDate(conv.game.date)}
                      </span>
                      <span className="flex items-center gap-1 text-xs text-slate-500">
                        <MapPin size={11} />
                        {conv.game.location === "casa" ? "Em casa" : "Fora"}
                      </span>
                    </div>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <CountdownBadge dateStr={conv.game.date} />
                  <span className="rounded-full bg-emerald-100 px-2.5 py-0.5 text-xs font-bold text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400">
                    Convocado ✓
                  </span>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
