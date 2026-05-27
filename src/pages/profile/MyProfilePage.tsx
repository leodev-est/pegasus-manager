import {
  CalendarDays,
  Camera,
  CreditCard,
  Loader2,
  Mail,
  Package,
  Phone,
  Save,
  Shield,
  TrendingUp,
  UserRound,
} from "lucide-react";
import { FormEvent, useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useTour } from "../../tours/useTour";
import { useLocation } from "react-router-dom";
import { useAuth } from "../../auth/AuthContext";
import { Button } from "../../components/ui/Button";
import { EmptyState } from "../../components/ui/EmptyState";
import { Input } from "../../components/ui/Input";
import { PageHeader } from "../../components/ui/PageHeader";
import { StatusBadge, type StatusTone } from "../../components/ui/StatusBadge";
import { Textarea } from "../../components/ui/Textarea";
import { useToast } from "../../components/ui/Toast";
import { OFFICIAL_TRAINING } from "../../data/trainingConfig";
import { getApiErrorMessage } from "../../services/api";
import { evaluationService, type CoachEvaluationPayload, type SelfEvaluationPayload } from "../../services/evaluationService";
import { googleCalendarService, type GoogleCalendarStatus } from "../../services/googleCalendarService";
import { profileService, type MyProfile } from "../../services/profileService";

function initials(name: string) {
  return name
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0])
    .join("")
    .toUpperCase();
}

function formatDate(value?: string | null) {
  if (!value) return "-";
  return new Intl.DateTimeFormat("pt-BR", { timeZone: "UTC" }).format(new Date(value));
}

function formatCurrency(value?: number | null) {
  if (value === null || value === undefined) return "-";
  return new Intl.NumberFormat("pt-BR", { currency: "BRL", style: "currency" }).format(value);
}

function statusTone(value?: string | null): StatusTone {
  if (["ativo", "pago", "presente"].includes(value ?? "")) return "success";
  if (["teste", "pendente", "justificada"].includes(value ?? "")) return "warning";
  if (["atrasado", "inativo", "falta"].includes(value ?? "")) return "danger";
  if (value === "isento") return "info";
  return "neutral";
}

function statusLabel(value?: string | null) {
  const labels: Record<string, string> = {
    ativo: "Ativo",
    atrasado: "Atrasado",
    falta: "Falta",
    inativo: "Inativo",
    isento: "Isento",
    pago: "Pago",
    pendente: "Pendente",
    teste: "Teste",
  };

  return value ? labels[value] ?? value : "-";
}

const TOUR_STEPS = [
  {
    popover: {
      title: "👤 Meu Perfil",
      description: "Sua página pessoal no Pegasus: informações de contato, estatísticas de frequência, autoavaliação e próximos treinos.",
    },
  },
  {
    element: "[data-tour='perfil-header']",
    popover: {
      title: "Dados do atleta",
      description: "Foto, categoria, posição e status de mensalidade. Clique na câmera para atualizar sua foto de perfil.",
      side: "bottom" as const,
    },
  },
  {
    element: "[data-tour='perfil-contato']",
    popover: {
      title: "Informações pessoais",
      description: "Atualize seu email, telefone e data de nascimento. Essas informações são usadas para notificações do WhatsApp.",
      side: "right" as const,
    },
  },
];

function overallTone(overall: number | null) {
  if (overall === null) return "from-slate-500 to-slate-700";
  if (overall >= 8) return "from-emerald-500 to-pegasus-primary";
  if (overall >= 5) return "from-amber-400 to-pegasus-primary";
  return "from-rose-500 to-pegasus-primary";
}

function RatingInput({
  label,
  onChange,
  value,
}: {
  label: string;
  onChange: (value: number | null) => void;
  value: number | null;
}) {
  return (
    <Input
      label={label}
      max="10"
      min="0"
      onChange={(event) => onChange(event.target.value === "" ? null : Number(event.target.value))}
      step="0.1"
      type="number"
      value={value ?? ""}
    />
  );
}

