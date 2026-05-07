import { AlertCircle, Hash, Loader2, MessageCircle, Phone, PhoneOff, RefreshCw, Wifi, WifiOff } from "lucide-react";
import { useCallback, useEffect, useRef, useState } from "react";
import { Button } from "../../components/ui/Button";
import { Input } from "../../components/ui/Input";
import { PageHeader } from "../../components/ui/PageHeader";
import { StatusBadge } from "../../components/ui/StatusBadge";
import { useToast } from "../../components/ui/Toast";
import { whatsappService, type WhatsAppState } from "../../services/whatsappService";

const STATUS_LABEL: Record<string, string> = {
  connected: "Conectado",
  connecting: "Conectando",
  disconnected: "Desconectado",
};

const STATUS_TONE: Record<string, "success" | "warning" | "danger"> = {
  connected: "success",
  connecting: "warning",
  disconnected: "danger",
};

const FEATURES = [
  { emoji: "🏐", title: "Lembrete de treino", description: "Enviado às 07:00 do dia anterior para todos os atletas ativos com telefone cadastrado." },
  { emoji: "💳", title: "Alerta de mensalidade", description: "Enviado às 07:00 quando a mensalidade vence hoje ou em 3 dias." },
  { emoji: "❌", title: "Treino cancelado", description: "Enviado imediatamente ao bloquear uma data no Calendário." },
  { emoji: "🎉", title: "Atleta aprovado", description: "Enviado ao atleta quando seu status muda de Teste para Ativo." },
  { emoji: "📊", title: "Avaliação atualizada", description: "Enviado ao atleta quando o técnico salva uma avaliação técnica." },
];

const EMPTY: WhatsAppState = { status: "disconnected", qrDataUrl: null, lastError: null };

