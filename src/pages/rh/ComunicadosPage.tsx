import {
  AlertCircle,
  Bell,
  Calendar,
  CheckCircle2,
  Clock,
  ExternalLink,
  FileText,
  Loader2,
  MessageCircle,
  MessageSquare,
  Pencil,
  Plus,
  RefreshCw,
  Send,
  Trash2,
  Users,
  WifiOff,
  XCircle,
} from "lucide-react";
import { FormEvent, useCallback, useEffect, useState } from "react";
import { Link } from "react-router-dom";
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
  announcementsService,
  type AnnouncementTemplate,
  type ScheduledAnnouncement,
} from "../../services/announcementsService";
import { muralService, type MuralPost } from "../../services/muralService";
import { whatsappService, type WhatsAppGroup } from "../../services/whatsappService";

type ComunicadosTab = "enviar" | "templates" | "agendados" | "mural";

const tabs: Array<{ label: string; value: ComunicadosTab }> = [
  { label: "Enviar", value: "enviar" },
  { label: "Templates", value: "templates" },
  { label: "Agendados", value: "agendados" },
  { label: "Mural", value: "mural" },
];

function scheduledStatusTone(status: string): StatusTone {
  if (status === "sent") return "success";
  if (status === "pending") return "info";
  if (status === "failed") return "danger";
  return "neutral";
}

function scheduledStatusLabel(status: string): string {
  const labels: Record<string, string> = { pending: "Agendado", sent: "Enviado", failed: "Falhou", cancelled: "Cancelado" };
  return labels[status] ?? status;
}

function channelLabel(channel: string): string {
  if (channel === "whatsapp") return "WhatsApp";
  if (channel === "notification") return "Notificação";
  return "Ambos";
}

function targetLabel(target: string): string {
  return target === "all" ? "Todos os atletas" : "Somente ativos";
}

function formatDateTime(value: string) {
  return new Intl.DateTimeFormat("pt-BR", {
    day: "2-digit", month: "2-digit", year: "numeric", hour: "2-digit", minute: "2-digit",
  }).format(new Date(value));
}

