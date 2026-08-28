import {
  CalendarDays,
  Camera,
  CreditCard,
  Loader2,
  Package,
  Save,
  Shield,
  UserRound,
} from "lucide-react";
import { FormEvent, useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useTour } from "../../tours/useTour";
import { useAuth } from "../../auth/AuthContext";
import { Button } from "../../components/ui/Button";
import { EmptyState } from "../../components/ui/EmptyState";
import { Input } from "../../components/ui/Input";
import { StatusBadge, type StatusTone } from "../../components/ui/StatusBadge";
import { Textarea } from "../../components/ui/Textarea";
import { useToast } from "../../components/ui/Toast";
import { OFFICIAL_TRAINING } from "../../data/trainingConfig";
import { getApiErrorMessage } from "../../services/api";
import { evaluationService, type CoachEvaluationPayload } from "../../services/evaluationService";
import { profileService, type MyProfile } from "../../services/profileService";
import { ORG_NAME } from "../../config/org";

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
      description: `Sua página pessoal no ${ORG_NAME}: informações de contato, estatísticas de frequência, avaliação e próximos treinos.`,
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
  const canEditCoachEvaluation = hasPermission(["trainings:update"]);
  const [profile, setProfile] = useState<MyProfile | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSavingProfile, setIsSavingProfile] = useState(false);

  useTour("meu-perfil:v1", isLoading ? [] : TOUR_STEPS);
  const [isSavingCoach, setIsSavingCoach] = useState(false);
  const [isUploadingAvatar, setIsUploadingAvatar] = useState(false);
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null);
  const avatarInputRef = useRef<HTMLInputElement>(null);
  const [contactForm, setContactForm] = useState({ email: "", phone: "", birthDate: "" });
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
  }, [loadProfile]);

  // Refresh profile whenever the user comes back to this tab/page
  useEffect(() => {
    function handleVisibilityChange() {
      if (!document.hidden) loadProfile();
    }
    document.addEventListener("visibilitychange", handleVisibilityChange);
    return () => document.removeEventListener("visibilitychange", handleVisibilityChange);
  }, [loadProfile]);

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
  const profileName = athlete?.name ?? profile.user.name ?? user?.name ?? ORG_NAME;

  const headerStats = [
    { label: "Presenças", value: profile.totalFrequency?.presences ?? 0 },
    { label: "Faltas", value: profile.totalFrequency?.absences ?? 0 },
    { label: "Mensalidade", value: athlete?.monthlyPaymentStatus ? statusLabel(athlete.monthlyPaymentStatus) : statusLabel(currentPayment?.status) },
    { label: "Próximo treino", value: profile.upcomingTrainings[0] ? formatDate(profile.upcomingTrainings[0].date) : "-" },
    { label: "Frequência", value: `${profile.totalFrequency?.percentage ?? 0}%`, highlight: true },
  ];

  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-black text-pegasus-navy">Meu Perfil</h1>

      <section data-tour="perfil-header">
        <div className="inline-flex items-center gap-4 rounded-t-2xl border border-b-0 border-stone-200 bg-white px-7 py-5 dark:border-slate-700 dark:bg-slate-800">
          <div className="relative h-16 w-16 shrink-0">
            {avatarUrl ? (
              <img
                src={avatarUrl}
                alt={profileName}
                className="h-16 w-16 rounded-xl object-cover ring-2 ring-emerald-50"
              />
            ) : (
              <div className="grid h-16 w-16 place-items-center rounded-xl bg-stone-100 text-xl font-black text-pegasus-navy ring-2 ring-emerald-50">
                {initials(profileName)}
              </div>
            )}
            <button
              type="button"
              onClick={() => avatarInputRef.current?.click()}
              disabled={isUploadingAvatar}
              className="focus-ring absolute -bottom-1 -right-1 flex h-6 w-6 items-center justify-center rounded-full bg-stone-900 text-white"
            >
              {isUploadingAvatar ? <Loader2 size={12} className="animate-spin" /> : <Camera size={12} />}
            </button>
            <input ref={avatarInputRef} type="file" accept="image/*" className="hidden" onChange={handleAvatarChange} />
          </div>
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2">
              <h2 className="text-xl font-black text-pegasus-navy">{profileName}</h2>
              <StatusBadge label={statusLabel(athlete?.status)} tone={statusTone(athlete?.status)} />
            </div>
            <p className="mt-1 truncate text-sm font-semibold text-stone-400">
              @{profile.user.username} · {athlete?.category ?? "Sem categoria"} · {athlete?.position ?? "Sem posição"}
            </p>
          </div>
        </div>
        <div className="panel grid grid-cols-5 divide-x divide-stone-100 rounded-tl-none dark:divide-slate-700">
          {headerStats.map((stat) => (
            <div key={stat.label} className="px-5 py-3">
              <p className="text-[10px] font-bold uppercase tracking-wide text-stone-400">{stat.label}</p>
              <p className={`mt-0.5 text-lg font-black tabular-nums ${stat.highlight ? "text-emerald-600" : "text-pegasus-navy"}`}>
                {stat.value}
              </p>
            </div>
          ))}
        </div>
      </section>

      <section className="grid gap-4 xl:grid-cols-[0.9fr_1.1fr]">
        <article data-tour="perfil-contato" className="panel p-4">
          <div className="mb-3 flex items-center gap-2">
            <UserRound className="text-pegasus-primary" size={18} />
            <h2 className="text-base font-black text-pegasus-navy">Informações pessoais</h2>
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

        <article className="panel p-4">
          <h2 className="text-base font-black text-pegasus-navy">Meus treinos</h2>
          <div className="mt-4 space-y-3">
            {profile.upcomingTrainings.length ? (
              profile.upcomingTrainings.map((training) => (
                <div className="rounded-2xl border border-stone-200 bg-white p-4" key={training.id}>
                  <p className="font-black text-pegasus-navy">{training.title}</p>
                  <p className="mt-1 text-sm text-slate-500">{formatDate(training.date)} · {OFFICIAL_TRAINING.location} · {OFFICIAL_TRAINING.time}</p>
                  <p className="mt-2 text-sm text-slate-600">{training.objective ?? `Treino oficial ${ORG_NAME}.`}</p>
                </div>
              ))
            ) : (
              <EmptyState description="Nenhum treino futuro cadastrado." icon={CalendarDays} title="Sem próximos treinos" />
            )}
          </div>
        </article>
      </section>

      <section className="grid gap-4 xl:grid-cols-[0.9fr_1.1fr]">
        <article className="panel p-4">
          <div className="mb-3 flex items-center gap-2">
            <CreditCard className="text-pegasus-primary" size={18} />
            <h2 className="text-base font-black text-pegasus-navy">Minha situação financeira</h2>
          </div>
          {athlete?.monthlyPaymentStatus === "isento" ? (
            <div className="rounded-2xl bg-stone-100 p-4">
              <StatusBadge label="Isento" tone="info" />
              <p className="mt-3 text-sm font-semibold text-pegasus-navy">Atleta com mensalidade isenta.</p>
            </div>
          ) : currentPayment ? (
            <div className="rounded-2xl border border-stone-200 bg-white p-4">
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

        <article className="overflow-hidden rounded-3xl shadow-xl">
          <div className={`bg-gradient-to-br ${overallTone(overall)} p-4 text-white`}>
            <p className="text-xs font-black uppercase tracking-[0.18em] text-white/75">Minha evolução</p>
            <div className="mt-2 flex items-end gap-4">
              <div>
                <p className="text-4xl font-black leading-none">{overall ?? "--"}</p>
                <p className="mt-1 text-[10px] font-black uppercase tracking-[0.14em] text-white/80">Overall</p>
              </div>
              <div className="pb-1 text-xs font-semibold text-white/80">
                {overall === null ? "Ainda sem avaliação técnica" : "Avaliação estilo FIFA"}
              </div>
            </div>
            <div className="mt-3 grid grid-cols-4 gap-2">
              {[
                ["Técnica", evaluation.technical],
                ["Físico", evaluation.physical],
                ["Tático", evaluation.tactical],
                ["Mental", evaluation.mental],
              ].map(([label, value]) => (
                <div className="rounded-lg bg-white/12 p-2 text-center ring-1 ring-white/15" key={label}>
                  <p className="truncate text-[9px] font-bold uppercase tracking-[0.1em] text-white/70">{label}</p>
                  <p className="mt-0.5 text-lg font-black">{value ?? "--"}</p>
                </div>
              ))}
            </div>
          </div>

          <div className="panel rounded-t-none border-t-0 p-4">
            <div className="mb-3 flex items-center gap-2">
              <Shield className="text-pegasus-primary" size={18} />
              <h2 className="text-base font-black text-pegasus-navy">Avaliação do técnico</h2>
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
              <p className="whitespace-pre-wrap text-sm text-slate-600">
                {evaluation.coachNotes || "Ainda sem observações do técnico."}
              </p>
            )}
          </div>
        </article>
      </section>

      {/* 3-month attendance chart */}
      {profile.monthlyAttendance && profile.monthlyAttendance.length > 0 && (
        <section className="panel p-4">
          <h2 className="mb-4 text-base font-black text-pegasus-navy">Frequência — últimos 3 meses</h2>
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
        <section className="panel p-4">
          <div className="mb-4 flex items-center gap-3">
            <Package className="text-pegasus-primary" size={20} />
            <h2 className="text-base font-black text-pegasus-navy">Uniformes recebidos</h2>
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

    </div>
  );
}
