import { ClipboardList } from "lucide-react";
import { useEffect, useState } from "react";
import { Input } from "../../components/ui/Input";
import { PageHeader } from "../../components/ui/PageHeader";
import { useToast } from "../../components/ui/Toast";
import { auditService, type AuditLog } from "../../services/auditService";

const ENTITY_OPTIONS = ["", "Athlete", "Finance", "Payment"];

const ACTION_LABELS: Record<string, string> = {
  create: "Criação",
  update: "Atualização",
  deactivate: "Desativação",
  delete: "Exclusão",
  pay: "Pagamento",
  undo_pay: "Estorno",
};

function actionBadge(action: string) {
  const label = ACTION_LABELS[action] ?? action;
  const colors: Record<string, string> = {
    create: "bg-emerald-100 text-emerald-700",
    update: "bg-blue-100 text-blue-700",
    deactivate: "bg-amber-100 text-amber-700",
    delete: "bg-red-100 text-red-700",
    pay: "bg-purple-100 text-purple-700",
    undo_pay: "bg-slate-100 text-slate-600",
  };
  return (
    <span className={`inline-block rounded-full px-2.5 py-0.5 text-xs font-semibold ${colors[action] ?? "bg-slate-100 text-slate-600"}`}>
      {label}
    </span>
  );
}

function MetaCell({ meta }: { meta: Record<string, unknown> }) {
  const entries = Object.entries(meta).filter(([k]) => k !== "changes");
  const changes = meta.changes as Record<string, unknown> | undefined;
  return (
    <div className="space-y-0.5 text-xs text-slate-500">
      {entries.map(([k, v]) => (
        <div key={k}>
          <span className="font-medium text-slate-700">{k}:</span>{" "}
          <span>{typeof v === "object" ? JSON.stringify(v) : String(v)}</span>
        </div>
      ))}
      {changes && Object.keys(changes).length > 0 && (
        <details>
          <summary className="cursor-pointer font-medium text-slate-600">alterações ({Object.keys(changes).length})</summary>
          <pre className="mt-1 max-w-xs overflow-x-auto rounded bg-slate-50 p-1.5 text-[10px]">
            {JSON.stringify(changes, null, 2)}
          </pre>
        </details>
      )}
    </div>
  );
}

export function AuditLogPage() {
  const { showToast } = useToast();
  const [logs, setLogs] = useState<AuditLog[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [entity, setEntity] = useState("");
  const [search, setSearch] = useState("");

  useEffect(() => {
    setIsLoading(true);
    auditService
      .list({ entity: entity || undefined, limit: 300 })
      .then(setLogs)
      .catch(() => showToast("Erro ao carregar logs", "error"))
      .finally(() => setIsLoading(false));
  }, [entity, showToast]);

  const filtered = search
    ? logs.filter(
        (l) =>
          l.userName?.toLowerCase().includes(search.toLowerCase()) ||
          l.entityId?.toLowerCase().includes(search.toLowerCase()) ||
          l.action.toLowerCase().includes(search.toLowerCase()),
      )
    : logs;

  return (
    <div className="space-y-8">
      <PageHeader
        title="Log de Auditoria"
        description="Histórico de ações realizadas no sistema."
      />

      <div className="flex flex-wrap items-end gap-4">
        <div>
          <label className="mb-1 block text-sm font-medium text-slate-700">Entidade</label>
          <select
            className="input w-44"
            value={entity}
            onChange={(e) => setEntity(e.target.value)}
          >
            <option value="">Todas</option>
            {ENTITY_OPTIONS.filter(Boolean).map((e) => (
              <option key={e} value={e}>{e}</option>
            ))}
          </select>
        </div>
        <Input
          label="Buscar usuário / ID"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Nome ou ID..."
          className="w-60"
        />
      </div>

      <div className="panel overflow-x-auto p-0">
        {isLoading ? (
          <p className="p-6 text-sm text-slate-500">Carregando...</p>
        ) : filtered.length === 0 ? (
          <div className="flex flex-col items-center py-14 text-slate-400">
            <ClipboardList size={32} className="mb-3 opacity-30" />
            <p className="text-sm">Nenhum evento encontrado.</p>
          </div>
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-slate-100 bg-slate-50 text-left text-xs font-semibold uppercase tracking-wide text-slate-400">
                <th className="px-4 py-3">Data/Hora</th>
                <th className="px-4 py-3">Usuário</th>
                <th className="px-4 py-3">Ação</th>
                <th className="px-4 py-3">Entidade</th>
                <th className="px-4 py-3">ID</th>
                <th className="px-4 py-3">Detalhes</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50">
              {filtered.map((log) => (
                <tr key={log.id} className="hover:bg-slate-50">
                  <td className="whitespace-nowrap px-4 py-3 text-xs text-slate-500">
                    {new Date(log.createdAt).toLocaleString("pt-BR")}
                  </td>
                  <td className="px-4 py-3 font-medium text-slate-700">
                    {log.userName ?? <span className="text-slate-400">Sistema</span>}
                  </td>
                  <td className="px-4 py-3">{actionBadge(log.action)}</td>
                  <td className="px-4 py-3 text-slate-600">{log.entity}</td>
                  <td className="px-4 py-3 font-mono text-xs text-slate-400">
                    {log.entityId ? log.entityId.slice(0, 8) + "…" : "—"}
                  </td>
                  <td className="px-4 py-3">
                    <MetaCell meta={log.meta} />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {!isLoading && filtered.length > 0 && (
        <p className="text-right text-xs text-slate-400">{filtered.length} evento{filtered.length !== 1 ? "s" : ""}</p>
      )}
    </div>
  );
}
