import { CalendarDays, CheckCircle2, Dumbbell, FileDown, Flag, Flame, Loader2, NotebookPen, Plus, Star, Target } from "lucide-react";
import { FormEvent, useCallback, useEffect, useMemo, useState } from "react";
import { useAuth } from "../../auth/AuthContext";
import { useTour } from "../../tours/useTour";
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
import { trainingFeedbackService, type TrainingFeedback } from "../../services/trainingFeedbackService";

type TrainingFeedbackWithAthlete = TrainingFeedback & { athlete: { id: string; name: string } };

function ReadonlyStars({ value, size = 14 }: { value: number; size?: number }) {
  return (
    <div className="flex gap-0.5">
      {[1, 2, 3, 4, 5].map((star) => (
        <Star key={star} size={size} className={star <= Math.round(value) ? "fill-amber-400 text-amber-400" : "text-slate-300"} />
      ))}
    </div>
  );
}

type TrainingForm = TrainingPayload;

const currentMonth = new Date().toISOString().slice(0, 7);

const emptyTraining: TrainingForm = {
  date: new Date().toISOString().slice(0, 10),
  title: "",
  category: "",
  warmup: "",
  fundamentals: "",
  mainPart: "",
  finalPart: "",
  notes: "",
  createdBy: "",
};

// Cada bloco do treino com seu ícone e uma dica curta — monta a esteira visual do formulário
// e também o "Ver detalhes"/PDF, pra não duplicar a lista em três lugares.
const BLOCKS: Array<{ key: keyof TrainingForm; label: string; icon: typeof Flame; hint: string; rows?: number }> = [
  { key: "warmup", label: "Aquecimento", icon: Flame, hint: "Ativação, mobilidade, bola em movimento..." },
  { key: "fundamentals", label: "Fundamentos", icon: Target, hint: "Saque, manchete, toque, ataque, bloqueio..." },
  { key: "mainPart", label: "Parte principal", icon: Dumbbell, hint: "O corpo do treino: exercícios, progressões, tempo de cada um...", rows: 6 },
  { key: "finalPart", label: "Parte final", icon: Flag, hint: "Volta à calma, alongamento, fechamento..." },
  { key: "notes", label: "Observações", icon: NotebookPen, hint: "Qualquer detalhe extra pra quem for aplicar o treino." },
];

const TOUR_STEPS = [
  {
    popover: {
      title: "🏐 Treinos",
      description: "Monte o treino por blocos (aquecimento, fundamentos, parte principal, parte final) e baixe em PDF quando terminar.",
    },
  },
  {
    element: "[data-tour='treinos-filtros']",
    popover: {
      title: "Filtros",
      description: "Filtre treinos por nome, categoria e mês. Use 'Novo treino' para montar uma sessão do zero.",
      side: "bottom" as const,
    },
  },
  {
    element: "[data-tour='treinos-lista']",
    popover: {
      title: "Lista de treinos",
      description: "Treinos agrupados por data. 'Ver' mostra o plano completo, 'Baixar PDF' gera o impresso pra levar pra quadra.",
      side: "top" as const,
    },
  },
];

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
    warmup: training.warmup ?? "",
    fundamentals: training.fundamentals ?? "",
    mainPart: training.mainPart ?? "",
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
    warmup: form.warmup,
    fundamentals: form.fundamentals,
    mainPart: form.mainPart,
    finalPart: form.finalPart,
    notes: form.notes,
    createdBy: form.createdBy,
  };
}

