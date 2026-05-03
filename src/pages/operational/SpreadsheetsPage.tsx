import { ExternalLink, FileSpreadsheet, Loader2, Plus, Trash2 } from "lucide-react";
import { FormEvent, useCallback, useEffect, useState } from "react";
import { useAuth } from "../../auth/AuthContext";
import { Button } from "../../components/ui/Button";
import { ConfirmDialog } from "../../components/ui/ConfirmDialog";
import { EmptyState } from "../../components/ui/EmptyState";
import { Input } from "../../components/ui/Input";
import { Modal } from "../../components/ui/Modal";
import { PageHeader } from "../../components/ui/PageHeader";
import { Table } from "../../components/ui/Table";
import { Textarea } from "../../components/ui/Textarea";
import { useToast } from "../../components/ui/Toast";
import { getApiErrorMessage } from "../../services/api";
import {
  spreadsheetService,
  type Spreadsheet,
  type SpreadsheetPayload,
} from "../../services/spreadsheetService";

type SpreadsheetForm = SpreadsheetPayload;

const emptySpreadsheet: SpreadsheetForm = {
  name: "",
  url: "",
  description: "",
};

function formatDate(value: string) {
  return new Intl.DateTimeFormat("pt-BR", {
    dateStyle: "short",
    timeStyle: "short",
  }).format(new Date(value));
}

