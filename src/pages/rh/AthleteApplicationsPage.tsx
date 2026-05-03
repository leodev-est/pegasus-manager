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

type ApplicationForm = Required<AthleteApplicationPayload>;

const emptyApplication: ApplicationForm = {
  name: "",
  email: "",
  phone: "",
  category: "",
  position: "",
  contribution: "",
  source: "site",
  status: "pendente",
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

  return value
    .split("_")
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
}

function applicationToForm(application: AthleteApplication): ApplicationForm {
  return {
    name: application.name,
    email: application.email ?? "",
    phone: application.phone ?? "",
    category: application.category ?? "",
    position: application.position ?? "",
    contribution: application.contribution ?? "",
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
    contribution: form.contribution,
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

export function AthleteApplicationsPage() {
  const { hasPermission } = useAuth();
  const { showToast } = useToast();
  const canCreate = hasPermission(["athletes:create"]);
  const canUpdate = hasPermission(["athletes:update"]);
  const canDelete = hasPermission(["athletes:delete"]);
  const [applications, setApplications] = useState<AthleteApplication[]>([]);
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState("pendente");
  const [position, setPosition] = useState("todos");
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [isImporting, setIsImporting] = useState(false);
  const [importSummary, setImportSummary] =
    useState<AthleteApplicationImportSummary | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingApplication, setEditingApplication] = useState<AthleteApplication | null>(null);
  const [form, setForm] = useState<ApplicationForm>(emptyApplication);
  const [approveTarget, setApproveTarget] = useState<AthleteApplication | null>(null);
  const [rejectTarget, setRejectTarget] = useState<AthleteApplication | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<AthleteApplication | null>(null);

  const summary = useMemo(
    () => ({
      total: applications.length,
      pending: applications.filter((application) => application.status === "pendente").length,
      inReview: applications.filter((application) => application.status === "em_analise").length,
      approved: applications.filter((application) => application.status === "aprovado").length,
      rejected: applications.filter((application) => application.status === "recusado").length,
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

  useEffect(() => {
    loadApplications();
  }, [loadApplications]);

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
          <article className="panel p-5" key={title}>
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
                <p key={`${error.row}-${error.message}`}>
                  Linha {error.row}: {error.message}
                </p>
              ))}
            </div>
          ) : null}
        </section>
      ) : null}

      <FilterBar>
        <Input label="Buscar" onChange={(event) => setSearch(event.target.value)} value={search} />
        <Select
          label="Status"
          onChange={(event) => setStatus(event.target.value)}
          options={statusOptions}
          value={status}
        />
        <Select
          label="Posição"
          onChange={(event) => setPosition(event.target.value)}
          options={positionOptions}
          value={position}
        />
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
            <div className="grid gap-3 p-4 md:hidden">
              {applications.map((application) => (
                <article key={application.id} className="rounded-2xl border border-blue-100 bg-white p-4 shadow-sm">
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <h3 className="font-bold text-pegasus-navy">{application.name}</h3>
                      <p className="mt-1 text-sm text-slate-500">{application.phone ?? application.email ?? "Sem contato"}</p>
                    </div>
                    <StatusBadge label={label(application.status)} tone={applicationTone(application.status)} />
                  </div>
                  <div className="mt-4 grid gap-2 text-sm text-slate-600">
                    <p><strong className="text-pegasus-navy">Posição:</strong> {application.position ?? "-"}</p>
                    <p><strong className="text-pegasus-navy">Entrada:</strong> {formatDate(application.createdAt)}</p>
                    <p className="leading-6"><strong className="text-pegasus-navy">Contribuição:</strong> {application.contribution ?? "-"}</p>
                  </div>
                  <div className="mt-4 flex flex-wrap items-center gap-3 border-t border-blue-50 pt-3">
                    {canCreate && application.status !== "aprovado" ? (
                      <button className="inline-flex min-h-10 items-center gap-1 text-sm font-bold text-emerald-700" onClick={() => setApproveTarget(application)} type="button">
                        <CheckCircle2 size={15} />
                        Aprovar
                      </button>
                    ) : null}
                    {canUpdate && application.status !== "recusado" ? (
                      <button className="inline-flex min-h-10 items-center gap-1 text-sm font-bold text-rose-700" onClick={() => setRejectTarget(application)} type="button">
                        <XCircle size={15} />
                        Recusar
                      </button>
                    ) : null}
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
            <div className="hidden md:block">
              <Table
                headers={["Pessoa", "Contato", "Posição", "Contribuição", "Status", "Entrada", "Ações"]}
                minWidth="1180px"
              >
                {applications.map((application) => (
                  <tr key={application.id} className="bg-white">
                    <td className="px-6 py-4">
                      <p className="font-bold text-pegasus-navy">{application.name}</p>
                      <p className="text-xs text-slate-500">{application.source}</p>
                    </td>
                    <td className="px-6 py-4 text-slate-600">
                      {application.email ? <p>{application.email}</p> : null}
                      {application.phone ? <p className="text-xs">{application.phone}</p> : null}
                      {!application.email && !application.phone ? <p>-</p> : null}
                    </td>
                    <td className="px-6 py-4 text-slate-600">{application.position ?? "-"}</td>
                    <td className="max-w-sm px-6 py-4 text-slate-600">
                      <p className="line-clamp-2">{application.contribution ?? "-"}</p>
                    </td>
                    <td className="px-6 py-4">
                      <StatusBadge label={label(application.status)} tone={applicationTone(application.status)} />
                    </td>
                    <td className="px-6 py-4 text-slate-600">{formatDate(application.createdAt)}</td>
                    <td className="px-6 py-4">
                      <div className="flex flex-wrap items-center gap-3">
                        {canCreate && application.status !== "aprovado" ? (
                          <button
                            className="inline-flex items-center gap-1 text-sm font-bold text-emerald-700"
                            onClick={() => setApproveTarget(application)}
                            type="button"
                          >
                            <CheckCircle2 size={15} />
                            Aprovar
                          </button>
                        ) : null}
                        {canUpdate && application.status !== "recusado" ? (
                          <button
                            className="inline-flex items-center gap-1 text-sm font-bold text-rose-700"
                            onClick={() => setRejectTarget(application)}
                            type="button"
                          >
                            <XCircle size={15} />
                            Recusar
                          </button>
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
              description="Importe o formulário público ou cadastre uma inscrição manualmente."
              icon={UserPlus}
              title="Nenhuma inscrição encontrada"
            />
          </div>
        )}
      </section>

      <Modal
        description="Use esta tela para triagem antes de criar o atleta no RH."
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        title={editingApplication ? "Editar inscrição" : "Nova inscrição"}
      >
        <form className="grid gap-4" onSubmit={handleSubmit}>
          <div className="grid gap-4 md:grid-cols-2">
            <Input disabled={isSaving} label="Nome" onChange={(event) => setForm({ ...form, name: event.target.value })} required value={form.name} />
            <Input disabled={isSaving} label="E-mail" onChange={(event) => setForm({ ...form, email: event.target.value })} type="email" value={form.email} />
            <Input disabled={isSaving} label="Telefone / WhatsApp" onChange={(event) => setForm({ ...form, phone: event.target.value })} value={form.phone} />
            <Select
              disabled={isSaving}
              label="Posição"
              onChange={(event) => setForm({ ...form, position: event.target.value })}
              options={[{ label: "Selecione uma posição", value: "" }, ...positionOptions.filter((option) => option.value !== "todos")]}
              value={form.position}
            />
            <Input disabled={isSaving} label="Categoria" onChange={(event) => setForm({ ...form, category: event.target.value })} value={form.category} />
            <Select
              disabled={isSaving}
              label="Status"
              onChange={(event) => setForm({ ...form, status: event.target.value as AthleteApplicationStatus })}
              options={statusOptions.filter((option) => option.value !== "todos")}
              value={form.status}
            />
          </div>
          <Textarea disabled={isSaving} label="Como pode contribuir" onChange={(event) => setForm({ ...form, contribution: event.target.value })} value={form.contribution} />
          <Textarea disabled={isSaving} label="Observações internas" onChange={(event) => setForm({ ...form, notes: event.target.value })} value={form.notes} />
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



