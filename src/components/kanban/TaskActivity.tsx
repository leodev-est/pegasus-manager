import { History, Loader2, MessageSquare } from "lucide-react";
import type { KeyboardEvent as ReactKeyboardEvent, ReactNode } from "react";
import { Fragment, useEffect, useId, useMemo, useRef, useState } from "react";
import { avatarClass } from "./cardMeta";

export type KanbanHistoryEntry = {
  id: string;
  action: string;
  userName: string | null;
  meta: Record<string, unknown> | null;
  createdAt: string;
};

export type MentionPerson = { name: string; label: string };

type Comment = { id: string; text: string; author?: string; createdAt: string };

function normalize(value: string) {
  return value.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase();
}

function firstName(name: string) {
  return name.trim().split(/\s+/)[0] ?? name;
}

function relativeTime(value: string) {
  const diff = Date.now() - Date.parse(value);
  const minutes = Math.round(diff / 60_000);
  if (minutes < 1) return "agora";
  if (minutes < 60) return `há ${minutes} min`;
  const hours = Math.round(minutes / 60);
  if (hours < 24) return `há ${hours} h`;
  const days = Math.round(hours / 24);
  if (days < 7) return days === 1 ? "ontem" : `há ${days} dias`;
  return new Intl.DateTimeFormat("pt-BR", { day: "2-digit", month: "short" }).format(new Date(value)).replace(".", "");
}

function formatDay(value: unknown) {
  if (typeof value !== "string" || !value) return "sem prazo";
  return new Intl.DateTimeFormat("pt-BR", { day: "2-digit", month: "2-digit", timeZone: "UTC" }).format(
    new Date(`${value.slice(0, 10)}T12:00:00Z`),
  );
}

