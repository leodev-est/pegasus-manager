import { Calendar, ChevronDown, ChevronUp, Edit2, MapPin, Plus, Trash2, Trophy, X } from "lucide-react";
import { useCallback, useEffect, useState } from "react";
import { useAuth } from "../../auth/AuthContext";
import { useTour } from "../../tours/useTour";
import { Button } from "../../components/ui/Button";
import { Input } from "../../components/ui/Input";
import { Modal } from "../../components/ui/Modal";
import { PageHeader } from "../../components/ui/PageHeader";
import { useToast } from "../../components/ui/Toast";
import { getApiErrorMessage } from "../../services/api";
import { gamesService, type Game, type GamePayload } from "../../services/gamesService";

const CURRENT_MONTH = new Date().toISOString().slice(0, 7);

const EMPTY_FORM: GamePayload = {
  date: new Date().toISOString().slice(0, 10),
  opponent: "",
  location: "fora",
  scorePegasus: 0,
  scoreOpponent: 0,
  notes: "",
};

const TOUR_STEPS = [
  {
    popover: {
      title: "🏆 Jogos e Resultados",
      description: "Histórico completo de partidas do Pegasus: placar, sets, local e observações de cada jogo.",
    },
  },
  {
    element: "[data-tour='jogos-stats']",
    popover: {
      title: "Estatísticas",
      description: "Totais de vitórias, derrotas, empates e pontos do período selecionado. Filtre pelo mês no campo abaixo.",
      side: "bottom" as const,
    },
  },
  {
    element: "[data-tour='jogos-lista']",
    popover: {
      title: "Lista de jogos",
      description: "Clique em um jogo para expandir os sets e ver detalhes. Use os botões de edição para registrar o resultado ou adicionar sets individualmente.",
      side: "top" as const,
    },
  },
];

function StatCard({ label, value, color }: { label: string; value: number | string; color: string }) {
  return (
    <div className="panel flex flex-col items-center p-5">
      <span className={`text-3xl font-bold ${color}`}>{value}</span>
      <span className="mt-1 text-sm text-slate-500">{label}</span>
    </div>
  );
}

function resultBadge(result: string) {
  if (result === "vitoria") return <span className="badge badge-green">Vitória</span>;
  if (result === "derrota") return <span className="badge badge-red">Derrota</span>;
  return <span className="badge badge-yellow">Empate</span>;
}