/** Mesmo formato de nome do PDF gerado no backend (trainings.service.ts). */
function pdfFileName(training: Training) {
  const safeTitle = training.title.replace(/[\\/:*?"<>|]/g, "").slice(0, 60);
  return `Treino ${toInputDate(training.date)} - ${safeTitle}.pdf`;
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
  const [viewFeedback, setViewFeedback] = useState<TrainingFeedbackWithAthlete[]>([]);
  const [isLoadingFeedback, setIsLoadingFeedback] = useState(false);
  const [doneTraining, setDoneTraining] = useState<Training | null>(null);
  const [downloadingId, setDownloadingId] = useState<string | null>(null);

  useEffect(() => {
    if (!viewTraining) {
      setViewFeedback([]);
      return;
    }
    let cancelled = false;
    setIsLoadingFeedback(true);
    trainingFeedbackService
      .getByTraining(viewTraining.id)
      .then((data) => { if (!cancelled) setViewFeedback(data); })
      .catch(() => { if (!cancelled) setViewFeedback([]); })
      .finally(() => { if (!cancelled) setIsLoadingFeedback(false); });
    return () => { cancelled = true; };
  }, [viewTraining]);

  const feedbackAverage = viewFeedback.length > 0
    ? viewFeedback.reduce((sum, fb) => sum + fb.rating, 0) / viewFeedback.length
    : 0;

  useTour("treinos:v2", isLoading ? [] : TOUR_STEPS);

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
      const saved = editingTraining
        ? await trainingService.update(editingTraining.id, buildPayload(form))
        : await trainingService.create(buildPayload(form));

      showToast(editingTraining ? "Treino atualizado com sucesso." : "Treino criado com sucesso.", "success");
      setIsModalOpen(false);
      setDoneTraining(saved);
      await loadTrainings();
    } catch (error) {
      showToast(getApiErrorMessage(error), "error");
    } finally {
      setIsSaving(false);
    }
  }

  async function handleDownloadPdf(training: Training) {
    setDownloadingId(training.id);
    try {
      await trainingService.downloadPdf(training.id, pdfFileName(training));
    } catch (error) {
      showToast(getApiErrorMessage(error), "error");
    } finally {
      setDownloadingId(null);
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
    <div className="space-y-6">
      <PageHeader
        title="Treinos"
        description="Monte o treino por blocos e baixe em PDF quando terminar."
        action={
          canCreate ? (
            <Button onClick={openCreateModal} className="w-full sm:w-auto">
              <Plus size={17} />
              Novo treino
            </Button>
          ) : null
        }
      />

      <div data-tour="treinos-filtros">
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
      </div>

      <section data-tour="treinos-lista" className="panel overflow-hidden">
        <div className="flex items-center gap-3 border-b border-stone-200 p-6">
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
                    <article key={training.id} className="rounded-2xl border border-stone-200 bg-white p-4 shadow-sm">
                      <div className="flex items-start gap-3">
                        <span className="rounded-2xl bg-pegasus-ice p-3 text-pegasus-primary">
                          <Dumbbell size={18} />
                        </span>
                        <div className="min-w-0 flex-1">
                          <p className="text-sm font-bold text-pegasus-primary">{training.category ?? "Treino"}</p>
                          <h4 className="mt-1 font-bold text-pegasus-navy">{training.title}</h4>
                          <p className="mt-2 text-sm leading-6 text-slate-600">{training.mainPart || "Parte principal ainda não definida."}</p>
                        </div>
                      </div>
                      <div className="mt-4 grid gap-2 text-sm text-slate-600 sm:grid-cols-2">
                        <p><strong className="text-pegasus-navy">Aquecimento:</strong> {training.warmup ?? "-"}</p>
                        <p><strong className="text-pegasus-navy">Fundamentos:</strong> {training.fundamentals ?? "-"}</p>
                        <p><strong className="text-pegasus-navy">Criado por:</strong> {training.createdBy}</p>
                      </div>
                      <div className="mt-4 flex flex-wrap items-center justify-between gap-2 border-t border-stone-100 pt-3">
                        <ActionButtons
                          canDelete={canDelete}
                          canEdit={canUpdate}
                          onDelete={() => setDeleteTarget(training)}
                          onEdit={() => openEditModal(training)}
                          onView={() => setViewTraining(training)}
                        />
                        <button
                          className="min-h-10 font-bold text-pegasus-primary disabled:opacity-50"
                          disabled={downloadingId === training.id}
                          onClick={() => handleDownloadPdf(training)}
                          type="button"
                        >
                          {downloadingId === training.id ? (
                            <Loader2 className="mr-1 inline animate-spin" size={16} />
                          ) : (
                            <FileDown className="mr-1 inline" size={16} />
                          )}
                          Baixar PDF
                        </button>
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

      <Modal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} title={editingTraining ? "Editar treino" : "Novo treino"} size="xl">
        <form className="grid gap-5" onSubmit={handleSubmit}>
          <div className="grid gap-4 rounded-2xl border border-stone-200 p-4 md:grid-cols-2">
            <Input disabled={isSaving} label="Data" onChange={(event) => setForm({ ...form, date: event.target.value })} required type="date" value={form.date} />
            <Input disabled={isSaving} label="Título" onChange={(event) => setForm({ ...form, title: event.target.value })} placeholder="Ex: Treino de saque e ataque" required value={form.title} />
            <Input disabled={isSaving} label="Categoria" onChange={(event) => setForm({ ...form, category: event.target.value })} placeholder="Ex: Sub-17" value={form.category} />
            <div>
              <span className="mb-1.5 block text-sm font-semibold text-slate-700">Criado por</span>
              <p className="flex h-11 items-center rounded-md border border-slate-200 bg-slate-50 px-3 text-sm text-slate-600">
                {form.createdBy || "-"}
              </p>
            </div>
          </div>

          {BLOCKS.map(({ key, label, icon: Icon, hint, rows }) => (
            <section className="rounded-2xl border border-stone-200 p-4" key={key}>
              <div className="mb-2 flex items-center gap-2">
                <Icon className="text-pegasus-primary" size={18} />
                <p className="text-xs text-slate-400">{hint}</p>
              </div>
              <Textarea
                disabled={isSaving}
                label={label}
                onChange={(event) => setForm({ ...form, [key]: event.target.value })}
                rows={rows}
                value={form[key] as string}
              />
            </section>
          ))}

          <div className="flex flex-col gap-3 sm:flex-row">
            <Button disabled={isSaving} type="submit">
              {isSaving ? <Loader2 className="animate-spin" size={17} /> : <CheckCircle2 size={17} />}
              Pronto
            </Button>
            <Button disabled={isSaving} onClick={() => setIsModalOpen(false)} variant="secondary">
              Cancelar
            </Button>
          </div>
        </form>
      </Modal>

      <Modal
        description="Treino salvo. Já pode baixar o PDF pra levar pra quadra."
        isOpen={Boolean(doneTraining)}
        onClose={() => setDoneTraining(null)}
        title="Treino pronto!"
      >
        {doneTraining ? (
          <div className="space-y-4">
            <div className="flex items-center gap-3 rounded-2xl bg-pegasus-surface p-4">
              <span className="rounded-xl bg-emerald-100 p-2.5 text-emerald-600">
                <CheckCircle2 size={22} />
              </span>
              <div>
                <p className="font-bold text-pegasus-navy">{doneTraining.title}</p>
                <p className="text-sm text-slate-500">{formatDate(doneTraining.date)}</p>
              </div>
            </div>
            <div className="flex flex-col gap-3 sm:flex-row">
              <Button disabled={downloadingId === doneTraining.id} onClick={() => handleDownloadPdf(doneTraining)}>
                {downloadingId === doneTraining.id ? <Loader2 className="animate-spin" size={17} /> : <FileDown size={17} />}
                Baixar PDF
              </Button>
              <Button onClick={() => setDoneTraining(null)} variant="secondary">
                Fechar
              </Button>
            </div>
          </div>
        ) : null}
      </Modal>

      <Modal isOpen={Boolean(viewTraining)} onClose={() => setViewTraining(null)} title={viewTraining?.title ?? "Detalhes do treino"}>
        {viewTraining ? (
          <div className="space-y-4 text-sm leading-6 text-slate-600">
            <div className="rounded-2xl bg-pegasus-surface p-4">
              <p><strong className="text-pegasus-navy">Data:</strong> {formatDate(viewTraining.date)}</p>
              <p><strong className="text-pegasus-navy">Categoria:</strong> {viewTraining.category ?? "-"}</p>
              <p><strong className="text-pegasus-navy">Criado por:</strong> {viewTraining.createdBy}</p>
            </div>
            {BLOCKS.map(({ key, label, icon: Icon }) => (
              <section className="rounded-2xl border border-stone-200 bg-white p-4" key={key}>
                <div className="flex items-center gap-2">
                  <Icon className="text-pegasus-primary" size={16} />
                  <h3 className="font-black text-pegasus-navy">{label}</h3>
                </div>
                <p className="mt-2 whitespace-pre-wrap">{(viewTraining[key] as string | null) || "-"}</p>
              </section>
            ))}

            <section className="rounded-2xl border border-stone-200 bg-white p-4">
              <div className="flex items-center justify-between">
                <h3 className="font-black text-pegasus-navy">Avaliação dos atletas</h3>
                {viewFeedback.length > 0 && (
                  <div className="flex items-center gap-2">
                    <ReadonlyStars value={feedbackAverage} size={16} />
                    <span className="text-xs font-bold text-slate-500">
                      {feedbackAverage.toFixed(1)} ({viewFeedback.length})
                    </span>
                  </div>
                )}
              </div>

              {isLoadingFeedback ? (
                <p className="mt-3 flex items-center gap-2 text-sm text-slate-500">
                  <Loader2 className="animate-spin" size={14} />
                  Carregando avaliações...
                </p>
              ) : viewFeedback.length === 0 ? (
                <p className="mt-2 text-sm text-slate-500">Nenhum atleta avaliou este treino ainda.</p>
              ) : (
                <div className="mt-3 space-y-3">
                  {viewFeedback.map((fb) => (
                    <div className="rounded-xl bg-pegasus-surface p-3" key={fb.id}>
                      <div className="flex items-center justify-between gap-2">
                        <p className="font-semibold text-pegasus-navy">{fb.athlete.name}</p>
                        <ReadonlyStars value={fb.rating} />
                      </div>
                      {fb.comment ? (
                        <p className="mt-1.5 text-sm italic text-slate-600">"{fb.comment}"</p>
                      ) : null}
                    </div>
                  ))}
                </div>
              )}
            </section>

            <Button
              className="w-full sm:w-auto"
              disabled={downloadingId === viewTraining.id}
              onClick={() => handleDownloadPdf(viewTraining)}
              variant="secondary"
            >
              {downloadingId === viewTraining.id ? <Loader2 className="animate-spin" size={17} /> : <FileDown size={17} />}
              Baixar PDF
            </Button>
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
