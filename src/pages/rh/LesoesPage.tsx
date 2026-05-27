import { Activity, Loader2, Pencil, Plus, Trash2 } from "lucide-react";
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
import { injuryService, type Injury } from "../../services/injuryService";
import { useTour } from "../../tours/useTour";

const TOUR_STEPS = [
  {
    popover: {
      title: "🏥 Controle de Lesões",
      description: "Aqui você registra e acompanha as lesões dos atletas. Atletas afastados aparecem com badge 'Afastado' na chamada de treino.",
    },
  },
  {
    element: "[data-tour='lesoes-filtro']",
    popover: {
      title: "Filtrar por atleta",
      description: "Use este seletor para ver somente as lesões de um atleta específico. Útil quando precisa consultar o histórico de saúde de alguém.",
      side: "bottom" as const,
    },
  },
  {
    element: "[data-tour='lesoes-lista']",
    popover: {
      title: "Lista de lesões",
      description: "Cada card mostra o atleta, tipo e gravidade da lesão, data de início e previsão de retorno. Borda vermelha = afastado, borda verde = recuperado. Use os botões Editar para atualizar o retorno real.",
      side: "top" as const,
    },
  },
];

const TYPE_OPTIONS = [
  { label: "Muscular", value: "muscular" },
  { label: "Articular", value: "articular" },
  { label: "Óssea", value: "óssea" },
  { label: "Tendão", value: "tendão" },
  { label: "Outro", value: "outro" },
];

const SEVERITY_OPTIONS = [
  { label: "Leve", value: "leve" },
  { label: "Moderada", value: "moderada" },
  { label: "Grave", value: "grave" },
];

const SEVERITY_COLORS: Record<string, string> = {
  leve: "bg-amber-100 text-amber-700",
  moderada: "bg-orange-100 text-orange-700",
  grave: "bg-rose-100 text-rose-700",
};

function formatDate(value: string | null) {
  if (!value) return "-";
  return new Intl.DateTimeFormat("pt-BR", { timeZone: "UTC" }).format(new Date(value));
}

type CreateForm = {
  athleteId: string;
  type: string;
  severity: string;
  description: string;
  startDate: string;
  expectedReturn: string;
  notes: string;
};

type UpdateForm = {
  expectedReturn: string;
  returnedAt: string;
  notes: string;
};

const emptyCreate: CreateForm = {
  athleteId: "",
  type: "muscular",
  severity: "leve",
  description: "",
  startDate: new Date().toISOString().slice(0, 10),
  expectedReturn: "",
  notes: "",
};

