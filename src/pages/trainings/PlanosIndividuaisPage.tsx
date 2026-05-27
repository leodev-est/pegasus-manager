import { ClipboardList, Loader2, Pencil, Plus, Trash2, X } from "lucide-react";
import { FormEvent, useCallback, useEffect, useState } from "react";
import { Button } from "../../components/ui/Button";
import { ConfirmDialog } from "../../components/ui/ConfirmDialog";
import { EmptyState } from "../../components/ui/EmptyState";
import { Input } from "../../components/ui/Input";
import { Modal } from "../../components/ui/Modal";
import { PageHeader } from "../../components/ui/PageHeader";
import { Select } from "../../components/ui/Select";
import { Textarea } from "../../components/ui/Textarea";
import { useToast } from "../../components/ui/Toast";
import { getApiErrorMessage } from "../../services/api";
import { athleteService, type Athlete } from "../../services/athleteService";
import { trainingPlanService, type Exercise, type TrainingPlan } from "../../services/trainingPlanService";

function formatDate(value: string | null) {
  if (!value) return null;
  return new Intl.DateTimeFormat("pt-BR", { timeZone: "UTC" }).format(new Date(value));
}

function isExpired(plan: TrainingPlan) {
  if (!plan.endDate) return false;
  return new Date(plan.endDate) < new Date();
}

type PlanForm = {
  title: string;
  description: string;
  goals: string;
  startDate: string;
  endDate: string;
  active: boolean;
  exercises: Exercise[];
};

const emptyExercise: Exercise = { name: "", sets: "", reps: "", notes: "" };
const emptyForm: PlanForm = {
  title: "",
  description: "",
  goals: "",
  startDate: "",
  endDate: "",
  active: true,
  exercises: [{ ...emptyExercise }],
};