export function ComunicadosPage() {
  const { showToast } = useToast();
  const { hasPermission } = useAuth();
  const canManageMural = hasPermission(["management:create"]);
  const [activeTab, setActiveTab] = useState<ComunicadosTab>("enviar");

  // ── Enviar state ────────────────────────────────────────────────────────────
  const [status, setStatus] = useState<"disconnected" | "connecting" | "connected">("disconnected");
  const [groups, setGroups] = useState<WhatsAppGroup[]>([]);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [message, setMessage] = useState("");
  const [isLoadingGroups, setIsLoadingGroups] = useState(true);
  const [isSending, setIsSending] = useState(false);
  const [lastResult, setLastResult] = useState<{ sent: number; failed: number } | null>(null);

  // ── Templates state ─────────────────────────────────────────────────────────
  const [templates, setTemplates] = useState<AnnouncementTemplate[]>([]);
  const [isLoadingTemplates, setIsLoadingTemplates] = useState(false);
  const [templateModal, setTemplateModal] = useState(false);
  const [editingTemplate, setEditingTemplate] = useState<AnnouncementTemplate | null>(null);
  const [templateForm, setTemplateForm] = useState({ title: "", body: "" });
  const [isSavingTemplate, setIsSavingTemplate] = useState(false);
  const [deleteTemplateTarget, setDeleteTemplateTarget] = useState<AnnouncementTemplate | null>(null);

  // ── Mural state ─────────────────────────────────────────────────────────────
  const [muralPosts, setMuralPosts] = useState<MuralPost[]>([]);
  const [isLoadingMural, setIsLoadingMural] = useState(false);
  const [muralModal, setMuralModal] = useState(false);
  const [isSavingMural, setIsSavingMural] = useState(false);
  const [muralForm, setMuralForm] = useState({ title: "", body: "", category: "info" });
  const [deleteMuralTarget, setDeleteMuralTarget] = useState<MuralPost | null>(null);

  // ── Agendados state ─────────────────────────────────────────────────────────
  const [scheduled, setScheduled] = useState<ScheduledAnnouncement[]>([]);
  const [isLoadingScheduled, setIsLoadingScheduled] = useState(false);
  const [scheduledModal, setScheduledModal] = useState(false);
  const [isSavingScheduled, setIsSavingScheduled] = useState(false);
  const [cancelTarget, setCancelTarget] = useState<ScheduledAnnouncement | null>(null);
  const [scheduledTemplateId, setScheduledTemplateId] = useState("");
  const [scheduledForm, setScheduledForm] = useState({
    title: "",
    body: "",
    target: "active" as "all" | "active",
    channel: "both" as "whatsapp" | "notification" | "both",
    scheduledAt: "",
  });

  // ── Loaders ─────────────────────────────────────────────────────────────────
  const loadGroups = useCallback(async () => {
    setIsLoadingGroups(true);
    setLastResult(null);
    try {
      const res = await whatsappService.getGroups();
      setStatus(res.status);
      setGroups(res.groups.sort((a, b) => a.name.localeCompare(b.name, "pt-BR")));
    } catch {
      // silent
    } finally {
      setIsLoadingGroups(false);
    }
  }, []);

  const loadTemplates = useCallback(async () => {
    setIsLoadingTemplates(true);
    try { setTemplates(await announcementsService.listTemplates()); }
    catch { /* silent */ }
    finally { setIsLoadingTemplates(false); }
  }, []);

  const loadScheduled = useCallback(async () => {
    setIsLoadingScheduled(true);
    try { setScheduled(await announcementsService.listScheduled()); }
    catch { /* silent */ }
    finally { setIsLoadingScheduled(false); }
  }, []);

  const loadMural = useCallback(async () => {
    setIsLoadingMural(true);
    try { setMuralPosts(await muralService.list()); }
    catch { /* silent */ }
    finally { setIsLoadingMural(false); }
  }, []);

  useEffect(() => { loadGroups(); }, [loadGroups]);

  useEffect(() => {
    if (activeTab === "templates") loadTemplates();
    if (activeTab === "agendados") { loadTemplates(); loadScheduled(); }
    if (activeTab === "mural") loadMural();
  }, [activeTab, loadTemplates, loadScheduled, loadMural]);

  // ── Enviar handlers ─────────────────────────────────────────────────────────
  function toggleGroup(id: string) {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  }

  function toggleAll() {
    setSelected(selected.size === groups.length ? new Set() : new Set(groups.map((g) => g.id)));
  }

  async function handleSend() {
    if (!message.trim()) { showToast("Digite uma mensagem antes de enviar.", "error"); return; }
    if (selected.size === 0) { showToast("Selecione pelo menos um grupo.", "error"); return; }
    setIsSending(true);
    setLastResult(null);
    try {
      const result = await whatsappService.sendBroadcast([...selected], message.trim());
      setLastResult(result);
      if (result.failed === 0) {
        showToast(`Comunicado enviado para ${result.sent} grupo(s) com sucesso!`, "success");
        setMessage("");
        setSelected(new Set());
      } else {
        showToast(`Enviado: ${result.sent} ✓  Falhou: ${result.failed} ✗`, result.sent > 0 ? "success" : "error");
      }
    } catch (err: any) {
      showToast(err?.response?.data?.error ?? err?.message ?? "Erro ao enviar comunicado.", "error");
    } finally {
      setIsSending(false);
    }
  }

  // ── Template handlers ────────────────────────────────────────────────────────
  function openCreateTemplate() {
    setEditingTemplate(null);
    setTemplateForm({ title: "", body: "" });
    setTemplateModal(true);
  }

  function openEditTemplate(template: AnnouncementTemplate) {
    setEditingTemplate(template);
    setTemplateForm({ title: template.title, body: template.body });
    setTemplateModal(true);
  }

  async function handleTemplateSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setIsSavingTemplate(true);
    try {
      if (editingTemplate) {
        await announcementsService.updateTemplate(editingTemplate.id, templateForm);
        showToast("Template atualizado.", "success");
      } else {
        await announcementsService.createTemplate(templateForm);
        showToast("Template criado.", "success");
      }
      setTemplateModal(false);
      await loadTemplates();
    } catch (error) {
      showToast(getApiErrorMessage(error), "error");
    } finally {
      setIsSavingTemplate(false);
    }
  }

  async function confirmDeleteTemplate() {
    if (!deleteTemplateTarget) return;
    setIsSavingTemplate(true);
    try {
      await announcementsService.deleteTemplate(deleteTemplateTarget.id);
      showToast("Template excluído.", "success");
      setDeleteTemplateTarget(null);
      await loadTemplates();
    } catch (error) {
      showToast(getApiErrorMessage(error), "error");
    } finally {
      setIsSavingTemplate(false);
    }
  }

  // ── Agendados handlers ───────────────────────────────────────────────────────
  function openCreateScheduled() {
    setScheduledForm({ title: "", body: "", target: "active", channel: "both", scheduledAt: "" });
    setScheduledTemplateId("");
    setScheduledModal(true);
  }

  async function handleScheduledSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setIsSavingScheduled(true);
    try {
      await announcementsService.createScheduled({
        ...scheduledForm,
        scheduledAt: new Date(scheduledForm.scheduledAt).toISOString(),
      });
      showToast("Comunicado agendado.", "success");
      setScheduledModal(false);
      await loadScheduled();
    } catch (error) {
      showToast(getApiErrorMessage(error), "error");
    } finally {
      setIsSavingScheduled(false);
    }
  }

  async function confirmCancel() {
    if (!cancelTarget) return;
    setIsSavingScheduled(true);
    try {
      await announcementsService.cancelScheduled(cancelTarget.id);
      showToast("Comunicado cancelado.", "success");
      setCancelTarget(null);
      await loadScheduled();
    } catch (error) {
      showToast(getApiErrorMessage(error), "error");
    } finally {
      setIsSavingScheduled(false);
    }
  }

  const isConnected = status === "connected";

  return (
    <div className="space-y-8">
      <PageHeader
        title="Comunicados"
        description="Envie comunicados para grupos de WhatsApp, crie templates e agende mensagens."
        action={
          activeTab === "templates" ? (
            <Button onClick={openCreateTemplate}>
              <Plus size={17} />Novo template
            </Button>
          ) : activeTab === "agendados" ? (
            <Button onClick={openCreateScheduled}>
              <Plus size={17} />Agendar comunicado
            </Button>
          ) : activeTab === "mural" && canManageMural ? (
            <Button onClick={() => { setMuralForm({ title: "", body: "", category: "info" }); setMuralModal(true); }}>
              <Plus size={17} />Publicar aviso
            </Button>
          ) : null
        }
      />

      {/* Tabs */}
      <div className="flex flex-wrap gap-2 rounded-2xl border border-blue-100 bg-white p-2 shadow-sm">
        {tabs.map((tab) => (
          <button
            className={`rounded-xl px-4 py-2 text-sm font-bold transition ${
              activeTab === tab.value
                ? "bg-pegasus-primary text-white shadow-sm"
                : "text-slate-600 hover:bg-pegasus-ice hover:text-pegasus-primary"
            }`}
            key={tab.value}
            onClick={() => setActiveTab(tab.value)}
            type="button"
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* ── Enviar Tab ─────────────────────────────────────────────────────────── */}
      {activeTab === "enviar" ? (
        <>
          {!isLoadingGroups && !isConnected ? (
            <div className="flex items-start gap-3 rounded-2xl border border-amber-200 bg-amber-50 p-4">
              <WifiOff className="mt-0.5 shrink-0 text-amber-600" size={18} />
              <div className="flex-1">
                <p className="text-sm font-bold text-amber-800">WhatsApp desconectado</p>
                <p className="mt-0.5 text-sm text-amber-700">
                  Para enviar comunicados, conecte o WhatsApp na{" "}
                  <Link className="inline-flex items-center gap-1 font-semibold underline underline-offset-2" to="/app/admin/whatsapp">
                    página de administração<ExternalLink size={12} />
                  </Link>.
                </p>
              </div>
            </div>
          ) : null}

          <div className="grid gap-6 lg:grid-cols-[1fr_2fr]">
            <section className="panel p-5">
              <div className="flex items-center justify-between gap-2">
                <h2 className="font-black text-pegasus-navy">Grupos</h2>
                <Button className="h-8 px-2 text-xs" disabled={isLoadingGroups} onClick={loadGroups} variant="secondary">
                  <RefreshCw className={isLoadingGroups ? "animate-spin" : ""} size={13} />
                  Atualizar
                </Button>
              </div>
              {isLoadingGroups ? (
                <div className="mt-6 flex justify-center"><Loader2 className="animate-spin text-pegasus-primary" size={22} /></div>
              ) : !isConnected ? (
                <p className="mt-4 text-sm text-slate-400">Conecte o WhatsApp para ver os grupos.</p>
              ) : groups.length === 0 ? (
                <p className="mt-4 text-sm text-slate-400">Nenhum grupo encontrado.</p>
              ) : (
                <>
                  <button className="mt-4 text-xs font-semibold text-pegasus-primary hover:underline" onClick={toggleAll}>
                    {selected.size === groups.length ? "Desselecionar todos" : "Selecionar todos"}
                  </button>
                  <ul className="mt-2 space-y-1">
                    {groups.map((g) => (
                      <li key={g.id}>
                        <label className="flex cursor-pointer items-center gap-3 rounded-xl px-3 py-2.5 hover:bg-pegasus-surface">
                          <input
                            checked={selected.has(g.id)}
                            className="h-4 w-4 rounded accent-pegasus-primary"
                            onChange={() => toggleGroup(g.id)}
                            type="checkbox"
                          />
                          <div className="min-w-0 flex-1">
                            <p className="truncate text-sm font-semibold text-pegasus-navy">{g.name}</p>
                            <p className="flex items-center gap-1 text-xs text-slate-400">
                              <Users size={10} />{g.participants} participante{g.participants !== 1 ? "s" : ""}
                            </p>
                          </div>
                        </label>
                      </li>
                    ))}
                  </ul>
                  {selected.size > 0 ? (
                    <p className="mt-3 text-xs font-semibold text-pegasus-primary">
                      {selected.size} grupo{selected.size !== 1 ? "s" : ""} selecionado{selected.size !== 1 ? "s" : ""}
                    </p>
                  ) : null}
                </>
              )}
            </section>

            <section className="panel flex flex-col gap-5 p-5">
              <h2 className="font-black text-pegasus-navy">Mensagem</h2>
              <div className="flex-1">
                <textarea
                  className="w-full resize-none rounded-2xl border border-blue-100 bg-white px-4 py-3 text-sm text-pegasus-navy placeholder-slate-400 outline-none transition focus:border-pegasus-primary focus:ring-2 focus:ring-pegasus-primary/20 disabled:opacity-50"
                  disabled={!isConnected || isSending}
                  onChange={(e) => setMessage(e.target.value)}
                  placeholder="Digite o comunicado aqui… Você pode usar *negrito*, _itálico_ e emojis 🎉"
                  rows={9}
                  value={message}
                />
                <p className="mt-1 text-right text-xs text-slate-400">{message.length} caracteres</p>
              </div>
              {lastResult ? (
                <div className={`flex items-center gap-2 rounded-2xl p-3 text-sm font-semibold ${lastResult.failed === 0 ? "bg-emerald-50 text-emerald-700" : "bg-rose-50 text-rose-700"}`}>
                  {lastResult.failed === 0 ? <CheckCircle2 size={16} /> : <AlertCircle size={16} />}
                  Enviado: {lastResult.sent} ✓&nbsp;&nbsp;Falhou: {lastResult.failed} ✗
                </div>
              ) : null}
              <div className="flex items-center justify-between gap-4">
                <p className="text-xs text-slate-400">
                  {isConnected
                    ? selected.size > 0 ? `Será enviado para ${selected.size} grupo${selected.size !== 1 ? "s" : ""}.` : "Selecione os grupos à esquerda."
                    : "WhatsApp desconectado."}
                </p>
                <Button disabled={!isConnected || isSending || !message.trim() || selected.size === 0} onClick={handleSend}>
                  {isSending ? <Loader2 className="animate-spin" size={16} /> : <Send size={16} />}
                  {isSending ? "Enviando…" : "Enviar comunicado"}
                </Button>
              </div>
            </section>
          </div>

          <section className="rounded-2xl border border-blue-100 bg-pegasus-surface p-5">
            <div className="flex items-center gap-2">
              <MessageCircle className="text-pegasus-primary" size={16} />
              <p className="text-sm font-bold text-pegasus-navy">Dicas de formatação</p>
            </div>
            <ul className="mt-2 space-y-1 text-sm text-slate-600">
              <li><span className="font-mono">*texto*</span> → <strong>negrito</strong></li>
              <li><span className="font-mono">_texto_</span> → <em>itálico</em></li>
              <li><span className="font-mono">~texto~</span> → <s>tachado</s></li>
              <li>Emojis funcionam normalmente 🎉🏐✅</li>
            </ul>
          </section>
        </>
      ) : null}

      {/* ── Templates Tab ──────────────────────────────────────────────────────── */}
      {activeTab === "templates" ? (
        <section className="panel overflow-hidden">
          <div className="flex items-center gap-3 border-b border-blue-100 p-6">
            <FileText className="text-pegasus-primary" size={22} />
            <div>
              <h2 className="text-xl font-bold text-pegasus-navy">Templates de mensagem</h2>
              <p className="text-sm text-slate-500">{templates.length} template(s) cadastrado(s).</p>
            </div>
          </div>
          {isLoadingTemplates ? (
            <div className="flex items-center gap-3 p-6 text-sm font-bold text-pegasus-primary">
              <Loader2 className="animate-spin" size={18} />Carregando templates
            </div>
          ) : templates.length === 0 ? (
            <div className="p-6">
              <EmptyState description="Crie templates para reutilizar mensagens frequentes." icon={FileText} title="Nenhum template" />
            </div>
          ) : (
            <div className="divide-y divide-blue-50">
              {templates.map((template) => (
                <div className="flex items-start justify-between gap-4 p-5" key={template.id}>
                  <div className="min-w-0 flex-1">
                    <p className="font-bold text-pegasus-navy">{template.title}</p>
                    <p className="mt-1 line-clamp-2 text-sm text-slate-500">{template.body}</p>
                  </div>
                  <div className="flex shrink-0 gap-2">
                    <Button className="h-8 px-3 text-xs" onClick={() => openEditTemplate(template)} variant="secondary">
                      <Pencil size={13} />Editar
                    </Button>
                    <Button className="h-8 px-3 text-xs" onClick={() => setDeleteTemplateTarget(template)} variant="danger">
                      <Trash2 size={13} />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>
      ) : null}

      {/* ── Agendados Tab ─────────────────────────────────────────────────────── */}
      {activeTab === "agendados" ? (
        <section className="panel overflow-hidden">
          <div className="flex items-center gap-3 border-b border-blue-100 p-6">
            <Clock className="text-pegasus-primary" size={22} />
            <div>
              <h2 className="text-xl font-bold text-pegasus-navy">Comunicados agendados</h2>
              <p className="text-sm text-slate-500">{scheduled.length} registro(s) encontrado(s).</p>
            </div>
          </div>
          {isLoadingScheduled ? (
            <div className="flex items-center gap-3 p-6 text-sm font-bold text-pegasus-primary">
              <Loader2 className="animate-spin" size={18} />Carregando agendamentos
            </div>
          ) : scheduled.length === 0 ? (
            <div className="p-6">
              <EmptyState description="Agende comunicados para envio automático." icon={Calendar} title="Nenhum agendamento" />
            </div>
          ) : (
            <div className="divide-y divide-blue-50">
              {scheduled.map((item) => (
                <div className="flex items-start justify-between gap-4 p-5" key={item.id}>
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <p className="font-bold text-pegasus-navy">{item.title}</p>
                      <StatusBadge label={scheduledStatusLabel(item.status)} tone={scheduledStatusTone(item.status)} />
                    </div>
                    <p className="mt-1 line-clamp-1 text-sm text-slate-500">{item.body}</p>
                    <p className="mt-1 text-xs text-slate-400">
                      {channelLabel(item.channel)} · {targetLabel(item.target)} · {formatDateTime(item.scheduledAt)}
                    </p>
                    {item.sentAt ? <p className="mt-0.5 text-xs text-emerald-600">Enviado em {formatDateTime(item.sentAt)}</p> : null}
                    {item.error ? <p className="mt-0.5 text-xs text-rose-600">Erro: {item.error}</p> : null}
                  </div>
                  {item.status === "pending" ? (
                    <Button className="h-8 shrink-0 px-3 text-xs" onClick={() => setCancelTarget(item)} variant="danger">
                      <XCircle size={13} />Cancelar
                    </Button>
                  ) : null}
                </div>
              ))}
            </div>
          )}
        </section>
      ) : null}

      {/* Template modal */}
      <Modal
        isOpen={templateModal}
        onClose={() => setTemplateModal(false)}
        title={editingTemplate ? "Editar template" : "Novo template"}
      >
        <form className="grid gap-4" onSubmit={handleTemplateSubmit}>
          <Input
            disabled={isSavingTemplate}
            label="Título"
            onChange={(e) => setTemplateForm({ ...templateForm, title: e.target.value })}
            required
            value={templateForm.title}
          />
          <Textarea
            disabled={isSavingTemplate}
            label="Mensagem"
            onChange={(e) => setTemplateForm({ ...templateForm, body: e.target.value })}
            rows={6}
            value={templateForm.body}
          />
          <div className="flex flex-col gap-3 sm:flex-row">
            <Button disabled={isSavingTemplate} type="submit">
              {isSavingTemplate ? <Loader2 className="animate-spin" size={17} /> : null}
              {editingTemplate ? "Salvar alterações" : "Criar template"}
            </Button>
            <Button disabled={isSavingTemplate} onClick={() => setTemplateModal(false)} variant="secondary">Cancelar</Button>
          </div>
        </form>
      </Modal>

      {/* Scheduled modal */}
      <Modal
        description="O comunicado será enviado automaticamente na data e hora indicadas."
        isOpen={scheduledModal}
        onClose={() => setScheduledModal(false)}
        title="Agendar comunicado"
      >
        <form className="grid gap-4" onSubmit={handleScheduledSubmit}>
          {templates.length > 0 ? (
            <Select
              label="Usar template (opcional)"
              onChange={(e) => {
                const t = templates.find((tp) => tp.id === e.target.value);
                if (t) setScheduledForm((prev) => ({ ...prev, title: t.title, body: t.body }));
                setScheduledTemplateId(e.target.value);
              }}
              options={[
                { label: "Selecione um template", value: "" },
                ...templates.map((t) => ({ label: t.title, value: t.id })),
              ]}
              value={scheduledTemplateId}
            />
          ) : null}
          <Input
            disabled={isSavingScheduled}
            label="Título"
            onChange={(e) => setScheduledForm({ ...scheduledForm, title: e.target.value })}
            required
            value={scheduledForm.title}
          />
          <Textarea
            disabled={isSavingScheduled}
            label="Mensagem"
            onChange={(e) => setScheduledForm({ ...scheduledForm, body: e.target.value })}
            rows={5}
            value={scheduledForm.body}
          />
          <div className="grid gap-4 sm:grid-cols-2">
            <Select
              disabled={isSavingScheduled}
              label="Destinatários"
              onChange={(e) => setScheduledForm({ ...scheduledForm, target: e.target.value as "all" | "active" })}
              options={[
                { label: "Somente ativos", value: "active" },
                { label: "Todos os atletas", value: "all" },
              ]}
              value={scheduledForm.target}
            />
            <Select
              disabled={isSavingScheduled}
              label="Canal"
              onChange={(e) => setScheduledForm({ ...scheduledForm, channel: e.target.value as "whatsapp" | "notification" | "both" })}
              options={[
                { label: "Ambos", value: "both" },
                { label: "WhatsApp", value: "whatsapp" },
                { label: "Notificação interna", value: "notification" },
              ]}
              value={scheduledForm.channel}
            />
          </div>
          <Input
            disabled={isSavingScheduled}
            label="Data e hora"
            onChange={(e) => setScheduledForm({ ...scheduledForm, scheduledAt: e.target.value })}
            required
            type="datetime-local"
            value={scheduledForm.scheduledAt}
          />
          <div className="flex flex-col gap-3 sm:flex-row">
            <Button disabled={isSavingScheduled} type="submit">
              {isSavingScheduled ? <Loader2 className="animate-spin" size={17} /> : <Bell size={17} />}
              Agendar comunicado
            </Button>
            <Button disabled={isSavingScheduled} onClick={() => setScheduledModal(false)} variant="secondary">Cancelar</Button>
          </div>
        </form>
      </Modal>

      {/* Confirm delete template */}
      <ConfirmDialog
        confirmLabel={isSavingTemplate ? "Excluindo..." : "Excluir template"}
        description={`Deseja excluir o template "${deleteTemplateTarget?.title ?? ""}"?`}
        isOpen={Boolean(deleteTemplateTarget)}
        onClose={() => setDeleteTemplateTarget(null)}
        onConfirm={confirmDeleteTemplate}
        title="Confirmar exclusão"
      />

      {/* Confirm cancel scheduled */}
      <ConfirmDialog
        confirmLabel={isSavingScheduled ? "Cancelando..." : "Confirmar cancelamento"}
        description={`Deseja cancelar o comunicado "${cancelTarget?.title ?? ""}"?`}
        isOpen={Boolean(cancelTarget)}
        onClose={() => setCancelTarget(null)}
        onConfirm={confirmCancel}
        title="Cancelar comunicado"
      />

      {/* ── Mural Tab ──────────────────────────────────────────────────────────── */}
      {activeTab === "mural" ? (
        <section className="panel overflow-hidden">
          <div className="flex items-center gap-3 border-b border-blue-100 p-6">
            <MessageSquare className="text-pegasus-primary" size={22} />
            <div>
              <h2 className="text-xl font-bold text-pegasus-navy">Mural de Avisos</h2>
              <p className="text-sm text-slate-500">{muralPosts.length} aviso(s) publicado(s).</p>
            </div>
          </div>
          {isLoadingMural ? (
            <div className="flex items-center gap-3 p-6 text-sm font-bold text-pegasus-primary">
              <Loader2 className="animate-spin" size={18} />Carregando avisos
            </div>
          ) : muralPosts.length === 0 ? (
            <div className="p-6">
              <p className="text-sm text-slate-400">Nenhum aviso publicado. Clique em "Publicar aviso" para criar.</p>
            </div>
          ) : (
            <div className="divide-y divide-blue-50">
              {muralPosts.map((post) => (
                <div className="flex items-start justify-between gap-4 p-5" key={post.id}>
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className={`rounded-full px-2.5 py-0.5 text-xs font-bold ${
                        post.category === "urgente" ? "bg-rose-100 text-rose-700" :
                        post.category === "evento" ? "bg-violet-100 text-violet-700" :
                        "bg-blue-100 text-blue-700"
                      }`}>
                        {post.category === "urgente" ? "Urgente" : post.category === "evento" ? "Evento" : "Informativo"}
                      </span>
                      <span className="text-xs text-slate-400">
                        {new Intl.DateTimeFormat("pt-BR", { day: "2-digit", month: "short", year: "numeric" }).format(new Date(post.createdAt))}
                      </span>
                    </div>
                    <p className="mt-1 font-bold text-pegasus-navy">{post.title}</p>
                    <p className="mt-1 line-clamp-2 text-sm text-slate-500">{post.body}</p>
                  </div>
                  {canManageMural && (
                    <Button
                      className="h-8 shrink-0 px-3 text-xs"
                      onClick={() => setDeleteMuralTarget(post)}
                      variant="danger"
                    >
                      <Trash2 size={13} />
                    </Button>
                  )}
                </div>
              ))}
            </div>
          )}
        </section>
      ) : null}

      {/* Mural modal */}
      <Modal isOpen={muralModal} onClose={() => setMuralModal(false)} title="Publicar aviso no mural">
        <form className="grid gap-4" onSubmit={async (e) => {
          e.preventDefault();
          setIsSavingMural(true);
          try {
            await muralService.create(muralForm);
            setMuralModal(false);
            await loadMural();
          } catch (err) {
            alert(getApiErrorMessage(err));
          } finally {
            setIsSavingMural(false);
          }
        }}>
          <Input
            disabled={isSavingMural}
            label="Título"
            onChange={(e) => setMuralForm({ ...muralForm, title: e.target.value })}
            required
            value={muralForm.title}
          />
          <Select
            disabled={isSavingMural}
            label="Categoria"
            onChange={(e) => setMuralForm({ ...muralForm, category: e.target.value })}
            options={[
              { label: "Informativo", value: "info" },
              { label: "Urgente", value: "urgente" },
              { label: "Evento", value: "evento" },
            ]}
            value={muralForm.category}
          />
          <Textarea
            disabled={isSavingMural}
            label="Corpo do aviso"
            onChange={(e) => setMuralForm({ ...muralForm, body: e.target.value })}
            rows={5}
            value={muralForm.body}
          />
          <div className="flex flex-col gap-3 sm:flex-row">
            <Button disabled={isSavingMural} type="submit">
              {isSavingMural ? <Loader2 className="animate-spin" size={17} /> : <Plus size={17} />}
              Publicar
            </Button>
            <Button disabled={isSavingMural} onClick={() => setMuralModal(false)} variant="secondary">Cancelar</Button>
          </div>
        </form>
      </Modal>

      {/* Confirm delete mural post */}
      <ConfirmDialog
        confirmLabel={isSavingMural ? "Removendo..." : "Remover aviso"}
        description={`Deseja remover o aviso "${deleteMuralTarget?.title ?? ""}"?`}
        isOpen={Boolean(deleteMuralTarget)}
        onClose={() => setDeleteMuralTarget(null)}
        onConfirm={async () => {
          if (!deleteMuralTarget) return;
          setIsSavingMural(true);
          try {
            await muralService.remove(deleteMuralTarget.id);
            setDeleteMuralTarget(null);
            await loadMural();
          } catch { /* silent */ }
          finally { setIsSavingMural(false); }
        }}
        title="Remover aviso"
      />
    </div>
  );
}
