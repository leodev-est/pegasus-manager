import { ClipboardList } from "lucide-react";
import { useCallback, useEffect, useMemo, useState } from "react";
import { useAuth } from "../../auth/AuthContext";
import { AdvancedKanban } from "../../components/kanban/AdvancedKanban";
import { FilterBar } from "../../components/ui/FilterBar";
import { Input } from "../../components/ui/Input";
import { Select } from "../../components/ui/Select";
import { useToast } from "../../components/ui/Toast";
import { getApiErrorMessage } from "../../services/api";
import {
  kanbanService,
  type ManagementTask,
  type TaskPayload,
  type TaskPriority,
  type TaskStatus,
} from "../../services/kanbanService";

const columns: Array<{ label: string; value: TaskStatus }> = [
  { label: "A Fazer", value: "todo" },
  { label: "Em Andamento", value: "doing" },
  { label: "Concluído", value: "done" },
];

type ManagementForm = Required<Omit<TaskPayload, "area" | "channel">>;

function buildPayload(form: ManagementForm): TaskPayload {
  return {
    title: form.title,
    description: form.description,
    assignedTo: form.assignedTo,
    dueDate: form.dueDate,
    priority: form.priority,
    status: form.status,
    labels: form.labels,
    comments: form.comments,
    checklist: form.checklist,
    area: "management",
  };
}

export function ManagementKanbanPage() {
  const { hasPermission, user } = useAuth();
  const { showToast } = useToast();
  const canCreate = hasPermission(["gestao", "management:create"]);
  const canUpdate = hasPermission(["gestao", "management:update"]);
  const canDelete = hasPermission(["gestao", "management:delete"]);
  const [tasks, setTasks] = useState<ManagementTask[]>([]);
  const [assignedTo, setAssignedTo] = useState("todos");
  const [priority, setPriority] = useState("todos");
  const [search, setSearch] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);

  const owners = useMemo(
    () => Array.from(new Set(tasks.map((task) => task.assignedTo).filter(Boolean))) as string[],
    [tasks],
  );

  const loadTasks = useCallback(async () => {
    setIsLoading(true);

    try {
      const data = await kanbanService.getTasks({
        area: "management",
        assignedTo,
        priority: priority as TaskPriority | "todos",
        search,
      });
      setTasks(data);
    } catch (error) {
      showToast(getApiErrorMessage(error), "error");
    } finally {
      setIsLoading(false);
    }
  }, [assignedTo, priority, search, showToast]);

  useEffect(() => {
    loadTasks();
  }, [loadTasks]);

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
    <AdvancedKanban
      areaLabel="tarefas"
      canCreate={canCreate}
      canDelete={canDelete}
      canUpdate={canUpdate}
      columns={columns}
      currentUserName={user?.name}
      description="Planejamento administrativo, operacional e institucional do Projeto Pegasus."
      emptyStatus="todo"
      filters={
        <FilterBar>
          <Input label="Buscar por título" onChange={(event) => setSearch(event.target.value)} value={search} />
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
      icon={ClipboardList}
      isLoading={isLoading}
      isSaving={isSaving}
      tasks={tasks}
      title="Kanban de Gestão"
      onCreate={(form) =>
        saveWithFeedback(
          () => kanbanService.createTask(buildPayload(form as ManagementForm)).then(() => undefined),
          "Tarefa criada com sucesso.",
        )
      }
      onDelete={(task) =>
        saveWithFeedback(
          () => kanbanService.deleteTask(task.id),
          "Tarefa excluída com sucesso.",
        )
      }
      onMove={(task, status) =>
        saveWithFeedback(
          () => kanbanService.updateTaskStatus(task.id, status).then(() => undefined),
          "Tarefa movida com sucesso.",
        )
      }
      onUpdate={(task, form) =>
        saveWithFeedback(
          () => kanbanService.updateTask(task.id, buildPayload(form as ManagementForm)).then(() => undefined),
          "Tarefa atualizada com sucesso.",
        )
      }
    />
  );
}
