import { ExternalLink, Lightbulb, Megaphone, Palette, ShieldCheck } from "lucide-react";
import { useCallback, useEffect, useMemo, useState } from "react";
import { useAuth } from "../../auth/AuthContext";
import { AdvancedKanban } from "../../components/kanban/AdvancedKanban";
import { FilterBar } from "../../components/ui/FilterBar";
import { Select } from "../../components/ui/Select";
import { useToast } from "../../components/ui/Toast";
import { getApiErrorMessage } from "../../services/api";
import {
  marketingService,
  type MarketingChannel,
  type MarketingPriority,
  type MarketingStatus,
  type MarketingTask,
  type MarketingTaskPayload,
} from "../../services/marketingService";
import { userService } from "../../services/userService";

const columns: Array<{ label: string; value: MarketingStatus }> = [
  { label: "Ideias", value: "ideas" },
  { label: "Produção", value: "production" },
  { label: "Revisão", value: "review" },
  { label: "Publicado", value: "published" },
];

const channels: MarketingChannel[] = ["Instagram", "WhatsApp", "Arte", "Captacao", "Evento"];
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

type MarketingForm = Required<Omit<MarketingTaskPayload, "area">>;

function label(value: string) {
  const labels: Record<string, string> = {
    Captacao: "Captação",
    media: "Média",
    baixa: "Baixa",
    alta: "Alta",
  };

  return labels[value] ?? value.charAt(0).toUpperCase() + value.slice(1);
}

function buildPayload(form: MarketingForm): MarketingTaskPayload {
  return {
    title: form.title,
    description: form.description,
    assignedTo: form.assignedTo,
    dueDate: form.dueDate,
    priority: form.priority,
    status: form.status,
    channel: form.channel,
    labels: form.labels,
    comments: form.comments,
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
  const [channel, setChannel] = useState("todos");
  const [assignedTo, setAssignedTo] = useState("todos");
  const [priority, setPriority] = useState("todos");
  const [activeTab, setActiveTab] = useState<MarketingTab>("kanban");
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [marketingUsers, setMarketingUsers] = useState<Array<{ label: string; value: string }>>([]);
  const today = new Date().toISOString().slice(0, 10);

  const owners = useMemo(
    () => Array.from(new Set(tasks.map((task) => task.assignedTo).filter(Boolean))) as string[],
    [tasks],
  );

  const loadTasks = useCallback(async () => {
    setIsLoading(true);

    try {
      const data = await marketingService.getTasks({
        channel: channel as MarketingChannel | "todos",
        assignedTo,
        priority: priority as MarketingPriority | "todos",
      });
      setTasks(data);
    } catch (error) {
      showToast(getApiErrorMessage(error), "error");
    } finally {
      setIsLoading(false);
    }
  }, [assignedTo, channel, priority, showToast]);

  useEffect(() => {
    loadTasks();
  }, [loadTasks]);

  // Auto-reload every minute when there are scheduled tasks pending publish
  useEffect(() => {
    const hasScheduled = tasks.some(
      (t) => t.approvalStatus === "approved" && t.scheduledAt && t.status !== "published",
    );
    if (!hasScheduled) return;
    const id = setInterval(loadTasks, 60_000);
    return () => clearInterval(id);
  }, [tasks, loadTasks]);

  useEffect(() => {
    userService.getUsersByRole("Marketing")
      .then((users) => setMarketingUsers(users.map((u) => ({ label: u.name, value: u.name }))))
      .catch(() => setMarketingUsers([]));
  }, []);

  async function saveWithFeedback(action: () => Promise<void>, message: string) {
    setIsSaving(true);

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
    <div className="space-y-8">
      <div className="flex flex-wrap gap-2 rounded-2xl border border-blue-100 bg-white p-2 shadow-sm">
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
      <AdvancedKanban
        areaLabel="marketing"
        approvalColumn="review"
        canApprove={canApprove}
        canCreate={canCreate}
        canDelete={canDelete}
        canUpdate={canUpdate}
        channelOptions={channels.map((item) => ({ label: label(item), value: item }))}
        columns={columns}
        currentUserName={user?.name}
        description="Kanban de comunicação, conteúdo e identidade visual do Projeto Pegasus."
        emptyStatus="ideas"
        labelsAsTab
        minDueDate={today}
        responsibleOptions={marketingUsers}
        filters={
          <FilterBar>
            <Select
              label="Canal"
              onChange={(event) => setChannel(event.target.value)}
              options={[
                { label: "Todos os canais", value: "todos" },
                ...channels.map((item) => ({ label: label(item), value: item })),
              ]}
              value={channel}
            />
            <Select
              label="Responsável"
              onChange={(event) => setAssignedTo(event.target.value)}
              options={[
                { label: "Todos os responsáveis", value: "todos" },
                ...owners.map((item) => ({ label: item, value: item })),
              ]}
              value={assignedTo}
            />
            <Select
              label="Prioridade"
              onChange={(event) => setPriority(event.target.value)}
              options={[
                { label: "Todas as prioridades", value: "todos" },
                { label: "Baixa", value: "baixa" },
                { label: "Média", value: "media" },
                { label: "Alta", value: "alta" },
              ]}
              value={priority}
            />
          </FilterBar>
        }
        icon={Megaphone}
        isLoading={isLoading}
        isSaving={isSaving}
        tasks={tasks}
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
        onMove={(task, status) =>
          saveWithFeedback(
            () => marketingService.updateTaskStatus(task.id, status).then(() => undefined),
            "Tarefa movida com sucesso.",
          )
        }
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
            "Tarefa reprovada e devolvida para Produção.",
          )
        }
      />
      ) : null}

      {activeTab === "identidade" ? (
      <section className="panel p-6">
        <div className="flex items-center gap-3">
          <Palette className="text-pegasus-primary" size={22} />
          <div>
            <h2 className="text-xl font-bold text-pegasus-navy">Identidade visual</h2>
            <p className="text-sm text-slate-500">Paleta, uso da marca e backlog de ideias para campanhas.</p>
          </div>
        </div>
        <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {palette.map(([name, color]) => (
            <div key={color} className="rounded-2xl border border-blue-100 bg-white p-4 shadow-sm">
              <div className="h-20 rounded-xl border border-slate-100" style={{ backgroundColor: color }} />
              <p className="mt-3 font-bold text-pegasus-navy">{name}</p>
              <p className="text-sm text-slate-500">{color}</p>
            </div>
          ))}
        </div>
        <div className="mt-6 grid gap-4 md:grid-cols-3">
          <div className="rounded-2xl border border-blue-100 bg-white p-5">
            <ShieldCheck className="text-pegasus-primary" size={20} />
            <h3 className="mt-3 font-bold text-pegasus-navy">Uso da logo</h3>
            <p className="mt-2 text-sm leading-6 text-slate-600">
              Manter contraste alto, área de respiro e preferir fundo branco ou azul escuro.
            </p>
          </div>
          <div className="rounded-2xl border border-blue-100 bg-white p-5">
            <Lightbulb className="text-pegasus-primary" size={20} />
            <h3 className="mt-3 font-bold text-pegasus-navy">Ideias de campanhas</h3>
            <p className="mt-2 text-sm leading-6 text-slate-600">
              Bastidores de treino, histórias de atletas, chamadas para voluntários e captação.
            </p>
          </div>
          <div className="rounded-2xl border border-blue-100 bg-white p-5">
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