function SetsPanel({ game, canEdit, onRefresh }: { game: Game; canEdit: boolean; onRefresh: () => void }) {
  const { showToast } = useToast();
  const [newSet, setNewSet] = useState({ scorePegasus: 0, scoreOpponent: 0 });
  const [isSaving, setIsSaving] = useState(false);

  const nextSetNumber = (game.sets?.length ?? 0) + 1;

  async function handleAddSet() {
    setIsSaving(true);
    try {
      await gamesService.upsertSet(game.id, { setNumber: nextSetNumber, ...newSet });
      setNewSet({ scorePegasus: 0, scoreOpponent: 0 });
      onRefresh();
    } catch (err) {
      showToast(getApiErrorMessage(err), "error");
    } finally {
      setIsSaving(false);
    }
  }

  async function handleDeleteSet(setNumber: number) {
    try {
      await gamesService.deleteSet(game.id, setNumber);
      onRefresh();
    } catch (err) {
      showToast(getApiErrorMessage(err), "error");
    }
  }

  const sets = game.sets ?? [];
  const setsPeg = sets.filter((s) => s.scorePegasus > s.scoreOpponent).length;
  const setsOpp = sets.filter((s) => s.scoreOpponent > s.scorePegasus).length;

  return (
    <div className="mt-3 rounded-xl border border-blue-50 bg-pegasus-surface p-3">
      <p className="mb-2 text-xs font-bold uppercase tracking-wide text-slate-400">
        Sets{sets.length > 0 ? ` — Pegasus ${setsPeg} × ${setsOpp} adversário` : ""}
      </p>
      <div className="flex flex-wrap gap-2">
        {sets.map((s) => (
          <div key={s.setNumber} className="flex items-center gap-1.5 rounded-lg border border-blue-100 bg-white px-3 py-1.5 text-sm">
            <span className="text-xs font-bold text-slate-400">S{s.setNumber}</span>
            <span className={`font-bold ${s.scorePegasus > s.scoreOpponent ? "text-emerald-600" : "text-rose-600"}`}>
              {s.scorePegasus}–{s.scoreOpponent}
            </span>
            {canEdit && (
              <button
                type="button"
                onClick={() => handleDeleteSet(s.setNumber)}
                className="ml-1 text-slate-300 hover:text-rose-500"
              >
                <X size={11} />
              </button>
            )}
          </div>
        ))}
        {canEdit && (
          <div className="flex items-center gap-1.5 rounded-lg border border-dashed border-blue-200 bg-white px-2 py-1">
            <span className="text-xs font-bold text-slate-400">S{nextSetNumber}</span>
            <input
              type="number"
              min="0"
              max="99"
              value={newSet.scorePegasus}
              onChange={(e) => setNewSet((p) => ({ ...p, scorePegasus: Number(e.target.value) }))}
              className="w-9 rounded border border-slate-200 px-1 py-0.5 text-center text-xs"
            />
            <span className="text-slate-400">×</span>
            <input
              type="number"
              min="0"
              max="99"
              value={newSet.scoreOpponent}
              onChange={(e) => setNewSet((p) => ({ ...p, scoreOpponent: Number(e.target.value) }))}
              className="w-9 rounded border border-slate-200 px-1 py-0.5 text-center text-xs"
            />
            <button
              type="button"
              onClick={handleAddSet}
              disabled={isSaving}
              className="rounded-full bg-pegasus-primary px-2 py-0.5 text-xs font-bold text-white hover:bg-blue-700 disabled:opacity-50"
            >
              +
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

export function GamesPage() {
  const { hasPermission } = useAuth();
  const { showToast } = useToast();
  const canEdit = hasPermission(["gestao", "admin"]);

  const [games, setGames] = useState<Game[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [month, setMonth] = useState(CURRENT_MONTH);
  const [stats, setStats] = useState({ total: 0, vitorias: 0, derrotas: 0, empates: 0, totalPoints: 0, totalConceded: 0 });
  const [modalOpen, setModalOpen] = useState(false);
  const [editingGame, setEditingGame] = useState<Game | null>(null);
  const [form, setForm] = useState<GamePayload>(EMPTY_FORM);
  const [isSaving, setIsSaving] = useState(false);
  const [expandedId, setExpandedId] = useState<string | null>(null);

  useTour("jogos:v1", isLoading ? [] : TOUR_STEPS);

  const load = useCallback(async () => {
    setIsLoading(true);
    try {
      const [gs, st] = await Promise.all([
        gamesService.getAll(month),
        gamesService.getStats(month),
      ]);
      setGames(gs);
      setStats(st);
    } catch {
      showToast("Erro ao carregar jogos", "error");
    } finally {
      setIsLoading(false);
    }
  }, [month, showToast]);

  useEffect(() => {
    load();
  }, [load]);

  function openCreate() {
    setEditingGame(null);
    setForm(EMPTY_FORM);
    setModalOpen(true);
  }

  function openEdit(game: Game) {
    setEditingGame(game);
    setForm({
      date: game.date.slice(0, 10),
      opponent: game.opponent,
      location: game.location,
      scorePegasus: game.scorePegasus,
      scoreOpponent: game.scoreOpponent,
      notes: game.notes ?? "",
    });
    setModalOpen(true);
  }

  async function handleSave() {
    setIsSaving(true);
    try {
      if (editingGame) {
        await gamesService.update(editingGame.id, form);
        showToast("Jogo atualizado.", "success");
      } else {
        await gamesService.create(form);
        showToast("Jogo registrado.", "success");
      }
      setModalOpen(false);
      load();
    } catch (err) {
      showToast(getApiErrorMessage(err), "error");
    } finally {
      setIsSaving(false);
    }
  }

  async function handleDelete(id: string) {
    if (!confirm("Excluir este jogo?")) return;
    try {
      await gamesService.delete(id);
      showToast("Jogo excluído.", "success");
      load();
    } catch (err) {
      showToast(getApiErrorMessage(err), "error");
    }
  }

  return (
    <div className="space-y-8">
      <PageHeader
        title="Jogos e Resultados"
        description="Histórico de partidas, sets e estatísticas do Projeto Pegasus."
        action={
          canEdit ? (
            <Button onClick={openCreate}>
              <Plus size={16} className="mr-2" />
              Registrar jogo
            </Button>
          ) : undefined
        }
      />

      <div data-tour="jogos-stats" className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-6">
        <StatCard label="Total" value={stats.total} color="text-pegasus-navy" />
        <StatCard label="Vitórias" value={stats.vitorias} color="text-green-600" />
        <StatCard label="Derrotas" value={stats.derrotas} color="text-red-500" />
        <StatCard label="Empates" value={stats.empates} color="text-yellow-500" />
        <StatCard label="Pontos marcados" value={stats.totalPoints} color="text-pegasus-primary" />
        <StatCard label="Pontos sofridos" value={stats.totalConceded} color="text-slate-500" />
      </div>

      <div className="flex items-center gap-3">
        <Input
          type="month"
          value={month}
          onChange={(e) => setMonth(e.target.value)}
          label=""
          className="w-44"
        />
        <span className="text-sm text-slate-500">Filtrar por mês</span>
      </div>

      <div data-tour="jogos-lista" className="space-y-3">
        {isLoading ? (
          <p className="text-sm text-slate-500">Carregando...</p>
        ) : games.length === 0 ? (
          <div className="panel flex flex-col items-center py-12 text-slate-500">
            <Trophy size={36} className="mb-3 opacity-30" />
            <p>Nenhum jogo registrado neste período.</p>
          </div>
        ) : (
          games.map((game) => (
            <div key={game.id} className="panel p-5">
              <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <div className="flex flex-1 flex-col gap-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="font-semibold text-pegasus-navy">Pegasus</span>
                    <span className="text-xl font-bold text-pegasus-primary">
                      {game.scorePegasus} × {game.scoreOpponent}
                    </span>
                    <span className="font-semibold text-pegasus-navy">{game.opponent}</span>
                    {resultBadge(game.result)}
                  </div>
                  <div className="flex flex-wrap gap-3 text-xs text-slate-500">
                    <span className="flex items-center gap-1">
                      <Calendar size={12} />
                      {new Date(game.date).toLocaleDateString("pt-BR")}
                    </span>
                    <span className="flex items-center gap-1">
                      <MapPin size={12} />
                      {game.location === "casa" ? "Em casa" : "Fora"}
                    </span>
                    {game.notes && <span className="text-slate-400">{game.notes}</span>}
                    {game.sets?.length > 0 && (
                      <span className="text-pegasus-primary font-semibold">{game.sets.length} set{game.sets.length !== 1 ? "s" : ""}</span>
                    )}
                  </div>
                </div>
                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={() => setExpandedId(expandedId === game.id ? null : game.id)}
                    className="flex items-center gap-1 rounded-lg px-2 py-1 text-xs font-semibold text-pegasus-primary hover:bg-pegasus-ice"
                  >
                    Sets
                    {expandedId === game.id ? <ChevronUp size={13} /> : <ChevronDown size={13} />}
                  </button>
                  {canEdit && (
                    <>
                      <Button variant="ghost" size="sm" onClick={() => openEdit(game)}>
                        <Edit2 size={14} />
                      </Button>
                      <Button variant="ghost" size="sm" onClick={() => handleDelete(game.id)}>
                        <Trash2 size={14} className="text-red-500" />
                      </Button>
                    </>
                  )}
                </div>
              </div>
              {expandedId === game.id && (
                <SetsPanel game={game} canEdit={canEdit} onRefresh={load} />
              )}
            </div>
          ))
        )}
      </div>

      <Modal
        isOpen={modalOpen}
        onClose={() => setModalOpen(false)}
        title={editingGame ? "Editar jogo" : "Registrar jogo"}
      >
        <div className="space-y-4">
          <Input
            label="Data"
            type="date"
            value={form.date}
            onChange={(e) => setForm({ ...form, date: e.target.value })}
          />
          <Input
            label="Adversário"
            value={form.opponent}
            onChange={(e) => setForm({ ...form, opponent: e.target.value })}
            placeholder="Nome do time adversário"
          />
          <div>
            <label className="mb-1 block text-sm font-medium text-slate-700">Local</label>
            <select
              className="input w-full"
              value={form.location}
              onChange={(e) => setForm({ ...form, location: e.target.value as "casa" | "fora" })}
            >
              <option value="casa">Em casa</option>
              <option value="fora">Fora</option>
            </select>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <Input
              label="Placar Pegasus"
              type="number"
              min="0"
              value={form.scorePegasus}
              onChange={(e) => setForm({ ...form, scorePegasus: Number(e.target.value) })}
            />
            <Input
              label="Placar adversário"
              type="number"
              min="0"
              value={form.scoreOpponent}
              onChange={(e) => setForm({ ...form, scoreOpponent: Number(e.target.value) })}
            />
          </div>
          <Input
            label="Observações (opcional)"
            value={form.notes ?? ""}
            onChange={(e) => setForm({ ...form, notes: e.target.value })}
            placeholder="Ex: fase eliminatória, campo neutro..."
          />
          <div className="flex justify-end gap-3">
            <Button variant="ghost" onClick={() => setModalOpen(false)}>
              Cancelar
            </Button>
            <Button onClick={handleSave} disabled={isSaving}>
              {isSaving ? "Salvando..." : "Salvar"}
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
