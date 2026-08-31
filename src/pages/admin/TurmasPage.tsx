import { Loader2, Plus, Users } from "lucide-react";
import { FormEvent, useCallback, useEffect, useState } from "react";
import { ActionButtons } from "../../components/ui/ActionButtons";
import { Button } from "../../components/ui/Button";
import { ConfirmDialog } from "../../components/ui/ConfirmDialog";
import { EmptyState } from "../../components/ui/EmptyState";
import { Input } from "../../components/ui/Input";
import { Modal } from "../../components/ui/Modal";
import { PageHeader } from "../../components/ui/PageHeader";
import { Select } from "../../components/ui/Select";
import { useToast } from "../../components/ui/Toast";
import { getApiErrorMessage } from "../../services/api";
import { turmaService, type Turma, type TurmaPayload } from "../../services/turmaService";

const daysOptions = [
  { value: "monday", label: "Segunda" },
  { value: "tuesday", label: "Terça" },
  { value: "wednesday", label: "Quarta" },
  { value: "thursday", label: "Quinta" },
  { value: "friday", label: "Sexta" },
  { value: "saturday", label: "Sábado" },
  { value: "sunday", label: "Domingo" },
];

const colorPresets = ["#ec4899", "#0D47A1", "#22c55e", "#f59e0b", "#8b5cf6", "#06b6d4"];

type TurmaForm = {
  name: string;
  gender: "masculino" | "feminino" | "";
  daysOfWeek: string[];
  time: string;
  location: string;
  dependency: string;
  color: string;
  active: boolean;
  order: number;
  startDate: string;
};

const emptyForm: TurmaForm = {
  name: "",
  gender: "",
  daysOfWeek: [],
  time: "",
  location: "",
  dependency: "",
  color: colorPresets[0],
  active: true,
  order: 0,
  startDate: "",
};

const genderOptions = [
  { value: "", label: "Mista (sem atribuição automática por sexo)" },
  { value: "masculino", label: "Masculino" },
  { value: "feminino", label: "Feminino" },
];

function turmaToForm(turma: Turma): TurmaForm {
  return {
    name: turma.name,
    gender: turma.gender ?? "",
    daysOfWeek: turma.daysOfWeek,
    time: turma.time,
    location: turma.location,
    dependency: turma.dependency ?? "",
    color: turma.color,
    active: turma.active,
    order: turma.order,
    startDate: turma.startDate ?? "",
  };
}

function buildPayload(form: TurmaForm): TurmaPayload {
  return {
    name: form.name,
    gender: form.gender || null,
    daysOfWeek: form.daysOfWeek,
    time: form.time,
    location: form.location,
    dependency: form.dependency || null,
    color: form.color,
    active: form.active,
    order: form.order,
    startDate: form.startDate || null,
  };
}

function dayLabels(days: string[]): string {
  return days
    .map((d) => daysOptions.find((o) => o.value === d)?.label ?? d)
    .join(", ") || "Nenhum dia selecionado";
}

