import { CheckCircle2, Download, Loader2, Plus, UserPlus, XCircle } from "lucide-react";
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
import { StatusBadge, type StatusTone } from "../../components/ui/StatusBadge";
import { Table } from "../../components/ui/Table";
import { Textarea } from "../../components/ui/Textarea";
import { useToast } from "../../components/ui/Toast";
import { getApiErrorMessage } from "../../services/api";
import {
  athleteApplicationService,
  type AthleteApplication,
  type AthleteApplicationImportSummary,
  type AthleteApplicationPayload,
  type AthleteApplicationStatus,
} from "../../services/athleteApplicationService";

type ApplicationForm = {
  name: string;
  email: string;
  phone: string;
  category: string;
  position: string;
  experienceTime: string;
  level: string;
  contribution: string;
  motivation: string;
  howFound: string;
  referral: string;
  source: string;
  status: AthleteApplicationStatus;
  notes: string;
};

const emptyApplication: ApplicationForm = {
  name: "",
  email: "",
  phone: "",
  category: "",
  position: "",
  experienceTime: "",
  level: "",
  contribution: "",
  motivation: "",
  howFound: "",
  referral: "",
  source: "site",
  status: "em_analise",
  notes: "",
};

const statusOptions = [
  { label: "Todos os status", value: "todos" },
  { label: "Pendente", value: "pendente" },
  { label: "Em análise", value: "em_analise" },
  { label: "Aprovado", value: "aprovado" },
  { label: "Recusado", value: "recusado" },
];

const positionOptions = [
  { label: "Todas as posições", value: "todos" },
  { label: "Levantador", value: "Levantador" },
  { label: "Ponteiro", value: "Ponteiro" },
  { label: "Central", value: "Central" },
  { label: "Líbero", value: "Líbero" },
  { label: "Oposto", value: "Oposto" },
];

const levelOptions = [
  { label: "Selecione o nível", value: "" },
  { label: "Iniciante", value: "Iniciante" },
  { label: "Intermediário", value: "Intermediário" },
  { label: "Avançado", value: "Avançado" },
];

function applicationTone(status: string): StatusTone {
  if (status === "aprovado") return "success";
  if (status === "em_analise") return "info";
  if (status === "recusado") return "danger";
  return "warning";
}

function label(value: string) {
  const labels: Record<string, string> = {
    pendente: "Pendente",
    em_analise: "Em análise",
    aprovado: "Aprovado",
    recusado: "Recusado",
  };
  if (labels[value]) return labels[value];
  return value.split("_").map((p) => p.charAt(0).toUpperCase() + p.slice(1)).join(" ");
}

function boolLabel(value: boolean | null, yesLabel = "Sim", noLabel = "Não") {
  if (value === null || value === undefined) return "-";
  return value ? yesLabel : noLabel;
}

function applicationToForm(application: AthleteApplication): ApplicationForm {
  return {
    name: application.name,
    email: application.email ?? "",
    phone: application.phone ?? "",
    category: application.category ?? "",
    position: application.position ?? "",
    experienceTime: application.experienceTime ?? "",
    level: application.level ?? "",
    contribution: application.contribution ?? "",
    motivation: application.motivation ?? "",
    howFound: application.howFound ?? "",
    referral: application.referral ?? "",
    source: application.source,
    status: application.status,
    notes: application.notes ?? "",
  };
}

function buildPayload(form: ApplicationForm): AthleteApplicationPayload {
  return {
    name: form.name,
    email: form.email,
    phone: form.phone,
    category: form.category,
    position: form.position,
    experienceTime: form.experienceTime,
    level: form.level,
    contribution: form.contribution,
    motivation: form.motivation,
    howFound: form.howFound,
    referral: form.referral,
    source: form.source,
    status: form.status,
    notes: form.notes,
  };
}

function formatDate(value: string) {
  return new Intl.DateTimeFormat("pt-BR", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  }).format(new Date(value));
}

