import { ExternalLink, Lightbulb, Megaphone, Palette, ShieldCheck } from "lucide-react";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { useAuth } from "../../auth/AuthContext";
import { useTour } from "../../tours/useTour";
import { AdvancedKanban } from "../../components/kanban/AdvancedKanban";
import { useToast } from "../../components/ui/Toast";
import { getApiErrorMessage } from "../../services/api";
import {
  marketingService,
  type MarketingChecklistItem,
  type MarketingStatus,
  type MarketingTask,
  type MarketingTaskPayload,
} from "../../services/marketingService";
import { userService } from "../../services/userService";
import { ORG_NAME } from "../../config/org";
import {
  MARKETING_CHANNELS,
  MARKETING_COLUMNS,
  MARKETING_FORMATS,
  STALE_AFTER_DAYS,
  archiveStateOf,
  normalizeLegacyTask,
} from "./marketingConfig";
import { MarketingFilters, applyMarketingFilters, usePersistedFilters } from "./MarketingFilters";

const columns = MARKETING_COLUMNS;

const savedContentLabels = ["Vídeo de Treino", "Reels", "Fotos"];
type MarketingTab = "kanban" | "identidade";

const marketingTabs: Array<{ label: string; value: MarketingTab }> = [
  { label: "Kanban", value: "kanban" },
  { label: "Identidade Visual", value: "identidade" },
];

const palette = [
  ["Azul muito escuro", "#0B2E59"],
  ["Azul principal", "#0D47A1"],
  ["Azul médio", "#1565C0"],
  ["Azul claro", "#42A5F5"],
  ["Azul gelo", "#E3F2FD"],
  ["Branco", "#FFFFFF"],
  ["Cinza claro", "#F5F7FA"],
];

const TOUR_STEPS = [
  {
    popover: {
      title: "📣 Marketing",
      description: "Kanban de produção de conteúdo e identidade visual do clube. Organize ideias, produções em andamento, revisões e publicações.",
    },
  },
  {
    element: "[data-tour='mkt-tabs']",
    popover: {
      title: "Abas",
      description: "Alterne entre o Kanban de tarefas e a seção de Identidade Visual com a paleta de cores e diretrizes da marca.",
      side: "bottom" as const,
    },
  },
  {
    element: "[data-tour='mkt-kanban']",
    popover: {
      title: "Kanban de marketing",
      description: "Arraste cards entre colunas (no celular, use o menu ⋯ do card). Tudo passa pela Revisão antes de Agendado ou Publicado. Filtre por Meus, Atrasados, formato, canal e pessoa.",
      side: "top" as const,
    },
  },
];

type MarketingForm = Required<Omit<MarketingTaskPayload, "area">>;

function buildPayload(form: MarketingForm): MarketingTaskPayload {
  return {
    title: form.title,
    description: form.description,
    assignedTo: form.assignedTo,
    dueDate: form.dueDate,
    priority: form.priority,
    status: form.status,
    format: form.format || null,
    stagesDone: form.format ? form.stagesDone : [],
    // Tarefa solta (and any format without a platform) is saved without a channel.
    channel: form.channel && MARKETING_FORMATS.find((item) => item.value === form.format)?.showChannel !== false
      ? form.channel
      : null,
    labels: form.labels,
    // Comments are added through their own endpoint (author from the login, @mentions).
    checklist: form.checklist,
    area: "marketing",
  };
}

