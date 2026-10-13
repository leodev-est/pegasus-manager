import { ExternalLink, Plus, X } from "lucide-react";
import { useState } from "react";
import { Button } from "../ui/Button";
import { Input } from "../ui/Input";

export type EditableLink = { id: string; label: string; url: string };

type LinksEditorProps = {
  value: EditableLink[];
  onChange: (links: EditableLink[]) => void;
  disabled?: boolean;
  label?: string;
  hint?: string;
};

function makeId() {
  return `link-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

export function LinksEditor({ value, onChange, disabled, label = "Links", hint = "Canva, Drive, vídeo bruto ou editado..." }: LinksEditorProps) {
  const [url, setUrl] = useState("");
  const [name, setName] = useState("");
  const [error, setError] = useState("");

  function add() {
    const trimmed = url.trim();
    if (!trimmed) return;
    try {
      const parsed = new URL(trimmed);
      if (parsed.protocol !== "http:" && parsed.protocol !== "https:") throw new Error("protocol");
    } catch {
      setError("Cole o endereço completo, começando com https://");
      return;
    }
    if (value.length >= 10) {
      setError("No máximo 10 links.");
      return;
    }
    setError("");
    onChange([...value, { id: makeId(), label: name.trim(), url: trimmed }]);
    setUrl("");
    setName("");
  }

  return (
    <div>
      <span className="mb-1.5 block text-sm font-semibold text-slate-700">{label}</span>
      {value.length > 0 ? (
        <ul className="mb-2 space-y-1.5">
          {value.map((link) => (
            <li className="flex items-center gap-2 rounded-lg border border-stone-200 bg-white px-3 py-1.5 text-sm" key={link.id}>
              <ExternalLink className="shrink-0 text-pegasus-primary" size={14} />
              <a className="min-w-0 flex-1 truncate font-semibold text-pegasus-primary hover:underline" href={link.url} rel="noreferrer" target="_blank">
                {link.label || link.url}
              </a>
              {!disabled ? (
                <button
                  aria-label="Remover link"
                  className="text-slate-400 hover:text-rose-600"
                  onClick={() => onChange(value.filter((l) => l.id !== link.id))}
                  type="button"
                >
                  <X size={14} />
                </button>
              ) : null}
            </li>
          ))}
        </ul>
      ) : null}
      {!disabled ? (
        <div className="grid gap-2 sm:grid-cols-[1fr_9rem_auto] sm:items-end">
          <Input
            error={error}
            label="Endereço"
            onChange={(event) => {
              setUrl(event.target.value);
              setError("");
            }}
            onKeyDown={(event) => {
              if (event.key === "Enter") {
                event.preventDefault();
                add();
              }
            }}
            placeholder="https://..."
            value={url}
          />
          <Input label="Nome (opcional)" onChange={(event) => setName(event.target.value)} placeholder="Ex: Canva" value={name} />
          <Button onClick={add} type="button" variant="secondary">
            <Plus size={16} />
            Adicionar
          </Button>
        </div>
      ) : null}
      <p className="mt-1 text-xs text-slate-400">{hint}</p>
    </div>
  );
}
