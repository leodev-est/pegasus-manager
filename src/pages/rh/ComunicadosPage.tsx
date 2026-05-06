import {
  AlertCircle,
  CheckCircle2,
  ExternalLink,
  Loader2,
  MessageCircle,
  RefreshCw,
  Send,
  Users,
  WifiOff,
} from "lucide-react";
import { useCallback, useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { Button } from "../../components/ui/Button";
import { PageHeader } from "../../components/ui/PageHeader";
import { useToast } from "../../components/ui/Toast";
import { whatsappService, type WhatsAppGroup } from "../../services/whatsappService";

export function ComunicadosPage() {
  const { showToast } = useToast();
  const [status, setStatus] = useState<"disconnected" | "connecting" | "connected">("disconnected");
  const [groups, setGroups] = useState<WhatsAppGroup[]>([]);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [message, setMessage] = useState("");
  const [isLoadingGroups, setIsLoadingGroups] = useState(true);
  const [isSending, setIsSending] = useState(false);
  const [lastResult, setLastResult] = useState<{ sent: number; failed: number } | null>(null);

  const loadGroups = useCallback(async () => {
    setIsLoadingGroups(true);
    setLastResult(null);
    try {
      const res = await whatsappService.getGroups();
      setStatus(res.status);
      // Sort alphabetically
      setGroups(res.groups.sort((a, b) => a.name.localeCompare(b.name, "pt-BR")));
    } catch {
      // silent — keep previous state
    } finally {
      setIsLoadingGroups(false);
    }
  }, []);

  useEffect(() => {
    loadGroups();
  }, [loadGroups]);

  function toggleGroup(id: string) {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  function toggleAll() {
    if (selected.size === groups.length) {
      setSelected(new Set());
    } else {
      setSelected(new Set(groups.map((g) => g.id)));
    }
  }

  async function handleSend() {
    if (!message.trim()) {
      showToast("Digite uma mensagem antes de enviar.", "error");
      return;
    }
    if (selected.size === 0) {
      showToast("Selecione pelo menos um grupo.", "error");
      return;
    }
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
        showToast(
          `Enviado: ${result.sent} ✓  Falhou: ${result.failed} ✗`,
          result.sent > 0 ? "success" : "error",
        );
      }
    } catch (err: any) {
      showToast(err?.response?.data?.error ?? err?.message ?? "Erro ao enviar comunicado.", "error");
    } finally {
      setIsSending(false);
    }
  }

  const isConnected = status === "connected";
  const charCount = message.length;

  return (
    <div className="space-y-8">
      <PageHeader
        title="Comunicados"
        description="Envie comunicados para grupos de WhatsApp do Pegasus."
      />

      {/* Connection status banner */}
      {!isLoadingGroups && !isConnected && (
        <div className="flex items-start gap-3 rounded-2xl border border-amber-200 bg-amber-50 p-4">
          <WifiOff className="mt-0.5 shrink-0 text-amber-600" size={18} />
          <div className="flex-1">
            <p className="text-sm font-bold text-amber-800">WhatsApp desconectado</p>
            <p className="mt-0.5 text-sm text-amber-700">
              Para enviar comunicados, conecte o WhatsApp na{" "}
              <Link
                to="/app/admin/whatsapp"
                className="inline-flex items-center gap-1 font-semibold underline underline-offset-2"
              >
                página de administração
                <ExternalLink size={12} />
              </Link>
              .
            </p>
          </div>
        </div>
      )}

      <div className="grid gap-6 lg:grid-cols-[1fr_2fr]">
        {/* Left: group list */}
        <section className="panel p-5">
          <div className="flex items-center justify-between gap-2">
            <h2 className="font-black text-pegasus-navy">Grupos</h2>
            <Button variant="secondary" onClick={loadGroups} disabled={isLoadingGroups} className="h-8 px-2 text-xs">
              <RefreshCw size={13} className={isLoadingGroups ? "animate-spin" : ""} />
              Atualizar
            </Button>
          </div>

          {isLoadingGroups ? (
            <div className="mt-6 flex justify-center">
              <Loader2 className="animate-spin text-pegasus-primary" size={22} />
            </div>
          ) : !isConnected ? (
            <p className="mt-4 text-sm text-slate-400">Conecte o WhatsApp para ver os grupos.</p>
          ) : groups.length === 0 ? (
            <p className="mt-4 text-sm text-slate-400">Nenhum grupo encontrado.</p>
          ) : (
            <>
              <button
                onClick={toggleAll}
                className="mt-4 text-xs font-semibold text-pegasus-primary hover:underline"
              >
                {selected.size === groups.length ? "Desselecionar todos" : "Selecionar todos"}
              </button>
              <ul className="mt-2 space-y-1">
                {groups.map((g) => (
                  <li key={g.id}>
                    <label className="flex cursor-pointer items-center gap-3 rounded-xl px-3 py-2.5 hover:bg-pegasus-surface">
                      <input
                        type="checkbox"
                        checked={selected.has(g.id)}
                        onChange={() => toggleGroup(g.id)}
                        className="h-4 w-4 rounded accent-pegasus-primary"
                      />
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-sm font-semibold text-pegasus-navy">{g.name}</p>
                        <p className="flex items-center gap-1 text-xs text-slate-400">
                          <Users size={10} />
                          {g.participants} participante{g.participants !== 1 ? "s" : ""}
                        </p>
                      </div>
                    </label>
                  </li>
                ))}
              </ul>
              {selected.size > 0 && (
                <p className="mt-3 text-xs font-semibold text-pegasus-primary">
                  {selected.size} grupo{selected.size !== 1 ? "s" : ""} selecionado{selected.size !== 1 ? "s" : ""}
                </p>
              )}
            </>
          )}
        </section>

        {/* Right: compose */}
        <section className="panel flex flex-col gap-5 p-5">
          <h2 className="font-black text-pegasus-navy">Mensagem</h2>

          <div className="flex-1">
            <textarea
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              placeholder="Digite o comunicado aqui… Você pode usar *negrito*, _itálico_ e emojis 🎉"
              disabled={!isConnected || isSending}
              rows={9}
              className="w-full resize-none rounded-2xl border border-blue-100 bg-white px-4 py-3 text-sm text-pegasus-navy placeholder-slate-400 outline-none transition focus:border-pegasus-primary focus:ring-2 focus:ring-pegasus-primary/20 disabled:opacity-50"
            />
            <p className="mt-1 text-right text-xs text-slate-400">{charCount} caracteres</p>
          </div>

          {/* Result banner */}
          {lastResult && (
            <div
              className={`flex items-center gap-2 rounded-2xl p-3 text-sm font-semibold ${
                lastResult.failed === 0
                  ? "bg-emerald-50 text-emerald-700"
                  : "bg-rose-50 text-rose-700"
              }`}
            >
              {lastResult.failed === 0 ? (
                <CheckCircle2 size={16} />
              ) : (
                <AlertCircle size={16} />
              )}
              Enviado: {lastResult.sent} ✓&nbsp;&nbsp;Falhou: {lastResult.failed} ✗
            </div>
          )}

          <div className="flex items-center justify-between gap-4">
            <p className="text-xs text-slate-400">
              {isConnected
                ? selected.size > 0
                  ? `Será enviado para ${selected.size} grupo${selected.size !== 1 ? "s" : ""}.`
                  : "Selecione os grupos à esquerda."
                : "WhatsApp desconectado."}
            </p>
            <Button
              onClick={handleSend}
              disabled={!isConnected || isSending || !message.trim() || selected.size === 0}
            >
              {isSending ? <Loader2 size={16} className="animate-spin" /> : <Send size={16} />}
              {isSending ? "Enviando…" : "Enviar comunicado"}
            </Button>
          </div>
        </section>
      </div>

      {/* Tips */}
      <section className="rounded-2xl border border-blue-100 bg-pegasus-surface p-5">
        <div className="flex items-center gap-2">
          <MessageCircle size={16} className="text-pegasus-primary" />
          <p className="text-sm font-bold text-pegasus-navy">Dicas de formatação</p>
        </div>
        <ul className="mt-2 space-y-1 text-sm text-slate-600">
          <li><span className="font-mono">*texto*</span> → <strong>negrito</strong></li>
          <li><span className="font-mono">_texto_</span> → <em>itálico</em></li>
          <li><span className="font-mono">~texto~</span> → <s>tachado</s></li>
          <li>Emojis funcionam normalmente 🎉🏐✅</li>
        </ul>
        <p className="mt-3 text-xs text-slate-400">
          Os grupos listados são todos os grupos em que o número conectado participa, incluindo grupos da comunidade Pegasus.
          Se o número for administrador do grupo de anúncios da comunidade, poderá enviar mensagens diretamente para ele.
        </p>
      </section>
    </div>
  );
}