export function WhatsAppPage() {
  const { showToast } = useToast();
  const [state, setState] = useState<WhatsAppState>(EMPTY);
  const [isLoading, setIsLoading] = useState(true);
  const [isActing, setIsActing] = useState(false);
  // Pairing code flow
  const [phone, setPhone] = useState("");
  const [pairingCode, setPairingCode] = useState<string | null>(null);
  const [isPairing, setIsPairing] = useState(false);
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const load = useCallback(async () => {
    try {
      const next = await whatsappService.getStatus();
      setState(next);
      if (next.status === "connected") setPairingCode(null);
    } catch {
      // silent — keep previous state
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  // Poll every 3s while connecting
  useEffect(() => {
    if (pollRef.current) clearInterval(pollRef.current);
    if (state.status === "connecting") {
      pollRef.current = setInterval(load, 3_000);
    }
    return () => { if (pollRef.current) clearInterval(pollRef.current); };
  }, [state.status, load]);

  async function handleConnect() {
    setIsActing(true);
    setPairingCode(null);
    try {
      await whatsappService.connect();
      await load();
    } catch (err: any) {
      showToast(err?.message ?? "Erro ao conectar", "error");
    } finally {
      setIsActing(false);
    }
  }

  async function handleDisconnect() {
    setIsActing(true);
    setPairingCode(null);
    try {
      await whatsappService.disconnect();
      setState(EMPTY);
      showToast("WhatsApp desconectado.", "success");
    } catch {
      // silent
    } finally {
      setIsActing(false);
    }
  }

  async function handlePairingCode() {
    if (!phone.trim()) { showToast("Digite o número de telefone.", "error"); return; }
    setIsPairing(true);
    try {
      const code = await whatsappService.getPairingCode(phone.trim());
      setPairingCode(code);
    } catch (err: any) {
      showToast(err?.message ?? "Erro ao gerar código.", "error");
    } finally {
      setIsPairing(false);
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
                <div className="mt-1 flex flex-wrap items-center gap-2">
                  <StatusBadge
                    label={STATUS_LABEL[state.status] ?? state.status}
                    tone={STATUS_TONE[state.status] ?? "neutral"}
                  />
                </div>
              )}
            </div>
          </div>

          <div className="flex gap-2">
            <Button onClick={load} variant="secondary" disabled={isLoading || isActing}>
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
                {state.status === "connecting" ? "Conectando…" : "Conectar"}
              </Button>
            )}
          </div>
        </div>

        {/* Error banner */}
        {state.lastError && state.status === "disconnected" && (
          <div className="mt-4 flex items-start gap-3 rounded-2xl border border-rose-200 bg-rose-50 p-4">
            <AlertCircle className="mt-0.5 shrink-0 text-rose-600" size={18} />
            <div>
              <p className="text-sm font-bold text-rose-700">Falha ao conectar</p>
              <p className="mt-1 font-mono text-xs text-rose-600">{state.lastError}</p>
            </div>
          </div>
        )}

        {/* QR code (if available) */}
        {state.status === "connecting" && state.qrDataUrl && (
          <div className="mt-6 flex flex-col items-center gap-4 rounded-2xl border border-blue-100 bg-pegasus-surface p-6">
            <p className="text-sm font-bold text-pegasus-navy">
              Abra o WhatsApp → Dispositivos conectados → Conectar dispositivo → Escaneie o QR
            </p>
            <img
              alt="QR Code WhatsApp"
              className="h-56 w-56 rounded-xl border border-blue-100 bg-white p-2 shadow-sm"
              src={state.qrDataUrl}
            />
          </div>
        )}

        {/* Pairing code flow (primary method when QR not available) */}
        {state.status === "connecting" && !state.qrDataUrl && (
          <div className="mt-5 space-y-4 rounded-2xl border border-blue-100 bg-pegasus-surface p-5">
            <div>
              <p className="font-bold text-pegasus-navy">Vincular com código de telefone</p>
              <p className="mt-1 text-sm text-slate-500">
                Digite o número do WhatsApp que será vinculado ao Pegasus e clique em Gerar código.
              </p>
            </div>

            <div className="flex flex-col gap-3 sm:flex-row sm:items-end">
              <div className="flex-1">
                <Input
                  label="Número do WhatsApp (com DDD)"
                  placeholder="Ex: 11999999999"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  disabled={isPairing}
                />
              </div>
              <Button onClick={handlePairingCode} disabled={isPairing || !phone.trim()}>
                {isPairing ? <Loader2 size={16} className="animate-spin" /> : <Phone size={16} />}
                Gerar código
              </Button>
            </div>

            {pairingCode && (
              <div className="rounded-2xl border border-emerald-200 bg-emerald-50 p-5">
                <div className="flex items-center gap-2">
                  <Hash size={18} className="shrink-0 text-emerald-600" />
                  <p className="font-bold text-emerald-800">Código de pareamento</p>
                </div>
                <p className="mt-3 text-center font-mono text-4xl font-black tracking-[0.3em] text-emerald-700">
                  {pairingCode}
                </p>
                <ol className="mt-4 list-inside list-decimal space-y-1 text-sm text-emerald-700">
                  <li>Abra o WhatsApp no celular com o número <strong>{phone}</strong></li>
                  <li>Toque em <strong>Aparelhos conectados</strong></li>
                  <li>Toque em <strong>Conectar com número de telefone</strong></li>
                  <li>Digite o código acima</li>
                </ol>
                <p className="mt-3 text-xs text-emerald-600">O código expira em ~60 segundos. Se expirar, clique em Gerar código novamente.</p>
              </div>
            )}

            {!pairingCode && (
              <div className="flex items-center gap-2 text-sm text-slate-500">
                <Loader2 size={14} className="animate-spin" />
                Aguardando vinculação…
              </div>
            )}
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

        {state.status === "disconnected" && !state.lastError && !isLoading && (
          <div className="mt-4 flex items-center gap-2 rounded-2xl bg-slate-50 p-4">
            <WifiOff className="shrink-0 text-slate-400" size={18} />
            <p className="text-sm text-slate-500">
              WhatsApp desconectado. Clique em "Conectar" e use o código de pareamento para ativar.
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
          <li>A sessão fica salva no servidor. Após um novo deploy, será necessário conectar novamente.</li>
          <li>Os atletas precisam ter telefone cadastrado no sistema para receber mensagens.</li>
        </ul>
      </section>
    </div>
  );
}
