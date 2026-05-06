import { Loader2, MessageCircle, PhoneOff, RefreshCw, Wifi, WifiOff } from "lucide-react";
import { useCallback, useEffect, useRef, useState } from "react";
import { Button } from "../../components/ui/Button";
import { PageHeader } from "../../components/ui/PageHeader";
import { StatusBadge } from "../../components/ui/StatusBadge";
import { whatsappService, type WhatsAppState } from "../../services/whatsappService";

const STATUS_LABEL: Record<string, string> = {
  connected: "Conectado",
  connecting: "Aguardando QR",
  disconnected: "Desconectado",
};

const STATUS_TONE: Record<string, "success" | "warning" | "danger"> = {
  connected: "success",
  connecting: "warning",
  disconnected: "danger",
};

const FEATURES = [
  { emoji: "🏐", title: "Lembrete de treino", description: "Enviado às 07:00 do dia anterior para todos os atletas ativos com telefone cadastrado." },
  { emoji: "💳", title: "Alerta de mensalidade", description: "Enviado às 07:00 quando a mensalidade vence hoje ou em 3 dias (status pendente ou atrasado)." },
  { emoji: "❌", title: "Treino cancelado", description: "Enviado imediatamente para todos os atletas ativos ao bloquear uma data no Calendário." },
  { emoji: "🎉", title: "Atleta aprovado", description: "Enviado ao atleta quando seu status muda de Teste para Ativo." },
  { emoji: "📊", title: "Avaliação atualizada", description: "Enviado ao atleta quando o técnico salva uma avaliação técnica." },
];

export function WhatsAppPage() {
  const [state, setState] = useState<WhatsAppState>({ status: "disconnected", qrDataUrl: null });
  const [isLoading, setIsLoading] = useState(true);
  const [isActing, setIsActing] = useState(false);
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const load = useCallback(async () => {
    try {
      setState(await whatsappService.getStatus());
    } catch {
      // silent
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  // Poll every 3s while connecting (waiting for QR scan)
  useEffect(() => {
    if (state.status === "connecting") {
      pollRef.current = setInterval(load, 3_000);
    } else {
      if (pollRef.current) clearInterval(pollRef.current);
    }
    return () => { if (pollRef.current) clearInterval(pollRef.current); };
  }, [state.status, load]);

  async function handleConnect() {
    setIsActing(true);
    try {
      setState(await whatsappService.connect());
    } catch {
      // silent
    } finally {
      setIsActing(false);
    }
  }

  async function handleDisconnect() {
    setIsActing(true);
    try {
      await whatsappService.disconnect();
      setState({ status: "disconnected", qrDataUrl: null });
    } catch {
      // silent
    } finally {
      setIsActing(false);
    }
  }

  return (
    <div className="space-y-8">
      <PageHeader
        title="WhatsApp"
        description="Conecte o número de WhatsApp do Pegasus para enviar notificações automáticas aos atletas."
      />

      <section className="panel p-6">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <div className="grid h-14 w-14 place-items-center rounded-2xl bg-pegasus-ice text-pegasus-primary">
              <MessageCircle size={26} />
            </div>
            <div>
              <p className="text-lg font-black text-pegasus-navy">Status da conexão</p>
              {isLoading ? (
                <Loader2 className="mt-1 animate-spin text-pegasus-primary" size={16} />
              ) : (
                <div className="mt-1 flex items-center gap-2">
                  <StatusBadge
                    label={STATUS_LABEL[state.status] ?? state.status}
                    tone={STATUS_TONE[state.status] ?? "neutral"}
                  />
                  {state.status === "connecting" && (
                    <span className="text-xs text-slate-500">Escaneie o QR code abaixo</span>
                  )}
                </div>
              )}
            </div>
          </div>

          <div className="flex gap-2">
            <Button onClick={load} variant="secondary" disabled={isLoading}>
              <RefreshCw size={16} className={isLoading ? "animate-spin" : ""} />
              Atualizar
            </Button>
            {state.status === "connected" ? (
              <Button onClick={handleDisconnect} variant="danger" disabled={isActing}>
                {isActing ? <Loader2 size={16} className="animate-spin" /> : <PhoneOff size={16} />}
                Desconectar
              </Button>
            ) : (
              <Button onClick={handleConnect} disabled={isActing || state.status === "connecting"}>
                {isActing ? <Loader2 size={16} className="animate-spin" /> : <Wifi size={16} />}
                {state.status === "connecting" ? "Aguardando QR…" : "Conectar"}
              </Button>
            )}
          </div>
        </div>

        {state.status === "connecting" && state.qrDataUrl && (
          <div className="mt-6 flex flex-col items-center gap-4 rounded-2xl border border-blue-100 bg-pegasus-surface p-6">
            <p className="text-sm font-bold text-pegasus-navy">
              Abra o WhatsApp no celular → Dispositivos conectados → Conectar dispositivo
            </p>
            <img
              alt="QR Code WhatsApp"
              className="h-56 w-56 rounded-xl border border-blue-100 bg-white p-2 shadow-sm"
              src={state.qrDataUrl}
            />
            <p className="text-xs text-slate-500">O QR code expira em 60 segundos. Se expirar, clique em "Conectar" novamente.</p>
          </div>
        )}

        {state.status === "connected" && (
          <div className="mt-4 flex items-center gap-2 rounded-2xl bg-emerald-50 p-4">
            <Wifi className="shrink-0 text-emerald-600" size={18} />
            <p className="text-sm font-semibold text-emerald-700">
              WhatsApp conectado. As notificações automáticas estão ativas.
            </p>
          </div>
        )}

        {state.status === "disconnected" && !isLoading && (
          <div className="mt-4 flex items-center gap-2 rounded-2xl bg-slate-50 p-4">
            <WifiOff className="shrink-0 text-slate-400" size={18} />
            <p className="text-sm text-slate-500">
              WhatsApp desconectado. Clique em "Conectar" e escaneie o QR code para ativar as notificações.
            </p>
          </div>
        )}
      </section>

      <section className="panel p-6">
        <h2 className="text-lg font-black text-pegasus-navy">Notificações automáticas</h2>
        <p className="mt-1 text-sm text-slate-500">
          Disparadas automaticamente quando conectado. Requerem telefone cadastrado no perfil do atleta.
        </p>
        <div className="mt-5 grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {FEATURES.map((f) => (
            <div className="rounded-2xl border border-blue-100 bg-white p-4" key={f.title}>
              <p className="text-2xl">{f.emoji}</p>
              <p className="mt-2 font-black text-pegasus-navy">{f.title}</p>
              <p className="mt-1 text-sm leading-5 text-slate-600">{f.description}</p>
            </div>
          ))}
        </div>
      </section>

      <section className="rounded-2xl border border-amber-200 bg-amber-50 p-5">
        <p className="text-sm font-bold text-amber-800">Importante</p>
        <ul className="mt-2 list-inside list-disc space-y-1 text-sm text-amber-700">
          <li>Use um número secundário dedicado ao Pegasus — não o seu número pessoal.</li>
          <li>A sessão fica salva no servidor. Após um novo deploy, será necessário escanear novamente.</li>
          <li>Os atletas precisam ter telefone cadastrado no sistema para receber mensagens.</li>
        </ul>
      </section>
    </div>
  );
}