export function LesoesPage() {
  const { showToast } = useToast();

  const [injuries, setInjuries] = useState<Injury[]>([]);
  const [athletes, setAthletes] = useState<Athlete[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [filterAthleteId, setFilterAthleteId] = useState("");

  useTour("lesoes-rh:v1", isLoading ? [] : TOUR_STEPS);

  const [createModal, setCreateModal] = useState(false);
  const [createForm, setCreateForm] = useState<CreateForm>(emptyCreate);
  const [isSaving, setIsSaving] = useState(false);

  const [editTarget, setEditTarget] = useState<Injury | null>(null);
  const [editForm, setEditForm] = useState<UpdateForm>({ expectedReturn: "", returnedAt: "", notes: "" });

  const [deleteTarget, setDeleteTarget] = useState<Injury | null>(null);

  const load = useCallback(async () => {
    setIsLoading(true);
    try {
      const [inj, ath] = await Promise.all([
        injuryService.list(),
        athleteService.getAll(),
      ]);
      setInjuries(inj);
      setAthletes(ath.filter((a) => a.status === "ativo" || a.status === "teste"));
    } catch {
      // silent
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  const displayed = filterAthleteId
    ? injuries.filter((i) => i.athleteId === filterAthleteId)
    : injuries;

  const athleteName = (id: string) => injuries.find((i) => i.athleteId === id)?.athlete?.name
    ?? athletes.find((a) => a.id === id)?.name
    ?? id;

  async function handleCreate(e: FormEvent) {
    e.preventDefault();
    if (!createForm.athleteId) { showToast("Selecione um atleta.", "error"); return; }
    setIsSaving(true);
    try {
      await injuryService.create({
        athleteId: createForm.athleteId,
        type: createForm.type,
        severity: createForm.severity,
        description: createForm.description || undefined,
        startDate: createForm.startDate,
        expectedReturn: createForm.expectedReturn || undefined,
        notes: createForm.notes || undefined,
      });
      showToast("Lesão registrada.", "success");
      setCreateModal(false);
      setCreateForm(emptyCreate);
      await load();
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
      await injuryService.update(editTarget.id, {
        expectedReturn: editForm.expectedReturn || null,
        returnedAt: editForm.returnedAt || null,
        notes: editForm.notes || null,
      });
      showToast("Lesão atualizada.", "success");
      setEditTarget(null);
      await load();
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
      await injuryService.remove(deleteTarget.id);
      showToast("Lesão removida.", "success");
      setDeleteTarget(null);
      await load();
    } catch (err) {
      showToast(getApiErrorMessage(err), "error");
    } finally {
      setIsSaving(false);
    }
  }

  return (
    <div className="space-y-8">
      <PageHeader
        title="Controle de Lesões"
        description="Gerencie lesões e afastamentos dos atletas."
        action={
          <Button onClick={() => { setCreateForm(emptyCreate); setCreateModal(true); }}>
            <Plus size={17} />Registrar lesão
          </Button>
        }
      />

      {/* Filter by athlete */}
      <div data-tour="lesoes-filtro" className="flex flex-wrap items-center gap-3">
        <Select
          label=""
          value={filterAthleteId}
          onChange={(e) => setFilterAthleteId(e.target.value)}
          options={[
            { label: "Todos os atletas", value: "" },
            ...athletes.map((a) => ({ label: a.name, value: a.id })),
          ]}
        />
        {filterAthleteId && (
          <button className="text-sm text-pegasus-primary hover:underline" onClick={() => setFilterAthleteId("")} type="button">
            Limpar filtro
          </button>
        )}
      </div>

      {isLoading ? (
        <div className="flex items-center justify-center py-16">
          <Loader2 className="animate-spin text-pegasus-primary" size={28} />
        </div>
      ) : displayed.length === 0 ? (
        <EmptyState icon={Activity} title="Nenhuma lesão" description="Nenhum registro de lesão encontrado." />
      ) : (
        <div data-tour="lesoes-lista" className="space-y-3">
          {displayed.map((injury) => (
            <div key={injury.id} className={`panel p-5 border-l-4 ${injury.returnedAt ? "border-emerald-300" : "border-rose-400"}`}>
              <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="font-bold text-pegasus-navy">
                      {injury.athlete?.name ?? athleteName(injury.athleteId)}
                    </span>
                    <span className={`rounded-full px-2.5 py-0.5 text-xs font-bold ${SEVERITY_COLORS[injury.severity] ?? "bg-slate-100 text-slate-600"}`}>
                      {SEVERITY_OPTIONS.find((o) => o.value === injury.severity)?.label ?? injury.severity}
                    </span>
                    <span className="rounded-full bg-slate-100 px-2.5 py-0.5 text-xs font-semibold text-slate-600">
                      {TYPE_OPTIONS.find((o) => o.value === injury.type)?.label ?? injury.type}
                    </span>
                    {injury.returnedAt ? (
                      <span className="rounded-full bg-emerald-50 px-2.5 py-0.5 text-xs font-bold text-emerald-600">Recuperado</span>
                    ) : (
                      <span className="rounded-full bg-rose-50 px-2.5 py-0.5 text-xs font-bold text-rose-600">Afastado</span>
                    )}
                  </div>
                  {injury.description && (
                    <p className="mt-1.5 text-sm text-slate-600">{injury.description}</p>
                  )}
                  <p className="mt-1 text-xs text-slate-400">
                    Início: {formatDate(injury.startDate)}
                    {injury.expectedReturn ? ` · Retorno previsto: ${formatDate(injury.expectedReturn)}` : ""}
                    {injury.returnedAt ? ` · Retornou em: ${formatDate(injury.returnedAt)}` : ""}
                  </p>
                  {injury.notes && (
                    <p className="mt-1 text-xs text-slate-500">{injury.notes}</p>
                  )}
                </div>
                <div className="flex shrink-0 gap-2">
                  <Button
                    className="h-8 px-3 text-xs"
                    variant="secondary"
                    onClick={() => {
                      setEditTarget(injury);
                      setEditForm({
                        expectedReturn: injury.expectedReturn ? injury.expectedReturn.slice(0, 10) : "",
                        returnedAt: injury.returnedAt ? injury.returnedAt.slice(0, 10) : "",
                        notes: injury.notes ?? "",
                      });
                    }}
                  >
                    <Pencil size={13} />Editar
                  </Button>
                  <Button className="h-8 px-3 text-xs" variant="danger" onClick={() => setDeleteTarget(injury)}>
                    <Trash2 size={13} />
                  </Button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Create modal */}
      <Modal isOpen={createModal} onClose={() => setCreateModal(false)} title="Registrar lesão">
        <form className="grid gap-4" onSubmit={handleCreate}>
          <Select
            label="Atleta"
            value={createForm.athleteId}
            onChange={(e) => setCreateForm({ ...createForm, athleteId: e.target.value })}
            options={[
              { label: "Selecione um atleta", value: "" },
              ...athletes.map((a) => ({ label: a.name, value: a.id })),
            ]}
            disabled={isSaving}
          />
          <div className="grid gap-4 sm:grid-cols-2">
            <Select
              label="Tipo"
              value={createForm.type}
              onChange={(e) => setCreateForm({ ...createForm, type: e.target.value })}
              options={TYPE_OPTIONS}
              disabled={isSaving}
            />
            <Select
              label="Gravidade"
              value={createForm.severity}
              onChange={(e) => setCreateForm({ ...createForm, severity: e.target.value })}
              options={SEVERITY_OPTIONS}
              disabled={isSaving}
            />
          </div>
          <Textarea
            label="Descrição (opcional)"
            value={createForm.description}
            onChange={(e) => setCreateForm({ ...createForm, description: e.target.value })}
            rows={2}
            disabled={isSaving}
          />
          <div className="grid gap-4 sm:grid-cols-2">
            <Input
              label="Data de início"
              type="date"
              value={createForm.startDate}
              onChange={(e) => setCreateForm({ ...createForm, startDate: e.target.value })}
              required
              disabled={isSaving}
            />
            <Input
              label="Retorno previsto (opcional)"
              type="date"
              value={createForm.expectedReturn}
              onChange={(e) => setCreateForm({ ...createForm, expectedReturn: e.target.value })}
              disabled={isSaving}
            />
          </div>
          <Textarea
            label="Observações (opcional)"
            value={createForm.notes}
            onChange={(e) => setCreateForm({ ...createForm, notes: e.target.value })}
            rows={2}
            disabled={isSaving}
          />
          <div className="flex flex-col gap-3 sm:flex-row">
            <Button type="submit" disabled={isSaving}>
              {isSaving ? <Loader2 className="animate-spin" size={17} /> : <Plus size={17} />}
              Registrar
            </Button>
            <Button variant="secondary" onClick={() => setCreateModal(false)} disabled={isSaving}>Cancelar</Button>
          </div>
        </form>
      </Modal>

      {/* Edit modal */}
      <Modal isOpen={Boolean(editTarget)} onClose={() => setEditTarget(null)} title="Editar lesão">
        <form className="grid gap-4" onSubmit={handleEdit}>
          <div className="grid gap-4 sm:grid-cols-2">
            <Input
              label="Retorno previsto"
              type="date"
              value={editForm.expectedReturn}
              onChange={(e) => setEditForm({ ...editForm, expectedReturn: e.target.value })}
              disabled={isSaving}
            />
            <Input
              label="Data de retorno real"
              type="date"
              value={editForm.returnedAt}
              onChange={(e) => setEditForm({ ...editForm, returnedAt: e.target.value })}
              disabled={isSaving}
            />
          </div>
          <Textarea
            label="Observações"
            value={editForm.notes}
            onChange={(e) => setEditForm({ ...editForm, notes: e.target.value })}
            rows={3}
            disabled={isSaving}
          />
          <div className="flex flex-col gap-3 sm:flex-row">
            <Button type="submit" disabled={isSaving}>
              {isSaving ? <Loader2 className="animate-spin" size={17} /> : null}
              Salvar
            </Button>
            <Button variant="secondary" onClick={() => setEditTarget(null)} disabled={isSaving}>Cancelar</Button>
          </div>
        </form>
      </Modal>

      <ConfirmDialog
        isOpen={Boolean(deleteTarget)}
        onClose={() => setDeleteTarget(null)}
        onConfirm={confirmDelete}
        title="Remover lesão"
        description="Deseja remover este registro de lesão?"
        confirmLabel={isSaving ? "Removendo..." : "Remover"}
      />
    </div>
  );
}
