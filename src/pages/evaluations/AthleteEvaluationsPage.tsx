import { ChevronDown, ChevronUp, History, Loader2, Save, Shield, Star, TrendingUp, UserRound } from "lucide-react";
import { FormEvent, useCallback, useEffect, useMemo, useState } from "react";
import { useTour } from "../../tours/useTour";
import { useAthletes } from "../../hooks/useAthletes";
import { CartesianGrid, Legend, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { Button } from "../../components/ui/Button";
import { EmptyState } from "../../components/ui/EmptyState";
import { Input } from "../../components/ui/Input";
import { PageHeader } from "../../components/ui/PageHeader";
import { Select } from "../../components/ui/Select";
import { StatusBadge } from "../../components/ui/StatusBadge";
import { Textarea } from "../../components/ui/Textarea";
import { useToast } from "../../components/ui/Toast";
import { getApiErrorMessage } from "../../services/api";
import { type Athlete } from "../../services/athleteService";
import {
  evaluationService,
  type AthleteEvaluation,
  type AthleteEvaluationSummary,
  type CoachEvaluationPayload,
  type EvaluationHistoryEntry,
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

const TOUR_STEPS = [
  {
    popover: {
      title: "⭐ Avaliações Técnicas",
      description: "Avalie atletas ativos com notas estilo FIFA: técnico, físico, tático e mental. O histórico gera gráfico de evolução visível ao atleta.",
    },
  },
  {
    element: "[data-tour='aval-atleta']",
    popover: {
      title: "Selecionar atleta",
      description: "Escolha o atleta que deseja avaliar. A avaliação mais recente já preenchida será carregada automaticamente.",
      side: "bottom" as const,
    },
  },
  {
    element: "[data-tour='aval-form']",
    popover: {
      title: "Formulário de avaliação",
      description: "Preencha notas de 0 a 10 para cada habilidade. A nota geral é calculada automaticamente. Adicione observações no campo de notas do técnico.",
      side: "left" as const,
    },
  },
];

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
  const { data: athletes = [], isLoading: isLoadingAthletes } = useAthletes({ status: "ativo" });
  const [summaries, setSummaries] = useState<AthleteEvaluationSummary[]>([]);
  const [selectedAthleteId, setSelectedAthleteId] = useState("");
  const [evaluation, setEvaluation] = useState<AthleteEvaluation>(emptyEvaluation);
  const [form, setForm] = useState<CoachEvaluationPayload>({
    coachNotes: "",
    mental: null,
    physical: null,
    tactical: null,
    technical: null,
  });
  const [history, setHistory] = useState<EvaluationHistoryEntry[]>([]);
  const [expandedHistoryId, setExpandedHistoryId] = useState<string | null>(null);
  const [isLoadingSummaries, setIsLoadingSummaries] = useState(true);
  const isLoading = isLoadingAthletes || isLoadingSummaries;
  const [isLoadingEvaluation, setIsLoadingEvaluation] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  useTour("avaliacoes:v1", isLoading ? [] : TOUR_STEPS);

  const selectedAthlete = useMemo(
    () => athletes.find((athlete) => athlete.id === selectedAthleteId) ?? null,
    [athletes, selectedAthleteId],
  );

  const loadSummaries = useCallback(async () => {
    setIsLoadingSummaries(true);
    try {
      setSummaries(await evaluationService.getAllSummaries());
    } catch (error) {
      showToast(getApiErrorMessage(error), "error");
    } finally {
      setIsLoadingSummaries(false);
    }
  }, [showToast]);

  const loadHistory = useCallback(async (athleteId: string) => {
    if (!athleteId) { setHistory([]); return; }
    try {
      const data = await evaluationService.getHistory(athleteId);
      setHistory(data);
    } catch {
      setHistory([]);
    }
  }, []);

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
    loadSummaries();
  }, [loadSummaries]);

  useEffect(() => {
    loadEvaluation(selectedAthleteId);
    loadHistory(selectedAthleteId);
  }, [loadEvaluation, loadHistory, selectedAthleteId]);

  async function saveEvaluation(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!selectedAthleteId) return;
    setIsSaving(true);

    try {
      const data = await evaluationService.updateCoachEvaluation(selectedAthleteId, form);
      setEvaluation(data);
      loadHistory(selectedAthleteId);
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

      <div data-tour="aval-atleta">
      <Select
        label="Selecionar atleta"
        onChange={(event) => setSelectedAthleteId(event.target.value)}
        options={[
          { label: "Selecione um atleta", value: "" },
          ...athletes.map((athlete) => ({ label: athlete.name, value: athlete.id })),
        ]}
        value={selectedAthleteId}
      />
      </div>

      {isLoading ? (
        <section className="panel flex items-center gap-3 p-6 text-sm font-bold text-pegasus-primary">
          <Loader2 className="animate-spin" size={18} />
          Carregando atletas
        </section>
      ) : !selectedAthlete ? (
        <section className="space-y-4">
          <div className="flex items-center gap-2">
            <Star className="text-pegasus-primary" size={18} />
            <h2 className="text-lg font-black text-pegasus-navy">Visão geral do elenco</h2>
            <span className="rounded-full bg-pegasus-ice px-3 py-0.5 text-xs font-bold text-pegasus-primary">
              {summaries.filter((s) => s.overall !== null).length} avaliados
            </span>
          </div>
          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
            {summaries.map((s) => (
              <button
                key={s.id}
                type="button"
                onClick={() => setSelectedAthleteId(s.id)}
                className="panel group p-5 text-left transition hover:ring-2 hover:ring-pegasus-primary"
              >
                <div className="flex items-center gap-3">
                  <div className="grid h-11 w-11 shrink-0 place-items-center rounded-xl bg-pegasus-navy text-sm font-black text-white">
                    {initials(s.name)}
                  </div>
                  <div className="min-w-0">
                    <p className="truncate font-black text-pegasus-navy group-hover:text-pegasus-primary">{s.name}</p>
                    <p className="text-xs text-slate-500">{s.position ?? s.category ?? "—"}</p>
                  </div>
                  <div className={`ml-auto text-3xl font-black ${s.overall !== null ? overallTone(s.overall).includes("emerald") ? "text-emerald-600" : overallTone(s.overall).includes("amber") ? "text-amber-500" : "text-rose-600" : "text-slate-300"}`}>
                    {s.overall ?? "—"}
                  </div>
                </div>
                {s.overall !== null && (
                  <div className="mt-3 grid grid-cols-4 gap-2 text-center">
                    {([["Téc", s.technical], ["Fís", s.physical], ["Tát", s.tactical], ["Men", s.mental]] as [string, number | null][]).map(([abbr, val]) => (
                      <div key={abbr} className="rounded-lg bg-pegasus-surface py-1.5">
                        <p className="text-[10px] font-bold uppercase text-slate-400">{abbr}</p>
                        <p className="text-sm font-black text-pegasus-navy">{val ?? "—"}</p>
                      </div>
                    ))}
                  </div>
                )}
                {s.overall === null && (
                  <p className="mt-3 text-xs text-slate-400">Sem avaliação técnica ainda</p>
                )}
              </button>
            ))}
          </div>
        </section>
      ) : (
        <section data-tour="aval-form" className="grid gap-6 xl:grid-cols-[0.85fr_1.15fr]">
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

      {selectedAthlete && history.length >= 2 ? (
        <section className="panel p-6">
          <div className="mb-5 flex items-center gap-3">
            <TrendingUp className="text-pegasus-primary" size={20} />
            <h2 className="text-xl font-black text-pegasus-navy">Evolução por atributo</h2>
            <span className="rounded-full bg-pegasus-ice px-3 py-1 text-xs font-bold text-pegasus-primary">
              {history.length} avaliações
            </span>
          </div>
          <ResponsiveContainer width="100%" height={260}>
            <LineChart
              data={[...history].reverse().map((entry, i) => ({
                label: `#${i + 1} ${new Date(entry.createdAt).toLocaleDateString("pt-BR", { month: "short", day: "2-digit" })}`,
                Técnica: entry.technical,
                Físico: entry.physical,
                Tático: entry.tactical,
                Mental: entry.mental,
                Overall: entry.overall,
              }))}
            >
              <CartesianGrid stroke="#e2e8f0" strokeDasharray="3 3" />
              <XAxis dataKey="label" tick={{ fontSize: 11 }} />
              <YAxis domain={[0, 10]} tick={{ fontSize: 11 }} />
              <Tooltip />
              <Legend />
              <Line type="monotone" dataKey="Técnica" stroke="#1e3a5f" strokeWidth={2} dot={{ r: 4 }} />
              <Line type="monotone" dataKey="Físico" stroke="#22c55e" strokeWidth={2} dot={{ r: 4 }} />
              <Line type="monotone" dataKey="Tático" stroke="#f59e0b" strokeWidth={2} dot={{ r: 4 }} />
              <Line type="monotone" dataKey="Mental" stroke="#ec4899" strokeWidth={2} dot={{ r: 4 }} />
              <Line type="monotone" dataKey="Overall" stroke="#6366f1" strokeWidth={2} strokeDasharray="5 3" dot={{ r: 4 }} />
            </LineChart>
          </ResponsiveContainer>
        </section>
      ) : null}

      {selectedAthlete && history.length > 0 ? (
        <section className="panel p-6">
          <div className="mb-5 flex items-center gap-3">
            <History className="text-pegasus-primary" size={20} />
            <h2 className="text-xl font-black text-pegasus-navy">Histórico de avaliações</h2>
            <span className="rounded-full bg-pegasus-ice px-3 py-1 text-xs font-bold text-pegasus-primary">
              {history.length} registro{history.length !== 1 ? "s" : ""}
            </span>
          </div>
          <div className="space-y-3">
            {history.map((entry, index) => {
              const prev = history[index + 1] ?? null;
              const isExpanded = expandedHistoryId === entry.id;
              return (
                <article key={entry.id} className="overflow-hidden rounded-2xl border border-blue-100 bg-white">
                  <button
                    className="flex w-full items-center justify-between gap-4 p-4 text-left"
                    onClick={() => setExpandedHistoryId(isExpanded ? null : entry.id)}
                    type="button"
                  >
                    <div className="flex items-center gap-4">
                      <span className="text-3xl font-black text-pegasus-navy">{entry.overall ?? "--"}</span>
                      <div>
                        <p className="text-sm font-bold text-pegasus-navy">
                          {new Date(entry.createdAt).toLocaleDateString("pt-BR")}
                        </p>
                        <p className="text-xs text-slate-500">{entry.evaluatedBy ?? "Avaliação técnica"}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-4">
                      {([["Téc", entry.technical], ["Fís", entry.physical], ["Tát", entry.tactical], ["Men", entry.mental]] as [string, number | null][]).map(([abbr, val]) => (
                        <span className="hidden flex-col items-center sm:flex" key={abbr}>
                          <span className="text-xs text-slate-400">{abbr}</span>
                          <span className="text-sm font-bold text-pegasus-navy">{val ?? "--"}</span>
                        </span>
                      ))}
                      {isExpanded ? <ChevronUp className="text-slate-400" size={16} /> : <ChevronDown className="text-slate-400" size={16} />}
                    </div>
                  </button>
                  {isExpanded ? (
                    <div className="border-t border-blue-50 px-4 pb-4 pt-3">
                      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
                        {([["Técnica", entry.technical, prev?.technical], ["Físico", entry.physical, prev?.physical], ["Tático", entry.tactical, prev?.tactical], ["Mental", entry.mental, prev?.mental]] as [string, number | null, number | null | undefined][]).map(([name, current, previous]) => {
                          const delta = current !== null && previous != null ? +(current - previous).toFixed(1) : null;
                          return (
                            <div className="rounded-xl bg-pegasus-surface p-3" key={name}>
                              <p className="text-xs font-bold uppercase tracking-wide text-slate-400">{name}</p>
                              <p className="mt-1 text-2xl font-black text-pegasus-navy">{current ?? "--"}</p>
                              {delta !== null ? (
                                <p className={`mt-0.5 text-xs font-bold ${delta > 0 ? "text-emerald-600" : delta < 0 ? "text-rose-600" : "text-slate-400"}`}>
                                  {delta > 0 ? `+${delta} ↑` : delta < 0 ? `${delta} ↓` : "= igual"}
                                </p>
                              ) : null}
                            </div>
                          );
                        })}
                      </div>
                      {entry.coachNotes ? (
                        <p className="mt-3 text-sm text-slate-600">
                          <strong className="text-pegasus-navy">Obs.: </strong>{entry.coachNotes}
                        </p>
                      ) : null}
                    </div>
                  ) : null}
                </article>
              );
            })}
          </div>
        </section>
      ) : null}
    </div>
  );
}
