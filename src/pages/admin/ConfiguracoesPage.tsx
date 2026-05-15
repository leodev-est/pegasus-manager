import { Bell, Calendar, DollarSign, Link, Loader2, Settings, Shield, Users } from "lucide-react";
import { FormEvent, useEffect, useState } from "react";
import { useLocation } from "react-router-dom";
import { Button } from "../../components/ui/Button";
import { Input } from "../../components/ui/Input";
import { PageHeader } from "../../components/ui/PageHeader";
import { useToast } from "../../components/ui/Toast";
import { getApiErrorMessage } from "../../services/api";
import { googleCalendarService, type GoogleCalendarStatus } from "../../services/googleCalendarService";
import { settingsService, type TrainingConfig } from "../../services/settingsService";

const defaultConfig: TrainingConfig = {
  trainingTime: "17:30 às 19:00",
  trainingLocation: "Jerusalém",
  trainingDependency: "Quadra - CREC",
  trainingDaysOfWeek: ["saturday"],
  trainingDuration: 90,
  defaultTrainingCategory: "geral",
  monthlyFeeAmount: 0,
  overduePaymentDays: 10,
  maxAbsencesPercentage: 25,
  minAttendanceToEvaluate: 3,
  notifyOnApproval: true,
  notifyOnOverdue: true,
  notifyOnTraining: false,
  systemName: "Pegasus Manager",
  timezone: "America/Sao_Paulo",
  blockedDates: [],
  emailEnabled: false,
  emailFallbackEnabled: false,
  emailHost: null,
  emailPort: null,
  emailSecure: true,
  emailUser: null,
  emailPassword: null,
  emailFrom: null,
  emailFromName: "Pegasus Manager",
};

type Tab = "treinos" | "mensalidades" | "notificacoes" | "frequencia" | "sistema" | "canais";

const tabs: { id: Tab; label: string; icon: typeof Settings }[] = [
  { id: "treinos", label: "Treinos", icon: Calendar },
  { id: "mensalidades", label: "Mensalidades", icon: DollarSign },
  { id: "notificacoes", label: "Notificações", icon: Bell },
  { id: "frequencia", label: "Frequência", icon: Users },
  { id: "canais", label: "Canais", icon: Link },
  { id: "sistema", label: "Sistema", icon: Shield },
];

const daysOptions = [
  { value: "monday", label: "Segunda" },
  { value: "tuesday", label: "Terça" },
  { value: "wednesday", label: "Quarta" },
  { value: "thursday", label: "Quinta" },
  { value: "friday", label: "Sexta" },
  { value: "saturday", label: "Sábado" },
  { value: "sunday", label: "Domingo" },
];

function ToggleRow({ label, description, checked, onChange }: { label: string; description?: string; checked: boolean; onChange: (v: boolean) => void }) {
  return (
    <div className="flex items-start justify-between gap-4 py-3">
      <div>
        <p className="font-medium text-slate-800">{label}</p>
        {description && <p className="text-xs text-slate-500">{description}</p>}
      </div>
      <button
        type="button"
        onClick={() => onChange(!checked)}
        className={`relative h-6 w-11 shrink-0 rounded-full transition-colors ${checked ? "bg-pegasus-primary" : "bg-slate-200"}`}
      >
        <span className={`absolute top-0.5 h-5 w-5 rounded-full bg-white shadow transition-transform ${checked ? "translate-x-5" : "translate-x-0.5"}`} />
      </button>
    </div>
  );
}

