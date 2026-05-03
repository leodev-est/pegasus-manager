import { Loader2, Save, Search, Shield, Star, UserRound } from "lucide-react";
import { FormEvent, useCallback, useEffect, useMemo, useState } from "react";
import { Button } from "../../components/ui/Button";
import { EmptyState } from "../../components/ui/EmptyState";
import { FilterBar } from "../../components/ui/FilterBar";
import { Input } from "../../components/ui/Input";
import { PageHeader } from "../../components/ui/PageHeader";
import { Select } from "../../components/ui/Select";
import { StatusBadge } from "../../components/ui/StatusBadge";
import { Textarea } from "../../components/ui/Textarea";
import { useToast } from "../../components/ui/Toast";
import { getApiErrorMessage } from "../../services/api";
import { athleteService, type Athlete } from "../../services/athleteService";
import {
  evaluationService,
  type AthleteEvaluation,
  type CoachEvaluationPayload,
} from "../../services/evaluationService";

const emptyEvaluation: AthleteEvaluation = {
  coachNotes: null,
  createdAt: null,
  id: null,
  improvements: null,
  mental: null,
  overall: null,
  physical: null,
  selfRating: null,
  strengths: null,
  tactical: null,
  technical: null,
  updatedAt: null,
};

function initials(name: string) {
  return name
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0])
    .join("")
    .toUpperCase();
}

function overallTone(overall: number | null) {
  if (overall === null) return "from-slate-500 to-slate-700";
  if (overall >= 8) return "from-emerald-500 to-pegasus-primary";
  if (overall >= 5) return "from-amber-400 to-pegasus-primary";
  return "from-rose-500 to-pegasus-primary";
}

function ratingTone(overall: number | null) {
  if (overall === null) return "neutral";
  if (overall >= 8) return "success";
  if (overall >= 5) return "warning";
  return "danger";
}

function RatingInput({
  label,
  onChange,
  value,
}: {
  label: string;
  onChange: (value: number | null) => void;
  value: number | null;
}) {
  return (
    <Input
      label={label}
      max="10"
      min="0"
      onChange={(event) => onChange(event.target.value === "" ? null : Number(event.target.value))}
      step="0.1"
      type="number"
      value={value ?? ""}
    />
  );
}

