import { ClockArrowUp, Download, FileDown, Info, Loader2, Plus, UserCheck } from "lucide-react";
import { FormEvent, useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useAthletes, useInvalidateAthletes } from "../../hooks/useAthletes";
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
import { StatusBadge, type StatusTone } from "../../components/ui/StatusBadge";
import { Table } from "../../components/ui/Table";
import { Textarea } from "../../components/ui/Textarea";
import { useToast } from "../../components/ui/Toast";
import { getApiErrorMessage } from "../../services/api";
import { exportToCSV } from "../../utils/exportUtils";
import { attendanceService } from "../../services/attendanceService";
import { athleteApplicationService, type AthleteApplication } from "../../services/athleteApplicationService";
import {
  athleteService,
  type Athlete,
  type AthleteGender,
  type AthleteImportSummary,
  type AthletePayload,
  type AthleteStatus,
  type MonthlyPaymentStatus,
  type PaymentStatusHistoryEntry,
} from "../../services/athleteService";

function InfoField({ label, value }: { label: string; value: React.ReactNode }) {
  if (!value) return null;
  return (
    <div>
      <p className="text-xs font-bold uppercase tracking-wide text-slate-400">{label}</p>
      <p className="mt-0.5 text-sm text-pegasus-navy">{value}</p>
    </div>
  );
}

function ApplicationInfoGrid({ application: a }: { application: AthleteApplication }) {
  const fmtDate = (v: string | null) => v ? new Date(v).toLocaleDateString("pt-BR") : "-";
  const bool = (v: boolean | null) => v === null ? "-" : v ? "Sim" : "Não";
  return (
    <div className="grid gap-4 sm:grid-cols-2">
      <InfoField label="Nome" value={a.name} />
      <InfoField label="Nascimento" value={fmtDate(a.birthDate)} />
      <InfoField label="Telefone" value={a.phone} />
      <InfoField label="E-mail" value={a.email} />
      <InfoField label="Posição" value={a.position} />
      <InfoField label="Segunda Posição" value={a.secondPosition} />
      <InfoField label="Disposto a Treinar em" value={a.willingPositions?.replace(/,/g, ", ")} />
      <InfoField label="Nível" value={a.level} />
      <InfoField label="Tempo de Experiência" value={a.experienceTime} />
      <InfoField label="Joga em Time" value={bool(a.currentTeam)} />
      <InfoField label="Time Atual" value={a.currentTeamName} />
      <InfoField label="Disponível Sábados" value={bool(a.availableSaturdays)} />
      <InfoField label="Disposto a Campeonatos" value={bool(a.willingToCompete)} />
      <InfoField label="Indicação" value={a.referral} />
      <div className="sm:col-span-2"><InfoField label="Motivação" value={a.motivation} /></div>
      <div className="sm:col-span-2"><InfoField label="Como Descobriu" value={a.howFound} /></div>
      <div className="sm:col-span-2"><InfoField label="Contribuição" value={a.contribution} /></div>
      {a.notes && <div className="sm:col-span-2"><InfoField label="Observações Internas" value={a.notes} /></div>}
    </div>
  );
}

function frequencyTone(pct: number | null | undefined): string {
  if (pct == null) return "text-slate-400";
  if (pct >= 75) return "text-emerald-600 font-bold";
  if (pct >= 50) return "text-amber-600 font-bold";
  return "text-rose-600 font-bold";
}

type AthleteForm = Required<Omit<AthletePayload, "gender">> & { gender: AthleteGender | "" };

const emptyAthlete: AthleteForm = {
  name: "",
  email: "",
  phone: "",
  category: "",
  position: "",
  gender: "",
  status: "ativo",
  monthlyPaymentStatus: "pendente",
  notes: "",
};

const statusOptions = [
  { label: "Ativos", value: "ativo" },
  { label: "Inativos", value: "inativo" },
  { label: "Todos", value: "todos" },
];

const paymentStatusOptions = [
  { label: "Pago", value: "pago" },
  { label: "Pendente", value: "pendente" },
  { label: "Atrasado", value: "atrasado" },
  { label: "Isento", value: "isento" },
];