export function MyProfilePage() {
  const { hasPermission, user } = useAuth();
  const { showToast } = useToast();
  const location = useLocation();
  const canEditCoachEvaluation = hasPermission(["trainings:update"]);
  const [profile, setProfile] = useState<MyProfile | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSavingProfile, setIsSavingProfile] = useState(false);

  useTour("meu-perfil:v1", isLoading ? [] : TOUR_STEPS);
  const [isSavingSelf, setIsSavingSelf] = useState(false);
  const [isSavingCoach, setIsSavingCoach] = useState(false);
  const [isUploadingAvatar, setIsUploadingAvatar] = useState(false);
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null);
  const avatarInputRef = useRef<HTMLInputElement>(null);
  const [contactForm, setContactForm] = useState({ email: "", phone: "", birthDate: "" });
  const [calendarStatus, setCalendarStatus] = useState<GoogleCalendarStatus | null>(null);
  const [isConnectingCalendar, setIsConnectingCalendar] = useState(false);
  const [selfForm, setSelfForm] = useState<SelfEvaluationPayload>({
    improvements: "",
    selfRating: null,
    strengths: "",
  });
  const [coachForm, setCoachForm] = useState<CoachEvaluationPayload>({
    coachNotes: "",
    mental: null,
    physical: null,
    tactical: null,
    technical: null,
  });

  const loadProfile = useCallback(async () => {
    setIsLoading(true);

    try {
      const data = await profileService.getMyProfile();
      setProfile(data);
      setAvatarUrl(data.user.avatarUrl ?? null);
      setContactForm({
        email: data.athlete?.email ?? data.user.email ?? "",
        phone: data.athlete?.phone ?? "",
        birthDate: data.athlete?.birthDate ? new Date(data.athlete.birthDate).toISOString().slice(0, 10) : "",
      });
      setSelfForm({
        improvements: data.evaluation.improvements ?? "",
        selfRating: data.evaluation.selfRating,
        strengths: data.evaluation.strengths ?? "",
      });
      setCoachForm({
        coachNotes: data.evaluation.coachNotes ?? "",
        mental: data.evaluation.mental,
        physical: data.evaluation.physical,
        tactical: data.evaluation.tactical,
        technical: data.evaluation.technical,
      });
    } catch (error) {
      showToast(getApiErrorMessage(error), "error");
    } finally {
      setIsLoading(false);
    }
  }, [showToast]);

  useEffect(() => {
    loadProfile();
    googleCalendarService.getUserStatus().then(setCalendarStatus).catch(() => {});
  }, [loadProfile]);

  useEffect(() => {
    const params = new URLSearchParams(location.search);
    const calResult = params.get("calendar");
    if (calResult === "success") {
      showToast("Google Calendar conectado com sucesso!", "success");
      googleCalendarService.getUserStatus().then(setCalendarStatus).catch(() => {});
    } else if (calResult === "error") {
      showToast("Erro ao conectar Google Calendar. Tente novamente.", "error");
    }
  }, [location.search, showToast]);

  // Refresh profile whenever the user comes back to this tab/page
  useEffect(() => {
    function handleVisibilityChange() {
      if (!document.hidden) loadProfile();
    }
    document.addEventListener("visibilitychange", handleVisibilityChange);
    return () => document.removeEventListener("visibilitychange", handleVisibilityChange);
  }, [loadProfile]);

  async function handleConnectCalendar() {
    setIsConnectingCalendar(true);
    try {
      const url = await googleCalendarService.getAuthUrl();
      window.location.href = url;
    } catch (error) {
      showToast(getApiErrorMessage(error), "error");
      setIsConnectingCalendar(false);
    }
  }

  async function handleDisconnectCalendar() {
    setIsConnectingCalendar(true);
    try {
      await googleCalendarService.disconnect();
      setCalendarStatus((prev) => prev ? { ...prev, connected: false, calendarId: null } : null);
      showToast("Google Calendar desconectado.", "success");
    } catch (error) {
      showToast(getApiErrorMessage(error), "error");
    } finally {
      setIsConnectingCalendar(false);
    }
  }

  const currentPayment = useMemo(() => {
    if (!profile?.payments.length) return null;
    return [...profile.payments].sort((a, b) =>
      String(b.dueDate ?? b.createdAt).localeCompare(String(a.dueDate ?? a.createdAt)),
    )[0];
  }, [profile]);

  async function handleAvatarChange(event: React.ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    if (!file) return;
    setIsUploadingAvatar(true);
    try {
      const result = await profileService.uploadAvatar(file);
      setAvatarUrl(result.avatarUrl);
      showToast("Foto atualizada.", "success");
    } catch (error) {
      showToast(getApiErrorMessage(error), "error");
    } finally {
      setIsUploadingAvatar(false);
    }
  }

  async function saveProfile(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setIsSavingProfile(true);

    try {
      const data = await profileService.updateMyProfile({
        email: contactForm.email || null,
        phone: contactForm.phone || null,
        birthDate: contactForm.birthDate || null,
      });
      setProfile(data);
      showToast("Perfil atualizado.", "success");
    } catch (error) {
      showToast(getApiErrorMessage(error), "error");
    } finally {
      setIsSavingProfile(false);
    }
  }

  async function saveSelfEvaluation(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setIsSavingSelf(true);

    try {
      const evaluation = await evaluationService.updateSelfEvaluation(selfForm);
      setProfile((current) => (current ? { ...current, evaluation } : current));
      showToast("Autoavaliação salva.", "success");
    } catch (error) {
      showToast(getApiErrorMessage(error), "error");
    } finally {
      setIsSavingSelf(false);
    }
  }

  async function saveCoachEvaluation(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!profile?.athlete) return;
    setIsSavingCoach(true);

    try {
      const evaluation = await evaluationService.updateCoachEvaluation(profile.athlete.id, coachForm);
      setProfile((current) => (current ? { ...current, evaluation } : current));
      showToast("Avaliação técnica salva.", "success");
    } catch (error) {
      showToast(getApiErrorMessage(error), "error");
    } finally {
      setIsSavingCoach(false);
    }
  }

  if (isLoading) {
    return (
      <section className="panel flex items-center gap-3 p-6 text-sm font-bold text-pegasus-primary">
        <Loader2 className="animate-spin" size={18} />
        Carregando perfil
      </section>
    );
  }

  if (!profile) {
    return <EmptyState description="Não foi possível carregar seus dados." icon={UserRound} title="Perfil indisponível" />;
  }

  const athlete = profile.athlete;
  const evaluation = profile.evaluation;
  const overall = evaluation.overall;
  const profileName = athlete?.name ?? profile.user.name ?? user?.name ?? "Pegasus";

  return (
    <div className="space-y-8">
      <PageHeader title="Meu Perfil" description="Dados pessoais, frequência, mensalidade e evolução esportiva." />

      <section data-tour="perfil-header" className="panel overflow-hidden">
        <div className="bg-pegasus-navy p-6 text-white sm:p-8">
          <div className="flex flex-col gap-5 sm:flex-row sm:items-center">
            <div className="relative h-20 w-20 shrink-0">
              {avatarUrl ? (
                <img src={avatarUrl} alt={profileName} className="h-20 w-20 rounded-3xl object-cover" />
              ) : (
                <div className="grid h-20 w-20 place-items-center rounded-3xl bg-white text-2xl font-black text-pegasus-primary">
                  {initials(profileName)}
                </div>
              )}
              <button
                type="button"
                onClick={() => avatarInputRef.current?.click()}
                disabled={isUploadingAvatar}
                className="absolute -bottom-1 -right-1 flex h-7 w-7 items-center justify-center rounded-full bg-pegasus-primary text-white shadow-md hover:bg-blue-700"
              >
                {isUploadingAvatar ? <Loader2 size={12} className="animate-spin" /> : <Camera size={12} />}
              </button>
              <input ref={avatarInputRef} type="file" accept="image/*" className="hidden" onChange={handleAvatarChange} />
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-xs font-black uppercase tracking-[0.16em] text-blue-100">@{profile.user.username}</p>
              <h1 className="mt-1 text-3xl font-black">{profileName}</h1>
              <div className="mt-3 flex flex-wrap gap-2">
                <StatusBadge label={statusLabel(athlete?.status)} tone={statusTone(athlete?.status)} />
                <span className="rounded-full bg-white/10 px-3 py-1 text-xs font-bold text-white ring-1 ring-white/20">
                  {athlete?.category ?? "Sem categoria"}
                </span>
                <span className="rounded-full bg-white/10 px-3 py-1 text-xs font-bold text-white ring-1 ring-white/20">
                  {athlete?.position ?? "Sem posição"}
                </span>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-5">
        {[
          { icon: TrendingUp, label: "Frequência total", value: `${profile.totalFrequency?.percentage ?? 0}%` },
          { icon: CalendarDays, label: "Presenças totais", value: profile.totalFrequency?.presences ?? 0 },
          { icon: CalendarDays, label: "Faltas totais", value: profile.totalFrequency?.absences ?? 0 },
          { icon: CreditCard, label: "Mensalidade", value: athlete?.monthlyPaymentStatus ? statusLabel(athlete.monthlyPaymentStatus) : statusLabel(currentPayment?.status) },
          { icon: CalendarDays, label: "Próximo treino", value: profile.upcomingTrainings[0] ? formatDate(profile.upcomingTrainings[0].date) : "-" },
        ].map((card) => {
          const Icon = card.icon;
          return (
            <article className="panel p-5" key={card.label}>
              <div className="flex items-center justify-between gap-3">
                <div>
                  <p className="text-sm font-semibold text-slate-500">{card.label}</p>
                  <p className="mt-2 text-2xl font-black text-pegasus-navy">{card.value}</p>
                </div>
                <span className="grid h-12 w-12 place-items-center rounded-2xl bg-pegasus-ice text-pegasus-primary">
                  <Icon size={22} />
                </span>
              </div>
            </article>
          );
        })}
      </section>

      <section className="grid gap-6 xl:grid-cols-[0.9fr_1.1fr]">
        <article data-tour="perfil-contato" className="panel p-6">
          <div className="mb-5 flex items-center gap-3">
            <UserRound className="text-pegasus-primary" size={22} />
            <h2 className="text-xl font-black text-pegasus-navy">Informações pessoais</h2>
          </div>
          <form className="grid gap-4" onSubmit={saveProfile}>
            <Input
              label="Email"
              onChange={(event) => setContactForm({ ...contactForm, email: event.target.value })}
              type="email"
              value={contactForm.email}
            />
            <Input
              label="Telefone"
              onChange={(event) => setContactForm({ ...contactForm, phone: event.target.value })}
              value={contactForm.phone}
            />
            <Input
              label="Data de nascimento"
              type="date"
              onChange={(event) => setContactForm({ ...contactForm, birthDate: event.target.value })}
              value={contactForm.birthDate}
            />
            <Button disabled={isSavingProfile} type="submit">
              {isSavingProfile ? <Loader2 className="animate-spin" size={17} /> : <Save size={17} />}
              Salvar contato
            </Button>
          </form>
        </article>

        <article className="panel p-6">
          <h2 className="text-xl font-black text-pegasus-navy">Meus treinos</h2>
          <div className="mt-4 space-y-3">
            {profile.upcomingTrainings.length ? (
              profile.upcomingTrainings.map((training) => (
                <div className="rounded-2xl border border-blue-100 bg-white p-4" key={training.id}>
                  <p className="font-black text-pegasus-navy">{training.title}</p>
                  <p className="mt-1 text-sm text-slate-500">{formatDate(training.date)} · {OFFICIAL_TRAINING.location} · {OFFICIAL_TRAINING.time}</p>
                  <p className="mt-2 text-sm text-slate-600">{training.objective ?? "Treino oficial Pegasus."}</p>
                </div>
              ))
            ) : (
              <EmptyState description="Nenhum treino futuro cadastrado." icon={CalendarDays} title="Sem próximos treinos" />
            )}
          </div>
        </article>
      </section>

      <section className="grid gap-6 xl:grid-cols-[0.9fr_1.1fr]">
        <article className="panel p-6">
          <div className="mb-5 flex items-center gap-3">
            <CreditCard className="text-pegasus-primary" size={22} />
            <h2 className="text-xl font-black text-pegasus-navy">Minha situação financeira</h2>
          </div>
          {athlete?.monthlyPaymentStatus === "isento" ? (
            <div className="rounded-2xl bg-blue-50 p-4">
              <StatusBadge label="Isento" tone="info" />
              <p className="mt-3 text-sm font-semibold text-pegasus-navy">Atleta com mensalidade isenta.</p>
            </div>
          ) : currentPayment ? (
            <div className="rounded-2xl border border-blue-100 bg-white p-4">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="font-black text-pegasus-navy">{currentPayment.description}</p>
                  <p className="text-sm text-slate-500">Vencimento: {formatDate(currentPayment.dueDate)}</p>
                </div>
                <StatusBadge label={statusLabel(currentPayment.status)} tone={statusTone(currentPayment.status)} />
              </div>
              <p className="mt-4 text-2xl font-black text-pegasus-navy">{formatCurrency(currentPayment.amount)}</p>
            </div>
          ) : (
            <EmptyState description="Nenhuma mensalidade registrada para este atleta." icon={CreditCard} title="Sem mensalidade" />
          )}
        </article>

        <article className={`overflow-hidden rounded-3xl bg-gradient-to-br ${overallTone(overall)} p-6 text-white shadow-xl`}>
          <p className="text-xs font-black uppercase tracking-[0.18em] text-white/75">Minha evolução</p>
          <div className="mt-5 flex items-end gap-5">
            <div>
              <p className="text-6xl font-black leading-none">{overall ?? "--"}</p>
              <p className="mt-2 text-sm font-black uppercase tracking-[0.14em] text-white/80">Overall</p>
            </div>
            <div className="pb-2 text-sm font-semibold text-white/80">
              {overall === null ? "Ainda sem avaliação técnica" : "Avaliação estilo FIFA"}
            </div>
          </div>
          <div className="mt-6 grid grid-cols-2 gap-3">
            {[
              ["Técnica", evaluation.technical],
              ["Físico", evaluation.physical],
              ["Tático", evaluation.tactical],
              ["Mental", evaluation.mental],
            ].map(([label, value]) => (
              <div className="rounded-2xl bg-white/12 p-3 ring-1 ring-white/15" key={label}>
                <p className="text-xs font-bold uppercase tracking-[0.12em] text-white/70">{label}</p>
                <p className="mt-1 text-2xl font-black">{value ?? "--"}</p>
              </div>
            ))}
          </div>
        </article>
      </section>

      <section className="grid gap-6 xl:grid-cols-2">
        <article className="panel p-6">
          <h2 className="text-xl font-black text-pegasus-navy">Autoavaliação</h2>
          <form className="mt-5 grid gap-4" onSubmit={saveSelfEvaluation}>
            <RatingInput
              label="Nota atual"
              onChange={(value) => setSelfForm({ ...selfForm, selfRating: value })}
              value={selfForm.selfRating ?? null}
            />
            <Textarea
              label="Pontos fortes"
              onChange={(event) => setSelfForm({ ...selfForm, strengths: event.target.value })}
              value={selfForm.strengths ?? ""}
            />
            <Textarea
              label="O que preciso treinar mais"
              onChange={(event) => setSelfForm({ ...selfForm, improvements: event.target.value })}
              value={selfForm.improvements ?? ""}
            />
            <Button disabled={isSavingSelf} type="submit">
              {isSavingSelf ? <Loader2 className="animate-spin" size={17} /> : <Save size={17} />}
              Salvar autoavaliação
            </Button>
          </form>
        </article>

        <article className="panel p-6">
          <div className="mb-5 flex items-center gap-3">
            <Shield className="text-pegasus-primary" size={22} />
            <h2 className="text-xl font-black text-pegasus-navy">Avaliação do técnico</h2>
          </div>
          {canEditCoachEvaluation && athlete ? (
            <form className="grid gap-4" onSubmit={saveCoachEvaluation}>
              <div className="grid gap-4 sm:grid-cols-2">
                <RatingInput label="Técnica" onChange={(value) => setCoachForm({ ...coachForm, technical: value })} value={coachForm.technical ?? null} />
                <RatingInput label="Físico" onChange={(value) => setCoachForm({ ...coachForm, physical: value })} value={coachForm.physical ?? null} />
                <RatingInput label="Tático" onChange={(value) => setCoachForm({ ...coachForm, tactical: value })} value={coachForm.tactical ?? null} />
                <RatingInput label="Mental" onChange={(value) => setCoachForm({ ...coachForm, mental: value })} value={coachForm.mental ?? null} />
              </div>
              <Textarea
                label="Observações do técnico"
                onChange={(event) => setCoachForm({ ...coachForm, coachNotes: event.target.value })}
                value={coachForm.coachNotes ?? ""}
              />
              <Button disabled={isSavingCoach} type="submit">
                {isSavingCoach ? <Loader2 className="animate-spin" size={17} /> : <Save size={17} />}
                Salvar avaliação técnica
              </Button>
            </form>
          ) : (
            <div className="space-y-3">
              {[
                ["Técnica", evaluation.technical],
                ["Físico", evaluation.physical],
                ["Tático", evaluation.tactical],
                ["Mental", evaluation.mental],
              ].map(([label, value]) => (
                <div className="flex items-center justify-between rounded-2xl bg-pegasus-surface p-4" key={label}>
                  <span className="font-bold text-pegasus-navy">{label}</span>
                  <strong className="text-pegasus-primary">{value ?? "--"}</strong>
                </div>
              ))}
              <div className="rounded-2xl border border-blue-100 bg-white p-4">
                <p className="font-bold text-pegasus-navy">Observações</p>
                <p className="mt-2 whitespace-pre-wrap text-sm text-slate-600">{evaluation.coachNotes || "Ainda sem observações."}</p>
              </div>
            </div>
          )}
        </article>
      </section>

      {/* 3-month attendance chart */}
      {profile.monthlyAttendance && profile.monthlyAttendance.length > 0 && (
        <section className="panel p-6">
          <h2 className="mb-4 text-xl font-black text-pegasus-navy">Frequência — últimos 3 meses</h2>
          <div className="flex flex-wrap gap-2">
            {profile.monthlyAttendance.map((entry) => {
              const d = new Date(entry.training.date);
              const label = d.toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit", timeZone: "UTC" });
              const color =
                entry.status === "presente"
                  ? "bg-green-500"
                  : entry.status === "justificada"
                    ? "bg-yellow-400"
                    : "bg-red-400";
              return (
                <div key={entry.id} title={`${label} — ${entry.status}`} className={`h-8 w-8 rounded-lg ${color} flex items-center justify-center text-xs font-bold text-white`}>
                  {d.getDate()}
                </div>
              );
            })}
          </div>
          <div className="mt-3 flex gap-4 text-xs text-slate-500">
            <span className="flex items-center gap-1"><span className="h-3 w-3 rounded bg-green-500" />Presente</span>
            <span className="flex items-center gap-1"><span className="h-3 w-3 rounded bg-yellow-400" />Justificada</span>
            <span className="flex items-center gap-1"><span className="h-3 w-3 rounded bg-red-400" />Falta</span>
          </div>
        </section>
      )}

      {/* Uniforms received */}
      {athlete?.uniformDeliveries && athlete.uniformDeliveries.length > 0 && (
        <section className="panel p-6">
          <div className="mb-4 flex items-center gap-3">
            <Package className="text-pegasus-primary" size={20} />
            <h2 className="text-xl font-black text-pegasus-navy">Uniformes recebidos</h2>
          </div>
          <div className="space-y-2">
            {athlete.uniformDeliveries.map((d) => (
              <div key={d.id} className="flex items-center justify-between rounded-xl bg-pegasus-surface p-3">
                <span className="font-medium text-pegasus-navy">{d.uniformItem.name}</span>
                <span className="text-sm text-slate-500">
                  {d.quantity} un. · {new Date(d.deliveredAt).toLocaleDateString("pt-BR")}
                </span>
              </div>
            ))}
          </div>
        </section>
      )}

      <section className="grid gap-6 xl:grid-cols-2">
        <article className="panel p-6">
          <div className="mb-4 flex items-center gap-3">
            <Mail className="text-pegasus-primary" size={20} />
            <h2 className="text-xl font-black text-pegasus-navy">Contato</h2>
          </div>
          <p className="text-sm text-slate-600">Email: {contactForm.email || "-"}</p>
          <p className="mt-2 text-sm text-slate-600">Telefone: {contactForm.phone || "-"}</p>
        </article>
        <article className="panel p-6">
          <div className="mb-4 flex items-center gap-3">
            <Phone className="text-pegasus-primary" size={20} />
            <h2 className="text-xl font-black text-pegasus-navy">Acesso</h2>
          </div>
          <p className="text-sm text-slate-600">Usuário: @{profile.user.username}</p>
          <p className="mt-2 text-sm text-slate-600">Perfis: {profile.user.roles.join(", ") || "-"}</p>
        </article>
      </section>

      {calendarStatus && (
        <section className="panel p-6">
          <div className="mb-4 flex items-center gap-3">
            <CalendarDays className="text-pegasus-primary" size={20} />
            <h2 className="text-xl font-black text-pegasus-navy">Google Calendar</h2>
          </div>
          {!calendarStatus.configured ? (
            <p className="text-sm text-slate-500">Google Calendar não está configurado no servidor.</p>
          ) : calendarStatus.connected ? (
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <p className="text-sm font-semibold text-emerald-700">Conectado</p>
                {calendarStatus.calendarId && (
                  <p className="mt-0.5 text-xs text-slate-500">{calendarStatus.calendarId}</p>
                )}
                <p className="mt-1 text-xs text-slate-400">Os treinos futuros serão adicionados automaticamente ao seu calendário.</p>
              </div>
              <Button
                variant="outline"
                onClick={handleDisconnectCalendar}
                disabled={isConnectingCalendar}
              >
                {isConnectingCalendar ? <Loader2 size={14} className="animate-spin" /> : null}
                Desconectar
              </Button>
            </div>
          ) : (
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <p className="text-sm text-slate-600">Conecte sua conta Google para sincronizar treinos automaticamente.</p>
              </div>
              <Button onClick={handleConnectCalendar} disabled={isConnectingCalendar}>
                {isConnectingCalendar ? <Loader2 size={14} className="animate-spin" /> : null}
                Conectar Google Calendar
              </Button>
            </div>
          )}
        </section>
      )}
    </div>
  );
}
