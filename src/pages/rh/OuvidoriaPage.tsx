import { Inbox, MessageSquare, User, UserX } from "lucide-react";
import { useEffect, useState } from "react";
import { useTour } from "../../tours/useTour";
import { Button } from "../../components/ui/Button";
import { PageHeader } from "../../components/ui/PageHeader";
import { useToast } from "../../components/ui/Toast";
import { getApiErrorMessage } from "../../services/api";
import { suggestionService, type Suggestion } from "../../services/suggestionService";

const TOUR_STEPS = [
  {
    popover: {
      title: "📬 Ouvidoria",
      description: "Canal de sugestões, críticas e feedbacks enviados anonimamente ou identificados pelos atletas e membros do clube.",
    },
  },
  {
    element: "[data-tour='ouvidoria-filtros']",
    popover: {
      title: "Filtros por status",
      description: "Filtre as mensagens por status: Todos, Pendente, Visto, Respondido ou Arquivado. O contador de pendentes aparece em destaque.",
      side: "bottom" as const,
    },
  },
  {
    element: "[data-tour='ouvidoria-lista']",
    popover: {
      title: "Lista de mensagens",
      description: "Clique em uma mensagem para abrir o painel de resposta à direita. Mensagens pendentes são marcadas como 'Visto' automaticamente ao abrir.",
      side: "right" as const,
    },
  },
];

const statusColors: Record<string, string> = {
  pendente: "bg-amber-50 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400",
  visto: "bg-blue-50 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400",
  respondido: "bg-emerald-50 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400",
  arquivado: "bg-slate-100 text-slate-600 dark:bg-slate-700 dark:text-slate-300",
};

const statusLabels: Record<string, string> = {
  pendente: "Pendente",
  visto: "Visto",
  respondido: "Respondido",
  arquivado: "Arquivado",
};