export function MarketingPage() {
  const { hasPermission, user } = useAuth();
  const { showToast } = useToast();
  const canCreate = hasPermission(["marketing:create"]);
  const canUpdate = hasPermission(["marketing:update"]);
  const canDelete = hasPermission(["marketing:delete"]);
  const canApprove = user?.roles?.includes("ChefeMarketing") || user?.roles?.includes("Diretor") || false;
  const [tasks, setTasks] = useState<MarketingTask[]>([]);
  const [filters, setFilters] = usePersistedFilters();
  const showArchived = filters.showArchived;
  const [activeTab, setActiveTab] = useState<MarketingTab>("kanban");
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);

  useTour("marketing:v1", isLoading ? [] : TOUR_STEPS);
  const [marketingUsers, setMarketingUsers] = useState<Array<{ label: string; value: string }>>([]);
  const today = new Date().toISOString().slice(0, 10);

  const people = useMemo(
    () =>
      Array.from(new Set([...marketingUsers.map((member) => member.value), ...tasks.flatMap((task) => task.assignedTo)])).sort(
        (a, b) => a.localeCompare(b, "pt-BR"),
      ),
    [marketingUsers, tasks],
  );
  const visibleTasks = useMemo(
    () => applyMarketingFilters(tasks, filters, user?.name),
    [filters, tasks, user?.name],
  );
  const visibleIds = useMemo(() => new Set(visibleTasks.map((task) => task.id)), [visibleTasks]);
  const isVisible = useCallback((task: MarketingTask) => visibleIds.has(task.id), [visibleIds]);

  // Skeleton only on the very first load; later loads keep the board on screen.
  const hasLoadedRef = useRef(false);
  // Responses are applied only if no newer request or local change happened meanwhile,
  // so a slow background refresh never undoes a move made while it was in flight.
  const requestIdRef = useRef(0);
  const mutationSeqRef = useRef(0);

  const loadTasks = useCallback(
    async ({ background = false }: { background?: boolean } = {}) => {
      const requestId = ++requestIdRef.current;
      const mutationSeq = mutationSeqRef.current;
      if (!hasLoadedRef.current) setIsLoading(true);

      try {
        // Everything is filtered on screen (instant); only archived cards are left to the server.
        const data = await marketingService.getTasks({ includeArchived: showArchived });
        if (requestId !== requestIdRef.current || mutationSeq !== mutationSeqRef.current) return;
        setTasks(data.map(normalizeLegacyTask));
        hasLoadedRef.current = true;
      } catch (error) {
        if (!background) showToast(getApiErrorMessage(error), "error");
      } finally {
        if (requestId === requestIdRef.current) setIsLoading(false);
      }
    },
    [showArchived, showToast],
  );

  useEffect(() => {
    loadTasks();
  }, [loadTasks]);

  const refreshInBackground = useCallback(() => loadTasks({ background: true }), [loadTasks]);

  // ?card=<id> (calendar, @mention notification): open that card once the board is loaded.
  const [searchParams, setSearchParams] = useSearchParams();
  const requestedCardId = searchParams.get("card");
  const [cardToOpen, setCardToOpen] = useState<MarketingTask | null>(null);
  useEffect(() => {
    if (!requestedCardId || isLoading) return;
    let cancelled = false;
    const clearParam = () =>
      setSearchParams(
        (params) => {
          params.delete("card");
          return params;
        },
        { replace: true },
      );
    const loaded = tasks.find((task) => task.id === requestedCardId);
    if (loaded) {
      setActiveTab("kanban");
      setCardToOpen(loaded);
      clearParam();
      return;
    }
    // Not on the board (archived or filtered out on the server): fetch it directly.
    marketingService
      .getTask(requestedCardId)
      .then((task) => {
        if (cancelled) return;
        setActiveTab("kanban");
        setCardToOpen(normalizeLegacyTask(task));
      })
      .catch(() => {
        if (!cancelled) showToast("Card não encontrado. Ele pode ter sido excluído.", "error");
      })
      .finally(() => {
        if (!cancelled) clearParam();
      });
    return () => {
      cancelled = true;
    };
  }, [isLoading, requestedCardId, setSearchParams, showToast, tasks]);
  const handleCardOpened = useCallback(() => setCardToOpen(null), []);

  function replaceTask(updated: MarketingTask) {
    const normalized = normalizeLegacyTask(updated);
    setTasks((current) => current.map((task) => (task.id === normalized.id ? normalized : task)));
  }

  async function moveTask(task: MarketingTask, status: MarketingStatus) {
    mutationSeqRef.current += 1;
    try {
      replaceTask(await marketingService.updateTaskStatus(task.id, status));
    } catch (error) {
      showToast(`Não foi possível mover. ${getApiErrorMessage(error)}`, "error");
      throw error;
    }
  }

  async function saveChecklist(task: MarketingTask, checklist: MarketingChecklistItem[]) {
    mutationSeqRef.current += 1;
    try {
      replaceTask(await marketingService.updateTask(task.id, { checklist }));
    } catch (error) {
      showToast(`Não foi possível salvar o checklist. ${getApiErrorMessage(error)}`, "error");
      throw error;
    }
  }

  async function quickCreate(title: string, status: MarketingStatus) {
    mutationSeqRef.current += 1;
    try {
      const created = normalizeLegacyTask(await marketingService.createTask({ title, status, area: "marketing" }));
      setTasks((current) => [created, ...current]);
    } catch (error) {
      showToast(`Não foi possível criar. ${getApiErrorMessage(error)}`, "error");
      throw error;
    }
  }

  async function quickUpdate(task: MarketingTask, patch: { assignedTo?: string[]; dueDate?: string | null }) {
    mutationSeqRef.current += 1;
    try {
      replaceTask(await marketingService.updateTask(task.id, patch));
    } catch (error) {
      showToast(`Não foi possível salvar. ${getApiErrorMessage(error)}`, "error");
      throw error;
    }
  }

  async function duplicateTask(task: MarketingTask) {
    mutationSeqRef.current += 1;
    const due = task.dueDate?.slice(0, 10) ?? null;
    try {
      const created = await marketingService.createTask({
        title: `${task.title} (cópia)`,
        description: task.description ?? undefined,
        // Copies start the flow again: approval-only columns are not a starting point.
        status: task.status === "scheduled" || task.status === "published" ? "ideas" : task.status,
        assignedTo: task.assignedTo,
        dueDate: due && due >= today ? due : undefined,
        priority: task.priority,
        channel: task.channel,
        format: task.format,
        labels: task.labels,
        checklist: task.checklist.map((item, index) => ({ ...item, id: `check-${Date.now()}-${index}`, done: false })),
        area: "marketing",
      });
      setTasks((current) => [normalizeLegacyTask(created), ...current]);
      showToast("Duplicado.", "success");
    } catch (error) {
      showToast(`Não foi possível duplicar. ${getApiErrorMessage(error)}`, "error");
      throw error;
    }
  }

  async function archiveTask(task: MarketingTask, archived: boolean) {
    mutationSeqRef.current += 1;
    const previous = tasks;
    // Hidden right away unless archived cards are on screen.
    setTasks((current) =>
      archived && !showArchived
        ? current.filter((item) => item.id !== task.id)
        : current.map((item) =>
            item.id === task.id ? { ...item, archivedAt: archived ? new Date().toISOString() : null } : item,
          ),
    );
    try {
      const saved = await marketingService.archiveTask(task.id, archived);
      if (!archived || showArchived) replaceTask(saved);
      showToast(archived ? "Arquivado." : "Desarquivado.", "success");
    } catch (error) {
      setTasks(previous);
      showToast(`Não foi possível ${archived ? "arquivar" : "desarquivar"}. ${getApiErrorMessage(error)}`, "error");
      throw error;
    }
  }

  async function reorderTask(task: MarketingTask, neighbours: { beforeId: string | null; afterId: string | null }) {
    mutationSeqRef.current += 1;
    try {
      await marketingService.reorderTask(task.id, neighbours);
      // The first hand-sort of a column spaces out every card in it: reload to get all positions.
      await loadTasks({ background: true });
    } catch (error) {
      showToast(`Não foi possível salvar a ordem. ${getApiErrorMessage(error)}`, "error");
      throw error;
    }
  }

  async function addComment(task: MarketingTask, text: string) {
    mutationSeqRef.current += 1;
    try {
      replaceTask(await marketingService.addComment(task.id, text));
    } catch (error) {
      showToast(`Não foi possível comentar. ${getApiErrorMessage(error)}`, "error");
      throw error;
    }
  }

  async function saveStages(task: MarketingTask, stagesDone: string[]) {
    mutationSeqRef.current += 1;
    try {
      // Format goes along so legacy cards (format read from the old channel) get it saved too.
      replaceTask(await marketingService.updateTask(task.id, { stagesDone, format: task.format }));
    } catch (error) {
      showToast(`Não foi possível salvar a etapa. ${getApiErrorMessage(error)}`, "error");
      throw error;
    }
  }

  useEffect(() => {
    // Team with each person's marketing function ("Gustavo — Edição de vídeos").
    // Falls back to the role lists if the API doesn't have the team route yet.
    marketingService
      .getTeam()
      .then((team) =>
        setMarketingUsers(
          team.map((member) => ({
            label: member.marketingFunction ? `${member.name} — ${member.marketingFunction}` : member.name,
            value: member.name,
          })),
        ),
      )
      .catch(() =>
        Promise.all([userService.getUsersByRole("Marketing"), userService.getUsersByRole("ChefeMarketing")])
          .then(([marketing, chefe]) => {
            const seen = new Set<string>();
            const merged = [...marketing, ...chefe].filter((u) => {
              if (seen.has(u.id)) return false;
              seen.add(u.id);
              return true;
            });
            setMarketingUsers(merged.map((u) => ({ label: u.name, value: u.name })));
          })
          .catch(() => setMarketingUsers([])),
      );
  }, []);

  async function saveWithFeedback(action: () => Promise<void>, message: string) {
    setIsSaving(true);
    mutationSeqRef.current += 1;

    try {
      await action();
      showToast(message, "success");
      await loadTasks();
    } catch (error) {
      showToast(getApiErrorMessage(error), "error");
    } finally {
      setIsSaving(false);
    }
  }

  return (
    <div className="space-y-6">
      <div data-tour="mkt-tabs" className="flex flex-wrap gap-2 rounded-2xl border border-stone-200 bg-white p-2 shadow-sm">
        {marketingTabs.map((tab) => (
          <button
            className={`rounded-xl px-4 py-2 text-sm font-bold transition ${
              activeTab === tab.value
                ? "bg-pegasus-primary text-white shadow-sm"
                : "text-slate-600 hover:bg-pegasus-ice hover:text-pegasus-primary"
            }`}
            key={tab.value}
            onClick={() => setActiveTab(tab.value)}
            type="button"
          >
            {tab.label}
          </button>
        ))}
      </div>

      {activeTab === "kanban" ? (
      <div data-tour="mkt-kanban">
      <AdvancedKanban
        areaLabel="marketing"
        approvalColumn="review"
        scheduledColumn="scheduled"
        canApprove={canApprove}
        canCreate={canCreate}
        canDelete={canDelete}
        canUpdate={canUpdate}
        channelOptions={MARKETING_CHANNELS}
        formatOptions={MARKETING_FORMATS}
        stagesColumn="production"
        staleAfterDays={STALE_AFTER_DAYS}
        columns={columns}
        currentUserName={user?.name}
        description={`Kanban de comunicação, conteúdo e identidade visual do Projeto ${ORG_NAME}.`}
        emptyStatus="ideas"
        labelsAsTab
        minDueDate={today}
        responsibleOptions={marketingUsers}
        savedLabels={savedContentLabels}
        filters={
          <MarketingFilters
            filters={filters}
            people={people}
            shown={visibleTasks.length}
            total={tasks.length}
            onChange={setFilters}
          />
        }
        icon={Megaphone}
        isLoading={isLoading}
        isSaving={isSaving}
        tasks={tasks}
        taskFilter={isVisible}
        title="Marketing"
        onCreate={(form) =>
          saveWithFeedback(
            () => marketingService.createTask(buildPayload(form as MarketingForm)).then(() => undefined),
            "Tarefa de marketing criada com sucesso.",
          )
        }
        onDelete={(task) =>
          saveWithFeedback(
            () => marketingService.deleteTask(task.id),
            "Tarefa excluída com sucesso.",
          )
        }
        onMove={moveTask}
        onChecklistToggle={saveChecklist}
        onStagesToggle={saveStages}
        onQuickCreate={quickCreate}
        onQuickUpdate={quickUpdate}
        onDuplicate={duplicateTask}
        onAddComment={addComment}
        onReorder={reorderTask}
        openTask={cardToOpen}
        onOpenTaskHandled={handleCardOpened}
        loadHistory={(task) => marketingService.getHistory(task.id)}
        onArchive={archiveTask}
        archiveState={archiveStateOf}
        onRefresh={refreshInBackground}
        onUpdate={(task, form) =>
          saveWithFeedback(
            () => marketingService.updateTask(task.id, buildPayload(form as MarketingForm)).then(() => undefined),
            "Tarefa de marketing atualizada com sucesso.",
          )
        }
        onApprove={(task, action, scheduledAt) =>
          saveWithFeedback(
            () => marketingService.approveTask(task.id, action, scheduledAt).then(() => undefined),
            action === "schedule" ? "Tarefa agendada para publicação." : "Tarefa aprovada e publicada.",
          )
        }
        onReject={(task) =>
          saveWithFeedback(
            () => marketingService.rejectTask(task.id).then(() => undefined),
            task.status === "scheduled" ? "Desagendado. O card voltou para Produção." : "Reprovado. O card voltou para Produção.",
          )
        }
      />
      </div>
      ) : null}

      {activeTab === "identidade" ? (
      <section className="panel p-5">
        <div className="flex items-center gap-3">
          <Palette className="text-pegasus-primary" size={22} />
          <div>
            <h2 className="text-xl font-bold text-pegasus-navy">Identidade visual</h2>
            <p className="text-sm text-slate-500">Paleta, uso da marca e backlog de ideias para campanhas.</p>
          </div>
        </div>
        <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {palette.map(([name, color]) => (
            <div key={color} className="rounded-2xl border border-stone-200 bg-white p-4 shadow-sm">
              <div className="h-20 rounded-xl border border-slate-100" style={{ backgroundColor: color }} />
              <p className="mt-3 font-bold text-pegasus-navy">{name}</p>
              <p className="text-sm text-slate-500">{color}</p>
            </div>
          ))}
        </div>
        <div className="mt-6 grid gap-4 md:grid-cols-3">
          <div className="rounded-2xl border border-stone-200 bg-white p-5">
            <ShieldCheck className="text-pegasus-primary" size={20} />
            <h3 className="mt-3 font-bold text-pegasus-navy">Uso da logo</h3>
            <p className="mt-2 text-sm leading-6 text-slate-600">
              Manter contraste alto, área de respiro e preferir fundo branco ou azul escuro.
            </p>
          </div>
          <div className="rounded-2xl border border-stone-200 bg-white p-5">
            <Lightbulb className="text-pegasus-primary" size={20} />
            <h3 className="mt-3 font-bold text-pegasus-navy">Ideias de campanhas</h3>
            <p className="mt-2 text-sm leading-6 text-slate-600">
              Bastidores de treino, histórias de atletas, chamadas para voluntários e captação.
            </p>
          </div>
          <div className="rounded-2xl border border-stone-200 bg-white p-5">
            <ExternalLink className="text-pegasus-primary" size={20} />
            <h3 className="mt-3 font-bold text-pegasus-navy">Observações futuras</h3>
            <p className="mt-2 text-sm leading-6 text-slate-600">
              Reservar links para drive de artes, calendário editorial e guias de tom de voz.
            </p>
          </div>
        </div>
      </section>
      ) : null}
    </div>
  );
}
