import { ChevronDown, ChevronUp, Download, Loader2, Plus, UserCheck, UserX } from "lucide-react";
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
  athleteService,
  type Athlete,
  type AthleteImportSummary,
  type AthletePayload,
  type AthleteStatus,
  type MonthlyPaymentStatus,
} from "../../services/athleteService";

type AthleteForm = Required<AthletePayload>;

const emptyAthlete: AthleteForm = {
  name: "",
  email: "",
  phone: "",
  category: "",
  position: "",
  status: "teste",
  monthlyPaymentStatus: "pendente",
  notes: "",
};

const statusOptions = [
  { label: "Todos os status", value: "todos" },
  { label: "Ativo", value: "ativo" },
  { label: "Teste", value: "teste" },
];

const paymentOptions = [
  { label: "Todas as mensalidades", value: "todos" },
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
  const [athletes, setAthletes] = useState<Athlete[]>([]);
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState("todos");
  const [monthlyPaymentStatus, setMonthlyPaymentStatus] = useState("todos");
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [isImporting, setIsImporting] = useState(false);
  const [importSummary, setImportSummary] = useState<AthleteImportSummary | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingAthlete, setEditingAthlete] = useState<Athlete | null>(null);
  const [form, setForm] = useState<AthleteForm>(emptyAthlete);
  const [deleteTarget, setDeleteTarget] = useState<Athlete | null>(null);
  const [reactivateTarget, setReactivateTarget] = useState<Athlete | null>(null);
  const [showInactive, setShowInactive] = useState(false);

  const filters = useMemo(
    () => ({
      search,
      status: "todos" as const,
      monthlyPaymentStatus: "todos" as const,
    }),
    [search],
  );

  const displayedAthletes = useMemo(() => {
    return athletes.filter((a) => {
      if (a.status === "inativo") return false;
      if (status !== "todos" && a.status !== status) return false;
      if (monthlyPaymentStatus !== "todos" && a.monthlyPaymentStatus !== monthlyPaymentStatus) return false;
      return true;
    });
  }, [athletes, status, monthlyPaymentStatus]);

  const inactiveAthletes = useMemo(
    () => athletes.filter((a) => a.status === "inativo"),
    [athletes],
  );

  const loadAthletes = useCallback(async () => {
    setIsLoading(true);

    try {
      const data = await athleteService.getAll(filters);
      setAthletes(data);
    } catch (error) {
      showToast(getApiErrorMessage(error), "error");
    } finally {
      setIsLoading(false);
    }
  }, [filters, showToast]);

  useEffect(() => {
    loadAthletes();
  }, [loadAthletes]);

  function openCreateModal() {
    setEditingAthlete(null);
    setForm(emptyAthlete);
    setIsModalOpen(true);
  }

  function openEditModal(athlete: Athlete) {
    setEditingAthlete(athlete);
    setForm(athleteToForm(athlete));
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
      await loadAthletes();
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
      await loadAthletes();
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
      await loadAthletes();
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
      await loadAthletes();
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
        <Select
          label="Mensalidade"
          onChange={(event) => setMonthlyPaymentStatus(event.target.value)}
          options={paymentOptions}
          value={monthlyPaymentStatus}
        />
      </FilterBar>

      <section className="panel overflow-hidden">
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
                <article key={athlete.id} className="rounded-2xl border border-blue-100 bg-white p-4 shadow-sm">
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
                    <div>
                      <span className="mb-2 block font-bold text-pegasus-navy">Mensalidade</span>
                      <StatusBadge label={label(athlete.monthlyPaymentStatus)} tone={badgeTone(athlete.monthlyPaymentStatus)} />
                    </div>
                  </div>
                  <div className="mt-4 border-t border-blue-50 pt-3">
                    <ActionButtons
                      canDelete={false}
                      canEdit={canUpdate}
                      canToggle={canDelete && athlete.status !== "inativo"}
                      onEdit={() => openEditModal(athlete)}
                      onToggle={() => setDeleteTarget(athlete)}
                      toggleLabel="Inativar"
                    />
                  </div>
                </article>
              ))}
            </div>
            <div className="hidden md:block">
              <Table
                headers={["Nome", "Posição", "Status", "Mensalidade", "Ações"]}
                minWidth="820px"
              >
                {displayedAthletes.map((athlete) => (
                  <tr key={athlete.id} className="bg-white">
                    <td className="px-6 py-4">
                      <p className="font-bold text-pegasus-navy">{athlete.name}</p>
                      <p className="text-xs text-slate-500">{athlete.email ?? "-"}</p>
                    </td>
                    <td className="px-6 py-4 text-slate-600">{athlete.position ?? "-"}</td>
                    <td className="px-6 py-4">
                      <StatusBadge label={label(athlete.status)} tone={badgeTone(athlete.status)} />
                    </td>
                    <td className="px-6 py-4">
                      <StatusBadge
                        label={label(athlete.monthlyPaymentStatus)}
                        tone={badgeTone(athlete.monthlyPaymentStatus)}
                      />
                    </td>
                    <td className="px-6 py-4">
                      <ActionButtons
                        canDelete={false}
                        canEdit={canUpdate}
                        canToggle={canDelete && athlete.status !== "inativo"}
                        onEdit={() => openEditModal(athlete)}
                        onToggle={() => setDeleteTarget(athlete)}
                        toggleLabel="Inativar"
                      />
                    </td>
                  </tr>
                ))}
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

      {inactiveAthletes.length > 0 ? (
        <section className="panel overflow-hidden">
          <button
            className="flex w-full items-center justify-between gap-3 p-6 text-left"
            onClick={() => setShowInactive((prev) => !prev)}
            type="button"
          >
            <div className="flex items-center gap-3">
              <UserX className="text-slate-400" size={22} />
              <div>
                <h2 className="text-xl font-bold text-pegasus-navy">Atletas inativos</h2>
                <p className="text-sm text-slate-500">{inactiveAthletes.length} atleta(s) inativo(s)</p>
              </div>
            </div>
            {showInactive ? <ChevronUp className="text-slate-400" size={20} /> : <ChevronDown className="text-slate-400" size={20} />}
          </button>

          {showInactive ? (
            <>
              <div className="grid gap-3 border-t border-blue-100 p-4 md:hidden">
                {inactiveAthletes.map((athlete) => (
                  <article key={athlete.id} className="rounded-2xl border border-blue-100 bg-white p-4 shadow-sm opacity-75">
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <h3 className="font-bold text-pegasus-navy">{athlete.name}</h3>
                        <p className="mt-1 text-sm text-slate-500">{athlete.email ?? athlete.phone ?? "Sem contato"}</p>
                      </div>
                      <StatusBadge label="Inativo" tone="danger" />
                    </div>
                    <div className="mt-4 border-t border-blue-50 pt-3">
                      <ActionButtons
                        canDelete={false}
                        canEdit={canUpdate}
                        canToggle={canUpdate}
                        onEdit={() => openEditModal(athlete)}
                        onToggle={() => setReactivateTarget(athlete)}
                        toggleLabel="Reativar"
                      />
                    </div>
                  </article>
                ))}
              </div>
              <div className="hidden border-t border-blue-100 md:block">
                <Table headers={["Nome", "Posição", "Mensalidade", "Ações"]} minWidth="720px">
                  {inactiveAthletes.map((athlete) => (
                    <tr key={athlete.id} className="bg-white opacity-75">
                      <td className="px-6 py-4">
                        <p className="font-bold text-pegasus-navy">{athlete.name}</p>
                        <p className="text-xs text-slate-500">{athlete.email ?? "-"}</p>
                      </td>
                      <td className="px-6 py-4 text-slate-600">{athlete.position ?? "-"}</td>
                      <td className="px-6 py-4">
                        <StatusBadge
                          label={label(athlete.monthlyPaymentStatus)}
                          tone={badgeTone(athlete.monthlyPaymentStatus)}
                        />
                      </td>
                      <td className="px-6 py-4">
                        <ActionButtons
                          canDelete={false}
                          canEdit={canUpdate}
                          canToggle={canUpdate}
                          onEdit={() => openEditModal(athlete)}
                          onToggle={() => setReactivateTarget(athlete)}
                          toggleLabel="Reativar"
                        />
                      </td>
                    </tr>
                  ))}
                </Table>
              </div>
            </>
          ) : null}
        </section>
      ) : null}

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
              onChange={(event) => setForm({ ...form, name: event.target.value })}
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
            <Select
              label="Status"
              onChange={(event) =>
                setForm({ ...form, status: event.target.value as AthleteStatus })
              }
              options={statusOptions.filter((option) => option.value !== "todos")}
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
              options={paymentOptions.filter((option) => option.value !== "todos")}
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



