import { CalendarDays, Dumbbell, Loader2, Plus } from "lucide-react";
import { FormEvent, useCallback, useEffect, useMemo, useState } from "react";
import { useAuth } from "../../auth/AuthContext";
import { ActionButtons } from "../../components/ui/ActionButtons";
import { Button } from "../../components/ui/Button";
import { ConfirmDialog } from "../../components/ui/ConfirmDialog";
import { EmptyState } from "../../components/ui/EmptyState";
import { FilterBar } from "../../components/ui/FilterBar";
import { Input } from "../../components/ui/Input";
import { Modal } from "../../components/ui/Modal";
import { PageHeader } from "../../components/ui/PageHeader";
import { Select } from "../../components/ui/Select";
import { Textarea } from "../../components/ui/Textarea";
import { useToast } from "../../components/ui/Toast";
import { getApiErrorMessage } from "../../services/api";
import {
  trainingService,
  type Training,
  type TrainingPayload,
} from "../../services/trainingService";

type TrainingForm = TrainingPayload;

const currentMonth = new Date().toISOString().slice(0, 7);

const emptyTraining: TrainingForm = {
  date: new Date().toISOString().slice(0, 10),
  title: "",
  category: "",
  objective: "",
  warmup: "",
  fundamentals: "",
  mainPart: "",
  reducedGame: "",
  finalPart: "",
  notes: "",
  createdBy: "",
};

function formatDate(value?: string | null) {
  if (!value) return "-";
  return new Intl.DateTimeFormat("pt-BR", { timeZone: "UTC" }).format(new Date(value));
}

function toInputDate(value: string) {
  return value.slice(0, 10);
}

function trainingToForm(training: Training): TrainingForm {
  return {
    date: toInputDate(training.date),
    title: training.title,
    category: training.category ?? "",
    objective: training.objective ?? "",
    warmup: training.warmup ?? "",
    fundamentals: training.fundamentals ?? "",
    mainPart: training.mainPart ?? "",
    reducedGame: training.reducedGame ?? "",
    finalPart: training.finalPart ?? "",
    notes: training.notes ?? "",
    createdBy: training.createdBy,
  };
}

function buildPayload(form: TrainingForm): TrainingPayload {
  return {
    date: form.date,
    title: form.title,
    category: form.category,
    objective: form.objective,
    warmup: form.warmup,
    fundamentals: form.fundamentals,
    mainPart: form.mainPart,
    reducedGame: form.reducedGame,
    finalPart: form.finalPart,
    notes: form.notes,
    createdBy: form.createdBy,
  };
}

