import {
  Calendar,
  ChevronDown,
  ChevronUp,
  MapPin,
  Plus,
  Trophy,
  UserCheck,
  Users,
  X,
} from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { useAuth } from "../../auth/AuthContext";
import { useTour } from "../../tours/useTour";
import { PageHeader } from "../../components/ui/PageHeader";
import { useToast } from "../../components/ui/Toast";
import { api } from "../../services/api";
import {
  gameConvocationService,
  type ConvocationAthlete,
  type GameConvocationData,
} from "../../services/gameConvocationService";
import { gamesService, type Game, type GameLocation } from "../../services/gamesService";

type GenderFilter = "misto" | "masculino" | "feminino";

const GENDER_LABELS: Record<GenderFilter, string> = {
  misto: "Misto",
  masculino: "Masculino",
  feminino: "Feminino",
};

function isPast(dateStr: string) {
  return new Date(dateStr).getTime() < Date.now();
}

function formatDate(dateStr: string) {
  return new Date(dateStr).toLocaleDateString("pt-BR", {
    weekday: "short",
    day: "2-digit",
    month: "short",
    year: "numeric",
    timeZone: "UTC",
  });
}

function LocationBadge({ location }: { location: string }) {
  const isCasa = location === "casa";
  return (
    <span
      className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-semibold ${
        isCasa
          ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400"
          : "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400"
      }`}
    >
      <MapPin size={10} />
      {isCasa ? "Casa" : "Fora"}
    </span>
  );
}

function ResultBadge({ result }: { result: string }) {
  const map: Record<string, { label: string; cls: string }> = {
    vitoria: { label: "Vitória", cls: "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400" },
    derrota: { label: "Derrota", cls: "bg-rose-100 text-rose-700 dark:bg-rose-900/30 dark:text-rose-400" },
    empate: { label: "Empate", cls: "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400" },
    pendente: { label: "Pendente", cls: "bg-slate-100 text-slate-500 dark:bg-slate-800 dark:text-slate-400" },
  };
  const { label, cls } = map[result] ?? { label: result, cls: "bg-slate-100 text-slate-500" };
  return <span className={`rounded-full px-2 py-0.5 text-xs font-bold ${cls}`}>{label}</span>;
}

// ─── Formulário de criar jogo ─────────────────────────────────────────────────
function CreateGameModal({
  onClose,
  onCreate,
}: {
  onClose: () => void;
  onCreate: (game: Game) => void;
}) {
  const { showToast } = useToast();
  const [opponent, setOpponent] = useState("");
  const [date, setDate] = useState("");
  const [location, setLocation] = useState<GameLocation>("casa");
  const [saving, setSaving] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!opponent.trim() || !date) return;
    setSaving(true);
    try {
      const game = await gamesService.create({ opponent: opponent.trim(), date, location });
      onCreate(game);
      showToast("Jogo criado com sucesso!", "success");
    } catch {
      showToast("Erro ao criar jogo", "error");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4 backdrop-blur-sm">
      <div className="panel w-full max-w-sm">
        <div className="flex items-center justify-between border-b border-blue-100 p-4 dark:border-slate-700">
          <h2 className="font-bold text-pegasus-navy">Criar Jogo</h2>
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg p-1 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
          >
            <X size={18} />
          </button>
        </div>
        <form onSubmit={handleSubmit} className="space-y-4 p-4">
          <div>
            <label className="mb-1 block text-xs font-semibold text-slate-600 dark:text-slate-400">
              Adversário
            </label>
            <input
              ref={inputRef}
              value={opponent}
              onChange={(e) => setOpponent(e.target.value)}
              placeholder="Nome do time adversário"
              className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm text-pegasus-navy placeholder-slate-400 focus:border-pegasus-primary focus:outline-none dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100"
              required
            />
          </div>
          <div>
            <label className="mb-1 block text-xs font-semibold text-slate-600 dark:text-slate-400">
              Data e horário
            </label>
            <input
              type="datetime-local"
              value={date}
              onChange={(e) => setDate(e.target.value)}
              className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm text-pegasus-navy focus:border-pegasus-primary focus:outline-none dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100"
              required
            />
          </div>
          <div>
            <label className="mb-1 block text-xs font-semibold text-slate-600 dark:text-slate-400">
              Local
            </label>
            <div className="flex gap-2">
              {(["casa", "fora"] as GameLocation[]).map((loc) => (
                <button
                  key={loc}
                  type="button"
                  onClick={() => setLocation(loc)}
                  className={`flex-1 rounded-xl py-2 text-sm font-bold transition ${
                    location === loc
                      ? "bg-pegasus-primary text-white"
                      : "border border-slate-200 text-slate-600 hover:bg-pegasus-ice dark:border-slate-700 dark:text-slate-300"
                  }`}
                >
                  {loc === "casa" ? "Casa" : "Fora"}
                </button>
              ))}
            </div>
          </div>
          <div className="flex gap-2 pt-1">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 rounded-xl border border-slate-200 py-2 text-sm font-bold text-slate-600 transition hover:bg-pegasus-ice dark:border-slate-700 dark:text-slate-300"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={saving || !opponent.trim() || !date}
              className="flex-1 rounded-xl bg-pegasus-primary py-2 text-sm font-bold text-white transition hover:bg-pegasus-primary/90 disabled:opacity-50"
            >
              {saving ? "Criando..." : "Criar"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

// ─── Card de jogo futuro ──────────────────────────────────────────────────────
function UpcomingGameCard({ game, onSaved }: { game: Game; onSaved: () => void }) {
  const { showToast } = useToast();
  const [convData, setConvData] = useState<GameConvocationData | null>(null);
  const [loading, setLoading] = useState(false);
  const [gender, setGender] = useState<GenderFilter>("misto");
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [saving, setSaving] = useState(false);
  const [loaded, setLoaded] = useState(false);

  // Carrega ao montar
  useEffect(() => {
    setLoading(true);
    gameConvocationService
      .getByGame(game.id)
      .then((d) => {
        setConvData(d);
        const already = new Set(
          d.athletes.filter((a) => a.convocation).map((a) => a.id),
        );
        setSelected(already);
        setLoaded(true);
      })
      .catch(() => showToast("Erro ao carregar convocação", "error"))
      .finally(() => setLoading(false));
  }, [game.id, showToast]);

  // Recarrega atletas quando filtro de gênero muda
  useEffect(() => {
    if (!loaded) return;
    gameConvocationService
      .getByGame(game.id, gender)
      .then((d) => setConvData(d))
      .catch(() => {});
  }, [gender, game.id, loaded]);

  function toggleAthlete(id: string) {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  async function handleSave() {
    setSaving(true);
    try {
      await gameConvocationService.bulkSetAndNotify(game.id, Array.from(selected));
      showToast(`${selected.size} atleta(s) convocado(s) com notificação!`, "success");
      onSaved();
    } catch {
      showToast("Erro ao salvar convocação", "error");
    } finally {
      setSaving(false);
    }
  }

  const visibleAthletes = convData?.athletes ?? [];

  return (
    <div className="panel overflow-hidden">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-blue-100 p-4 dark:border-slate-700">
        <div className="flex items-center gap-3">
          <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-pegasus-primary/10">
            <Trophy className="text-pegasus-primary" size={18} />
          </div>
          <div>
            <p className="font-black text-pegasus-navy">vs {game.opponent}</p>
            <div className="flex items-center gap-2">
              <Calendar size={12} className="text-slate-400" />
              <span className="text-xs text-slate-500">{formatDate(game.date)}</span>
              <LocationBadge location={game.location} />
            </div>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <span className="rounded-full bg-blue-100 px-3 py-1 text-sm font-bold text-blue-700 dark:bg-blue-900/30 dark:text-blue-400">
            {selected.size} convocado(s)
          </span>
        </div>
      </div>

      {/* Filtro de gênero */}
      <div className="flex items-center gap-1 border-b border-blue-50 px-4 py-2 dark:border-slate-700/50">
        <Users size={14} className="mr-1 text-slate-400" />
        {(["misto", "masculino", "feminino"] as GenderFilter[]).map((g) => (
          <button
            key={g}
            type="button"
            onClick={() => setGender(g)}
            className={`rounded-full px-3 py-1 text-xs font-bold transition ${
              gender === g
                ? "bg-pegasus-primary text-white"
                : "text-slate-500 hover:bg-pegasus-ice dark:hover:bg-slate-700"
            }`}
          >
            {GENDER_LABELS[g]}
          </button>
        ))}
      </div>

      {/* Lista de atletas */}
      {loading ? (
        <p className="p-6 text-center text-sm text-slate-500">Carregando atletas...</p>
      ) : visibleAthletes.length === 0 ? (
        <p className="p-6 text-center text-sm text-slate-500">Nenhum atleta ativo encontrado.</p>
      ) : (
        <div className="grid grid-cols-2 gap-2 p-4 sm:grid-cols-3 lg:grid-cols-4">
          {visibleAthletes.map((athlete) => {
            const isSelected = selected.has(athlete.id);
            return (
              <button
                key={athlete.id}
                type="button"
                onClick={() => toggleAthlete(athlete.id)}
                className={`flex flex-col rounded-xl border-2 px-3 py-2.5 text-left transition ${
                  isSelected
                    ? "border-pegasus-primary bg-pegasus-primary text-white"
                    : "border-slate-200 bg-white text-pegasus-navy hover:border-pegasus-primary/40 hover:bg-pegasus-ice dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100"
                }`}
              >
                <span className="truncate text-sm font-bold">{athlete.name}</span>
                {(athlete.position || athlete.category) && (
                  <span className={`mt-0.5 truncate text-xs ${isSelected ? "text-blue-100" : "text-slate-400"}`}>
                    {[athlete.position, athlete.category].filter(Boolean).join(" · ")}
                  </span>
                )}
              </button>
            );
          })}
        </div>
      )}

      {/* Rodapé com botão salvar */}
      <div className="flex items-center justify-between border-t border-blue-100 px-4 py-3 dark:border-slate-700">
        <button
          type="button"
          onClick={() => setSelected(new Set())}
          disabled={selected.size === 0}
          className="text-xs text-slate-400 underline underline-offset-2 transition hover:text-rose-500 disabled:pointer-events-none disabled:opacity-0"
        >
          Limpar seleção
        </button>
        <button
          type="button"
          onClick={handleSave}
          disabled={saving}
          className="flex items-center gap-2 rounded-xl bg-pegasus-primary px-4 py-2 text-sm font-bold text-white transition hover:bg-pegasus-primary/90 disabled:opacity-50"
        >
          <UserCheck size={15} />
          {saving ? "Salvando..." : "Confirmar convocação"}
        </button>
      </div>
    </div>
  );
}

// ─── Card de jogo passado (colapsável) ───────────────────────────────────────
function PastGameCard({ game }: { game: Game }) {
  const [expanded, setExpanded] = useState(false);
  const [convData, setConvData] = useState<GameConvocationData | null>(null);
  const { showToast } = useToast();

  function handleExpand() {
    if (!expanded && !convData) {
      gameConvocationService
        .getByGame(game.id)
        .then(setConvData)
        .catch(() => showToast("Erro ao carregar convocação", "error"));
    }
    setExpanded((v) => !v);
  }

  const convocados = convData?.athletes.filter((a) => a.convocation) ?? [];

  return (
    <div className="panel overflow-hidden">
      <button
        type="button"
        onClick={handleExpand}
        className="flex w-full items-center justify-between px-4 py-3 text-left hover:bg-pegasus-ice/50 dark:hover:bg-slate-700/30"
      >
        <div className="flex min-w-0 items-center gap-3">
          <span className="text-sm font-bold text-pegasus-navy">vs {game.opponent}</span>
          <span className="hidden text-xs text-slate-400 sm:block">{formatDate(game.date)}</span>
          <LocationBadge location={game.location} />
          <ResultBadge result={game.result} />
        </div>
        <div className="flex shrink-0 items-center gap-2">
          <span className="text-xs text-slate-400 sm:hidden">{formatDate(game.date)}</span>
          {expanded ? (
            <ChevronUp size={16} className="text-slate-400" />
          ) : (
            <ChevronDown size={16} className="text-slate-400" />
          )}
        </div>
      </button>

      {expanded && (
        <div className="border-t border-blue-50 px-4 py-3 dark:border-slate-700/50">
          {convData === null ? (
            <p className="text-xs text-slate-400">Carregando...</p>
          ) : convocados.length === 0 ? (
            <p className="text-xs text-slate-400">Nenhum atleta convocado registrado.</p>
          ) : (
            <div className="flex flex-wrap gap-1.5">
              {convocados.map((a) => (
                <span
                  key={a.id}
                  className="rounded-full bg-slate-100 px-2.5 py-1 text-xs font-medium text-slate-600 dark:bg-slate-700 dark:text-slate-300"
                >
                  {a.name}
                </span>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

const TOUR_STEPS = [
  {
    popover: {
      title: "📣 Convocação de Jogos",
      description: "Gerencie jogos futuros e convoque os atletas para cada partida. Os atletas convocados recebem uma notificação no app.",
    },
  },
  {
    element: "[data-tour='conv-proximos']",
    popover: {
      title: "Próximos jogos",
      description: "Selecione os atletas convocados para cada jogo futuro. Filtre por gênero e salve a convocação.",
      side: "bottom" as const,
    },
  },
  {
    element: "[data-tour='conv-passados']",
    popover: {
      title: "Jogos passados",
      description: "Histórico de jogos realizados com os atletas que foram convocados. Expanda para ver a lista completa.",
      side: "top" as const,
    },
  },
];

// ─── Página principal ─────────────────────────────────────────────────────────
export function ConvocacaoPage() {
  const { user } = useAuth();
  const { showToast } = useToast();
  const [games, setGames] = useState<Game[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreate, setShowCreate] = useState(false);

  const canManage =
    (user?.permissions?.includes("treinos") || user?.permissions?.includes("gestao")) &&
    !user?.permissions?.includes("atleta");

  function loadGames() {
    setLoading(true);
    api
      .get<Game[]>("/games")
      .then(({ data }) => {
        const arr = Array.isArray(data) ? data : (data as unknown as { games: Game[] }).games ?? [];
        setGames(arr.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()));
      })
      .catch(() => showToast("Erro ao carregar jogos", "error"))
      .finally(() => setLoading(false));
  }

  useEffect(() => {
    loadGames();
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  function handleGameCreated(game: Game) {
    setGames((prev) =>
      [game, ...prev].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()),
    );
    setShowCreate(false);
  }

  useTour("convocacao:v1", loading ? [] : TOUR_STEPS);

  const upcoming = games.filter((g) => !isPast(g.date));
  const past = games.filter((g) => isPast(g.date));

  return (
    <div className="space-y-6">
      <PageHeader
        title="Convocação de Jogos"
        description="Crie jogos futuros e selecione os atletas convocados."
        action={
          canManage ? (
            <button
              type="button"
              onClick={() => setShowCreate(true)}
              className="flex items-center gap-2 rounded-xl bg-pegasus-primary px-4 py-2 text-sm font-bold text-white transition hover:bg-pegasus-primary/90"
            >
              <Plus size={16} />
              Criar Jogo
            </button>
          ) : undefined
        }
      />

      {showCreate && (
        <CreateGameModal onClose={() => setShowCreate(false)} onCreate={handleGameCreated} />
      )}

      {loading ? (
        <div className="panel p-12 text-center text-sm text-slate-500">Carregando jogos...</div>
      ) : (
        <div className="space-y-6">
          {/* Jogos futuros */}
          {upcoming.length > 0 && (
            <div data-tour="conv-proximos" className="space-y-4">
              <h2 className="text-sm font-bold uppercase tracking-wide text-slate-500">
                Próximos jogos
              </h2>
              {upcoming.map((game) => (
                <UpcomingGameCard key={game.id} game={game} onSaved={loadGames} />
              ))}
            </div>
          )}

          {upcoming.length === 0 && canManage && (
            <div className="panel flex flex-col items-center gap-3 p-12 text-center">
              <Trophy className="text-slate-200" size={40} />
              <p className="font-semibold text-slate-500">Nenhum jogo futuro cadastrado.</p>
              <p className="text-sm text-slate-400">Crie um jogo para começar a convocar atletas.</p>
              <button
                type="button"
                onClick={() => setShowCreate(true)}
                className="mt-1 flex items-center gap-2 rounded-xl bg-pegasus-primary px-4 py-2 text-sm font-bold text-white transition hover:bg-pegasus-primary/90"
              >
                <Plus size={15} />
                Criar Jogo
              </button>
            </div>
          )}

          {/* Jogos passados */}
          {past.length > 0 && (
            <div data-tour="conv-passados" className="space-y-2">
              <h2 className="text-sm font-bold uppercase tracking-wide text-slate-500">
                Jogos anteriores
              </h2>
              {past.map((game) => (
                <PastGameCard key={game.id} game={game} />
              ))}
            </div>
          )}

          {games.length === 0 && !loading && (
            <div className="panel flex flex-col items-center gap-3 p-12 text-center">
              <Trophy className="text-slate-200" size={40} />
              <p className="text-sm text-slate-500">Nenhum jogo cadastrado ainda.</p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
