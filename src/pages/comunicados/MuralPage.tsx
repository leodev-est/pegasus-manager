import { Loader2, MessageSquare, Plus, Trash2 } from "lucide-react";
import { useCallback, useEffect, useState } from "react";
import { useAuth } from "../../auth/AuthContext";
import { Button } from "../../components/ui/Button";
import { ConfirmDialog } from "../../components/ui/ConfirmDialog";
import { EmptyState } from "../../components/ui/EmptyState";
import { Input } from "../../components/ui/Input";
import { Modal } from "../../components/ui/Modal";
import { PageHeader } from "../../components/ui/PageHeader";
import { Select } from "../../components/ui/Select";
import { Textarea } from "../../components/ui/Textarea";
import { useToast } from "../../components/ui/Toast";
import { getApiErrorMessage } from "../../services/api";
import { muralService, type MuralPost } from "../../services/muralService";

type Category = "all" | "info" | "urgente" | "evento";

const CATEGORY_LABELS: Record<string, string> = {
  info: "Informativo",
  urgente: "Urgente",
  evento: "Evento",
};

const CATEGORY_COLORS: Record<string, string> = {
  info: "bg-blue-100 text-blue-700",
  urgente: "bg-rose-100 text-rose-700",
  evento: "bg-violet-100 text-violet-700",
};

function formatDate(value: string) {
  return new Intl.DateTimeFormat("pt-BR", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(value));
}

export function MuralPage() {
  const { hasPermission } = useAuth();
  const { showToast } = useToast();
  const canManage = hasPermission(["management:create"]);

  const [posts, setPosts] = useState<MuralPost[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [filter, setFilter] = useState<Category>("all");
  const [showModal, setShowModal] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<MuralPost | null>(null);
  const [form, setForm] = useState({ title: "", body: "", category: "info" });

  const load = useCallback(async () => {
    setIsLoading(true);
    try {
      setPosts(await muralService.list());
    } catch {
      // silent
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  const filtered = filter === "all" ? posts : posts.filter((p) => p.category === filter);

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    if (!form.title.trim() || !form.body.trim()) {
      showToast("Preencha título e corpo do aviso.", "error");
      return;
    }
    setIsSaving(true);
    try {
      await muralService.create(form);
      showToast("Aviso publicado!", "success");
      setShowModal(false);
      setForm({ title: "", body: "", category: "info" });
      await load();
    } catch (err) {
      showToast(getApiErrorMessage(err), "error");
    } finally {
      setIsSaving(false);
    }
  }

  async function confirmDelete() {
    if (!deleteTarget) return;
    setIsSaving(true);
    try {
      await muralService.remove(deleteTarget.id);
      showToast("Aviso removido.", "success");
      setDeleteTarget(null);
      await load();
    } catch (err) {
      showToast(getApiErrorMessage(err), "error");
    } finally {
      setIsSaving(false);
    }
  }

  return (
    <div className="space-y-8">
      <PageHeader
        title="Mural de Avisos"
        description="Comunicados e informações importantes do clube."
        action={
          canManage ? (
            <Button onClick={() => setShowModal(true)}>
              <Plus size={17} />Publicar aviso
            </Button>
          ) : undefined
        }
      />

      {/* Filter */}
      <div className="flex flex-wrap gap-2">
        {(["all", "info", "urgente", "evento"] as Category[]).map((cat) => (
          <button
            key={cat}
            type="button"
            onClick={() => setFilter(cat)}
            className={`rounded-full px-4 py-1.5 text-sm font-bold transition ${
              filter === cat
                ? "bg-pegasus-primary text-white"
                : "bg-white border border-blue-100 text-slate-600 hover:bg-pegasus-ice"
            }`}
          >
            {cat === "all" ? "Todos" : CATEGORY_LABELS[cat]}
          </button>
        ))}
      </div>

      {isLoading ? (
        <div className="flex items-center justify-center py-16">
          <Loader2 className="animate-spin text-pegasus-primary" size={28} />
        </div>
      ) : filtered.length === 0 ? (
        <EmptyState
          icon={MessageSquare}
          title="Nenhum aviso"
          description={filter === "all" ? "Nenhum aviso publicado ainda." : "Nenhum aviso nesta categoria."}
        />
      ) : (
        <div className="space-y-4">
          {filtered.map((post) => (
            <article key={post.id} className="panel p-6">
              <div className="flex items-start justify-between gap-4">
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className={`rounded-full px-2.5 py-0.5 text-xs font-bold ${CATEGORY_COLORS[post.category] ?? "bg-slate-100 text-slate-600"}`}>
                      {CATEGORY_LABELS[post.category] ?? post.category}
                    </span>
                    <span className="text-xs text-slate-400">{formatDate(post.createdAt)}</span>
                  </div>
                  <h2 className="mt-2 text-lg font-black text-pegasus-navy">{post.title}</h2>
                  <p className="mt-2 whitespace-pre-wrap text-sm leading-relaxed text-slate-600">{post.body}</p>
                </div>
                {canManage && (
                  <Button
                    variant="danger"
                    className="h-8 shrink-0 px-3 text-xs"
                    onClick={() => setDeleteTarget(post)}
                  >
                    <Trash2 size={13} />
                  </Button>
                )}
              </div>
            </article>
          ))}
        </div>
      )}

      <Modal isOpen={showModal} onClose={() => setShowModal(false)} title="Publicar aviso">
        <form className="grid gap-4" onSubmit={handleCreate}>
          <Input
            label="Título"
            value={form.title}
            onChange={(e) => setForm({ ...form, title: e.target.value })}
            required
            disabled={isSaving}
          />
          <Select
            label="Categoria"
            value={form.category}
            onChange={(e) => setForm({ ...form, category: e.target.value })}
            options={[
              { label: "Informativo", value: "info" },
              { label: "Urgente", value: "urgente" },
              { label: "Evento", value: "evento" },
            ]}
            disabled={isSaving}
          />
          <Textarea
            label="Corpo do aviso"
            value={form.body}
            onChange={(e) => setForm({ ...form, body: e.target.value })}
            rows={5}
            disabled={isSaving}
          />
          <div className="flex flex-col gap-3 sm:flex-row">
            <Button type="submit" disabled={isSaving}>
              {isSaving ? <Loader2 className="animate-spin" size={17} /> : <Plus size={17} />}
              Publicar
            </Button>
            <Button variant="secondary" onClick={() => setShowModal(false)} disabled={isSaving}>
              Cancelar
            </Button>
          </div>
        </form>
      </Modal>

      <ConfirmDialog
        isOpen={Boolean(deleteTarget)}
        onClose={() => setDeleteTarget(null)}
        onConfirm={confirmDelete}
        title="Remover aviso"
        description={`Deseja remover o aviso "${deleteTarget?.title ?? ""}"?`}
        confirmLabel={isSaving ? "Removendo..." : "Remover"}
      />
    </div>
  );
}