export function ConfiguracoesPage() {
  const { showToast } = useToast();
  const location = useLocation();
  const [activeTab, setActiveTab] = useState<Tab>("treinos");
  const [form, setForm] = useState<TrainingConfig>(defaultConfig);
  const [emailPassword, setEmailPassword] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [teamCalendar, setTeamCalendar] = useState<GoogleCalendarStatus | null>(null);
  const [isConnectingCalendar, setIsConnectingCalendar] = useState(false);

  useEffect(() => {
    settingsService
      .getTrainingConfig()
      .then((config) => setForm({ ...defaultConfig, ...config }))
      .catch(() => {})
      .finally(() => setIsLoading(false));

    googleCalendarService.getTeamStatus().then(setTeamCalendar).catch(() => {});
  }, []);

  useEffect(() => {
    const params = new URLSearchParams(location.search);
    const calResult = params.get("calendar");
    if (calResult === "success") {
      showToast("Calendário da equipe conectado!", "success");
      googleCalendarService.getTeamStatus().then(setTeamCalendar).catch(() => {});
    } else if (calResult === "error") {
      showToast("Erro ao conectar calendário. Tente novamente.", "error");
    }
  }, [location.search, showToast]);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setIsSaving(true);
    try {
      const payload: Parameters<typeof settingsService.updateTrainingConfig>[0] = { ...form };
      if (emailPassword) payload.emailPassword = emailPassword;
      const updated = await settingsService.updateTrainingConfig(payload);
      setForm({ ...defaultConfig, ...updated });
      setEmailPassword("");
      showToast("Configurações salvas com sucesso.", "success");
    } catch (error) {
      showToast(getApiErrorMessage(error), "error");
    } finally {
      setIsSaving(false);
    }
  }

  function toggleDay(day: string) {
    const days = form.trainingDaysOfWeek ?? [];
    setForm({
      ...form,
      trainingDaysOfWeek: days.includes(day) ? days.filter((d) => d !== day) : [...days, day],
    });
  }

  async function handleConnectTeamCalendar() {
    setIsConnectingCalendar(true);
    try {
      const url = await googleCalendarService.getTeamAuthUrl();
      window.location.href = url;
    } catch (error) {
      showToast(getApiErrorMessage(error), "error");
      setIsConnectingCalendar(false);
    }
  }

  async function handleDisconnectTeamCalendar() {
    setIsConnectingCalendar(true);
    try {
      await googleCalendarService.disconnectTeam();
      setTeamCalendar((prev) => prev ? { ...prev, connected: false, calendarId: null } : null);
      showToast("Calendário da equipe desconectado.", "success");
    } catch (error) {
      showToast(getApiErrorMessage(error), "error");
    } finally {
      setIsConnectingCalendar(false);
    }
  }

  return (
    <div className="space-y-8">
      <PageHeader
        title="Configurações"
        description="Parâmetros gerais do sistema Pegasus."
      />

      <div className="flex gap-1 border-b border-slate-200 overflow-x-auto">
        {tabs.map((t) => (
          <button
            key={t.id}
            type="button"
            onClick={() => setActiveTab(t.id)}
            className={`flex items-center gap-1.5 whitespace-nowrap px-4 py-2 text-sm font-medium transition-colors ${activeTab === t.id ? "border-b-2 border-pegasus-primary text-pegasus-primary" : "text-slate-500 hover:text-slate-700"}`}
          >
            <t.icon size={14} />
            {t.label}
          </button>
        ))}
      </div>

      {isLoading ? (
        <p className="text-sm text-slate-500">Carregando configurações...</p>
      ) : (
        <form onSubmit={handleSubmit} className="space-y-6">
          {/* TREINOS */}
          {activeTab === "treinos" && (
            <section className="panel p-6 space-y-5">
              <h2 className="font-bold text-pegasus-navy">Parâmetros de Treino</h2>
              <div className="grid gap-5 md:grid-cols-2">
                <Input label="Horário" value={form.trainingTime} onChange={(e) => setForm({ ...form, trainingTime: e.target.value })} disabled={isSaving} placeholder="Ex: 17:30 às 19:00" />
                <Input label="Local" value={form.trainingLocation} onChange={(e) => setForm({ ...form, trainingLocation: e.target.value })} disabled={isSaving} placeholder="Ex: Jerusalém" />
                <Input label="Dependência" value={form.trainingDependency} onChange={(e) => setForm({ ...form, trainingDependency: e.target.value })} disabled={isSaving} placeholder="Ex: Quadra - CREC" />
                <Input label="Duração (min)" type="number" min="30" value={form.trainingDuration} onChange={(e) => setForm({ ...form, trainingDuration: Number(e.target.value) })} disabled={isSaving} />
                <Input label="Categoria padrão" value={form.defaultTrainingCategory} onChange={(e) => setForm({ ...form, defaultTrainingCategory: e.target.value })} disabled={isSaving} />
              </div>
              <div>
                <p className="mb-2 text-sm font-medium text-slate-700">Dias de treino</p>
                <div className="flex flex-wrap gap-2">
                  {daysOptions.map((d) => (
                    <button
                      key={d.value}
                      type="button"
                      onClick={() => toggleDay(d.value)}
                      className={`rounded-full px-3 py-1 text-sm transition-colors ${(form.trainingDaysOfWeek ?? []).includes(d.value) ? "bg-pegasus-primary text-white" : "bg-slate-100 text-slate-600 hover:bg-slate-200"}`}
                    >
                      {d.label}
                    </button>
                  ))}
                </div>
              </div>
            </section>
          )}

          {/* MENSALIDADES */}
          {activeTab === "mensalidades" && (
            <div className="space-y-6">
              <section className="panel p-6 space-y-5">
                <h2 className="font-bold text-pegasus-navy">Mensalidades</h2>
                <div className="grid gap-5 md:grid-cols-2">
                  <Input label="Valor da mensalidade (R$)" type="number" min="0" step="0.01" value={form.monthlyFeeAmount} onChange={(e) => setForm({ ...form, monthlyFeeAmount: Number(e.target.value) })} disabled={isSaving} />
                  <Input label="Dias de carência (atraso)" type="number" min="0" value={form.overduePaymentDays} onChange={(e) => setForm({ ...form, overduePaymentDays: Number(e.target.value) })} disabled={isSaving} />
                </div>
              </section>
            </div>
          )}

          {/* NOTIFICAÇÕES */}
          {activeTab === "notificacoes" && (
            <section className="panel p-6">
              <h2 className="mb-4 font-bold text-pegasus-navy">Notificações</h2>
              <div className="divide-y divide-slate-100">
                <ToggleRow label="Notificar ao aprovar atleta" description="Envia notificação ao atleta e à equipe ao mudar status de teste para ativo." checked={form.notifyOnApproval} onChange={(v) => setForm({ ...form, notifyOnApproval: v })} />
                <ToggleRow label="Notificar mensalidade em atraso" description="Notifica RH/Financeiro quando mensalidades ficam atrasadas." checked={form.notifyOnOverdue} onChange={(v) => setForm({ ...form, notifyOnOverdue: v })} />
                <ToggleRow label="Lembrete de treino" description="Notifica atletas no dia do treino." checked={form.notifyOnTraining} onChange={(v) => setForm({ ...form, notifyOnTraining: v })} />
              </div>
            </section>
          )}

          {/* FREQUÊNCIA */}
          {activeTab === "frequencia" && (
            <section className="panel p-6 space-y-5">
              <h2 className="font-bold text-pegasus-navy">Frequência</h2>
              <div className="grid gap-5 md:grid-cols-2">
                <Input label="Percentual máximo de faltas (%)" type="number" min="0" max="100" value={form.maxAbsencesPercentage} onChange={(e) => setForm({ ...form, maxAbsencesPercentage: Number(e.target.value) })} disabled={isSaving} />
                <Input label="Mínimo de treinos para avaliação" type="number" min="1" value={form.minAttendanceToEvaluate} onChange={(e) => setForm({ ...form, minAttendanceToEvaluate: Number(e.target.value) })} disabled={isSaving} />
              </div>
            </section>
          )}

          {/* CANAIS DE COMUNICAÇÃO */}
          {activeTab === "canais" && (
            <div className="space-y-6">
              <section className="panel p-6">
                <h2 className="mb-4 font-bold text-pegasus-navy">Canais de Comunicação</h2>
                <div className="divide-y divide-slate-100">
                  <ToggleRow label="Email habilitado" description="Ativa o envio de emails pelo sistema." checked={form.emailEnabled} onChange={(v) => setForm({ ...form, emailEnabled: v })} />
                  <ToggleRow label="Fallback para email" description="Quando WhatsApp falhar, tenta enviar por email automaticamente." checked={form.emailFallbackEnabled} onChange={(v) => setForm({ ...form, emailFallbackEnabled: v })} />
                </div>
              </section>
              <section className="panel p-6 space-y-5">
                <h2 className="font-bold text-pegasus-navy">Configuração SMTP</h2>
                <div className="grid gap-5 md:grid-cols-2">
                  <Input label="Servidor SMTP" value={form.emailHost ?? ""} onChange={(e) => setForm({ ...form, emailHost: e.target.value || null })} disabled={isSaving} placeholder="smtp.gmail.com" />
                  <Input label="Porta" type="number" value={form.emailPort ?? ""} onChange={(e) => setForm({ ...form, emailPort: e.target.value ? Number(e.target.value) : null })} disabled={isSaving} placeholder="587" />
                  <Input label="Usuário/Login" value={form.emailUser ?? ""} onChange={(e) => setForm({ ...form, emailUser: e.target.value || null })} disabled={isSaving} placeholder="usuario@gmail.com" />
                  <Input label="Senha" type="password" value={emailPassword} onChange={(e) => setEmailPassword(e.target.value)} disabled={isSaving} placeholder={form.emailUser ? "Deixe em branco para manter" : "Senha ou App Password"} />
                  <Input label="Remetente (from)" value={form.emailFrom ?? ""} onChange={(e) => setForm({ ...form, emailFrom: e.target.value || null })} disabled={isSaving} placeholder="noreply@seudominio.com" />
                  <Input label="Nome do remetente" value={form.emailFromName} onChange={(e) => setForm({ ...form, emailFromName: e.target.value })} disabled={isSaving} placeholder="Pegasus Manager" />
                </div>
                <div>
                  <ToggleRow label="Conexão segura (TLS)" description="Usa TLS na conexão SMTP (porta 465)." checked={form.emailSecure} onChange={(v) => setForm({ ...form, emailSecure: v })} />
                </div>
              </section>
            </div>
          )}

          {/* SISTEMA */}
          {activeTab === "sistema" && (
            <div className="space-y-6">
              <section className="panel p-6 space-y-5">
                <h2 className="font-bold text-pegasus-navy">Sistema</h2>
                <div className="grid gap-5 md:grid-cols-2">
                  <Input label="Nome do sistema" value={form.systemName} onChange={(e) => setForm({ ...form, systemName: e.target.value })} disabled={isSaving} />
                  <Input label="Fuso horário" value={form.timezone} onChange={(e) => setForm({ ...form, timezone: e.target.value })} disabled={isSaving} placeholder="Ex: America/Sao_Paulo" />
                </div>
              </section>

              <section className="panel p-6">
                <h2 className="mb-4 font-bold text-pegasus-navy">Google Calendar — Equipe</h2>
                <p className="mb-4 text-xs text-slate-500">Sincroniza treinos e datas bloqueadas com o calendário oficial da equipe.</p>
                {!teamCalendar ? (
                  <p className="text-sm text-slate-400">Verificando status...</p>
                ) : !teamCalendar.configured ? (
                  <p className="text-sm text-slate-500">Google Calendar não está configurado no servidor. Defina GOOGLE_CLIENT_ID e GOOGLE_CLIENT_SECRET.</p>
                ) : teamCalendar.connected ? (
                  <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                    <div>
                      <p className="text-sm font-semibold text-emerald-700">Calendário conectado</p>
                      {teamCalendar.calendarId && (
                        <p className="mt-0.5 text-xs text-slate-500">{teamCalendar.calendarId}</p>
                      )}
                    </div>
                    <Button type="button" variant="outline" onClick={handleDisconnectTeamCalendar} disabled={isConnectingCalendar}>
                      {isConnectingCalendar ? <Loader2 size={14} className="animate-spin" /> : null}
                      Desconectar
                    </Button>
                  </div>
                ) : (
                  <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                    <p className="text-sm text-slate-600">Nenhum calendário conectado. Clique para autorizar.</p>
                    <Button type="button" onClick={handleConnectTeamCalendar} disabled={isConnectingCalendar}>
                      {isConnectingCalendar ? <Loader2 size={14} className="animate-spin" /> : null}
                      Conectar Calendário da Equipe
                    </Button>
                  </div>
                )}
              </section>
            </div>
          )}

          <div>
            <Button type="submit" disabled={isSaving}>
              {isSaving ? "Salvando..." : "Salvar configurações"}
            </Button>
          </div>
        </form>
      )}
    </div>
  );
}