export function TurmasPage() {
  const { showToast } = useToast();
  const [turmas, setTurmas] = useState<Turma[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingTurma, setEditingTurma] = useState<Turma | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<Turma | null>(null);
  const [form, setForm] = useState<TurmaForm>(emptyForm);
  const [formErrors, setFormErrors] = useState<Partial<Record<"name" | "time" | "location" | "daysOfWeek", string>>>({});

  const loadTurmas = useCallback(async () => {
    setIsLoading(true);
    try {
      setTurmas(await turmaService.getAll());
    } catch (error) {
      showToast(getApiErrorMessage(error), "error");
    } finally {
      setIsLoading(false);
    }
  }, [showToast]);

  useEffect(() => {
    loadTurmas();
  }, [loadTurmas]);

  function openCreateModal() {
    setEditingTurma(null);
    setForm(emptyForm);
    setFormErrors({});
    setIsModalOpen(true);
  }

  function openEditModal(turma: Turma) {
    setEditingTurma(turma);
    setForm(turmaToForm(turma));
    setFormErrors({});
    setIsModalOpen(true);
  }

  function toggleDay(day: string) {
    setForm((f) => ({
      ...f,
      daysOfWeek: f.daysOfWeek.includes(day) ? f.daysOfWeek.filter((d) => d !== day) : [...f.daysOfWeek, day],
    }));
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    const errors: typeof formErrors = {};
    if (!form.name.trim()) errors.name = "Informe o nome da turma.";
    if (!form.time.trim()) errors.time = "Informe o horário.";
    if (!form.location.trim()) errors.location = "Informe o local do treino.";
    if (form.daysOfWeek.length === 0) errors.daysOfWeek = "Selecione ao menos um dia de treino.";
    setFormErrors(errors);
    if (Object.keys(errors).length > 0) return;

    setIsSaving(true);

    try {
      if (editingTurma) {
        await turmaService.update(editingTurma.id, buildPayload(form));
        showToast("Turma atualizada com sucesso.", "success");
      } else {
        await turmaService.create(buildPayload(form));
        showToast("Turma criada com sucesso.", "success");
      }
      setIsModalOpen(false);
      await loadTurmas();
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
      await turmaService.delete(deleteTarget.id);
      showToast("Turma excluída com sucesso.", "success");
      setDeleteTarget(null);
      await loadTurmas();
    } catch (error) {
      showToast(getApiErrorMessage(error), "error");
    } finally {
      setIsSaving(false);
    }
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Turmas"
        description="Cada turma tem seus próprios dias, horário e local — usados na chamada, no formulário de inscrição e nos lembretes."
        action={
          <Button onClick={openCreateModal} className="w-full sm:w-auto">
            <Plus size={17} />
            Nova turma
          </Button>
        }
      />

      <section className="panel overflow-hidden">
        <div className="flex items-center gap-3 border-b border-stone-200 p-6">
          <Users className="text-pegasus-primary" size={22} />
          <div>
            <h2 className="text-xl font-bold text-pegasus-navy">Turmas cadastradas</h2>
            <p className="text-sm text-slate-500">{turmas.length} turma(s).</p>
          </div>
        </div>

        {isLoading ? (
          <div className="flex items-center gap-3 p-6 text-sm font-bold text-pegasus-primary">
            <Loader2 className="animate-spin" size={18} />
            Carregando turmas
          </div>
        ) : turmas.length > 0 ? (
          <div className="grid gap-3 p-4 sm:p-6 lg:grid-cols-2">
            {turmas.map((turma) => (
              <article key={turma.id} className="rounded-2xl border border-stone-200 bg-white p-4 shadow-sm">
                <div className="flex items-start gap-3">
                  <span className="mt-1 h-4 w-4 shrink-0 rounded-full" style={{ backgroundColor: turma.color }} />
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <h4 className="font-bold text-pegasus-navy">{turma.name}</h4>
                      {turma.gender && (
                        <span className={`rounded-full px-2 py-0.5 text-[10px] font-bold ${turma.gender === "masculino" ? "bg-blue-100 text-blue-700" : "bg-pink-100 text-pink-700"}`}>
                          {turma.gender === "masculino" ? "Masc." : "Fem."}
                        </span>
                      )}
                      {!turma.active && (
                        <span className="rounded-full bg-slate-100 px-2 py-0.5 text-[10px] font-bold text-slate-500">Inativa</span>
                      )}
                    </div>
                    <p className="mt-1 text-sm text-slate-600">{dayLabels(turma.daysOfWeek)} · {turma.time}</p>
                    <p className="mt-1 text-sm text-slate-500">{turma.location}{turma.dependency ? ` (${turma.dependency})` : ""}</p>
                    {turma.startDate && (
                      <p className="mt-1 text-xs text-slate-400">
                        Treinos oficiais a partir de {new Intl.DateTimeFormat("pt-BR", { timeZone: "UTC" }).format(new Date(`${turma.startDate}T00:00:00.000Z`))}
                      </p>
                    )}
                  </div>
                </div>
                <div className="mt-4 border-t border-stone-100 pt-3">
                  <ActionButtons canDelete canEdit onDelete={() => setDeleteTarget(turma)} onEdit={() => openEditModal(turma)} />
                </div>
              </article>
            ))}
          </div>
        ) : (
          <div className="p-6">
            <EmptyState
              action={
                <Button onClick={openCreateModal}>
                  <Plus size={17} />
                  Nova turma
                </Button>
              }
              description="Cadastre a primeira turma pra começar a usar chamada, inscrição e lembretes por turma."
              icon={Users}
              title="Nenhuma turma cadastrada"
            />
          </div>
        )}
      </section>

      <Modal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} title={editingTurma ? "Editar turma" : "Nova turma"}>
        <form className="grid gap-4" onSubmit={handleSubmit}>
          <Input disabled={isSaving} error={formErrors.name} label="Nome" onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="Ex: Feminino, Masculino, Feminino Sub-18" required value={form.name} />

          <Select
            disabled={isSaving}
            label="Gênero da turma"
            onChange={(e) => setForm({ ...form, gender: e.target.value as TurmaForm["gender"] })}
            options={genderOptions}
            value={form.gender}
          />

          <div>
            <p className="mb-2 text-sm font-medium text-slate-700">Dias de treino</p>
            <div className="flex flex-wrap gap-2">
              {daysOptions.map((d) => (
                <button
                  key={d.value}
                  type="button"
                  disabled={isSaving}
                  onClick={() => toggleDay(d.value)}
                  className={`rounded-full border px-3 py-1.5 text-xs font-bold transition ${
                    form.daysOfWeek.includes(d.value)
                      ? "border-pegasus-primary bg-pegasus-primary text-white"
                      : "border-stone-200 text-slate-600 hover:bg-pegasus-surface"
                  }`}
                >
                  {d.label}
                </button>
              ))}
            </div>
            {formErrors.daysOfWeek ? (
              <p role="alert" className="mt-1.5 text-xs font-semibold text-rose-600">{formErrors.daysOfWeek}</p>
            ) : null}
          </div>

          <div className="grid gap-4 md:grid-cols-2">
            <Input disabled={isSaving} error={formErrors.time} label="Horário" onChange={(e) => setForm({ ...form, time: e.target.value })} placeholder="Ex: 16:00 às 17:30" required value={form.time} />
            <Input disabled={isSaving} label="Data de início (opcional)" onChange={(e) => setForm({ ...form, startDate: e.target.value })} type="date" value={form.startDate} />
          </div>

          <Input disabled={isSaving} error={formErrors.location} label="Local" onChange={(e) => setForm({ ...form, location: e.target.value })} placeholder="Endereço completo" required value={form.location} />
          <Input disabled={isSaving} label="Dependência (opcional)" onChange={(e) => setForm({ ...form, dependency: e.target.value })} placeholder="Ex: Quadra - CREC" value={form.dependency} />

          <div>
            <p className="mb-2 text-sm font-medium text-slate-700">Cor</p>
            <div className="flex flex-wrap gap-2">
              {colorPresets.map((color) => (
                <button
                  key={color}
                  type="button"
                  disabled={isSaving}
                  onClick={() => setForm({ ...form, color })}
                  className={`h-8 w-8 rounded-full transition ${form.color === color ? "ring-2 ring-offset-2 ring-pegasus-primary" : ""}`}
                  style={{ backgroundColor: color }}
                  aria-label={color}
                />
              ))}
            </div>
          </div>

          <label className="flex items-center gap-2 text-sm font-medium text-slate-700">
            <input
              checked={form.active}
              disabled={isSaving}
              onChange={(e) => setForm({ ...form, active: e.target.checked })}
              type="checkbox"
            />
            Turma ativa
          </label>

          <div className="flex flex-col gap-3 sm:flex-row">
            <Button disabled={isSaving} type="submit">
              {isSaving ? <Loader2 className="animate-spin" size={17} /> : null}
              {editingTurma ? "Salvar alterações" : "Criar turma"}
            </Button>
            <Button disabled={isSaving} onClick={() => setIsModalOpen(false)} variant="secondary">
              Cancelar
            </Button>
          </div>
        </form>
      </Modal>

      <ConfirmDialog
        confirmLabel={isSaving ? "Excluindo..." : "Excluir turma"}
        description={`Deseja excluir "${deleteTarget?.name ?? "esta turma"}"? Só é possível se não houver atletas nela.`}
        isOpen={Boolean(deleteTarget)}
        onClose={() => setDeleteTarget(null)}
        onConfirm={confirmDelete}
        title="Confirmar exclusão"
      />
    </div>
  );
}