function formatBirthDate(value: string | null) {
  if (!value) return "-";
  return new Intl.DateTimeFormat("pt-BR").format(new Date(value));
}

// ── Drawer de detalhes ────────────────────────────────────────────────────────

function DetailField({ label: fieldLabel, value }: { label: string; value: React.ReactNode }) {
  return (
    <div>
      <p className="text-xs font-bold uppercase tracking-wide text-slate-400">{fieldLabel}</p>
      <p className="mt-0.5 text-sm text-pegasus-navy">{value || "-"}</p>
    </div>
  );
}

function ApplicationDetailModal({
  application,
  onClose,
}: {
  application: AthleteApplication | null;
  onClose: () => void;
}) {
  if (!application) return null;
  return (
    <Modal isOpen={!!application} onClose={onClose} title={application.name} description="Detalhes completos da inscrição">
      <div className="grid gap-5 sm:grid-cols-2">
        <DetailField label="Nome" value={application.name} />
        <DetailField label="Data de Nascimento" value={formatBirthDate(application.birthDate)} />
        <DetailField label="Telefone" value={application.phone} />
        <DetailField label="E-mail" value={application.email} />
        <DetailField label="Posição" value={application.position} />
        <DetailField label="Nível" value={application.level} />
        <DetailField label="Tempo de Experiência" value={application.experienceTime} />
        <DetailField label="Disponível aos Sábados (17:30-19h)" value={boolLabel(application.availableSaturdays)} />
        <DetailField label="Joga em Time Atualmente" value={boolLabel(application.currentTeam)} />
        <DetailField label="Time Atual" value={application.currentTeamName} />
        <DetailField label="Disposto a Campeonatos" value={boolLabel(application.willingToCompete)} />
        <DetailField label="Indicação" value={application.referral} />
        <div className="sm:col-span-2">
          <DetailField label="Motivação para Entrar no Time" value={application.motivation} />
        </div>
        <div className="sm:col-span-2">
          <DetailField label="Como Descobriu o Pegasus" value={application.howFound} />
        </div>
        {application.contribution && (
          <div className="sm:col-span-2">
            <DetailField label="Contribuição" value={application.contribution} />
          </div>
        )}
        {application.notes && (
          <div className="sm:col-span-2">
            <DetailField label="Observações Internas" value={application.notes} />
          </div>
        )}
        <DetailField label="Origem" value={application.source} />
        <DetailField label="Entrada" value={formatDate(application.createdAt)} />
      </div>
    </Modal>
  );
}

// ── Página Principal ───────────────────────────────────────────────────────────