export function SpreadsheetsPage() {
  const { hasPermission } = useAuth();
  const { showToast } = useToast();
  const canCreate = hasPermission(["operational:create"]);
  const canDelete = hasPermission(["operational:delete"]);
  const [spreadsheets, setSpreadsheets] = useState<Spreadsheet[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<Spreadsheet | null>(null);
  const [form, setForm] = useState<SpreadsheetForm>(emptySpreadsheet);

  const loadSpreadsheets = useCallback(async () => {
    setIsLoading(true);

    try {
      setSpreadsheets(await spreadsheetService.getAll());
    } catch (error) {
      showToast(getApiErrorMessage(error), "error");
    } finally {
      setIsLoading(false);
    }
  }, [showToast]);

  useEffect(() => {
    loadSpreadsheets();
  }, [loadSpreadsheets]);

  function openCreateModal() {
    setForm(emptySpreadsheet);
    setIsModalOpen(true);
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setIsSaving(true);

    try {
      await spreadsheetService.create(form);
      showToast("Planilha salva com sucesso.", "success");
      setIsModalOpen(false);
      await loadSpreadsheets();
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
      await spreadsheetService.delete(deleteTarget.id);
      showToast("Planilha removida com sucesso.", "success");
      setDeleteTarget(null);
      await loadSpreadsheets();
    } catch (error) {
      showToast(getApiErrorMessage(error), "error");
    } finally {
      setIsSaving(false);
    }
  }

  return (
    <div className="space-y-8">
      <PageHeader
        title="Operacional / Planilhas"
        description="Biblioteca de planilhas importadas para consulta recorrente."
        action={
          canCreate ? (
            <Button onClick={openCreateModal}>
              <Plus size={17} />
              Importar planilha
            </Button>
          ) : null
        }
      />

      <section className="panel overflow-hidden">
        <div className="flex items-center gap-3 border-b border-blue-100 p-6">
          <FileSpreadsheet className="text-pegasus-primary" size={22} />
          <div>
            <h2 className="text-xl font-bold text-pegasus-navy">Planilhas salvas</h2>
            <p className="text-sm text-slate-500">{spreadsheets.length} registro(s) armazenados.</p>
          </div>
        </div>

        {isLoading ? (
          <div className="flex items-center gap-3 p-6 text-sm font-bold text-pegasus-primary">
            <Loader2 className="animate-spin" size={18} />
            Carregando planilhas
          </div>
        ) : spreadsheets.length > 0 ? (
          <>
            <div className="grid gap-3 p-4 md:hidden">
              {spreadsheets.map((spreadsheet) => (
                <article key={spreadsheet.id} className="rounded-2xl border border-blue-100 bg-white p-4 shadow-sm">
                  <h3 className="font-bold text-pegasus-navy">{spreadsheet.name}</h3>
                  <p className="mt-2 text-sm text-slate-500">{spreadsheet.description ?? "Sem descricao"}</p>
                  <p className="mt-2 text-xs text-slate-400">Salva em {formatDate(spreadsheet.createdAt)}</p>
                  <div className="mt-4 flex flex-wrap gap-2">
                    <a
                      className="focus-ring inline-flex min-h-11 items-center justify-center gap-2 rounded-xl border border-blue-100 bg-white px-4 py-2.5 text-sm font-bold text-pegasus-primary shadow-sm transition hover:bg-pegasus-ice"
                      href={spreadsheet.url}
                      rel="noreferrer"
                      target="_blank"
                    >
                      <ExternalLink size={17} />
                      Abrir
                    </a>
                    {canDelete ? (
                      <Button onClick={() => setDeleteTarget(spreadsheet)} variant="danger">
                        <Trash2 size={17} />
                        Remover
                      </Button>
                    ) : null}
                  </div>
                </article>
              ))}
            </div>
            <div className="hidden md:block">
              <Table headers={["Nome", "Descricao", "Salva em", "Acoes"]} minWidth="820px">
                {spreadsheets.map((spreadsheet) => (
                  <tr key={spreadsheet.id} className="bg-white">
                    <td className="px-6 py-4 font-bold text-pegasus-navy">{spreadsheet.name}</td>
                    <td className="px-6 py-4 text-slate-600">{spreadsheet.description ?? "-"}</td>
                    <td className="px-6 py-4 text-slate-600">{formatDate(spreadsheet.createdAt)}</td>
                    <td className="px-6 py-4">
                      <div className="flex flex-wrap gap-2">
                        <a
                          className="focus-ring inline-flex min-h-11 items-center justify-center gap-2 rounded-xl border border-blue-100 bg-white px-4 py-2.5 text-sm font-bold text-pegasus-primary shadow-sm transition hover:bg-pegasus-ice"
                          href={spreadsheet.url}
                          rel="noreferrer"
                          target="_blank"
                        >
                          <ExternalLink size={17} />
                          Abrir
                        </a>
                        {canDelete ? (
                          <Button onClick={() => setDeleteTarget(spreadsheet)} variant="danger">
                            <Trash2 size={17} />
                            Remover
                          </Button>
                        ) : null}
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
              description="Importe uma planilha por link para que ela fique salva aqui."
              icon={FileSpreadsheet}
              title="Nenhuma planilha salva"
            />
          </div>
        )}
      </section>

      <Modal
        description="Cole o link da planilha para deixa-la salva nesta biblioteca."
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        title="Importar planilha"
      >
        <form className="grid gap-4" onSubmit={handleSubmit}>
          <Input
            disabled={isSaving}
            label="Nome"
            onChange={(event) => setForm({ ...form, name: event.target.value })}
            required
            value={form.name}
          />
          <Input
            disabled={isSaving}
            label="URL da planilha"
            onChange={(event) => setForm({ ...form, url: event.target.value })}
            required
            type="url"
            value={form.url}
          />
          <Textarea
            disabled={isSaving}
            label="Descricao"
            onChange={(event) => setForm({ ...form, description: event.target.value })}
            value={form.description}
          />
          <div className="flex flex-col gap-3 sm:flex-row">
            <Button disabled={isSaving} type="submit">
              {isSaving ? <Loader2 className="animate-spin" size={17} /> : null}
              Salvar planilha
            </Button>
            <Button disabled={isSaving} onClick={() => setIsModalOpen(false)} variant="secondary">
              Cancelar
            </Button>
          </div>
        </form>
      </Modal>

      <ConfirmDialog
        confirmLabel={isSaving ? "Removendo..." : "Remover planilha"}
        description={`Deseja remover "${deleteTarget?.name ?? "esta planilha"}" da biblioteca?`}
        isOpen={Boolean(deleteTarget)}
        onClose={() => setDeleteTarget(null)}
        onConfirm={confirmDelete}
        title="Confirmar remocao"
      />
    </div>
  );
}
