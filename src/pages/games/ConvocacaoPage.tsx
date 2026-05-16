import { Check, ChevronRight, MapPin, Trophy, UserCheck, UserMinus, UserX, X } from "lucide-react";
import { useEffect, useState } from "react";
import { PageHeader } from "../../components/ui/PageHeader";
import { useToast } from "../../components/ui/Toast";
import { getApiErrorMessage, api } from "../../services/api";
import {
  gameConvocationService,
  type ConvocationAthlete,
  type ConvocationStatus,
  type GameConvocationData,
} from "../../services/gameConvocationService";

type Game = {
  id: string;
  date: string;
  opponent: string;
  location: string;
  result: string;
  scorePegasus: number;
  scoreOpponent: number;
};

const STATUS_CONFIG: Record<
  ConvocationStatus,
  { label: string; icon: React.ElementType; active: string; idle: string; dot: string }
> = {
  convocado: {
    label: "Convocado",
    icon: UserCheck,
    active: "bg-blue-600 text-white",
    idle: "border border-blue-300 text-blue-700 hover:bg-blue-50 dark:border-blue-700 dark:text-blue-400",
    dot: "bg-blue-500",
  },
  presente: {
    label: "Presente",
    icon: Check,
    active: "bg-emerald-600 text-white",
    idle: "border border-emerald-300 text-emerald-700 hover:bg-emerald-50 dark:border-emerald-700 dark:text-emerald-400",
    dot: "bg-emerald-500",
  },
  ausente: {
    label: "Ausente",
    icon: UserX,
    active: "bg-rose-500 text-white",
    idle: "border border-rose-300 text-rose-700 hover:bg-rose-50 dark:border-rose-700 dark:text-rose-400",
    dot: "bg-rose-500",
  },
};

function formatGameDate(value: string) {
  return new Date(value).toLocaleDateString("pt-BR", {
    weekday: "short",
    day: "2-digit",
    month: "short",
    year: "numeric",
    timeZone: "UTC",
  });
}

function ResultBadge({ result }: { result: string }) {
  const map: Record<string, { label: string; cls: string }> = {
    vitoria: { label: "Vitória", cls: "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400" },
    derrota: { label: "Derrota", cls: "bg-rose-100 text-rose-700 dark:bg-rose-900/30 dark:text-rose-400" },
    empate: { label: "Empate", cls: "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400" },
  };
  const { label, cls } = map[result] ?? { label: result, cls: "bg-slate-100 text-slate-600" };
  return <span className={`rounded-full px-2 py-0.5 text-xs font-bold ${cls}`}>{label}</span>;
}

function AthleteRow({
  athlete,
  onStatusChange,
  onRemove,
  saving,
}: {
  athlete: ConvocationAthlete;
  onStatusChange: (status: ConvocationStatus) => void;
  onRemove: () => void;
  saving: boolean;
}) {
  const convStatus = athlete.convocation?.status;

  return (
    <div className="flex flex-col gap-2 px-5 py-3.5 sm:flex-row sm:items-center sm:justify-between">
      <div className="flex min-w-0 items-center gap-3">
        <span
          className={`h-2.5 w-2.5 shrink-0 rounded-full ${
            convStatus ? STATUS_CONFIG[convStatus].dot : "bg-slate-200"
          }`}
        />
        <div className="min-w-0">
          <p className="truncate text-sm font-semibold text-pegasus-navy">{athlete.name}</p>
          <p className="text-xs text-slate-500">
            {[athlete.category, athlete.position].filter(Boolean).join(" · ") || "—"}
          </p>
        </div>
      </div>

      <div className="flex shrink-0 items-center gap-1.5">
        {(["convocado", "presente", "ausente"] as ConvocationStatus[]).map((s) => {
          const cfg = STATUS_CONFIG[s];
          const Icon = cfg.icon;
          return (
            <button
              key={s}
              type="button"
              onClick={() => onStatusChange(s)}
              disabled={saving}
              title={cfg.label}
              className={`flex items-center gap-1 rounded-xl px-2.5 py-1.5 text-xs font-bold transition disabled:opacity-50 ${
                convStatus === s ? cfg.active : cfg.idle
              }`}
            >
              <Icon size={13} />
              <span className="hidden sm:inline">{cfg.label}</span>
            </button>
          );
        })}
        {athlete.convocation && (
          <button
            type="button"
            onClick={onRemove}
            disabled={saving}
            title="Remover da convocação"
            className="ml-1 rounded-xl border border-slate-200 p-1.5 text-slate-400 transition hover:border-rose-300 hover:text-rose-500 disabled:opacity-50 dark:border-slate-700"
          >
            <X size={13} />
          </button>
        )}
      </div>
    </div>
  );
}