export function AthleteEvaluationsPage() {
  const { showToast } = useToast();
  const [athletes, setAthletes] = useState<Athlete[]>([]);
  const [selectedAthleteId, setSelectedAthleteId] = useState("");
  const [search, setSearch] = useState("");
  const [evaluation, setEvaluation] = useState<AthleteEvaluation>(emptyEvaluation);
  const [form, setForm] = useState<CoachEvaluationPayload>({
    coachNotes: "",
    mental: null,
    physical: null,
    tactical: null,
    technical: null,
  });
  const [isLoading, setIsLoading] = useState(true);
  const [isLoadingEvaluation, setIsLoadingEvaluation] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  const selectedAthlete = useMemo(
    () => athletes.find((athlete) => athlete.id === selectedAthleteId) ?? null,
    [athletes, selectedAthleteId],
  );

  const filteredAthletes = useMemo(() => {
    const normalizedSearch = search.trim().toLowerCase();
    if (!normalizedSearch) return athletes;

    return athletes.filter((athlete) =>
      [athlete.name, athlete.category, athlete.position]
        .filter(Boolean)
        .some((value) => String(value).toLowerCase().includes(normalizedSearch)),
    );
  }, [athletes, search]);

  const loadAthletes = useCallback(async () => {
    setIsLoading(true);

    try {
      const data = await athleteService.getAll({ status: "ativo" });
      setAthletes(data);
      setSelectedAthleteId((current) => current || data[0]?.id || "");
    } catch (error) {
      showToast(getApiErrorMessage(error), "error");
    } finally {
      setIsLoading(false);
    }
  }, [showToast]);

  const loadEvaluation = useCallback(
    async (athleteId: string) => {
      if (!athleteId) {
        setEvaluation(emptyEvaluation);
        return;
      }

      setIsLoadingEvaluation(true);

      try {
        const data = await evaluationService.getEvaluationByAthlete(athleteId);
        setEvaluation(data);
        setForm({
          coachNotes: data.coachNotes ?? "",
          mental: data.mental,
          physical: data.physical,
          tactical: data.tactical,
          technical: data.technical,
        });
      } catch (error) {
        showToast(getApiErrorMessage(error), "error");
      } finally {
        setIsLoadingEvaluation(false);
      }
    },
    [showToast],
  );

  useEffect(() => {
    loadAthletes();
  }, [loadAthletes]);

  useEffect(() => {
    loadEvaluation(selectedAthleteId);
  }, [loadEvaluation, selectedAthleteId]);

  async function saveEvaluation(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!selectedAthleteId) return;
    setIsSaving(true);

    try {
      const data = await evaluationService.updateCoachEvaluation(selectedAthleteId, form);
      setEvaluation(data);
      showToast("Avaliação técnica salva.", "success");
    } catch (error) {
      showToast(getApiErrorMessage(error), "error");
    } finally {
      setIsSaving(false);
    }
  }

  return (
    <div className="space-y-8">
      <PageHeader
        title="Avaliações"
        description="Avaliação técnica estilo FIFA por atleta ativo."
      />

      <FilterBar>
        <Input
          label="Buscar atleta"
          onChange={(event) => setSearch(event.target.value)}
          placeholder="Nome, categoria ou posição"
          value={search}
        />
        <Select
          label="Selecionar atleta"
          onChange={(event) => setSelectedAthleteId(event.target.value)}
          options={[
            { label: "Selecione um atleta", value: "" },
            ...filteredAthletes.map((athlete) => ({ label: athlete.name, value: athlete.id })),
          ]}
          value={selectedAthleteId}
        />
      </FilterBar>

      {isLoading ? (
        <section className="panel flex items-center gap-3 p-6 text-sm font-bold text-pegasus-primary">
          <Loader2 className="animate-spin" size={18} />
          Carregando atletas
        </section>
      ) : !selectedAthlete ? (
        <EmptyState
          description="Escolha um atleta ativo para iniciar a avaliação técnica."
          icon={UserRound}
          title="Nenhum atleta selecionado"
        />
      ) : (
        <section className="grid gap-6 xl:grid-cols-[0.85fr_1.15fr]">
          <aside className="space-y-6">
            <article className="panel p-6">
              <div className="flex items-center gap-4">
                <div className="grid h-16 w-16 place-items-center rounded-2xl bg-pegasus-navy text-xl font-black text-white">
                  {initials(selectedAthlete.name)}
                </div>
                <div className="min-w-0">
                  <p className="text-xs font-black uppercase tracking-[0.14em] text-pegasus-primary">Atleta</p>
                  <h2 className="mt-1 text-2xl font-black text-pegasus-navy">{selectedAthlete.name}</h2>
                  <p className="mt-1 text-sm text-slate-500">
                    {selectedAthlete.category ?? "Sem categoria"} · {selectedAthlete.position ?? "Sem posição"}
                  </p>
                </div>
              </div>
              <div className="mt-5 flex flex-wrap gap-2">
                <StatusBadge label={selectedAthlete.status === "ativo" ? "Ativo" : selectedAthlete.status} tone="success" />
                <StatusBadge
                  label={evaluation.overall === null ? "Sem overall" : `${evaluation.overall} overall`}
                  tone={ratingTone(evaluation.overall)}
                />
              </div>
            </article>

            <article className={`overflow-hidden rounded-3xl bg-gradient-to-br ${overallTone(evaluation.overall)} p-6 text-white shadow-xl`}>
              <div className="flex items-center gap-3">
                <Star size={22} />
                <p className="text-xs font-black uppercase tracking-[0.18em] text-white/75">Card técnico</p>
              </div>
              <div className="mt-5">
                <p className="text-7xl font-black leading-none">{evaluation.overall ?? "--"}</p>
                <p className="mt-2 text-sm font-black uppercase tracking-[0.14em] text-white/80">Overall</p>
              </div>
              <div className="mt-6 grid grid-cols-2 gap-3">
                {[
                  ["Técnica", evaluation.technical],
                  ["Físico", evaluation.physical],
                  ["Tático", evaluation.tactical],
                  ["Mental", evaluation.mental],
                ].map(([label, value]) => (
                  <div className="rounded-2xl bg-white/12 p-3 ring-1 ring-white/15" key={label}>
                    <p className="text-xs font-bold uppercase tracking-[0.12em] text-white/70">{label}</p>
                    <p className="mt-1 text-2xl font-black">{value ?? "--"}</p>
                  </div>
                ))}
              </div>
            </article>

            <article className="panel p-6">
              <h3 className="text-lg font-black text-pegasus-navy">Autoavaliação do atleta</h3>
              <div className="mt-4 space-y-3 text-sm text-slate-600">
                <p><strong className="text-pegasus-navy">Nota própria:</strong> {evaluation.selfRating ?? "--"}</p>
                <p><strong className="text-pegasus-navy">Pontos fortes:</strong> {evaluation.strengths || "Ainda não preenchido."}</p>
                <p><strong className="text-pegasus-navy">Precisa treinar:</strong> {evaluation.improvements || "Ainda não preenchido."}</p>
              </div>
            </article>
          </aside>

          <article className="panel p-6">
            <div className="mb-5 flex items-center gap-3">
              <Shield className="text-pegasus-primary" size={22} />
              <div>
                <h2 className="text-xl font-black text-pegasus-navy">Avaliação técnica</h2>
                <p className="text-sm text-slate-500">Notas de 0 a 10 preenchidas por Diretor ou Técnico.</p>
              </div>
            </div>

            {isLoadingEvaluation ? (
              <div className="flex items-center gap-3 p-6 text-sm font-bold text-pegasus-primary">
                <Loader2 className="animate-spin" size={18} />
                Carregando avaliação
              </div>
            ) : (
              <form className="grid gap-4" onSubmit={saveEvaluation}>
                <div className="grid gap-4 sm:grid-cols-2">
                  <RatingInput
                    label="Técnica"
                    onChange={(value) => setForm({ ...form, technical: value })}
                    value={form.technical ?? null}
                  />
                  <RatingInput
                    label="Físico"
                    onChange={(value) => setForm({ ...form, physical: value })}
                    value={form.physical ?? null}
                  />
                  <RatingInput
                    label="Tático"
                    onChange={(value) => setForm({ ...form, tactical: value })}
                    value={form.tactical ?? null}
                  />
                  <RatingInput
                    label="Mental"
                    onChange={(value) => setForm({ ...form, mental: value })}
                    value={form.mental ?? null}
                  />
                </div>
                <Textarea
                  label="Observações do técnico"
                  onChange={(event) => setForm({ ...form, coachNotes: event.target.value })}
                  rows={6}
                  value={form.coachNotes ?? ""}
                />
                <Button disabled={isSaving} type="submit">
                  {isSaving ? <Loader2 className="animate-spin" size={17} /> : <Save size={17} />}
                  Salvar avaliação técnica
                </Button>
              </form>
            )}
          </article>
        </section>
      )}
    </div>
  );
}
