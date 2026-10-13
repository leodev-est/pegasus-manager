import { Bookmark, CalendarPlus, ExternalLink, Plus, Search, Trash2 } from "lucide-react";
import { useCallback, useEffect, useMemo, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { useAuth } from "../../auth/AuthContext";
import { Button } from "../../components/ui/Button";
import { ConfirmDialog } from "../../components/ui/ConfirmDialog";
import { EmptyState } from "../../components/ui/EmptyState";
import { Input } from "../../components/ui/Input";
import { Modal } from "../../components/ui/Modal";
import { PageHeader } from "../../components/ui/PageHeader";
import { Select } from "../../components/ui/Select";
import { StatusBadge, type StatusTone } from "../../components/ui/StatusBadge";
import { Textarea } from "../../components/ui/Textarea";
import { useToast } from "../../components/ui/Toast";
import { getApiErrorMessage } from "../../services/api";
import {
  referenceService,
  type ReferencePlatform,
  type ReferenceStatus,
  type ReferenceVideo,
} from "../../services/referenceService";
import { FORMAT_OPTIONS, type ContentFormat } from "../../utils/contentPipeline";

// A curadoria é só de vídeos de referência, então só os formatos com vídeo fazem sentido aqui.
const VIDEO_FORMAT_OPTIONS = FORMAT_OPTIONS.filter((o) => o.value === "video" || o.value === "video_arte" || o.value === "so_arte");

const STATUS_OPTIONS: Array<{ label: string; value: ReferenceStatus }> = [
  { label: "Nova", value: "nova" },
  { label: "Aprovada para gravar", value: "aprovada" },
  { label: "Gravada", value: "gravada" },
  { label: "Descartada", value: "descartada" },
];

const STATUS_TONE: Record<ReferenceStatus, StatusTone> = {
  nova: "info",
  aprovada: "warning",
  gravada: "success",
  descartada: "neutral",
};

const STATUS_LABEL: Record<ReferenceStatus, string> = {
  nova: "Nova",
  aprovada: "Aprovada",
  gravada: "Gravada",
  descartada: "Descartada",
};

const PLATFORM_LABEL: Record<ReferencePlatform, string> = {
  instagram: "Instagram",
  youtube: "YouTube",
  tiktok: "TikTok",
  outro: "Link",
};

const PLATFORM_OPTIONS = (Object.keys(PLATFORM_LABEL) as ReferencePlatform[]).map((p) => ({ label: PLATFORM_LABEL[p], value: p }));

function todayKey() {
  return new Date().toLocaleDateString("en-CA", { timeZone: "America/Sao_Paulo" });
}

/** Pega o primeiro endereço http(s) de um texto (o "Compartilhar" do Instagram manda texto + link). */
function extractUrl(...candidates: Array<string | null>) {
  for (const text of candidates) {
    const match = text?.match(/https?:\/\/[^\s]+/);
    if (match) return match[0];
  }
  return "";
}

type AddForm = { url: string; title: string; note: string; tags: string; platform: ReferencePlatform | "auto" };
const emptyAdd: AddForm = { url: "", title: "", note: "", tags: "", platform: "auto" };

export function CuratoriaPage() {
  const { hasPermission } = useAuth();
  const { showToast } = useToast();
  const [searchParams, setSearchParams] = useSearchParams();
  const canCreate = hasPermission(["marketing:create"]);
  const canUpdate = hasPermission(["marketing:update"]);
  const canDelete = hasPermission(["marketing:delete"]);

  const [references, setReferences] = useState<ReferenceVideo[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [statusFilter, setStatusFilter] = useState<ReferenceStatus | "todos">("todos");
  const [tagFilter, setTagFilter] = useState("todas");
  const [search, setSearch] = useState("");

  const [addOpen, setAddOpen] = useState(false);
  const [addForm, setAddForm] = useState<AddForm>(emptyAdd);
  const [editing, setEditing] = useState<ReferenceVideo | null>(null);
  const [editForm, setEditForm] = useState({ title: "", note: "", tags: "" });
  const [productionTarget, setProductionTarget] = useState<ReferenceVideo | null>(null);
  const [productionForm, setProductionForm] = useState<{ date: string; format: ContentFormat }>({ date: todayKey(), format: "video" });
  const [deleteTarget, setDeleteTarget] = useState<ReferenceVideo | null>(null);

  // "Compartilhar" do celular (PWA instalado no Android) chega aqui com ?url=&text=&title=
  useEffect(() => {
    const shared = extractUrl(searchParams.get("url"), searchParams.get("text"), searchParams.get("title"));
    if (!shared) return;
    setAddForm({ ...emptyAdd, url: shared, title: "" });
    setAddOpen(true);
    setSearchParams({}, { replace: true });
  }, [searchParams, setSearchParams]);

  const load = useCallback(async () => {
    setIsLoading(true);
    try {
      setReferences(await referenceService.getAll({ status: statusFilter }));
    } catch (error) {
      showToast(getApiErrorMessage(error), "error");
    } finally {
      setIsLoading(false);
    }
  }, [statusFilter, showToast]);

  useEffect(() => {
    load();
  }, [load]);

  const allTags = useMemo(() => Array.from(new Set(references.flatMap((r) => r.tags))).sort(), [references]);

  const visible = useMemo(() => {
    const term = search.trim().toLowerCase();
    return references.filter((r) => {
      if (tagFilter !== "todas" && !r.tags.includes(tagFilter)) return false;
      if (!term) return true;
      return [r.title, r.note ?? "", r.url, r.addedBy].some((text) => text.toLowerCase().includes(term));
    });
  }, [references, tagFilter, search]);

  function parseTags(text: string) {
    return text
      .split(/[,\n]/)
      .map((t) => t.trim())
      .filter(Boolean);
  }

  async function run(action: () => Promise<unknown>, success: string) {
    setIsSaving(true);
    try {
      await action();
      showToast(success, "success");
      await load();
      return true;
    } catch (error) {
      showToast(getApiErrorMessage(error), "error");
      return false;
    } finally {
      setIsSaving(false);
    }
  }

  async function handleAdd(event: React.FormEvent) {
    event.preventDefault();
    if (!addForm.url.trim()) {
      showToast("Cole o link do vídeo.", "error");
      return;
    }
    const ok = await run(
      () =>
        referenceService.create({
          url: addForm.url.trim(),
          title: addForm.title.trim() || undefined,
          note: addForm.note.trim() || undefined,
          tags: parseTags(addForm.tags),
          platform: addForm.platform === "auto" ? undefined : addForm.platform,
        }),
      "Referência salva na curadoria.",
    );
    if (ok) {
      setAddOpen(false);
      setAddForm(emptyAdd);
    }
  }

  function openEdit(reference: ReferenceVideo) {
    setEditing(reference);
    setEditForm({ title: reference.title, note: reference.note ?? "", tags: reference.tags.join(", ") });
  }

  async function handleEdit(event: React.FormEvent) {
    event.preventDefault();
    if (!editing) return;
    const ok = await run(
      () => referenceService.update(editing.id, { title: editForm.title, note: editForm.note, tags: parseTags(editForm.tags) }),
      "Referência atualizada.",
    );
    if (ok) setEditing(null);
  }

  async function handleCreateCard(event: React.FormEvent) {
    event.preventDefault();
    if (!productionTarget) return;
    const ok = await run(
      () => referenceService.toTask(productionTarget.id, productionForm),
      "Card criado no Kanban de Marketing.",
    );
    if (ok) setProductionTarget(null);
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Curadoria"
        description="Guarde os vídeos de referência que o time quer gravar. Cole o link (ou compartilhe do Instagram), diga por que é bom e crie o card de produção no Kanban."
        action={
          canCreate ? (
            <Button
              onClick={() => {
                setAddForm(emptyAdd);
                setAddOpen(true);
              }}
            >
              <Plus size={16} />
              Nova referência
            </Button>
          ) : undefined
        }
      />

      <section className="panel space-y-3 p-4">
        <div className="flex flex-wrap gap-1.5">
          {[{ label: "Todas", value: "todos" as const }, ...STATUS_OPTIONS].map((option) => (
            <button
              className={`rounded-full border px-3 py-1.5 text-xs font-bold transition ${
                statusFilter === option.value
                  ? "border-pegasus-primary bg-pegasus-primary text-white"
                  : "border-stone-200 bg-white text-slate-600 hover:border-pegasus-primary hover:text-pegasus-primary"
              }`}
              key={option.value}
              onClick={() => setStatusFilter(option.value)}
              type="button"
            >
              {option.label}
            </button>
          ))}
        </div>
        <div className="grid gap-3 sm:grid-cols-[1fr_14rem]">
          <label className="block">
            <span className="mb-1.5 block text-sm font-semibold text-slate-700">Buscar</span>
            <span className="relative block">
              <Search className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={15} />
              <input
                className="h-11 w-full rounded-md border border-slate-200 bg-white pl-9 pr-3 text-sm outline-none focus:border-pegasus-sky focus:ring-2 focus:ring-pegasus-sky/20"
                onChange={(event) => setSearch(event.target.value)}
                placeholder="Título, nota, link ou quem salvou"
                value={search}
              />
            </span>
          </label>
          <Select
            label="Tag"
            onChange={(event) => setTagFilter(event.target.value)}
            options={[{ label: "Todas as tags", value: "todas" }, ...allTags.map((t) => ({ label: `#${t}`, value: t }))]}
            value={tagFilter}
          />
        </div>
      </section>

      {isLoading ? (
        <p className="text-sm font-bold text-pegasus-primary">Carregando curadoria...</p>
      ) : visible.length === 0 ? (
        <EmptyState
          description={
            references.length === 0
              ? "Ache um vídeo bom no Instagram, copie o link e salve aqui com uma nota do que vale copiar."
              : "Nenhuma referência com esses filtros."
          }
          icon={Bookmark}
          title="Nada por aqui ainda"
        />
      ) : (
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {visible.map((reference) => (
            <article className="panel flex flex-col gap-3 p-4" key={reference.id}>
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0">
                  <p className="text-[10px] font-bold uppercase tracking-wide text-slate-400">{PLATFORM_LABEL[reference.platform]}</p>
                  <h3 className="mt-0.5 break-words text-sm font-black text-pegasus-navy">{reference.title}</h3>
                </div>
                <StatusBadge label={STATUS_LABEL[reference.status]} tone={STATUS_TONE[reference.status]} />
              </div>

              {reference.note ? <p className="whitespace-pre-line text-sm leading-6 text-slate-600">{reference.note}</p> : null}

              {reference.tags.length > 0 ? (
                <div className="flex flex-wrap gap-1.5">
                  {reference.tags.map((tag) => (
                    <button
                      className="rounded-full bg-pegasus-ice px-2.5 py-0.5 text-[11px] font-bold text-pegasus-primary"
                      key={tag}
                      onClick={() => setTagFilter(tag)}
                      type="button"
                    >
                      #{tag}
                    </button>
                  ))}
                </div>
              ) : null}

              <p className="text-[11px] text-slate-400">
                Salvo por {reference.addedBy} em {new Intl.DateTimeFormat("pt-BR").format(new Date(reference.createdAt))}
                {reference.task?.dueDate ? (
                  <span className="font-bold text-emerald-600">
                    {" "}
                    · em produção (
                    {new Intl.DateTimeFormat("pt-BR", { day: "2-digit", month: "2-digit", timeZone: "UTC" }).format(
                      new Date(reference.task.dueDate),
                    )}
                    )
                  </span>
                ) : null}
              </p>

              <div className="mt-auto flex flex-wrap items-center gap-2">
                <a
                  className="inline-flex h-9 items-center gap-1.5 rounded-md border border-stone-200 bg-white px-3 text-xs font-semibold text-stone-700 hover:bg-stone-50"
                  href={reference.url}
                  rel="noreferrer"
                  target="_blank"
                >
                  <ExternalLink size={13} />
                  Abrir vídeo
                </a>
                {canUpdate ? (
                  <select
                    aria-label="Mudar status"
                    className="h-9 rounded-md border border-stone-200 bg-white px-2 text-xs font-semibold text-stone-700"
                    disabled={isSaving}
                    onChange={(event) =>
                      run(() => referenceService.update(reference.id, { status: event.target.value as ReferenceStatus }), "Status atualizado.")
                    }
                    value={reference.status}
                  >
                    {STATUS_OPTIONS.map((o) => (
                      <option key={o.value} value={o.value}>
                        {o.label}
                      </option>
                    ))}
                  </select>
                ) : null}
                {canCreate && !reference.taskId && reference.status !== "descartada" ? (
                  <Button
                    className="h-9 px-3 text-xs"
                    onClick={() => {
                      setProductionTarget(reference);
                      setProductionForm({ date: todayKey(), format: "video" });
                    }}
                    variant="secondary"
                  >
                    <CalendarPlus size={13} />
                    Criar card para produção
                  </Button>
                ) : null}
                {canUpdate ? (
                  <Button className="h-9 px-3 text-xs" onClick={() => openEdit(reference)} variant="ghost">
                    Editar
                  </Button>
                ) : null}
                {canDelete ? (
                  <button
                    aria-label="Excluir referência"
                    className="ml-auto text-slate-400 hover:text-rose-600"
                    onClick={() => setDeleteTarget(reference)}
                    type="button"
                  >
                    <Trash2 size={15} />
                  </button>
                ) : null}
              </div>
            </article>
          ))}
        </div>
      )}

      <Modal isOpen={addOpen} onClose={() => setAddOpen(false)} title="Nova referência" description="Cole o link do vídeo que você achou bom.">
        <form className="grid gap-4" onSubmit={handleAdd}>
          <Input
            autoFocus
            disabled={isSaving}
            label="Link do vídeo"
            onChange={(event) => setAddForm({ ...addForm, url: event.target.value })}
            placeholder="https://www.instagram.com/reel/..."
            required
            value={addForm.url}
          />
          <Input
            disabled={isSaving}
            label="Título (opcional)"
            onChange={(event) => setAddForm({ ...addForm, title: event.target.value })}
            placeholder="Ex: Treino de saque em câmera lenta"
            value={addForm.title}
          />
          <Textarea
            disabled={isSaving}
            label="Por que é bom? O que copiar?"
            onChange={(event) => setAddForm({ ...addForm, note: event.target.value })}
            placeholder="Gancho dos 3 primeiros segundos, áudio, corte, legenda..."
            value={addForm.note}
          />
          <div className="grid gap-4 sm:grid-cols-2">
            <Input
              disabled={isSaving}
              label="Tags (separe por vírgula)"
              onChange={(event) => setAddForm({ ...addForm, tags: event.target.value })}
              placeholder="treino, bastidores, humor"
              value={addForm.tags}
            />
            <Select
              disabled={isSaving}
              label="Plataforma"
              onChange={(event) => setAddForm({ ...addForm, platform: event.target.value as ReferencePlatform | "auto" })}
              options={[{ label: "Detectar pelo link", value: "auto" }, ...PLATFORM_OPTIONS]}
              value={addForm.platform}
            />
          </div>
          <div className="flex gap-3">
            <Button disabled={isSaving} type="submit">
              {isSaving ? "Salvando..." : "Salvar referência"}
            </Button>
            <Button disabled={isSaving} onClick={() => setAddOpen(false)} type="button" variant="secondary">
              Cancelar
            </Button>
          </div>
        </form>
      </Modal>

      <Modal isOpen={Boolean(editing)} onClose={() => setEditing(null)} title="Editar referência">
        <form className="grid gap-4" onSubmit={handleEdit}>
          <Input disabled={isSaving} label="Título" onChange={(e) => setEditForm({ ...editForm, title: e.target.value })} required value={editForm.title} />
          <Textarea disabled={isSaving} label="Por que é bom? O que copiar?" onChange={(e) => setEditForm({ ...editForm, note: e.target.value })} value={editForm.note} />
          <Input disabled={isSaving} label="Tags (separe por vírgula)" onChange={(e) => setEditForm({ ...editForm, tags: e.target.value })} value={editForm.tags} />
          <div className="flex gap-3">
            <Button disabled={isSaving} type="submit">
              Salvar
            </Button>
            <Button disabled={isSaving} onClick={() => setEditing(null)} type="button" variant="secondary">
              Cancelar
            </Button>
          </div>
        </form>
      </Modal>

      <Modal
        isOpen={Boolean(productionTarget)}
        onClose={() => setProductionTarget(null)}
        title="Criar card para produção"
        description={productionTarget?.title}
      >
        <form className="grid gap-4" onSubmit={handleCreateCard}>
          <div className="grid gap-4 sm:grid-cols-2">
            <Input
              disabled={isSaving}
              label="Data de publicação"
              onChange={(e) => setProductionForm({ ...productionForm, date: e.target.value })}
              required
              type="date"
              value={productionForm.date}
            />
            <Select
              disabled={isSaving}
              label="Formato"
              onChange={(e) => setProductionForm({ ...productionForm, format: e.target.value as ContentFormat })}
              options={VIDEO_FORMAT_OPTIONS}
              value={productionForm.format}
            />
          </div>
          <p className="text-xs text-slate-500">O link da referência vai junto, como anexo do card. A referência passa para "Aprovada".</p>
          <div className="flex gap-3">
            <Button disabled={isSaving} type="submit">
              Criar card
            </Button>
            <Button disabled={isSaving} onClick={() => setProductionTarget(null)} type="button" variant="secondary">
              Cancelar
            </Button>
          </div>
        </form>
      </Modal>

      <ConfirmDialog
        confirmLabel="Excluir"
        description={`Remover "${deleteTarget?.title ?? ""}" da curadoria?`}
        isOpen={Boolean(deleteTarget)}
        onClose={() => setDeleteTarget(null)}
        onConfirm={async () => {
          if (!deleteTarget) return;
          const ok = await run(() => referenceService.delete(deleteTarget.id), "Referência removida.");
          if (ok) setDeleteTarget(null);
        }}
        title="Excluir referência"
      />
    </div>
  );
}