/** Highlights @mentions inside a comment. */
function CommentText({ text }: { text: string }) {
  const parts = text.split(/(@[\p{L}][\p{L}\p{M}'-]*)/u);
  return (
    <>
      {parts.map((part, index) =>
        part.startsWith("@") ? (
          <span className="rounded bg-emerald-50 px-0.5 font-semibold text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300" key={index}>
            {part}
          </span>
        ) : (
          <Fragment key={index}>{part}</Fragment>
        ),
      )}
    </>
  );
}

/** Comment box with @ suggestions (arrows to choose, Enter/Tab to insert, Esc to close). */
function CommentComposer({
  people,
  onSubmit,
}: {
  people: MentionPerson[];
  onSubmit: (text: string) => Promise<boolean>;
}) {
  const [text, setText] = useState("");
  const [isSending, setIsSending] = useState(false);
  const [query, setQuery] = useState<{ start: number; value: string } | null>(null);
  const [active, setActive] = useState(0);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const listId = useId();

  const suggestions = useMemo(() => {
    if (!query) return [];
    const term = normalize(query.value);
    return people.filter((person) => normalize(person.name).includes(term)).slice(0, 6);
  }, [people, query]);

  function updateQuery(value: string, caret: number) {
    const before = value.slice(0, caret);
    const match = before.match(/(^|\s)@([\p{L}\p{M}'-]*)$/u);
    setQuery(match ? { start: caret - match[2].length - 1, value: match[2] } : null);
    setActive(0);
  }

  function insert(person: MentionPerson) {
    if (!query) return;
    const caret = textareaRef.current?.selectionStart ?? text.length;
    const mention = `@${firstName(person.name)} `;
    const next = text.slice(0, query.start) + mention + text.slice(caret);
    setText(next);
    setQuery(null);
    requestAnimationFrame(() => {
      const position = query.start + mention.length;
      textareaRef.current?.focus();
      textareaRef.current?.setSelectionRange(position, position);
    });
  }

  async function submit() {
    const value = text.trim();
    if (!value || isSending) return;
    setIsSending(true);
    const sent = await onSubmit(value);
    setIsSending(false);
    if (sent) setText("");
  }

  function onKeyDown(event: ReactKeyboardEvent<HTMLTextAreaElement>) {
    if (suggestions.length > 0) {
      if (event.key === "ArrowDown" || event.key === "ArrowUp") {
        event.preventDefault();
        setActive((index) => (index + (event.key === "ArrowDown" ? 1 : -1) + suggestions.length) % suggestions.length);
        return;
      }
      if (event.key === "Enter" || event.key === "Tab") {
        event.preventDefault();
        insert(suggestions[active]);
        return;
      }
      if (event.key === "Escape") {
        // Close only the suggestions, not the whole modal.
        event.preventDefault();
        event.stopPropagation();
        setQuery(null);
        return;
      }
    }
    if (event.key === "Enter" && (event.metaKey || event.ctrlKey)) {
      event.preventDefault();
      void submit();
    }
  }

  return (
    <div className="relative">
      <label className="sr-only" htmlFor={`${listId}-input`}>
        Novo comentário
      </label>
      <textarea
        aria-activedescendant={suggestions.length > 0 ? `${listId}-${active}` : undefined}
        aria-autocomplete="list"
        aria-controls={suggestions.length > 0 ? listId : undefined}
        aria-expanded={suggestions.length > 0}
        className="min-h-[72px] w-full resize-y rounded-lg border border-stone-200 bg-white px-3 py-2 text-sm text-slate-800 placeholder:text-stone-400 focus:border-pegasus-sky focus:outline-none focus:ring-2 focus:ring-pegasus-sky/20 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100"
        disabled={isSending}
        id={`${listId}-input`}
        maxLength={2000}
        onChange={(event) => {
          setText(event.target.value);
          updateQuery(event.target.value, event.target.selectionStart);
        }}
        onKeyDown={onKeyDown}
        onSelect={(event) => updateQuery(event.currentTarget.value, event.currentTarget.selectionStart)}
        placeholder="Escreva um comentário. Use @ para avisar alguém."
        ref={textareaRef}
        role="combobox"
        value={text}
      />
      {suggestions.length > 0 ? (
        <ul
          className="absolute left-2 top-full z-20 mt-1 w-64 overflow-hidden rounded-lg border border-stone-200 bg-white py-1 shadow-xl dark:border-slate-700 dark:bg-slate-800"
          id={listId}
          role="listbox"
        >
          {suggestions.map((person, index) => (
            <li
              aria-selected={index === active}
              className={`flex cursor-pointer items-center gap-2 px-3 py-1.5 text-sm ${
                index === active ? "bg-pegasus-surface dark:bg-slate-700" : ""
              }`}
              id={`${listId}-${index}`}
              key={person.name}
              onMouseDown={(event) => {
                event.preventDefault();
                insert(person);
              }}
              role="option"
            >
              <span className={`grid h-6 w-6 shrink-0 place-items-center rounded-full text-[10px] font-bold ${avatarClass(person.name)}`}>
                {firstName(person.name).slice(0, 1).toUpperCase()}
              </span>
              <span className="min-w-0">
                <span className="block font-semibold text-pegasus-navy">{person.name}</span>
                {person.label !== person.name ? (
                  <span className="block truncate text-xs text-slate-500">{person.label.split(" — ").slice(1).join(" — ")}</span>
                ) : null}
              </span>
            </li>
          ))}
        </ul>
      ) : null}
      <div className="mt-2 flex items-center justify-between gap-2">
        <span className="hidden text-[11px] text-slate-400 sm:inline">Ctrl + Enter envia</span>
        <button
          className="ml-auto inline-flex h-9 items-center gap-2 rounded-md bg-pegasus-primary px-4 text-sm font-semibold text-white transition hover:opacity-90 focus:outline-none focus-visible:ring-2 focus-visible:ring-pegasus-sky focus-visible:ring-offset-2 disabled:opacity-50 dark:bg-slate-100 dark:text-slate-900"
          disabled={!text.trim() || isSending}
          onClick={() => void submit()}
          type="button"
        >
          {isSending ? <Loader2 aria-hidden="true" className="animate-spin" size={15} /> : null}
          Comentar
        </button>
      </div>
    </div>
  );
}

export function TaskActivity({
  comments,
  canComment,
  people,
  refreshKey,
  statusLabel,
  formatLabel,
  loadHistory,
  onAddComment,
}: {
  comments: Comment[];
  canComment: boolean;
  people: MentionPerson[];
  /** Changes whenever the card changes, so the history reloads. */
  refreshKey: string;
  statusLabel: (status: string) => string;
  formatLabel: (format: string) => string;
  loadHistory?: () => Promise<KanbanHistoryEntry[]>;
  onAddComment?: (text: string) => Promise<boolean>;
}) {
  const [history, setHistory] = useState<KanbanHistoryEntry[] | null>(null);
  const [historyError, setHistoryError] = useState(false);
  const [showAll, setShowAll] = useState(false);
  const loadRef = useRef(loadHistory);
  loadRef.current = loadHistory;

  useEffect(() => {
    if (!loadRef.current) return;
    let cancelled = false;
    setHistoryError(false);
    loadRef
      .current()
      .then((entries) => {
        if (!cancelled) setHistory(entries);
      })
      .catch(() => {
        if (!cancelled) setHistoryError(true);
      });
    return () => {
      cancelled = true;
    };
  }, [refreshKey]);

  function describe(entry: KanbanHistoryEntry): ReactNode {
    const meta = entry.meta ?? {};
    const list = (value: unknown) => (Array.isArray(value) ? value.join(", ") : "");
    switch (entry.action) {
      case "create":
        return <>criou o card</>;
      case "move":
        return (
          <>
            moveu de <strong>{statusLabel(String(meta.from))}</strong> para <strong>{statusLabel(String(meta.to))}</strong>
          </>
        );
      case "due_date":
        return (
          <>
            mudou o prazo de {formatDay(meta.from)} para <strong>{formatDay(meta.to)}</strong>
          </>
        );
      case "assignees": {
        const added = list(meta.added);
        const removed = list(meta.removed);
        return (
          <>
            {added ? <>atribuiu a <strong>{added}</strong></> : null}
            {added && removed ? " e " : null}
            {removed ? <>tirou <strong>{removed}</strong></> : null}
          </>
        );
      }
      case "format":
        return (
          <>
            mudou o formato para <strong>{meta.to ? formatLabel(String(meta.to)) : "nenhum"}</strong>
          </>
        );
      case "edit":
        return <>editou {list(meta.fields)}</>;
      case "approve":
        return meta.to === "scheduled" ? <>aprovou e agendou</> : <>aprovou e publicou</>;
      case "reject":
        return <>reprovou e devolveu para Produção</>;
      case "unschedule":
        return <>desagendou e devolveu para Produção</>;
      case "publish":
        return <>publicado pelo agendamento</>;
      case "archive":
        return <>arquivou</>;
      case "unarchive":
        return <>desarquivou</>;
      case "comment":
        return <>comentou</>;
      default:
        return <>{entry.action}</>;
    }
  }

  const visibleHistory = history ? (showAll ? history : history.slice(0, 6)) : [];

  return (
    <div className="space-y-4">
      <section className="rounded-2xl border border-stone-200 bg-white p-4 dark:border-slate-700 dark:bg-slate-800/50">
        <div className="flex items-center gap-2">
          <MessageSquare aria-hidden="true" className="text-pegasus-primary" size={17} />
          <h3 className="font-black text-pegasus-navy">Comentários</h3>
          {comments.length > 0 ? <span className="text-xs font-bold text-slate-400">{comments.length}</span> : null}
        </div>
        <div className="mt-3 space-y-2">
          {comments.length === 0 ? <p className="text-sm text-slate-500">Nenhum comentário ainda.</p> : null}
          {comments.map((comment) => (
            <div className="flex gap-2.5 text-sm" key={comment.id}>
              <span
                aria-hidden="true"
                className={`mt-0.5 grid h-7 w-7 shrink-0 place-items-center rounded-full text-[10px] font-bold ${avatarClass(comment.author || "Pegasus")}`}
              >
                {(comment.author || "P").slice(0, 1).toUpperCase()}
              </span>
              <div className="min-w-0 flex-1 rounded-xl bg-pegasus-surface px-3 py-2 dark:bg-slate-800">
                <p className="flex items-baseline justify-between gap-2">
                  <span className="font-bold text-pegasus-navy">{comment.author || "Pegasus"}</span>
                  <span className="shrink-0 text-[11px] text-slate-400" title={new Date(comment.createdAt).toLocaleString("pt-BR")}>
                    {relativeTime(comment.createdAt)}
                  </span>
                </p>
                <p className="mt-0.5 whitespace-pre-wrap text-slate-600 [overflow-wrap:anywhere] dark:text-slate-300">
                  <CommentText text={comment.text} />
                </p>
              </div>
            </div>
          ))}
        </div>
        {canComment && onAddComment ? (
          <div className="mt-3">
            <CommentComposer people={people} onSubmit={onAddComment} />
          </div>
        ) : null}
      </section>

      {loadHistory ? (
        <section className="rounded-2xl border border-stone-200 bg-white p-4 dark:border-slate-700 dark:bg-slate-800/50">
          <div className="flex items-center gap-2">
            <History aria-hidden="true" className="text-pegasus-primary" size={17} />
            <h3 className="font-black text-pegasus-navy">Histórico</h3>
          </div>
          {historyError ? (
            <p className="mt-3 text-sm text-slate-500">Não foi possível carregar o histórico.</p>
          ) : history === null ? (
            <p className="mt-3 flex items-center gap-2 text-sm text-slate-500">
              <Loader2 aria-hidden="true" className="animate-spin" size={14} />
              Carregando histórico
            </p>
          ) : history.length === 0 ? (
            <p className="mt-3 text-sm text-slate-500">Sem registros ainda. As próximas mudanças aparecem aqui.</p>
          ) : (
            <ol className="mt-3 space-y-2 border-l border-stone-200 pl-4 dark:border-slate-700">
              {visibleHistory.map((entry) => (
                <li className="relative text-sm text-slate-600 dark:text-slate-300" key={entry.id}>
                  <span
                    aria-hidden="true"
                    className="absolute -left-[21px] top-1.5 h-2 w-2 rounded-full bg-stone-300 ring-2 ring-white dark:bg-slate-500 dark:ring-slate-800"
                  />
                  <strong className="text-pegasus-navy">{entry.userName ?? "Sistema"}</strong> {describe(entry)}
                  <span className="ml-1.5 text-xs text-slate-400" title={new Date(entry.createdAt).toLocaleString("pt-BR")}>
                    {relativeTime(entry.createdAt)}
                  </span>
                </li>
              ))}
            </ol>
          )}
          {history && history.length > 6 ? (
            <button
              className="mt-2 text-xs font-bold text-pegasus-primary hover:underline focus:outline-none focus-visible:ring-2 focus-visible:ring-pegasus-sky dark:text-slate-200"
              onClick={() => setShowAll((value) => !value)}
              type="button"
            >
              {showAll ? "Mostrar menos" : `Ver tudo (${history.length})`}
            </button>
          ) : null}
        </section>
      ) : null}
    </div>
  );
}