const positionOptions = [
  { label: "Selecione uma posição", value: "" },
  { label: "Levantador", value: "Levantador" },
  { label: "Ponteiro", value: "Ponteiro" },
  { label: "Central", value: "Central" },
  { label: "Líbero", value: "Líbero" },
  { label: "Oposto", value: "Oposto" },
];

const TOUR_STEPS = [
  {
    popover: {
      title: "🏐 Atletas",
      description: "Cadastro completo de atletas: criação, edição, filtros por status e sexo, importação do Google Forms e exportação CSV.",
    },
  },
  {
    element: "[data-tour='atletas-filtros']",
    popover: {
      title: "Filtros",
      description: "Filtre por nome, status (Ativo / Inativo / Todos) e sexo. Use a importação do Google Forms para cadastrar múltiplos atletas de uma vez.",
      side: "bottom" as const,
    },
  },
  {
    element: "[data-tour='atletas-lista']",
    popover: {
      title: "Lista de atletas",
      description: "Clique no nome para editar. Use os botões de ação para editar, excluir ou ver histórico de pagamentos. A barra de frequência mostra a assiduidade recente.",
      side: "top" as const,
    },
  },
];

function badgeTone(value: string): StatusTone {
  if (["ativo", "pago"].includes(value)) return "success";
  if (["teste", "pendente"].includes(value)) return "warning";
  if (["inativo", "atrasado"].includes(value)) return "danger";
  if (value === "isento") return "info";
  return "neutral";
}

function label(value?: string | null) {
  if (!value) return "-";
  if (value === "isento") return "Isento";
  return value.charAt(0).toUpperCase() + value.slice(1);
}

function buildPayload(form: AthleteForm): AthletePayload {
  return {
    name: form.name,
    email: form.email,
    phone: form.phone || undefined,
    category: form.category || undefined,
    position: form.position,
    gender: form.gender || null,
    status: form.status,
    monthlyPaymentStatus: form.monthlyPaymentStatus,
    notes: form.notes,
  };
}

function athleteToForm(athlete: Athlete): AthleteForm {
  return {
    name: athlete.name,
    email: athlete.email ?? "",
    phone: athlete.phone ?? "",
    category: athlete.category ?? "",
    position: athlete.position ?? "",
    gender: athlete.gender ?? "",
    status: athlete.status,
    monthlyPaymentStatus: athlete.monthlyPaymentStatus,
    notes: athlete.notes ?? "",
  };
}