export function AthleteApplicationsPage() {
  const { hasPermission } = useAuth();
  const { showToast } = useToast();
  const canCreate = hasPermission(["rh", "athletes:create"]);
  const canUpdate = hasPermission(["rh", "athletes:update"]);
  const canDelete = hasPermission(["rh", "athletes:delete"]);
  const [applications, setApplications] = useState<AthleteApplication[]>([]);
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState("pendente");
  const [position, setPosition] = useState("todos");
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [isImporting, setIsImporting] = useState(false);
  const [importSummary, setImportSummary] = useState<AthleteApplicationImportSummary | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingApplication, setEditingApplication] = useState<AthleteApplication | null>(null);
  const [detailApplication, setDetailApplication] = useState<AthleteApplication | null>(null);
  const [form, setForm] = useState<ApplicationForm>(emptyApplication);
  const [approveTarget, setApproveTarget] = useState<AthleteApplication | null>(null);
  const [rejectTarget, setRejectTarget] = useState<AthleteApplication | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<AthleteApplication | null>(null);

  const summary = useMemo(
    () => ({
      total: applications.length,
      pending: applications.filter((a) => a.status === "pendente").length,
      inReview: applications.filter((a) => a.status === "em_analise").length,
      approved: applications.filter((a) => a.status === "aprovado").length,
      rejected: applications.filter((a) => a.status === "recusado").length,
    }),
    [applications],
  );

  const loadApplications = useCallback(async () => {
    setIsLoading(true);
    try {
      const data = await athleteApplicationService.getAll({
        search,
        status: status as AthleteApplicationStatus | "todos",
        position,
      });
      setApplications(data);
    } catch (error) {
      showToast(getApiErrorMessage(error), "error");
    } finally {
      setIsLoading(false);
    }
  }, [position, search, showToast, status]);

  useEffect(() => { loadApplications(); }, [loadApplications]);

  function openCreateModal() {
    setEditingApplication(null);
    setForm(emptyApplication);
    setIsModalOpen(true);
  }

  function openEditModal(application: AthleteApplication) {
    setEditingApplication(application);
    setForm(applicationToForm(application));
    setIsModalOpen(true);
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setIsSaving(true);
    try {
      if (editingApplication) {
        await athleteApplicationService.update(editingApplication.id, buildPayload(form));
        showToast("Inscrição atualizada com sucesso.", "success");
      } else {
        await athleteApplicationService.create(buildPayload(form));
        showToast("Inscrição cadastrada com sucesso.", "success");
      }
      setIsModalOpen(false);
      await loadApplications();
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
      const summaryData = await athleteApplicationService.importFromGoogleSheets();
      setImportSummary(summaryData);
      showToast("Importação de inscrições concluída.", "success");
      await loadApplications();
    } catch (error) {
      showToast(getApiErrorMessage(error), "error");
    } finally {
      setIsImporting(false);
    }
  }

  async function confirmApprove() {
    if (!approveTarget) return;
    setIsSaving(true);
    try {
      await athleteApplicationService.approve(approveTarget.id);
      showToast("Inscrição aprovada e atleta criado em RH / Atletas.", "success");
      setApproveTarget(null);
      await loadApplications();
    } catch (error) {
      showToast(getApiErrorMessage(error), "error");
    } finally {
      setIsSaving(false);
    }
  }

  async function confirmReject() {
    if (!rejectTarget) return;
    setIsSaving(true);
    try {
      await athleteApplicationService.update(rejectTarget.id, { status: "recusado" });
      showToast("Inscrição recusada.", "success");
      setRejectTarget(null);
      await loadApplications();
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
      await athleteApplicationService.delete(deleteTarget.id);
      showToast("Inscrição excluída com sucesso.", "success");
      setDeleteTarget(null);
      await loadApplications();
    } catch (error) {
      showToast(getApiErrorMessage(error), "error");
    } finally {
      setIsSaving(false);
    }
  }

  return (
    <div className="space-y-8">
      <PageHeader
        title="RH / Inscrições"
        description="Triagem das pessoas inscritas pelo formulário público antes de virarem atletas."
        action={
          canCreate ? (
            <div className="flex w-full flex-col gap-3 sm:w-auto sm:flex-row">
              <Button disabled={isImporting} onClick={importFromGoogleForms} variant="secondary">
                {isImporting ? <Loader2 className="animate-spin" size={17} /> : <Download size={17} />}
                Importar Forms público
              </Button>
              <Button onClick={openCreateModal}>
                <Plus size={17} />
                Nova inscrição
              </Button>
            </div>
          ) : null
        }
      />

      <section className="grid gap-5 md:grid-cols-2 xl:grid-cols-5">
        {[
          ["Total", summary.total],
          ["Pendentes", summary.pending],
          ["Em análise", summary.inReview],
          ["Aprovadas", summary.approved],
          ["Recusadas", summary.rejected],
        ].map(([title, value]) => (
          <article className="panel p-5" key={title as string}>
            <div className="flex items-center justify-between gap-4">
              <div>
                <p className="text-sm font-semibold text-slate-500">{title}</p>
                <strong className="mt-2 block text-2xl font-black text-pegasus-navy">{value}</strong>
              </div>
              <span className="rounded-2xl bg-pegasus-ice p-3 text-pegasus-primary">
                <UserPlus size={22} />
              </span>
            </div>
          </article>
        ))}
      </section>

      {importSummary ? (
        <section className="panel p-5">
          <div className="flex flex-wrap gap-4 text-sm">
            <span className="font-bold text-pegasus-navy">Resumo da importação</span>
            <span className="text-slate-600">Total lido: {importSummary.totalRead}</span>
            <span className="text-emerald-700">Importados: {importSummary.imported}</span>
            {importSummary.updated !== undefined ? (
              <span className="text-sky-700">Atualizados: {importSummary.updated}</span>
            ) : null}
            <span className="text-amber-700">Duplicados: {importSummary.duplicates}</span>
            <span className="text-rose-700">Erros: {importSummary.errors.length}</span>
          </div>
          {importSummary.errors.length > 0 ? (
            <div className="mt-3 space-y-1 text-sm text-rose-700">
              {importSummary.errors.slice(0, 5).map((error) => (
                <p key={`${error.row}-${error.message}`}>Linha {error.row}: {error.message}</p>
              ))}
            </div>
          ) : null}
        </section>
      ) : null}

      <FilterBar>
        <Input label="Buscar" onChange={(e) => setSearch(e.target.value)} value={search} />
        <Select label="Status" onChange={(e) => setStatus(e.target.value)} options={statusOptions} value={status} />
        <Select label="Posição" onChange={(e) => setPosition(e.target.value)} options={positionOptions} value={position} />
      </FilterBar>

      <section className="panel overflow-hidden">
        <div className="flex items-center gap-3 border-b border-blue-100 p-6">
          <UserPlus className="text-pegasus-primary" size={22} />
          <div>
            <h2 className="text-xl font-bold text-pegasus-navy">Inscrições recebidas</h2>
            <p className="text-sm text-slate-500">{applications.length} registro(s) encontrados.</p>
          </div>
        </div>

        {isLoading ? (
          <div className="flex items-center gap-3 p-6 text-sm font-bold text-pegasus-primary">
            <Loader2 className="animate-spin" size={18} />
            Carregando inscrições
          </div>
        ) : applications.length > 0 ? (
          <>
            {/* Mobile cards */}
            <div className="grid gap-3 p-4 md:hidden">
              {applications.map((application) => (
                <article key={application.id} className="rounded-2xl border border-blue-100 bg-white p-4 shadow-sm">
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <h3 className="font-bold text-pegasus-navy">{application.name}</h3>
                      <p className="mt-0.5 text-sm text-slate-500">
                        {application.phone ?? application.email ?? "Sem contato"}
                      </p>
                    </div>
                    <StatusBadge label={label(application.status)} tone={applicationTone(application.status)} />
                  </div>
                  <div className="mt-3 grid grid-cols-2 gap-2 text-sm text-slate-600">
                    <p><strong className="text-pegasus-navy">Posição:</strong> {application.position ?? "-"}</p>
                    <p><strong className="text-pegasus-navy">Nível:</strong> {application.level ?? "-"}</p>
                    <p><strong className="text-pegasus-navy">Sábados:</strong> {boolLabel(application.availableSaturdays)}</p>
                    <p><strong className="text-pegasus-navy">Campeonatos:</strong> {boolLabel(application.willingToCompete)}</p>
                    <p className="col-span-2"><strong className="text-pegasus-navy">Entrada:</strong> {formatDate(application.createdAt)}</p>
                  </div>
                  {application.status === "em_analise" && (canCreate || canUpdate) ? (
                    <div className="mt-3 flex gap-2 border-t border-blue-50 pt-3">
                      {canCreate ? (
                        <Button className="flex-1" onClick={() => setApproveTarget(application)}>
                          <CheckCircle2 size={15} />Aprovar
                        </Button>
                      ) : null}
                      {canUpdate ? (
                        <Button className="flex-1" onClick={() => setRejectTarget(application)} variant="danger">
                          <XCircle size={15} />Recusar
                        </Button>
                      ) : null}
                    </div>
                  ) : null}
                  <div className="mt-3 flex flex-wrap items-center gap-3 border-t border-blue-50 pt-3">
                    <Button className="h-8 px-3 text-xs" onClick={() => setDetailApplication(application)} variant="secondary">
                      Ver detalhes
                    </Button>
                    <ActionButtons
                      canDelete={canDelete}
                      canEdit={canUpdate}
                      canToggle={false}
                      onDelete={() => setDeleteTarget(application)}
                      onEdit={() => openEditModal(application)}
                    />
                  </div>
                </article>
              ))}
            </div>

            {/* Desktop table */}
            <div className="hidden md:block">
              <Table
                headers={["Pessoa", "Contato", "Posição / Nível", "Disponibilidade", "Status", "Entrada", "Ações"]}
                minWidth="1200px"
              >
                {applications.map((application) => (
                  <tr key={application.id} className="bg-white">
                    <td className="px-6 py-4">
                      <p className="font-bold text-pegasus-navy">{application.name}</p>
                      <p className="text-xs text-slate-500">{application.source}</p>
                      {application.birthDate && (
                        <p className="text-xs text-slate-400">Nasc. {formatBirthDate(application.birthDate)}</p>
                      )}
                    </td>
                    <td className="px-6 py-4 text-slate-600">
                      {application.email ? <p>{application.email}</p> : null}
                      {application.phone ? <p className="text-xs">{application.phone}</p> : null}
                      {!application.email && !application.phone ? <p>-</p> : null}
                    </td>
                    <td className="px-6 py-4 text-slate-600">
                      <p>{application.position ?? "-"}</p>
                      {application.level && <p className="text-xs text-slate-400">{application.level}</p>}
                    </td>
                    <td className="px-6 py-4 text-slate-600">
                      <p className="text-xs">Sábados: {boolLabel(application.availableSaturdays)}</p>
                      <p className="text-xs">Campeonatos: {boolLabel(application.willingToCompete)}</p>
                    </td>
                    <td className="px-6 py-4">
                      <StatusBadge label={label(application.status)} tone={applicationTone(application.status)} />
                    </td>
                    <td className="px-6 py-4 text-slate-600">{formatDate(application.createdAt)}</td>
                    <td className="px-6 py-4">
                      <div className="flex flex-wrap items-center gap-2">
                        <Button className="h-8 px-3 text-xs" onClick={() => setDetailApplication(application)} variant="secondary">
                          Detalhes
                        </Button>
                        {application.status === "em_analise" && canCreate ? (
                          <Button className="h-8 px-3 text-xs" onClick={() => setApproveTarget(application)}>
                            <CheckCircle2 size={13} />Aprovar
                          </Button>
                        ) : null}
                        {application.status === "em_analise" && canUpdate ? (
                          <Button className="h-8 px-3 text-xs" onClick={() => setRejectTarget(application)} variant="danger">
                            <XCircle size={13} />Recusar
                          </Button>
                        ) : null}
                        <ActionButtons
                          canDelete={canDelete}
                          canEdit={canUpdate}
                          canToggle={false}
                          onDelete={() => setDeleteTarget(application)}
                          onEdit={() => openEditModal(application)}
                        />
                      </div>
                    </td>
                  </tr>
                ))}
              </Table>
            </div>
          </>
        ) : (
          <div className="p-6">
            <EmptyState
              description="As inscrições do formulário público aparecem aqui automaticamente."
              icon={UserPlus}
              title="Nenhuma inscrição encontrada"
            />
          </div>
        )}
      </section>

      {/* Modal de criar/editar */}
      <Modal
        description="Use esta tela para triagem antes de criar o atleta no RH."
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        title={editingApplication ? "Editar inscrição" : "Nova inscrição"}
      >
        <form className="grid gap-4" onSubmit={handleSubmit}>
          <div className="grid gap-4 md:grid-cols-2">
            <Input disabled={isSaving} label="Nome *" onChange={(e) => setForm({ ...form, name: e.target.value })} required value={form.name} />
            <Input disabled={isSaving} label="E-mail" onChange={(e) => setForm({ ...form, email: e.target.value })} type="email" value={form.email} />
            <Input disabled={isSaving} label="Telefone / WhatsApp" onChange={(e) => setForm({ ...form, phone: e.target.value })} value={form.phone} />
            <Select
              disabled={isSaving}
              label="Posição"
              onChange={(e) => setForm({ ...form, position: e.target.value })}
              options={[{ label: "Selecione uma posição", value: "" }, ...positionOptions.filter((o) => o.value !== "todos")]}
              value={form.position}
            />
            <Select
              disabled={isSaving}
              label="Nível"
              onChange={(e) => setForm({ ...form, level: e.target.value })}
              options={levelOptions}
              value={form.level}
            />
            <Input disabled={isSaving} label="Tempo de experiência" onChange={(e) => setForm({ ...form, experienceTime: e.target.value })} placeholder="Ex: 2 anos" value={form.experienceTime} />
            {editingApplication ? (
              <Select
                disabled={isSaving}
                label="Status"
                onChange={(e) => setForm({ ...form, status: e.target.value as AthleteApplicationStatus })}
                options={statusOptions.filter((o) => o.value !== "todos")}
                value={form.status}
              />
            ) : null}
          </div>
          <Textarea disabled={isSaving} label="Motivação" onChange={(e) => setForm({ ...form, motivation: e.target.value })} value={form.motivation} />
          <Textarea disabled={isSaving} label="Como descobriu o Pegasus" onChange={(e) => setForm({ ...form, howFound: e.target.value })} value={form.howFound} />
          <Textarea disabled={isSaving} label="Como pode contribuir" onChange={(e) => setForm({ ...form, contribution: e.target.value })} value={form.contribution} />
          <Textarea disabled={isSaving} label="Observações internas" onChange={(e) => setForm({ ...form, notes: e.target.value })} value={form.notes} />
          <div className="flex flex-col gap-3 sm:flex-row">
            <Button disabled={isSaving} type="submit">
              {isSaving ? <Loader2 className="animate-spin" size={17} /> : null}
              {editingApplication ? "Salvar alterações" : "Cadastrar inscrição"}
            </Button>
            <Button disabled={isSaving} onClick={() => setIsModalOpen(false)} variant="secondary">
              Cancelar
            </Button>
          </div>
        </form>
      </Modal>

      {/* Modal de detalhes */}
      <ApplicationDetailModal application={detailApplication} onClose={() => setDetailApplication(null)} />

      <ConfirmDialog
        confirmLabel={isSaving ? "Aprovando..." : "Aprovar e criar atleta"}
        description={`Aprovar ${approveTarget?.name ?? "esta inscrição"} e criar atleta em RH?`}
        isOpen={Boolean(approveTarget)}
        onClose={() => setApproveTarget(null)}
        onConfirm={confirmApprove}
        title="Confirmar aprovação"
      />
      <ConfirmDialog
        confirmLabel={isSaving ? "Recusando..." : "Recusar inscrição"}
        description={`Deseja recusar ${rejectTarget?.name ?? "esta inscrição"}?`}
        isOpen={Boolean(rejectTarget)}
        onClose={() => setRejectTarget(null)}
        onConfirm={confirmReject}
        title="Confirmar recusa"
      />
      <ConfirmDialog
        confirmLabel={isSaving ? "Excluindo..." : "Excluir inscrição"}
        description={`Deseja excluir ${deleteTarget?.name ?? "esta inscrição"}?`}
        isOpen={Boolean(deleteTarget)}
        onClose={() => setDeleteTarget(null)}
        onConfirm={confirmDelete}
        title="Confirmar exclusão"
      />
    </div>
  );
}