export function PlanosIndividuaisPage() {
  const { showToast } = useToast();

  const [athletes, setAthletes] = useState<Athlete[]>([]);
  const [selectedAthleteId, setSelectedAthleteId] = useState("");
  const [plans, setPlans] = useState<TrainingPlan[]>([]);
  const [isLoadingAthletes, setIsLoadingAthletes] = useState(true);
  const [isLoadingPlans, setIsLoadingPlans] = useState(false);

  const [createModal, setCreateModal] = useState(false);
  const [editTarget, setEditTarget] = useState<TrainingPlan | null>(null);
  const [form, setForm] = useState<PlanForm>(emptyForm);
  const [isSaving, setIsSaving] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<TrainingPlan | null>(null);

  useEffect(() => {
    athleteService.getAll()
      .then((all) => setAthletes(all.filter((a) => a.status === "ativo" || a.status === "teste")))
      .catch(() => {})
      .finally(() => setIsLoadingAthletes(false));
  }, []);

  const loadPlans = useCallback(async (athleteId: string) => {
    if (!athleteId) { setPlans([]); return; }
    setIsLoadingPlans(true);
    try {
      setPlans(await trainingPlanService.list(athleteId));
    } catch {
      // silent
    } finally {
      setIsLoadingPlans(false);
    }
  }, []);

  useEffect(() => { loadPlans(selectedAthleteId); }, [selectedAthleteId, loadPlans]);

  function openCreate() {
    setForm({ ...emptyForm, exercises: [{ ...emptyExercise }] });
    setCreateModal(true);
  }

  function openEdit(plan: TrainingPlan) {
    setEditTarget(plan);
    setForm({
      title: plan.title,
      description: plan.description ?? "",
      goals: plan.goals ?? "",
      startDate: plan.startDate ? plan.startDate.slice(0, 10) : "",
      endDate: plan.endDate ? plan.endDate.slice(0, 10) : "",
      active: plan.active,
      exercises: plan.exercises.length > 0 ? plan.exercises : [{ ...emptyExercise }],
    });
  }

  function addExercise() {
    setForm((prev) => ({ ...prev, exercises: [...prev.exercises, { ...emptyExercise }] }));
  }

  function removeExercise(idx: number) {
    setForm((prev) => ({ ...prev, exercises: prev.exercises.filter((_, i) => i !== idx) }));
  }

  function updateExercise(idx: number, field: keyof Exercise, value: string) {
    setForm((prev) => ({
      ...prev,
      exercises: prev.exercises.map((ex, i) => i === idx ? { ...ex, [field]: value } : ex),
    }));
  }

  function buildPayload() {
    const exercises = form.exercises.filter((ex) => ex.name.trim());
    return {
      title: form.title.trim(),
      description: form.description.trim() || undefined,
      goals: form.goals.trim() || undefined,
      startDate: form.startDate || undefined,
      endDate: form.endDate || undefined,
      exercises,
      active: form.active,
    };
  }

  async function handleCreate(e: FormEvent) {
    e.preventDefault();
    if (!selectedAthleteId) { showToast("Selecione um atleta.", "error"); return; }
    if (!form.title.trim()) { showToast("Título é obrigatório.", "error"); return; }
    setIsSaving(true);
    try {
      await trainingPlanService.create({ athleteId: selectedAthleteId, ...buildPayload() });
      showToast("Plano criado!", "success");
      setCreateModal(false);
      await loadPlans(selectedAthleteId);
    } catch (err) {
      showToast(getApiErrorMessage(err), "error");
    } finally {
      setIsSaving(false);
    }
  }

  async function handleEdit(e: FormEvent) {
    e.preventDefault();
    if (!editTarget) return;
    setIsSaving(true);
    try {
      await trainingPlanService.update(editTarget.id, buildPayload());
      showToast("Plano atualizado.", "success");
      setEditTarget(null);
      await loadPlans(selectedAthleteId);
    } catch (err) {
      showToast(getApiErrorMessage(err), "error");
    } finally {
      setIsSaving(false);
    }
  }

  async function confirmDelete() {
    if (!deleteTarget) return;
    setIsSaving(true);
    try {
      await trainingPlanService.remove(deleteTarget.id);
      showToast("Plano removido.", "success");
      setDeleteTarget(null);
      await loadPlans(selectedAthleteId);
    } catch (err) {
      showToast(getApiErrorMessage(err), "error");
    } finally {
      setIsSaving(false);
    }
  }

  const selectedAthlete = athletes.find((a) => a.id === selectedAthleteId);

  return (
    <div className="space-y-8">
      <PageHeader
        title="Planos Individuais"
        description="Crie e gerencie planos de treino individuais para os atletas."
        action={
          selectedAthleteId ? (
            <Button onClick={openCreate}>
              <Plus size={17} />Novo plano
            </Button>
          ) : undefined
        }
      />

      {/* Athlete selector */}
      {isLoadingAthletes ? (
        <div className="flex items-center gap-2 text-sm text-pegasus-primary">
          <Loader2 className="animate-spin" size={16} />Carregando atletas...
        </div>
      ) : (
        <Select
          label="Atleta"
          value={selectedAthleteId}
          onChange={(e) => setSelectedAthleteId(e.target.value)}
          options={[
            { label: "Selecione um atleta", value: "" },
            ...athletes.map((a) => ({ label: a.name, value: a.id })),
          ]}
        />
      )}

      {/* Plans list */}
      {selectedAthleteId && (
        isLoadingPlans ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="animate-spin text-pegasus-primary" size={28} />
          </div>
        ) : plans.length === 0 ? (
          <EmptyState
            icon={ClipboardList}
            title="Sem planos"
            description={`Nenhum plano cadastrado para ${selectedAthlete?.name ?? "este atleta"}.`}
          />
        ) : (
          <div className="space-y-4">
            {plans.map((plan) => (
              <div key={plan.id} className={`panel p-5 border-l-4 ${plan.active && !isExpired(plan) ? "border-pegasus-primary" : "border-slate-200"}`}>
                <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <h2 className="font-black text-pegasus-navy">{plan.title}</h2>
                      {plan.active && !isExpired(plan) ? (
                        <span className="rounded-full bg-emerald-100 px-2.5 py-0.5 text-xs font-bold text-emerald-700">Ativo</span>
                      ) : (
                        <span className="rounded-full bg-slate-100 px-2.5 py-0.5 text-xs font-semibold text-slate-500">
                          {isExpired(plan) ? "Expirado" : "Inativo"}
                        </span>
                      )}
                    </div>
                    {(plan.startDate || plan.endDate) && (
                      <p className="mt-1 text-xs text-slate-400">
                        {formatDate(plan.startDate)}
                        {plan.startDate && plan.endDate ? " → " : ""}
                        {formatDate(plan.endDate)}
                      </p>
                    )}
                    {plan.goals && (
                      <p className="mt-2 text-sm text-slate-600 line-clamp-2">{plan.goals}</p>
                    )}
                    {plan.exercises.length > 0 && (
                      <p className="mt-1 text-xs text-slate-400">{plan.exercises.length} exercício{plan.exercises.length !== 1 ? "s" : ""}</p>
                    )}
                  </div>
                  <div className="flex shrink-0 gap-2">
                    <Button className="h-8 px-3 text-xs" variant="secondary" onClick={() => openEdit(plan)}>
                      <Pencil size={13} />Editar
                    </Button>
                    <Button className="h-8 px-3 text-xs" variant="danger" onClick={() => setDeleteTarget(plan)}>
                      <Trash2 size={13} />
                    </Button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )
      )}

      {/* Create/Edit modal shared component */}
      {[
        { isOpen: createModal, onClose: () => setCreateModal(false), title: "Novo plano de treino", onSubmit: handleCreate },
        { isOpen: Boolean(editTarget), onClose: () => setEditTarget(null), title: "Editar plano", onSubmit: handleEdit },
      ].map((modal) => (
        <Modal key={modal.title} isOpen={modal.isOpen} onClose={modal.onClose} title={modal.title}>
          <form className="grid gap-4" onSubmit={modal.onSubmit}>
            <Input
              label="Título"
              value={form.title}
              onChange={(e) => setForm({ ...form, title: e.target.value })}
              required
              disabled={isSaving}
            />
            <Textarea
              label="Objetivos (opcional)"
              value={form.goals}
              onChange={(e) => setForm({ ...form, goals: e.target.value })}
              rows={3}
              disabled={isSaving}
            />
            <Textarea
              label="Descrição (opcional)"
              value={form.description}
              onChange={(e) => setForm({ ...form, description: e.target.value })}
              rows={2}
              disabled={isSaving}
            />
            <div className="grid gap-4 sm:grid-cols-2">
              <Input
                label="Data de início (opcional)"
                type="date"
                value={form.startDate}
                onChange={(e) => setForm({ ...form, startDate: e.target.value })}
                disabled={isSaving}
              />
              <Input
                label="Data de término (opcional)"
                type="date"
                value={form.endDate}
                onChange={(e) => setForm({ ...form, endDate: e.target.value })}
                disabled={isSaving}
              />
            </div>

            <div>
              <div className="mb-2 flex items-center justify-between">
                <label className="text-sm font-semibold text-pegasus-navy">Exercícios</label>
                <button
                  type="button"
                  onClick={addExercise}
                  className="flex items-center gap-1 text-xs font-semibold text-pegasus-primary hover:underline"
                >
                  <Plus size={13} />Adicionar
                </button>
              </div>
              <div className="space-y-3">
                {form.exercises.map((ex, idx) => (
                  <div key={idx} className="relative rounded-2xl border border-blue-100 bg-pegasus-surface p-3">
                    {form.exercises.length > 1 && (
                      <button
                        type="button"
                        onClick={() => removeExercise(idx)}
                        className="absolute right-2 top-2 text-slate-400 hover:text-rose-500"
                      >
                        <X size={14} />
                      </button>
                    )}
                    <p className="mb-2 text-xs font-bold text-pegasus-primary">Exercício {idx + 1}</p>
                    <div className="grid gap-2">
                      <Input
                        label="Nome"
                        value={ex.name}
                        onChange={(e) => updateExercise(idx, "name", e.target.value)}
                        disabled={isSaving}
                      />
                      <div className="grid grid-cols-2 gap-2">
                        <Input
                          label="Séries"
                          value={ex.sets}
                          onChange={(e) => updateExercise(idx, "sets", e.target.value)}
                          placeholder="ex: 3"
                          disabled={isSaving}
                        />
                        <Input
                          label="Repetições"
                          value={ex.reps}
                          onChange={(e) => updateExercise(idx, "reps", e.target.value)}
                          placeholder="ex: 12"
                          disabled={isSaving}
                        />
                      </div>
                      <Input
                        label="Observação (opcional)"
                        value={ex.notes ?? ""}
                        onChange={(e) => updateExercise(idx, "notes", e.target.value)}
                        disabled={isSaving}
                      />
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <label className="flex cursor-pointer items-center gap-2">
              <input
                type="checkbox"
                checked={form.active}
                onChange={(e) => setForm({ ...form, active: e.target.checked })}
                className="h-4 w-4 rounded accent-pegasus-primary"
                disabled={isSaving}
              />
              <span className="text-sm font-semibold text-pegasus-navy">Plano ativo</span>
            </label>

            <div className="flex flex-col gap-3 sm:flex-row">
              <Button type="submit" disabled={isSaving}>
                {isSaving ? <Loader2 className="animate-spin" size={17} /> : null}
                Salvar plano
              </Button>
              <Button variant="secondary" onClick={modal.onClose} disabled={isSaving}>Cancelar</Button>
            </div>
          </form>
        </Modal>
      ))}

      <ConfirmDialog
        isOpen={Boolean(deleteTarget)}
        onClose={() => setDeleteTarget(null)}
        onConfirm={confirmDelete}
        title="Remover plano"
        description={`Deseja remover o plano "${deleteTarget?.title ?? ""}"?`}
        confirmLabel={isSaving ? "Removendo..." : "Remover"}
      />
    </div>
  );
}