export function ConvocacaoPage() {
  const { showToast } = useToast();
  const [games, setGames] = useState<Game[]>([]);
  const [selectedGameId, setSelectedGameId] = useState<string | null>(null);
  const [convData, setConvData] = useState<GameConvocationData | null>(null);
  const [isLoadingGames, setIsLoadingGames] = useState(true);
  const [isLoadingConv, setIsLoadingConv] = useState(false);
  const [savingId, setSavingId] = useState<string | null>(null);

  useEffect(() => {
    api
      .get<{ games: Game[] }>("/games")
      .then(({ data }) => {
        const sorted = (data.games ?? data as unknown as Game[])
          .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
        setGames(sorted);
        if (sorted.length > 0) setSelectedGameId(sorted[0].id);
      })
      .catch(() => showToast("Erro ao carregar jogos", "error"))
      .finally(() => setIsLoadingGames(false));
  }, [showToast]);

  useEffect(() => {
    if (!selectedGameId) return;
    setIsLoadingConv(true);
    setConvData(null);
    gameConvocationService
      .getByGame(selectedGameId)
      .then(setConvData)
      .catch(() => showToast("Erro ao carregar convocação", "error"))
      .finally(() => setIsLoadingConv(false));
  }, [selectedGameId, showToast]);

  async function handleStatusChange(athlete: ConvocationAthlete, status: ConvocationStatus) {
    if (!selectedGameId || savingId === athlete.id) return;
    setSavingId(athlete.id);

    setConvData((prev) =>
      prev
        ? {
            ...prev,
            athletes: prev.athletes.map((a) =>
              a.id === athlete.id
                ? { ...a, convocation: { id: a.convocation?.id ?? "", status, notes: a.convocation?.notes ?? null } }
                : a,
            ),
          }
        : prev,
    );

    try {
      await gameConvocationService.upsert(selectedGameId, athlete.id, status);
    } catch (error) {
      showToast(getApiErrorMessage(error), "error");
      const fresh = await gameConvocationService.getByGame(selectedGameId);
      setConvData(fresh);
    } finally {
      setSavingId(null);
    }
  }

  async function handleRemove(athlete: ConvocationAthlete) {
    if (!selectedGameId || savingId === athlete.id) return;
    setSavingId(athlete.id);

    setConvData((prev) =>
      prev
        ? { ...prev, athletes: prev.athletes.map((a) => (a.id === athlete.id ? { ...a, convocation: null } : a)) }
        : prev,
    );

    try {
      await gameConvocationService.remove(selectedGameId, athlete.id);
    } catch (error) {
      showToast(getApiErrorMessage(error), "error");
      const fresh = await gameConvocationService.getByGame(selectedGameId);
      setConvData(fresh);
    } finally {
      setSavingId(null);
    }
  }

  const convocados = convData?.athletes.filter((a) => a.convocation) ?? [];
  const presentes = convocados.filter((a) => a.convocation?.status === "presente").length;
  const ausentes = convocados.filter((a) => a.convocation?.status === "ausente").length;
  const sóConvocados = convocados.filter((a) => a.convocation?.status === "convocado").length;

  return (
    <div className="space-y-6">
      <PageHeader
        title="Convocação de Jogos"
        description="Selecione os atletas convocados para cada jogo e registre presença."
      />

      <div className="grid gap-6 xl:grid-cols-[320px_1fr]">
        {/* Lista de jogos */}
        <div className="panel overflow-hidden">
          <div className="border-b border-blue-100 p-4 dark:border-slate-700">
            <div className="flex items-center gap-2">
              <Trophy className="text-pegasus-primary" size={18} />
              <h2 className="font-bold text-pegasus-navy">Jogos</h2>
            </div>
          </div>
          {isLoadingGames ? (
            <p className="p-6 text-sm text-slate-500">Carregando jogos...</p>
          ) : games.length === 0 ? (
            <p className="p-6 text-sm text-slate-500">Nenhum jogo cadastrado.</p>
          ) : (
            <div className="divide-y divide-blue-50 dark:divide-slate-700">
              {games.map((game) => (
                <button
                  key={game.id}
                  type="button"
                  onClick={() => setSelectedGameId(game.id)}
                  className={`flex w-full items-center justify-between px-4 py-3.5 text-left transition ${
                    selectedGameId === game.id
                      ? "bg-pegasus-ice dark:bg-slate-700"
                      : "hover:bg-pegasus-ice dark:hover:bg-slate-700/50"
                  }`}
                >
                  <div className="min-w-0">
                    <p className="truncate text-sm font-bold text-pegasus-navy">vs {game.opponent}</p>
                    <p className="text-xs text-slate-500">{formatGameDate(game.date)}</p>
                    <div className="mt-1 flex items-center gap-2">
                      <ResultBadge result={game.result} />
                      <span className="text-xs text-slate-500">
                        {game.scorePegasus} × {game.scoreOpponent}
                      </span>
                    </div>
                  </div>
                  <ChevronRight className="shrink-0 text-slate-400" size={16} />
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Painel de convocação */}
        <div className="space-y-4">
          {!selectedGameId ? (
            <div className="panel flex flex-col items-center gap-3 p-16 text-center">
              <Trophy className="text-slate-200" size={40} />
              <p className="text-sm text-slate-500">Selecione um jogo para gerenciar a convocação.</p>
            </div>
          ) : isLoadingConv ? (
            <div className="panel p-8 text-center text-sm text-slate-500">Carregando convocação...</div>
          ) : convData ? (
            <>
              {/* Header do jogo selecionado */}
              <div className="panel p-5">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <h2 className="text-lg font-black text-pegasus-navy">vs {convData.game.opponent}</h2>
                    <p className="text-sm text-slate-500">{formatGameDate(convData.game.date)}</p>
                    <div className="mt-1 flex items-center gap-2">
                      <MapPin size={13} className="text-slate-400" />
                      <span className="text-sm text-slate-500">{convData.game.location}</span>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="text-2xl font-black text-pegasus-navy">
                      {convData.game.scorePegasus} <span className="text-slate-400">×</span> {convData.game.scoreOpponent}
                    </p>
                    <ResultBadge result={convData.game.result} />
                  </div>
                </div>
              </div>

              {/* Resumo */}
              <div className="grid grid-cols-3 gap-3">
                <div className="panel p-4 text-center">
                  <p className="text-2xl font-black text-blue-600">{sóConvocados}</p>
                  <p className="text-xs font-semibold text-slate-500">Convocados</p>
                </div>
                <div className="panel p-4 text-center">
                  <p className="text-2xl font-black text-emerald-600">{presentes}</p>
                  <p className="text-xs font-semibold text-slate-500">Presentes</p>
                </div>
                <div className="panel p-4 text-center">
                  <p className="text-2xl font-black text-rose-500">{ausentes}</p>
                  <p className="text-xs font-semibold text-slate-500">Ausentes</p>
                </div>
              </div>

              {/* Lista de atletas */}
              <div className="panel overflow-hidden">
                <div className="flex items-center justify-between border-b border-blue-100 px-5 py-3.5 dark:border-slate-700">
                  <div className="flex items-center gap-2">
                    <UserCheck className="text-pegasus-primary" size={18} />
                    <h3 className="font-bold text-pegasus-navy">Atletas ativos</h3>
                    <span className="rounded-full bg-pegasus-ice px-2 py-0.5 text-xs font-bold text-pegasus-primary">
                      {convData.athletes.length}
                    </span>
                  </div>
                  <div className="flex items-center gap-3 text-xs text-slate-500">
                    {(["convocado", "presente", "ausente"] as ConvocationStatus[]).map((s) => (
                      <div key={s} className="flex items-center gap-1">
                        <span className={`h-2 w-2 rounded-full ${STATUS_CONFIG[s].dot}`} />
                        {STATUS_CONFIG[s].label}
                      </div>
                    ))}
                    <div className="flex items-center gap-1">
                      <span className="h-2 w-2 rounded-full bg-slate-200" />
                      Não convocado
                    </div>
                  </div>
                </div>

                <div className="divide-y divide-blue-50 dark:divide-slate-700">
                  {/* Convocados primeiro */}
                  {convData.athletes
                    .slice()
                    .sort((a, b) => {
                      const order: Record<ConvocationStatus | "none", number> = { presente: 0, convocado: 1, ausente: 2, none: 3 };
                      return order[a.convocation?.status ?? "none"] - order[b.convocation?.status ?? "none"];
                    })
                    .map((athlete) => (
                      <AthleteRow
                        key={athlete.id}
                        athlete={athlete}
                        onStatusChange={(status) => handleStatusChange(athlete, status)}
                        onRemove={() => handleRemove(athlete)}
                        saving={savingId === athlete.id}
                      />
                    ))}
                </div>

                {convocados.length === 0 && (
                  <div className="flex flex-col items-center gap-2 p-10 text-center">
                    <UserMinus className="text-slate-300" size={36} />
                    <p className="text-sm text-slate-500">Nenhum atleta convocado ainda.</p>
                    <p className="text-xs text-slate-400">Clique em "Convocado" ao lado de cada atleta para adicioná-lo.</p>
                  </div>
                )}
              </div>
            </>
          ) : null}
        </div>
      </div>
    </div>
  );
}