export function TrainingsPage() {
  const { hasPermission, user } = useAuth();
  const { showToast } = useToast();
  const canCreate = hasPermission(["trainings:create"]);
  const canUpdate = hasPermission(["trainings:update"]);
  const canDelete = hasPermission(["trainings:delete"]);
  const [trainings, setTrainings] = useState<Training[]>([]);
  const [category, setCategory] = useState("todos");
  const [month, setMonth] = useState(currentMonth);
  const [search, setSearch] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingTraining, setEditingTraining] = useState<Training | null>(null);
  const [viewTraining, setViewTraining] = useState<Training | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<Training | null>(null);
  const [form, setForm] = useState<TrainingForm>(emptyTraining);

  const categories = useMemo(
    () => Array.from(new Set(trainings.map((training) => training.category).filter(Boolean))) as string[],
    [trainings],
  );

  const groupedTrainings = useMemo(() => {
    const groups = new Map<string, Training[]>();

    for (const training of trainings) {
      const key = training.date.slice(0, 10);
      groups.set(key, [...(groups.get(key) ?? []), training]);
    }

    return Array.from(groups.entries()).map(([date, dateTrainings]) => ({
      date,
      trainings: dateTrainings,
    }));
  }, [trainings]);

  const loadTrainings = useCallback(async () => {
    setIsLoading(true);

    try {
      const data = await trainingService.getAll({
        category,
        month,
        search,
      });
      setTrainings(data);
    } catch (error) {
      showToast(getApiErrorMessage(error), "error");
    } finally {
      setIsLoading(false);
    }
  }, [category, month, search, showToast]);

  useEffect(() => {
    loadTrainings();
  }, [loadTrainings]);

  function openCreateModal() {
    setEditingTraining(null);
    setForm({ ...emptyTraining, createdBy: user?.name ?? "" });
    setIsModalOpen(true);
  }

  function openEditModal(training: Training) {
    setEditingTraining(training);
    setForm(trainingToForm(training));
    setIsModalOpen(true);
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setIsSaving(true);

    try {
      if (editingTraining) {
        await trainingService.update(editingTraining.id, buildPayload(form));
        showToast("Treino atualizado com sucesso.", "success");
      } else {
        await trainingService.create(buildPayload(form));
        showToast("Treino criado com sucesso.", "success");
      }

      setIsModalOpen(false);
      await loadTrainings();
    } catch (error) {
      showToast(getApiErrorMessage(error), "error");
    } finally {
      setIsSaving(false);
    }
  }

  async function confirmDelete() {
    if (!deleteTarget) return;
    setIsSaving(true);

    try {
      await trainingService.remove(deleteTarget.id);
      showToast("Treino excluído com sucesso.", "success");
      setDeleteTarget(null);
      await loadTrainings();
    } catch (error) {
      showToast(getApiErrorMessage(error), "error");
    } finally {
      setIsSaving(false);
    }
  }

  return (
    <div className="space-y-8">
      <PageHeader
        title="Treinos"
        description="Planejamento técnico dos treinos, separado por data e blocos de atividade."
        action={
          canCreate ? (
            <Button onClick={openCreateModal} className="w-full sm:w-auto">
              <Plus size={17} />
              Novo treino
            </Button>
          ) : null
        }
      />

      <FilterBar>
        <Input
          label="Buscar"
          onChange={(event) => setSearch(event.target.value)}
          value={search}
        />
        <Select
          label="Categoria"
          onChange={(event) => setCategory(event.target.value)}
          options={[
            { label: "Todas as categorias", value: "todos" },
            ...categories.map((item) => ({ label: item, value: item })),
          ]}
          value={category}
        />
        <Input label="Mês" onChange={(event) => setMonth(event.target.value)} type="month" value={month} />
      </FilterBar>

      <section className="panel overflow-hidden">
        <div className="flex items-center gap-3 border-b border-blue-100 p-6">
          <CalendarDays className="text-pegasus-primary" size={22} />
          <div>
            <h2 className="text-xl font-bold text-pegasus-navy">Planejamento por data</h2>
            <p className="text-sm text-slate-500">{trainings.length} treino(s) encontrados.</p>
          </div>
        </div>

        {isLoading ? (
          <div className="flex items-center gap-3 p-6 text-sm font-bold text-pegasus-primary">
            <Loader2 className="animate-spin" size={18} />
            Carregando treinos
          </div>
        ) : groupedTrainings.length > 0 ? (
          <div className="space-y-5 p-4 sm:p-6">
            {groupedTrainings.map((group) => (
              <section key={group.date}>
                <h3 className="mb-3 text-sm font-black uppercase tracking-[0.12em] text-pegasus-medium">
                  Treino do dia {formatDate(group.date)}
                </h3>
                <div className="grid gap-3 lg:grid-cols-2">
                  {group.trainings.map((training) => (
                    <article key={training.id} className="rounded-2xl border border-blue-100 bg-white p-4 shadow-sm">
                      <div className="flex items-start gap-3">
                        <span className="rounded-2xl bg-pegasus-ice p-3 text-pegasus-primary">
                          <Dumbbell size={18} />
                        </span>
                        <div className="min-w-0 flex-1">
                          <p className="text-sm font-bold text-pegasus-primary">{training.category ?? "Treino"}</p>
                          <h4 className="mt-1 font-bold text-pegasus-navy">{training.title}</h4>
                          <p className="mt-2 text-sm leading-6 text-slate-600">{training.objective ?? "Sem objetivo informado."}</p>
                        </div>
                      </div>
                      <div className="mt-4 grid gap-2 text-sm text-slate-600 sm:grid-cols-2">
                        <p><strong className="text-pegasus-navy">Aquecimento:</strong> {training.warmup ?? "-"}</p>
                        <p><strong className="text-pegasus-navy">Fundamento:</strong> {training.fundamentals ?? "-"}</p>
                        <p><strong className="text-pegasus-navy">Jogo reduzido:</strong> {training.reducedGame ?? "-"}</p>
                        <p><strong className="text-pegasus-navy">Criado por:</strong> {training.createdBy}</p>
                      </div>
                      <div className="mt-4 border-t border-blue-50 pt-3">
                        <ActionButtons
                          canDelete={canDelete}
                          canEdit={canUpdate}
                          onDelete={() => setDeleteTarget(training)}
                          onEdit={() => openEditModal(training)}
                          onView={() => setViewTraining(training)}
                        />
                      </div>
                    </article>
                  ))}
                </div>
              </section>
            ))}
          </div>
        ) : (
          <div className="p-6">
            <EmptyState
              description="Ajuste os filtros ou cadastre um novo treino."
              icon={CalendarDays}
              title="Nenhum treino encontrado"
            />
          </div>
        )}
      </section>

      <Modal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} title={editingTraining ? "Editar treino" : "Novo treino"}>
        <form className="grid gap-4" onSubmit={handleSubmit}>
          <div className="grid gap-4 md:grid-cols-2">
            <Input disabled={isSaving} label="Data" onChange={(event) => setForm({ ...form, date: event.target.value })} required type="date" value={form.date} />
            <Input disabled={isSaving} label="Título" onChange={(event) => setForm({ ...form, title: event.target.value })} required value={form.title} />
            <Input disabled={isSaving} label="Categoria" onChange={(event) => setForm({ ...form, category: event.target.value })} value={form.category} />
            <Input disabled={isSaving} label="Criado por" onChange={(event) => setForm({ ...form, createdBy: event.target.value })} required value={form.createdBy} />
          </div>
          <Textarea disabled={isSaving} label="Objetivo" onChange={(event) => setForm({ ...form, objective: event.target.value })} value={form.objective} />
          <Textarea disabled={isSaving} label="Aquecimento" onChange={(event) => setForm({ ...form, warmup: event.target.value })} value={form.warmup} />
          <Textarea disabled={isSaving} label="Fundamento" onChange={(event) => setForm({ ...form, fundamentals: event.target.value })} value={form.fundamentals} />
          <Textarea disabled={isSaving} label="Parte principal" onChange={(event) => setForm({ ...form, mainPart: event.target.value })} rows={6} value={form.mainPart} />
          <Textarea disabled={isSaving} label="Jogo reduzido" onChange={(event) => setForm({ ...form, reducedGame: event.target.value })} value={form.reducedGame} />
          <Textarea disabled={isSaving} label="Parte final" onChange={(event) => setForm({ ...form, finalPart: event.target.value })} value={form.finalPart} />
          <Textarea disabled={isSaving} label="Observações" onChange={(event) => setForm({ ...form, notes: event.target.value })} value={form.notes} />
          <div className="flex flex-col gap-3 sm:flex-row">
            <Button disabled={isSaving} type="submit">
              {isSaving ? <Loader2 className="animate-spin" size={17} /> : null}
              {editingTraining ? "Salvar alterações" : "Criar treino"}
            </Button>
            <Button disabled={isSaving} onClick={() => setIsModalOpen(false)} variant="secondary">
              Cancelar
            </Button>
          </div>
        </form>
      </Modal>

      <Modal isOpen={Boolean(viewTraining)} onClose={() => setViewTraining(null)} title={viewTraining?.title ?? "Detalhes do treino"}>
        {viewTraining ? (
          <div className="space-y-4 text-sm leading-6 text-slate-600">
            <div className="rounded-2xl bg-pegasus-surface p-4">
              <p><strong className="text-pegasus-navy">Data:</strong> {formatDate(viewTraining.date)}</p>
              <p><strong className="text-pegasus-navy">Categoria:</strong> {viewTraining.category ?? "-"}</p>
              <p><strong className="text-pegasus-navy">Criado por:</strong> {viewTraining.createdBy}</p>
            </div>
            {[
              ["Objetivo", viewTraining.objective],
              ["Aquecimento", viewTraining.warmup],
              ["Fundamento", viewTraining.fundamentals],
              ["Parte principal", viewTraining.mainPart],
              ["Jogo reduzido", viewTraining.reducedGame],
              ["Finalização", viewTraining.finalPart],
              ["Observações", viewTraining.notes],
            ].map(([title, value]) => (
              <section className="rounded-2xl border border-blue-100 bg-white p-4" key={title}>
                <h3 className="font-black text-pegasus-navy">{title}</h3>
                <p className="mt-2 whitespace-pre-wrap">{value || "-"}</p>
              </section>
            ))}
          </div>
        ) : null}
      </Modal>

      <ConfirmDialog
        confirmLabel={isSaving ? "Excluindo..." : "Excluir treino"}
        description={`Deseja excluir "${deleteTarget?.title ?? "este treino"}"?`}
        isOpen={Boolean(deleteTarget)}
        onClose={() => setDeleteTarget(null)}
        onConfirm={confirmDelete}
        title="Confirmar exclusão"
      />
    </div>
  );
}