function formatDate(value: string) {
  return new Date(value).toLocaleDateString("pt-BR", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export function OuvidoriaPage() {
  const { showToast } = useToast();
  const [suggestions, setSuggestions] = useState<Suggestion[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [filterStatus, setFilterStatus] = useState("todos");
  const [selected, setSelected] = useState<Suggestion | null>(null);
  const [response, setResponse] = useState("");
  const [isSaving, setIsSaving] = useState(false);

  useTour("ouvidoria:v1", isLoading ? [] : TOUR_STEPS);

  async function loadSuggestions() {
    setIsLoading(true);
    try {
      const all = await suggestionService.getAll();
      setSuggestions(all);
    } catch (error) {
      showToast(getApiErrorMessage(error), "error");
    } finally {
      setIsLoading(false);
    }
  }

  useEffect(() => {
    loadSuggestions();
  }, []);

  async function handleMarkSeen(suggestion: Suggestion) {
    if (suggestion.status !== "pendente") return;
    try {
      const updated = await suggestionService.respond(suggestion.id, { status: "visto" });
      setSuggestions((prev) => prev.map((s) => (s.id === updated.id ? updated : s)));
    } catch {
      // non-critical
    }
  }

  async function handleRespond(e: React.FormEvent) {
    e.preventDefault();
    if (!selected || !response.trim()) return;

    setIsSaving(true);
    try {
      const updated = await suggestionService.respond(selected.id, {
        status: "respondido",
        response: response.trim(),
      });
      setSuggestions((prev) => prev.map((s) => (s.id === updated.id ? updated : s)));
      setSelected(null);
      setResponse("");
      showToast("Resposta registrada.", "success");
    } catch (error) {
      showToast(getApiErrorMessage(error), "error");
    } finally {
      setIsSaving(false);
    }
  }

  async function handleArchive(suggestion: Suggestion) {
    try {
      const updated = await suggestionService.respond(suggestion.id, { status: "arquivado" });
      setSuggestions((prev) => prev.map((s) => (s.id === updated.id ? updated : s)));
      if (selected?.id === suggestion.id) setSelected(null);
      showToast("Sugestão arquivada.", "success");
    } catch (error) {
      showToast(getApiErrorMessage(error), "error");
    }
  }

  const filtered =
    filterStatus === "todos" ? suggestions : suggestions.filter((s) => s.status === filterStatus);

  const counts = {
    pendente: suggestions.filter((s) => s.status === "pendente").length,
    todos: suggestions.length,
  };

  return (
    <div className="space-y-8">
      <PageHeader
        title="Ouvidoria"
        description="Sugestões, críticas e feedbacks enviados pelos atletas e membros."
      />

      <div data-tour="ouvidoria-filtros" className="flex flex-wrap gap-2">
        {["todos", "pendente", "visto", "respondido", "arquivado"].map((s) => (
          <button
            className={`rounded-full px-4 py-1.5 text-sm font-bold transition ${
              filterStatus === s
                ? "bg-pegasus-primary text-white"
                : "bg-white text-slate-600 ring-1 ring-blue-100 hover:bg-pegasus-ice dark:bg-slate-800 dark:text-slate-300 dark:ring-slate-700"
            }`}
            key={s}
            onClick={() => setFilterStatus(s)}
            type="button"
          >
            {s === "todos" ? `Todos (${counts.todos})` : statusLabels[s]}
            {s === "pendente" && counts.pendente > 0 ? (
              <span className="ml-2 rounded-full bg-amber-500 px-1.5 py-0.5 text-[10px] text-white">
                {counts.pendente}
              </span>
            ) : null}
          </button>
        ))}
      </div>

      <div className="grid gap-6 xl:grid-cols-[1fr_420px]">
        <div data-tour="ouvidoria-lista" className="space-y-3">
          {isLoading ? (
            <p className="rounded-2xl bg-white p-6 text-sm font-semibold text-slate-500 dark:bg-slate-800">
              Carregando sugestões...
            </p>
          ) : filtered.length === 0 ? (
            <div className="panel flex flex-col items-center gap-3 p-10 text-center">
              <Inbox className="text-slate-300" size={40} />
              <p className="text-sm font-semibold text-slate-500">Nenhuma sugestão encontrada.</p>
            </div>
          ) : (
            filtered.map((s) => (
              <button
                className={`w-full rounded-2xl border p-5 text-left transition ${
                  selected?.id === s.id
                    ? "border-pegasus-primary bg-pegasus-ice dark:bg-slate-700"
                    : "border-blue-100 bg-white hover:bg-pegasus-ice dark:border-slate-700 dark:bg-slate-800 dark:hover:bg-slate-700"
                }`}
                key={s.id}
                onClick={() => {
                  setSelected(s);
                  setResponse(s.response ?? "");
                  handleMarkSeen(s);
                }}
                type="button"
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="flex min-w-0 items-center gap-2">
                    {s.anonymous ? (
                      <UserX className="shrink-0 text-slate-400" size={16} />
                    ) : (
                      <User className="shrink-0 text-pegasus-primary" size={16} />
                    )}
                    <span className="truncate text-sm font-semibold text-pegasus-navy">
                      {s.anonymous ? "Anônimo" : (s.authorName ?? "Sem identificação")}
                    </span>
                  </div>
                  <span className={`shrink-0 rounded-full px-2.5 py-0.5 text-xs font-bold ${statusColors[s.status]}`}>
                    {statusLabels[s.status]}
                  </span>
                </div>
                <p className="mt-2 line-clamp-2 text-sm text-slate-600">{s.message}</p>
                <p className="mt-2 text-xs text-slate-400">{formatDate(s.createdAt)}</p>
              </button>
            ))
          )}
        </div>

        {selected ? (
          <div className="panel h-fit p-6">
            <div className="flex items-center justify-between gap-3">
              <div className="flex items-center gap-2">
                {selected.anonymous ? (
                  <UserX className="text-slate-400" size={18} />
                ) : (
                  <User className="text-pegasus-primary" size={18} />
                )}
                <strong className="font-bold text-pegasus-navy">
                  {selected.anonymous ? "Anônimo" : (selected.authorName ?? "Sem identificação")}
                </strong>
              </div>
              <span className={`rounded-full px-2.5 py-0.5 text-xs font-bold ${statusColors[selected.status]}`}>
                {statusLabels[selected.status]}
              </span>
            </div>
            <p className="mt-4 text-xs text-slate-400">{formatDate(selected.createdAt)}</p>
            <div className="mt-4 rounded-2xl bg-pegasus-surface p-4 text-sm leading-6 text-slate-700 dark:bg-slate-900">
              {selected.message}
            </div>

            <form className="mt-6 space-y-4" onSubmit={handleRespond}>
              <label className="block text-sm font-semibold text-pegasus-navy" htmlFor="response-text">
                <MessageSquare className="mr-1.5 inline" size={14} />
                Resposta interna (opcional)
              </label>
              <textarea
                className="w-full rounded-2xl border border-blue-100 bg-pegasus-surface px-4 py-3 text-sm outline-none transition focus:border-pegasus-primary focus:ring-2 focus:ring-pegasus-sky dark:border-slate-700 dark:bg-slate-900"
                id="response-text"
                onChange={(e) => setResponse(e.target.value)}
                placeholder="Adicione uma nota interna..."
                rows={4}
                value={response}
              />
              <div className="flex flex-wrap gap-2">
                <Button disabled={isSaving} type="submit">
                  {isSaving ? "Salvando..." : "Salvar resposta"}
                </Button>
                <Button
                  onClick={() => handleArchive(selected)}
                  type="button"
                  variant="secondary"
                >
                  Arquivar
                </Button>
              </div>
            </form>
          </div>
        ) : (
          <div className="panel flex flex-col items-center gap-3 p-10 text-center">
            <Inbox className="text-slate-200" size={40} />
            <p className="text-sm text-slate-500">Selecione uma sugestão para ler.</p>
          </div>
        )}
      </div>
    </div>
  );
}
