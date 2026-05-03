import { CheckCircle2, FileSpreadsheet, Loader2, RefreshCw, XCircle } from "lucide-react";
import { useCallback, useEffect, useMemo, useState } from "react";
import { Button } from "../../components/ui/Button";
import { EmptyState } from "../../components/ui/EmptyState";
import { FilterBar } from "../../components/ui/FilterBar";
import { Input } from "../../components/ui/Input";
import { PageHeader } from "../../components/ui/PageHeader";
import { Select } from "../../components/ui/Select";
import { StatusBadge } from "../../components/ui/StatusBadge";
import { Table } from "../../components/ui/Table";
import { useToast } from "../../components/ui/Toast";
import { getApiErrorMessage } from "../../services/api";
import { operationalService, type SchoolContact } from "../../services/operationalService";

function matchesSearch(contact: SchoolContact, search: string) {
  const query = search.trim().toLowerCase();

  if (!query) return true;

  return [contact.name, contact.phone, contact.email, contact.response, contact.responsible]
    .filter(Boolean)
    .some((value) => String(value).toLowerCase().includes(query));
}

export function SchoolsPage() {
  const { showToast } = useToast();
  const [contacts, setContacts] = useState<SchoolContact[]>([]);
  const [search, setSearch] = useState("");
  const [sentFilter, setSentFilter] = useState("todos");
  const [responsible, setResponsible] = useState("todos");
  const [isLoading, setIsLoading] = useState(true);

  const responsibles = useMemo(
    () =>
      Array.from(new Set(contacts.map((contact) => contact.responsible).filter(Boolean))) as string[],
    [contacts],
  );

  const filteredContacts = useMemo(
    () =>
      contacts.filter((contact) => {
        const sentMatches =
          sentFilter === "todos" || (sentFilter === "sim" ? contact.sent : !contact.sent);
        const responsibleMatches = responsible === "todos" || contact.responsible === responsible;

        return sentMatches && responsibleMatches && matchesSearch(contact, search);
      }),
    [contacts, responsible, search, sentFilter],
  );

  const summary = useMemo(
    () => ({
      total: contacts.length,
      sent: contacts.filter((contact) => contact.sent).length,
      notSent: contacts.filter((contact) => !contact.sent).length,
      answered: contacts.filter((contact) => Boolean(contact.response)).length,
    }),
    [contacts],
  );

  const loadContacts = useCallback(async () => {
    setIsLoading(true);

    try {
      setContacts(await operationalService.getSchoolContacts());
    } catch (error) {
      showToast(getApiErrorMessage(error), "error");
    } finally {
      setIsLoading(false);
    }
  }, [showToast]);

  useEffect(() => {
    loadContacts();
  }, [loadContacts]);

  return (
    <div className="space-y-8">
      <PageHeader
        title="Operacional / Contato com Escolas"
        description="Leitura direta da planilha de contatos escolares."
        action={
          <Button disabled={isLoading} onClick={loadContacts} variant="secondary">
            {isLoading ? <Loader2 className="animate-spin" size={17} /> : <RefreshCw size={17} />}
            Atualizar
          </Button>
        }
      />

      <section className="grid gap-5 md:grid-cols-2 xl:grid-cols-4">
        {[
          ["Escolas na planilha", summary.total],
          ["Enviados", summary.sent],
          ["Nao enviados", summary.notSent],
          ["Com resposta", summary.answered],
        ].map(([title, value]) => (
          <article className="panel p-5" key={title}>
            <p className="text-sm font-semibold text-slate-500">{title}</p>
            <strong className="mt-2 block text-2xl font-black text-pegasus-navy">{value}</strong>
          </article>
        ))}
      </section>

      <FilterBar>
        <Input
          label="Buscar"
          onChange={(event) => setSearch(event.target.value)}
          value={search}
        />
        <Select
          label="Enviado"
          onChange={(event) => setSentFilter(event.target.value)}
          options={[
            { label: "Todos", value: "todos" },
            { label: "Sim", value: "sim" },
            { label: "Nao", value: "nao" },
          ]}
          value={sentFilter}
        />
        <Select
          label="Responsavel"
          onChange={(event) => setResponsible(event.target.value)}
          options={[
            { label: "Todos os responsaveis", value: "todos" },
            ...responsibles.map((item) => ({ label: item, value: item })),
          ]}
          value={responsible}
        />
      </FilterBar>

      <section className="panel overflow-hidden">
        <div className="flex items-center gap-3 border-b border-blue-100 p-6">
          <FileSpreadsheet className="text-pegasus-primary" size={22} />
          <div>
            <h2 className="text-xl font-bold text-pegasus-navy">Contatos da planilha</h2>
            <p className="text-sm text-slate-500">{filteredContacts.length} registro(s) encontrados.</p>
          </div>
        </div>

        {isLoading ? (
          <div className="flex items-center gap-3 p-6 text-sm font-bold text-pegasus-primary">
            <Loader2 className="animate-spin" size={18} />
            Carregando planilha
          </div>
        ) : filteredContacts.length > 0 ? (
          <>
            <div className="grid gap-3 p-4 md:hidden">
              {filteredContacts.map((contact) => (
                <article key={contact.id} className="rounded-2xl border border-blue-100 bg-white p-4 shadow-sm">
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <h3 className="font-bold text-pegasus-navy">{contact.name}</h3>
                      <p className="mt-1 text-sm text-slate-500">{contact.email ?? "Sem email"}</p>
                    </div>
                    <StatusBadge
                      label={contact.sent ? "Enviado" : "Nao enviado"}
                      tone={contact.sent ? "success" : "warning"}
                    />
                  </div>
                  <div className="mt-4 grid gap-2 text-sm text-slate-600">
                    <p><strong className="text-pegasus-navy">Telefone:</strong> {contact.phone ?? "-"}</p>
                    <p><strong className="text-pegasus-navy">Resposta:</strong> {contact.response ?? "-"}</p>
                    <p><strong className="text-pegasus-navy">Responsavel:</strong> {contact.responsible ?? "-"}</p>
                  </div>
                </article>
              ))}
            </div>
            <div className="hidden md:block">
              <Table
                headers={["Escola", "Telefone", "Email", "Enviado", "Resposta", "Responsavel"]}
                minWidth="940px"
              >
                {filteredContacts.map((contact) => (
                  <tr key={contact.id} className="bg-white">
                    <td className="px-6 py-4 font-bold text-pegasus-navy">{contact.name}</td>
                    <td className="px-6 py-4 text-slate-600">{contact.phone ?? "-"}</td>
                    <td className="px-6 py-4 text-slate-600">{contact.email ?? "-"}</td>
                    <td className="px-6 py-4">
                      <span className="inline-flex items-center gap-2">
                        {contact.sent ? (
                          <CheckCircle2 className="text-emerald-600" size={18} />
                        ) : (
                          <XCircle className="text-amber-600" size={18} />
                        )}
                        <StatusBadge
                          label={contact.sent ? "Sim" : "Nao"}
                          tone={contact.sent ? "success" : "warning"}
                        />
                      </span>
                    </td>
                    <td className="max-w-md px-6 py-4 text-slate-600">{contact.response ?? "-"}</td>
                    <td className="px-6 py-4 font-semibold text-slate-700">{contact.responsible ?? "-"}</td>
                  </tr>
                ))}
              </Table>
            </div>
          </>
        ) : (
          <div className="p-6">
            <EmptyState
              description="A planilha nao retornou contatos ou os filtros nao encontraram registros."
              icon={FileSpreadsheet}
              title="Nenhum contato encontrado"
            />
          </div>
        )}
      </section>
    </div>
  );
}