export function AthletesPage() {
  const { hasPermission } = useAuth();
  const { showToast } = useToast();
  const canCreate = hasPermission(["athletes:create"]);
  const canUpdate = hasPermission(["athletes:update"]);
  const canDelete = hasPermission(["athletes:delete"]);
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState("ativo");
  const invalidateAthletes = useInvalidateAthletes();
  const [isSaving, setIsSaving] = useState(false);
  const [isImporting, setIsImporting] = useState(false);
  const [importSummary, setImportSummary] = useState<AthleteImportSummary | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingAthlete, setEditingAthlete] = useState<Athlete | null>(null);
  const [form, setForm] = useState<AthleteForm>(emptyAthlete);
  const [deleteTarget, setDeleteTarget] = useState<Athlete | null>(null);
  const [reactivateTarget, setReactivateTarget] = useState<Athlete | null>(null);
  const [frequencyMap, setFrequencyMap] = useState<Record<string, number | null>>({});
  const [historyAthlete, setHistoryAthlete] = useState<Athlete | null>(null);
  const [paymentHistory, setPaymentHistory] = useState<PaymentStatusHistoryEntry[]>([]);
  const [isLoadingHistory, setIsLoadingHistory] = useState(false);
  const [infoTarget, setInfoTarget] = useState<Athlete | null>(null);
  const [infoApplication, setInfoApplication] = useState<AthleteApplication | null>(null);
  const [isLoadingInfo, setIsLoadingInfo] = useState(false);
  const [genderSuggestion, setGenderSuggestion] = useState<{ gender: AthleteGender; probability: number } | null>(null);
  const [genderFilter, setGenderFilter] = useState<"todos" | "masculino" | "feminino">("todos");

  const filters = useMemo(
    () => ({ search, status: status as AthleteStatus | "todos" }),
    [search, status],
  );

  const { data: athletes = [], isLoading } = useAthletes(filters);

  useTour("atletas-rh:v1", isLoading ? [] : TOUR_STEPS);
  const genderizeTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const displayedAthletes = useMemo(() => {
    return athletes.filter((a) => {
      if (a.status === "teste") return false;
      if (status === "ativo" && a.status !== "ativo") return false;
      if (status === "inativo" && a.status !== "inativo") return false;
      if (genderFilter !== "todos" && a.gender !== genderFilter) return false;
      return true;
    });
  }, [athletes, status, genderFilter]);

  useEffect(() => {
    attendanceService.getAthletesSummary().then(setFrequencyMap).catch(() => {});
  }, []);

  async function openPaymentHistory(athlete: Athlete) {
    setHistoryAthlete(athlete);
    setPaymentHistory([]);
    setIsLoadingHistory(true);
    try {
      const data = await athleteService.getPaymentStatusHistory(athlete.id);
      setPaymentHistory(data);
    } catch (error) {
      showToast(getApiErrorMessage(error), "error");
    } finally {
      setIsLoadingHistory(false);
    }
  }

  async function openInfo(athlete: Athlete) {
    setInfoTarget(athlete);
    setInfoApplication(null);
    setIsLoadingInfo(true);
    try {
      const app = await athleteApplicationService.getByAthleteId(athlete.id);
      setInfoApplication(app);
    } catch {
      // silently ignore
    } finally {
      setIsLoadingInfo(false);
    }
  }

  function fetchGenderSuggestion(name: string) {
    const firstName = name.trim().split(" ")[0];
    if (!firstName || firstName.length < 2) { setGenderSuggestion(null); return; }
    if (genderizeTimer.current) clearTimeout(genderizeTimer.current);
    genderizeTimer.current = setTimeout(async () => {
      try {
        const res = await fetch(`https://api.genderize.io/?name=${encodeURIComponent(firstName)}&country_id=BR`);
        const json = await res.json() as { gender: string | null; probability: number };
        if (json.gender === "male" || json.gender === "female") {
          setGenderSuggestion({
            gender: json.gender === "male" ? "masculino" : "feminino",
            probability: json.probability,
          });
        } else {
          setGenderSuggestion(null);
        }
      } catch { setGenderSuggestion(null); }
    }, 600);
  }

  function handleNameChange(value: string) {
    setForm((f) => ({ ...f, name: value }));
    fetchGenderSuggestion(value);
  }

  function openCreateModal() {
    setEditingAthlete(null);
    setForm(emptyAthlete);
    setGenderSuggestion(null);
    setIsModalOpen(true);
  }

  function openEditModal(athlete: Athlete) {
    setEditingAthlete(athlete);
    setForm(athleteToForm(athlete));
    setGenderSuggestion(null);
    setIsModalOpen(true);
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setIsSaving(true);

    try {
      if (editingAthlete) {
        const updatedAthlete = await athleteService.update(editingAthlete.id, buildPayload(form));
        showToast(
          updatedAthlete.user?.username
            ? `Atleta atualizado. Usuário: ${updatedAthlete.user.username}`
            : "Atleta atualizado com sucesso.",
          "success",
        );
      } else {
        const createdAthlete = await athleteService.create(buildPayload(form));
        showToast(
          createdAthlete.user?.username
            ? `Atleta cadastrado. Usuário: ${createdAthlete.user.username}`
            : "Atleta cadastrado com sucesso.",
          "success",
        );
      }

      setIsModalOpen(false);
      invalidateAthletes();
    } catch (error) {
      showToast(getApiErrorMessage(error), "error");
    } finally {
      setIsSaving(false);
    }
  }

  async function confirmInactivate() {
    if (!deleteTarget) return;

    setIsSaving(true);

    try {
      await athleteService.remove(deleteTarget.id);
      showToast("Atleta inativado com sucesso.", "success");
      setDeleteTarget(null);
      invalidateAthletes();
    } catch (error) {
      showToast(getApiErrorMessage(error), "error");
    } finally {
      setIsSaving(false);
    }
  }

  async function confirmReactivate() {
    if (!reactivateTarget) return;
    setIsSaving(true);
    try {
      await athleteService.update(reactivateTarget.id, { status: "ativo" });
      showToast("Atleta reativado com sucesso.", "success");
      setReactivateTarget(null);
      invalidateAthletes();
    } catch (error) {
      showToast(getApiErrorMessage(error), "error");
    } finally {
      setIsSaving(false);
    }
  }

  async function importFromGoogleForms() {
    setIsImporting(true);
    setImportSummary(null);

    try {
      const summary = await athleteService.importFromGoogleSheets();
      setImportSummary(summary);
      showToast("Importação concluída.", "success");
      invalidateAthletes();
    } catch (error) {
      showToast(getApiErrorMessage(error), "error");
    } finally {
      setIsImporting(false);
    }
  }

  return (
    <div className="space-y-8">
      <PageHeader
        title="RH / Atletas"
        description="Cadastro, filtros e acompanhamento dos atletas."
        action={
          <div className="flex w-full flex-col gap-3 sm:w-auto sm:flex-row">
            <Button
              onClick={() =>
                exportToCSV(
                  "atletas",
                  ["Nome", "E-mail", "Telefone", "Posição", "Categoria", "Status", "Mensalidade"],
                  displayedAthletes.map((a) => [a.name, a.email, a.phone, a.position, a.category, a.status, a.monthlyPaymentStatus]),
                )
              }
              variant="secondary"
            >
              <FileDown size={17} />
              Exportar CSV
            </Button>
            {canCreate ? (
              <>
                <Button disabled={isImporting} onClick={importFromGoogleForms} variant="secondary">
                  {isImporting ? <Loader2 className="animate-spin" size={17} /> : <Download size={17} />}
                  Importar do Google Forms
                </Button>
                <Button onClick={openCreateModal}>
                  <Plus size={17} />
                  Novo atleta
                </Button>
              </>
            ) : null}
          </div>
        }
      />

      {importSummary ? (
        <section className="panel p-5">
          <div className="flex flex-wrap gap-4 text-sm">
            <span className="font-bold text-pegasus-navy">Resumo da importação</span>
            <span className="text-slate-600">Total lido: {importSummary.totalRead}</span>
            <span className="text-emerald-700">Importados: {importSummary.imported}</span>
            <span className="text-amber-700">Duplicados: {importSummary.duplicates}</span>
            <span className="text-rose-700">Erros: {importSummary.errors.length}</span>
          </div>
          {importSummary.errors.length > 0 ? (
            <div className="mt-3 space-y-1 text-sm text-rose-700">
              {importSummary.errors.slice(0, 5).map((error) => (
                <p key={`${error.row}-${error.message}`}>
                  Linha {error.row}: {error.message}
                </p>
              ))}
            </div>
          ) : null}
        </section>
      ) : null}

      <div data-tour="atletas-filtros">
      <FilterBar>
        <Input
          label="Buscar por nome"
          onChange={(event) => setSearch(event.target.value)}
          value={search}
        />
        <Select
          label="Status"
          onChange={(event) => setStatus(event.target.value)}
          options={statusOptions}
          value={status}
        />
        <div className="flex flex-col gap-1">
          <span className="text-xs font-medium text-slate-500">Sexo</span>
          <div className="flex rounded-xl border border-slate-200 bg-white overflow-hidden text-sm font-medium">
            {(["todos", "masculino", "feminino"] as const).map((opt) => (
              <button
                key={opt}
                type="button"
                onClick={() => setGenderFilter(opt)}
                className={`px-3 py-2 transition ${
                  genderFilter === opt
                    ? opt === "masculino"
                      ? "bg-blue-100 text-blue-700"
                      : opt === "feminino"
                        ? "bg-pink-100 text-pink-700"
                        : "bg-slate-100 text-slate-700"
                    : "text-slate-500 hover:bg-slate-50"
                }`}
              >
                {opt === "todos" ? "Todos" : opt === "masculino" ? "Masc." : "Fem."}
              </button>
            ))}
          </div>
        </div>
      </FilterBar>
      </div>

      <section data-tour="atletas-lista" className="panel overflow-hidden">
        <div className="flex items-center gap-3 border-b border-blue-100 p-6">
          <UserCheck className="text-pegasus-primary" size={22} />
          <div>
            <h2 className="text-xl font-bold text-pegasus-navy">Atletas</h2>
            <p className="text-sm text-slate-500">{displayedAthletes.length} registro(s) encontrados.</p>
          </div>
        </div>

        {isLoading ? (
          <div className="flex items-center gap-3 p-6 text-sm font-bold text-pegasus-primary">
            <Loader2 className="animate-spin" size={18} />
            Carregando atletas
          </div>
        ) : displayedAthletes.length > 0 ? (
          <>
            <div className="grid gap-3 p-4 md:hidden">
              {displayedAthletes.map((athlete) => (
                <article key={athlete.id} className={`rounded-2xl border border-blue-100 bg-white p-4 shadow-sm${athlete.status === "inativo" ? " opacity-60" : ""}`}>
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <h3 className="font-bold text-pegasus-navy">{athlete.name}</h3>
                      <p className="mt-1 text-sm text-slate-500">{athlete.email ?? athlete.phone ?? "Sem contato"}</p>
                    </div>
                    <StatusBadge label={label(athlete.status)} tone={badgeTone(athlete.status)} />
                  </div>
                  <div className="mt-4 grid gap-3 text-sm text-slate-600">
                    <p><strong className="text-pegasus-navy">Posição:</strong> {athlete.position ?? "-"}</p>
                    <p><strong className="text-pegasus-navy">Categoria:</strong> {athlete.category ?? "-"}</p>
                  </div>
                  <div className="mt-4 flex flex-wrap items-center gap-2 border-t border-blue-50 pt-3">
                    <Button
                      className="h-8 px-3 text-xs"
                      onClick={() => openPaymentHistory(athlete)}
                      variant="secondary"
                    >
                      <ClockArrowUp size={13} />Histórico
                    </Button>
                    <button
                      className="flex items-center gap-1.5 rounded-xl bg-blue-50 px-3 py-1.5 text-sm font-semibold text-blue-700 hover:bg-blue-100"
                      onClick={() => openInfo(athlete)}
                      type="button"
                    >
                      <Info size={13} />
                      Inscrição
                    </button>
                    {athlete.status === "inativo" ? (
                      <ActionButtons
                        canDelete={false}
                        canEdit={canUpdate}
                        canToggle={canUpdate}
                        onEdit={() => openEditModal(athlete)}
                        onToggle={() => setReactivateTarget(athlete)}
                        toggleLabel="Reativar"
                      />
                    ) : (
                      <ActionButtons
                        canDelete={false}
                        canEdit={canUpdate}
                        canToggle={canDelete}
                        onEdit={() => openEditModal(athlete)}
                        onToggle={() => setDeleteTarget(athlete)}
                        toggleLabel="Inativar"
                      />
                    )}
                  </div>
                </article>
              ))}
            </div>
            <div className="hidden md:block">
              <Table
                headers={["Nome", "Posição", "Sexo", "Status", "Frequência", "Ações"]}
                minWidth="920px"
              >
                {displayedAthletes.map((athlete) => {
                  const pct = frequencyMap[athlete.id];
                  return (
                    <tr key={athlete.id} className={`bg-white${athlete.status === "inativo" ? " opacity-60" : ""}`}>
                      <td className="px-6 py-4">
                        <p className="font-bold text-pegasus-navy">{athlete.name}</p>
                        <p className="text-xs text-slate-500">{athlete.email ?? "-"}</p>
                      </td>
                      <td className="px-6 py-4 text-slate-600">{athlete.position ?? "-"}</td>
                      <td className="px-6 py-4">
                        {athlete.gender ? (
                          <span className={`inline-block rounded-full px-2 py-0.5 text-xs font-semibold ${athlete.gender === "masculino" ? "bg-blue-100 text-blue-700" : "bg-pink-100 text-pink-700"}`}>
                            {athlete.gender === "masculino" ? "Masc." : "Fem."}
                          </span>
                        ) : (
                          <span className="text-xs text-slate-300">—</span>
                        )}
                      </td>
                      <td className="px-6 py-4">
                        <StatusBadge label={label(athlete.status)} tone={badgeTone(athlete.status)} />
                      </td>
                      <td className="px-6 py-4">
                        <span className={`text-sm ${frequencyTone(pct)}`}>
                          {pct != null ? `${pct}%` : "—"}
                        </span>
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex flex-wrap items-center gap-2">
                          <Button
                            className="h-8 px-3 text-xs"
                            onClick={() => openPaymentHistory(athlete)}
                            variant="secondary"
                          >
                            <ClockArrowUp size={13} />Histórico
                          </Button>
                          <button
                            className="flex items-center gap-1.5 rounded-xl bg-blue-50 px-3 py-1.5 text-sm font-semibold text-blue-700 hover:bg-blue-100"
                            onClick={() => openInfo(athlete)}
                            type="button"
                          >
                            <Info size={15} />
                            Inscrição
                          </button>
                          {athlete.status === "inativo" ? (
                            <ActionButtons
                              canDelete={false}
                              canEdit={canUpdate}
                              canToggle={canUpdate}
                              onEdit={() => openEditModal(athlete)}
                              onToggle={() => setReactivateTarget(athlete)}
                              toggleLabel="Reativar"
                            />
                          ) : (
                            <ActionButtons
                              canDelete={false}
                              canEdit={canUpdate}
                              canToggle={canDelete}
                              onEdit={() => openEditModal(athlete)}
                              onToggle={() => setDeleteTarget(athlete)}
                              toggleLabel="Inativar"
                            />
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </Table>
            </div>
          </>
        ) : (
          <div className="p-6">
            <EmptyState
              description="Ajuste os filtros ou cadastre um novo atleta para preencher a listagem."
              icon={UserCheck}
              title="Nenhum atleta encontrado"
            />
          </div>
        )}
      </section>


      {/* Modal de inscrição */}
      <Modal
        description="Dados preenchidos no formulário de inscrição."
        isOpen={Boolean(infoTarget)}
        onClose={() => { setInfoTarget(null); setInfoApplication(null); }}
        title={infoTarget?.name ?? ""}
      >
        {isLoadingInfo ? (
          <div className="flex items-center gap-2 py-4 text-sm text-pegasus-primary">
            <Loader2 className="animate-spin" size={16} /> Carregando inscrição...
          </div>
        ) : infoApplication ? (
          <ApplicationInfoGrid application={infoApplication} />
        ) : (
          <p className="py-4 text-sm text-slate-500">Este atleta não se inscreveu pelo site. Não há dados de inscrição disponíveis.</p>
        )}
      </Modal>

      {/* Modal de histórico de mensalidade */}
      <Modal
        isOpen={Boolean(historyAthlete)}
        onClose={() => setHistoryAthlete(null)}
        title={`Histórico de mensalidade — ${historyAthlete?.name ?? ""}`}
      >
        {isLoadingHistory ? (
          <div className="flex items-center gap-3 py-8 text-sm font-bold text-pegasus-primary">
            <Loader2 className="animate-spin" size={18} />
            Carregando histórico
          </div>
        ) : paymentHistory.length === 0 ? (
          <p className="py-8 text-center text-sm text-slate-500">Nenhuma alteração registrada ainda.</p>
        ) : (
          <div className="divide-y divide-blue-50">
            {paymentHistory.map((entry) => (
              <div className="flex items-start justify-between gap-4 py-3" key={entry.id}>
                <div>
                  <p className="text-sm text-slate-600">
                    <span className="font-bold text-pegasus-navy">{label(entry.fromStatus)}</span>
                    {" → "}
                    <span className="font-bold text-pegasus-navy">{label(entry.toStatus)}</span>
                  </p>
                  <p className="mt-0.5 text-xs text-slate-400">por {entry.changedBy}</p>
                  {entry.notes ? <p className="mt-0.5 text-xs text-slate-500 italic">{entry.notes}</p> : null}
                </div>
                <p className="shrink-0 text-xs text-slate-400">
                  {new Date(entry.createdAt).toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit", year: "numeric", hour: "2-digit", minute: "2-digit" })}
                </p>
              </div>
            ))}
          </div>
        )}
      </Modal>

      <Modal
        description="Preencha os dados do atleta. As alterações serão salvas na API."
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        title={editingAthlete ? "Editar atleta" : "Novo atleta"}
      >
        <form className="grid gap-4" onSubmit={handleSubmit}>
          <div className="grid gap-4 md:grid-cols-2">
            <Input
              disabled={isSaving}
              label="Nome"
              onChange={(event) => handleNameChange(event.target.value)}
              required
              value={form.name}
            />
            <Input
              disabled={isSaving}
              label="E-mail"
              onChange={(event) => setForm({ ...form, email: event.target.value })}
              type="email"
              value={form.email}
            />
            <Select
              label="Posição"
              onChange={(event) => setForm({ ...form, position: event.target.value })}
              options={positionOptions}
              value={form.position}
            />
            <div>
              <Select
                label="Sexo"
                onChange={(event) => setForm({ ...form, gender: event.target.value as AthleteGender | "" })}
                options={[
                  { label: "Não definido", value: "" },
                  { label: "Masculino", value: "masculino" },
                  { label: "Feminino", value: "feminino" },
                ]}
                value={form.gender}
              />
              {genderSuggestion && !form.gender && (
                <button
                  type="button"
                  onClick={() => setForm((f) => ({ ...f, gender: genderSuggestion.gender }))}
                  className="mt-1.5 flex items-center gap-1.5 rounded-lg border border-amber-200 bg-amber-50 px-2.5 py-1 text-xs font-medium text-amber-700 hover:bg-amber-100"
                >
                  Sugestão: {genderSuggestion.gender === "masculino" ? "Masculino" : "Feminino"} ({Math.round(genderSuggestion.probability * 100)}%) — clique para aplicar
                </button>
              )}
            </div>
            <Select
              label="Status"
              onChange={(event) =>
                setForm({ ...form, status: event.target.value as AthleteStatus })
              }
              options={[
                { label: "Ativo", value: "ativo" },
                { label: "Inativo", value: "inativo" },
                { label: "Teste", value: "teste" },
              ]}
              value={form.status}
            />
            {form.status === "ativo" && editingAthlete?.status !== "ativo" ? (
              <p className="rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm font-semibold leading-6 text-amber-800 md:col-span-2">
                Ao ativar este atleta, um usuário de acesso será criado automaticamente.
              </p>
            ) : null}
            <Select
              label="Mensalidade"
              onChange={(event) =>
                setForm({
                  ...form,
                  monthlyPaymentStatus: event.target.value as MonthlyPaymentStatus,
                })
              }
              options={paymentStatusOptions}
              value={form.monthlyPaymentStatus}
            />
          </div>
          <Textarea
            label="Observações"
            onChange={(event) => setForm({ ...form, notes: event.target.value })}
            value={form.notes}
          />
          <div className="flex flex-col gap-3 sm:flex-row">
            <Button disabled={isSaving} type="submit">
              {isSaving ? (
                <>
                  <Loader2 className="animate-spin" size={17} />
                  Salvando
                </>
              ) : editingAthlete ? (
                "Salvar alterações"
              ) : (
                "Cadastrar atleta"
              )}
            </Button>
            <Button disabled={isSaving} onClick={() => setIsModalOpen(false)} variant="secondary">
              Cancelar
            </Button>
          </div>
        </form>
      </Modal>

      <ConfirmDialog
        confirmLabel={isSaving ? "Inativando..." : "Inativar atleta"}
        description={`Deseja inativar ${deleteTarget?.name ?? "este atleta"}? O registro será mantido no histórico.`}
        isOpen={Boolean(deleteTarget)}
        onClose={() => setDeleteTarget(null)}
        onConfirm={confirmInactivate}
        title="Confirmar inativação"
      />

      <ConfirmDialog
        confirmLabel={isSaving ? "Reativando..." : "Reativar atleta"}
        description={`Deseja reativar ${reactivateTarget?.name ?? "este atleta"}? Ele voltará a aparecer na lista principal.`}
        isOpen={Boolean(reactivateTarget)}
        onClose={() => setReactivateTarget(null)}
        onConfirm={confirmReactivate}
        title="Confirmar reativação"
      />
    </div>
  );
}



