import { ArrowLeft, ArrowRight, CheckCircle2, Loader2, LogIn, Trophy } from "lucide-react";
import { FormEvent, useEffect, useMemo, useRef, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import logoFull from "../../assets/logo/logo-full.png";
import { ORG_NAME, ORG_LOGO_URL } from "../../config/org";
import {
  athleteApplicationService,
  type PublicApplicationPayload,
} from "../../services/athleteApplicationService";
import { turmaService, type PublicTurma } from "../../services/turmaService";

// ── Tipos internos ─────────────────────────────────────────────────────────────

type FormData = {
  name: string;
  phone: string;
  birthDate: string;
  turmaId: string;
  availableSaturdays: "" | "sim" | "nao";
  position: "" | "Levantador" | "Central" | "Líbero" | "Ponteiro" | "Oposto";
  secondPosition: "" | "Levantador" | "Central" | "Líbero" | "Ponteiro" | "Oposto";
  willingPositions: string[];
  currentTeam: "" | "sim" | "nao";
  currentTeamName: string;
  experienceTime: string;
  level: "" | "Iniciante" | "Intermediário" | "Avançado";
  willingToCompete: "" | "sim" | "nao";
  motivation: string;
  howFound: string;
  referral: string;
  contribution: string;
};

const EMPTY: FormData = {
  name: "",
  phone: "",
  birthDate: "",
  turmaId: "",
  availableSaturdays: "",
  position: "",
  secondPosition: "",
  willingPositions: [],
  currentTeam: "",
  currentTeamName: "",
  experienceTime: "",
  level: "",
  willingToCompete: "",
  motivation: "",
  howFound: "",
  referral: "",
  contribution: "",
};

// ── Componentes de campo reutilizáveis ─────────────────────────────────────────

function FieldLabel({ children, required }: { children: React.ReactNode; required?: boolean }) {
  return (
    <span className="block text-sm font-bold text-pegasus-navy">
      {children}
      {required && <span className="ml-1 text-rose-500">*</span>}
    </span>
  );
}

function FieldError({ message }: { message?: string }) {
  if (!message) return null;
  return (
    <p role="alert" className="mt-1 text-xs font-semibold text-rose-600">
      {message}
    </p>
  );
}

function TextInput({
  label,
  required,
  value,
  onChange,
  placeholder,
  type = "text",
  disabled,
  error,
  id,
}: {
  label: string;
  required?: boolean;
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
  type?: string;
  disabled?: boolean;
  error?: string;
  id?: string;
}) {
  return (
    <label className="block space-y-1.5" id={id}>
      <FieldLabel required={required}>{label}</FieldLabel>
      <input
        aria-invalid={error ? true : undefined}
        className={`min-h-11 w-full rounded-2xl border bg-white px-4 py-3 text-sm text-pegasus-navy placeholder:text-slate-400 focus:outline-none focus:ring-2 disabled:opacity-60 ${
          error
            ? "border-rose-400 focus:border-rose-500 focus:ring-rose-100"
            : "border-stone-200 focus:border-[#42A5F5] focus:ring-[#42A5F5]/15"
        }`}
        disabled={disabled}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        type={type}
        value={value}
      />
      <FieldError message={error} />
    </label>
  );
}

function TextareaInput({
  label,
  required,
  value,
  onChange,
  placeholder,
  disabled,
  rows = 4,
  error,
  id,
}: {
  label: string;
  required?: boolean;
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
  disabled?: boolean;
  rows?: number;
  error?: string;
  id?: string;
}) {
  return (
    <label className="block space-y-1.5" id={id}>
      <FieldLabel required={required}>{label}</FieldLabel>
      <textarea
        aria-invalid={error ? true : undefined}
        className={`w-full resize-none rounded-2xl border bg-white px-4 py-3 text-sm text-pegasus-navy placeholder:text-slate-400 focus:outline-none focus:ring-2 disabled:opacity-60 ${
          error
            ? "border-rose-400 focus:border-rose-500 focus:ring-rose-100"
            : "border-stone-200 focus:border-[#42A5F5] focus:ring-[#42A5F5]/15"
        }`}
        disabled={disabled}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        rows={rows}
        value={value}
      />
      <FieldError message={error} />
    </label>
  );
}

function RadioGroup<T extends string>({
  label,
  required,
  value,
  onChange,
  options,
  disabled,
  error,
  id,
}: {
  label: string;
  required?: boolean;
  value: T | "";
  onChange: (v: T) => void;
  options: { label: string; value: T }[];
  disabled?: boolean;
  error?: string;
  id?: string;
}) {
  return (
    <fieldset className="space-y-2" id={id}>
      <FieldLabel required={required}>{label}</FieldLabel>
      <div className="flex flex-wrap gap-3">
        {options.map((opt) => (
          <label
            key={opt.value}
            className={`flex cursor-pointer items-center gap-2.5 rounded-2xl border px-4 py-2.5 text-sm font-semibold transition-colors ${
              value === opt.value
                ? "border-[#1565C0] bg-[#E3F2FD] text-[#0D47A1]"
                : error
                ? "border-rose-300 bg-white text-slate-600 hover:border-rose-400"
                : "border-stone-200 bg-white text-slate-600 hover:border-[#42A5F5] hover:bg-[#E3F2FD]/50"
            } ${disabled ? "cursor-not-allowed opacity-60" : ""}`}
          >
            <input
              checked={value === opt.value}
              className="sr-only"
              disabled={disabled}
              name={label}
              onChange={() => onChange(opt.value)}
              required={required && !value}
              type="radio"
              value={opt.value}
            />
            <span
              className={`h-4 w-4 shrink-0 rounded-full border-2 transition-colors ${
                value === opt.value ? "border-[#1565C0] bg-[#1565C0]" : "border-slate-300"
              }`}
            />
            {opt.label}
          </label>
        ))}
      </div>
      <FieldError message={error} />
    </fieldset>
  );
}

function ToggleGroup({
  label,
  value,
  onChange,
  options,
  disabled,
}: {
  label: string;
  value: string[];
  onChange: (v: string[]) => void;
  options: string[];
  disabled?: boolean;
}) {
  function toggle(opt: string) {
    onChange(value.includes(opt) ? value.filter((v) => v !== opt) : [...value, opt]);
  }
  return (
    <fieldset className="space-y-2">
      <FieldLabel>{label}</FieldLabel>
      <div className="flex flex-wrap gap-3">
        {options.map((opt) => (
          <button
            key={opt}
            type="button"
            disabled={disabled}
            onClick={() => toggle(opt)}
            className={`rounded-2xl border px-4 py-2.5 text-sm font-semibold transition-colors ${
              value.includes(opt)
                ? "border-[#1565C0] bg-[#E3F2FD] text-[#0D47A1]"
                : "border-stone-200 bg-white text-slate-600 hover:border-[#42A5F5] hover:bg-[#E3F2FD]/50"
            } ${disabled ? "cursor-not-allowed opacity-60" : "cursor-pointer"}`}
          >
            {opt}
          </button>
        ))}
      </div>
    </fieldset>
  );
}

function SectionTitle({ step, title, description }: { step: number; title: string; description: string }) {
  return (
    <div className="flex items-start gap-4">
      <span className="grid h-10 w-10 shrink-0 place-items-center rounded-2xl bg-[#1565C0] font-black text-white">
        {step}
      </span>
      <div>
        <h2 className="font-black text-pegasus-navy">{title}</h2>
        <p className="mt-0.5 text-sm text-slate-500">{description}</p>
      </div>
    </div>
  );
}

// ── Validação ──────────────────────────────────────────────────────────────────

const REQUIRED_FIELDS: (keyof FormData)[] = [
  "name",
  "birthDate",
  "turmaId",
  "availableSaturdays",
  "position",
  "currentTeam",
  "experienceTime",
  "level",
  "willingToCompete",
  "motivation",
  "howFound",
];

function computeProgress(form: FormData): number {
  const filled = REQUIRED_FIELDS.filter((key) => form[key]).length;
  return Math.round((filled / REQUIRED_FIELDS.length) * 100);
}

type FieldErrors = Partial<Record<keyof FormData, string>>;

function validate(form: FormData): FieldErrors {
  const errors: FieldErrors = {};
  if (!form.name.trim()) errors.name = "Informe seu nome.";
  if (!form.birthDate) errors.birthDate = "Informe sua data de nascimento.";
  if (!form.turmaId) errors.turmaId = "Selecione a turma que deseja se inscrever.";
  if (!form.availableSaturdays) errors.availableSaturdays = "Informe sua disponibilidade.";
  if (!form.position) errors.position = "Selecione sua posição de jogo.";
  if (!form.currentTeam) errors.currentTeam = "Informe se joga em algum time atualmente.";
  if (form.currentTeam === "sim" && !form.currentTeamName.trim()) {
    errors.currentTeamName = "Informe o nome do time atual.";
  }
  if (!form.experienceTime.trim()) errors.experienceTime = "Informe seu tempo de experiência.";
  if (!form.level) errors.level = "Selecione seu nível atual.";
  if (!form.willingToCompete) errors.willingToCompete = "Informe sua disponibilidade para campeonatos.";
  if (!form.motivation.trim()) errors.motivation = "Conte seu motivo para entrar no time.";
  if (!form.howFound.trim()) errors.howFound = `Informe como você descobriu o ${ORG_NAME}.`;
  return errors;
}

// ── Persistência local ─────────────────────────────────────────────────────────

const DRAFT_KEY = "pegasus:inscricao:draft";

function loadDraft(): FormData {
  try {
    const raw = localStorage.getItem(DRAFT_KEY);
    if (!raw) return EMPTY;
    const parsed = JSON.parse(raw);
    return { ...EMPTY, ...parsed };
  } catch {
    return EMPTY;
  }
}

function saveDraft(data: FormData) {
  try {
    localStorage.setItem(DRAFT_KEY, JSON.stringify(data));
  } catch {
    // Storage not available — silent fail
  }
}

function clearDraft() {
  try {
    localStorage.removeItem(DRAFT_KEY);
  } catch {}
}

// ── Banner de erro ──────────────────────────────────────────────────────────────

function ErrorBanner({ message }: { message: string }) {
  return (
    <div className="flex items-start gap-3 rounded-2xl border-2 border-rose-300 bg-rose-50 px-4 py-4">
      <span className="mt-0.5 text-xl text-rose-500">⚠</span>
      <div>
        <p className="text-sm font-bold text-rose-700">Sua inscrição não foi enviada</p>
        <p className="mt-0.5 text-sm text-rose-600">{message}</p>
        <p className="mt-1 text-xs text-rose-500">
          Verifique sua conexão e tente novamente. Se o problema persistir, entre em contato pelo Instagram{" "}
          <strong>@projetopegasus</strong>.
        </p>
      </div>
    </div>
  );
}

// ── Página Principal ───────────────────────────────────────────────────────────

export function InscricaoPage() {
  const navigate = useNavigate();
  const [form, setForm] = useState<FormData>(loadDraft);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<FieldErrors>({});
  const [turmas, setTurmas] = useState<PublicTurma[]>([]);
  const [hasDraft] = useState(() => {
    const draft = loadDraft();
    return draft.name.trim().length > 0;
  });
  const submitErrorRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    turmaService.getPublicActive().then(setTurmas).catch(() => {});
  }, []);

  const selectedTurma = turmas.find((t) => t.id === form.turmaId) ?? null;
  const progress = useMemo(() => computeProgress(form), [form]);

  function set<K extends keyof FormData>(key: K, value: FormData[K]) {
    setForm((prev) => {
      const next = { ...prev, [key]: value };
      saveDraft(next);
      return next;
    });
    setError(null);
    setFieldErrors((prev) => {
      if (!prev[key]) return prev;
      const next = { ...prev };
      delete next[key];
      return next;
    });
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    const errors = validate(form);
    const errorKeys = Object.keys(errors) as (keyof FormData)[];
    if (errorKeys.length > 0) {
      setFieldErrors(errors);
      setError(`Você tem ${errorKeys.length} campo(s) obrigatório(s) pendente(s) — veja os destacados em vermelho abaixo.`);
      const firstField = document.getElementById(errorKeys[0]);
      (firstField ?? document.body).scrollIntoView({ behavior: "smooth", block: "center" });
      return;
    }

    setFieldErrors({});
    setIsSubmitting(true);
    setError(null);

    try {
      const payload: PublicApplicationPayload = {
        name: form.name.trim(),
        phone: form.phone.trim() || undefined,
        birthDate: form.birthDate,
        turmaId: form.turmaId,
        position: form.position as string,
        availableSaturdays: form.availableSaturdays === "sim",
        currentTeam: form.currentTeam === "sim",
        currentTeamName: form.currentTeam === "sim" ? form.currentTeamName.trim() || undefined : undefined,
        experienceTime: form.experienceTime.trim(),
        level: form.level as string,
        willingToCompete: form.willingToCompete === "sim",
        motivation: form.motivation.trim(),
        howFound: form.howFound.trim(),
        referral: form.referral.trim() || undefined,
        contribution: form.contribution.trim() || undefined,
        secondPosition: form.secondPosition || undefined,
        willingPositions: form.willingPositions.length > 0 ? form.willingPositions.join(",") : undefined,
      };

      await athleteApplicationService.submitPublic(payload);
      clearDraft();
      navigate("/inscricao/enviada");
    } catch (err: any) {
      const msg =
        err?.response?.data?.message ??
        err?.response?.data?.error ??
        err?.message ??
        "Não foi possível conectar ao servidor. Verifique sua internet e tente novamente.";
      setError(msg);
      // Scroll to the error near the submit button (visible on mobile)
      setTimeout(() => {
        submitErrorRef.current?.scrollIntoView({ behavior: "smooth", block: "center" });
      }, 50);
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <main className="min-h-screen bg-pegasus-surface">
      {/* Header + Hero */}
      <div className="relative overflow-hidden bg-[#071428] text-white">
        <div className="pointer-events-none absolute inset-0 overflow-hidden">
          <div className="absolute left-1/2 top-0 h-[300px] w-[700px] -translate-x-1/2 rounded-full bg-[#1565C0]/20 blur-3xl" />
        </div>

        <header className="relative border-b border-white/10">
          <div className="mx-auto flex max-w-4xl items-center justify-between gap-4 px-4 py-4 sm:px-6">
            <Link to="/" className="flex items-center gap-3">
              <img src={ORG_LOGO_URL || logoFull} alt={`Projeto ${ORG_NAME}`} className="h-10 w-20 rounded-xl object-contain" />
              <div>
                <p className="font-bold leading-tight">Projeto {ORG_NAME}</p>
                <p className="text-xs text-[#42A5F5]">Caminho Para o Time</p>
              </div>
            </Link>
            <Link
              to="/login"
              className="inline-flex items-center gap-2 rounded-full bg-[#1565C0] px-4 py-2 text-sm font-bold text-white transition hover:bg-[#42A5F5] hover:text-[#071428]"
            >
              <LogIn size={16} />
              Sou Atleta
            </Link>
          </div>
        </header>

        {/* Hero */}
        <section className="relative pb-8 pt-2">
          <div className="mx-auto max-w-4xl px-4 sm:px-6">
            <div className="inline-flex items-center gap-2 rounded-full border border-[#42A5F5]/30 bg-[#42A5F5]/10 px-4 py-1.5 text-xs font-semibold text-[#42A5F5]">
              <Trophy size={14} />
              Inscrição gratuita
            </div>
            <h1 className="mt-4 text-3xl font-black sm:text-4xl">Caminho Para o Time</h1>
            <p className="mt-3 max-w-xl text-base leading-7 text-blue-100">
              Preencha o formulário abaixo para fazer sua inscrição no <strong className="text-white">Projeto {ORG_NAME}</strong>.
              Nossa equipe analisará seu perfil e entrará em contato.
            </p>
          </div>
        </section>
      </div>

      {/* Barra de progresso — fica visível enquanto a pessoa preenche */}
      <div className="sticky top-0 z-20 border-b border-stone-200 bg-white/90 px-4 py-2.5 backdrop-blur sm:px-6">
        <div className="mx-auto flex max-w-4xl items-center gap-3">
          <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-stone-100">
            <div
              className="h-full rounded-full bg-[#1565C0] transition-all duration-300"
              style={{ width: `${progress}%` }}
            />
          </div>
          <span className="shrink-0 text-xs font-bold text-[#0D47A1]">{progress}% preenchido</span>
        </div>
      </div>

      {/* Formulário */}
      <div className="mx-auto max-w-4xl px-4 py-8 sm:px-6">

        {/* Error banner — top (visible when user scrolls up) */}
        {error && (
          <div className="mb-6">
            <ErrorBanner message={error} />
          </div>
        )}

        {/* Draft restored notice */}
        {hasDraft && !error && (
          <div className="mb-6 flex items-center gap-2 rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-700">
            <CheckCircle2 size={16} className="shrink-0 text-emerald-500" />
            <span>Suas respostas anteriores foram restauradas. Continue de onde parou.</span>
          </div>
        )}

        <form className="space-y-6" noValidate onSubmit={handleSubmit}>

          {/* Seção 1: Dados Pessoais */}
          <section className="rounded-3xl border border-stone-200 bg-white p-6 shadow-soft sm:p-8">
            <SectionTitle
              step={1}
              title="Dados Pessoais"
              description="Informações básicas para identificação"
            />
            <div className="mt-6 grid gap-5 sm:grid-cols-2">
              <div className="sm:col-span-2">
                <TextInput
                  disabled={isSubmitting}
                  error={fieldErrors.name}
                  id="name"
                  label="Nome completo"
                  onChange={(v) => set("name", v)}
                  placeholder="Ex: João da Silva"
                  required
                  value={form.name}
                />
              </div>
              <TextInput
                disabled={isSubmitting}
                error={fieldErrors.birthDate}
                id="birthDate"
                label="Data de nascimento"
                onChange={(v) => set("birthDate", v)}
                required
                type="date"
                value={form.birthDate}
              />
              <TextInput
                disabled={isSubmitting}
                label="Telefone para contato"
                onChange={(v) => set("phone", v)}
                placeholder="(11) 99999-9999"
                type="tel"
                value={form.phone}
              />
            </div>
          </section>

          {/* Seção 2: Disponibilidade */}
          <section className="rounded-3xl border border-stone-200 bg-white p-6 shadow-soft sm:p-8">
            <SectionTitle
              step={2}
              title="Disponibilidade"
              description="Horários e comprometimento com o time"
            />
            <div className="mt-6 space-y-6">
              <RadioGroup
                disabled={isSubmitting || turmas.length === 0}
                error={fieldErrors.turmaId}
                id="turmaId"
                label="Qual a categoria deseja se inscrever?"
                onChange={(v) => set("turmaId", v)}
                options={turmas.map((t) => ({ label: t.name, value: t.id }))}
                required
                value={form.turmaId}
              />
              {selectedTurma && (
                <RadioGroup
                  disabled={isSubmitting}
                  error={fieldErrors.availableSaturdays}
                  id="availableSaturdays"
                  label={`Você tem disponibilidade para treinar${
                    selectedTurma.daysOfWeek.length > 0 ? "" : " aos sábados"
                  }, das ${selectedTurma.time}, em ${selectedTurma.location}${
                    selectedTurma.dependency ? ` (${selectedTurma.dependency})` : ""
                  }?`}
                  onChange={(v) => set("availableSaturdays", v)}
                  options={[
                    { label: "Sim", value: "sim" },
                    { label: "Não", value: "nao" },
                  ]}
                  required
                  value={form.availableSaturdays}
                />
              )}
              <RadioGroup
                disabled={isSubmitting}
                error={fieldErrors.willingToCompete}
                id="willingToCompete"
                label="Disposto a participar de campeonatos?"
                onChange={(v) => set("willingToCompete", v)}
                options={[
                  { label: "Sim, disposto", value: "sim" },
                  { label: "Não disposto", value: "nao" },
                ]}
                required
                value={form.willingToCompete}
              />
            </div>
          </section>

          {/* Seção 3: Experiência no Vôlei */}
          <section className="rounded-3xl border border-stone-200 bg-white p-6 shadow-soft sm:p-8">
            <SectionTitle
              step={3}
              title="Experiência no Vôlei"
              description="Conta um pouco sobre sua trajetória"
            />
            <div className="mt-6 space-y-6">
              <RadioGroup
                disabled={isSubmitting}
                error={fieldErrors.position}
                id="position"
                label="Posição de jogo"
                onChange={(v) => set("position", v)}
                options={[
                  { label: "Levantador", value: "Levantador" },
                  { label: "Central", value: "Central" },
                  { label: "Líbero", value: "Líbero" },
                  { label: "Ponteiro", value: "Ponteiro" },
                  { label: "Oposto", value: "Oposto" },
                ]}
                required
                value={form.position}
              />
              <RadioGroup
                disabled={isSubmitting}
                label="Você tem uma segunda posição?"
                onChange={(v) => set("secondPosition", v)}
                options={[
                  { label: "Levantador", value: "Levantador" },
                  { label: "Central", value: "Central" },
                  { label: "Líbero", value: "Líbero" },
                  { label: "Ponteiro", value: "Ponteiro" },
                  { label: "Oposto", value: "Oposto" },
                ]}
                value={form.secondPosition}
              />
              <ToggleGroup
                disabled={isSubmitting}
                label="Você está disposto a treinar em alguma outra posição das selecionadas, caso nosso time esteja precisando?"
                onChange={(v) => set("willingPositions", v)}
                options={["Levantador", "Central", "Líbero", "Ponteiro", "Oposto"]}
                value={form.willingPositions}
              />
              <RadioGroup
                disabled={isSubmitting}
                error={fieldErrors.level}
                id="level"
                label="Nível atual"
                onChange={(v) => set("level", v)}
                options={[
                  { label: "Iniciante", value: "Iniciante" },
                  { label: "Intermediário", value: "Intermediário" },
                  { label: "Avançado", value: "Avançado" },
                ]}
                required
                value={form.level}
              />
              <TextInput
                disabled={isSubmitting}
                error={fieldErrors.experienceTime}
                id="experienceTime"
                label="Tempo de experiência com vôlei"
                onChange={(v) => set("experienceTime", v)}
                placeholder="Ex: 2 anos, 6 meses, nunca joguei..."
                required
                value={form.experienceTime}
              />
              <RadioGroup
                disabled={isSubmitting}
                error={fieldErrors.currentTeam}
                id="currentTeam"
                label="Joga em algum time atualmente?"
                onChange={(v) => set("currentTeam", v)}
                options={[
                  { label: "Sim", value: "sim" },
                  { label: "Não", value: "nao" },
                ]}
                required
                value={form.currentTeam}
              />
              {form.currentTeam === "sim" && (
                <TextInput
                  disabled={isSubmitting}
                  error={fieldErrors.currentTeamName}
                  id="currentTeamName"
                  label="Qual time?"
                  onChange={(v) => set("currentTeamName", v)}
                  placeholder="Nome do time atual"
                  required
                  value={form.currentTeamName}
                />
              )}
            </div>
          </section>

          {/* Seção 4: Motivação */}
          <section className="rounded-3xl border border-stone-200 bg-white p-6 shadow-soft sm:p-8">
            <SectionTitle
              step={4}
              title="Motivação e Contato"
              description="Queremos te conhecer melhor"
            />
            <div className="mt-6 space-y-5">
              <TextareaInput
                disabled={isSubmitting}
                error={fieldErrors.motivation}
                id="motivation"
                label="Por que você quer entrar no time?"
                onChange={(v) => set("motivation", v)}
                placeholder={`Conte sua motivação, objetivos e o que espera do Projeto ${ORG_NAME}...`}
                required
                rows={4}
                value={form.motivation}
              />
              <TextareaInput
                disabled={isSubmitting}
                error={fieldErrors.howFound}
                id="howFound"
                label={`Como você descobriu o Projeto ${ORG_NAME}?`}
                onChange={(v) => set("howFound", v)}
                placeholder="Instagram, indicação de amigo, evento..."
                required
                rows={3}
                value={form.howFound}
              />
              <TextareaInput
                disabled={isSubmitting}
                label="Você tem alguma habilidade fora de quadra que pode contribuir com o time?"
                onChange={(v) => set("contribution", v)}
                placeholder="Ex: edição de vídeo, fotografia, design, gestão de redes sociais, RH, organização de eventos... (opcional)"
                rows={3}
                value={form.contribution}
              />
              <TextInput
                disabled={isSubmitting}
                label="Indicação de membro do time (se houver)"
                onChange={(v) => set("referral", v)}
                placeholder="Nome de quem te indicou (opcional)"
                value={form.referral}
              />
            </div>
          </section>

          {/* Aviso sobre contribuição */}
          <div className="rounded-2xl border border-amber-200 bg-amber-50 p-4">
            <p className="text-sm font-bold text-amber-800">Sobre a contribuição financeira</p>
            <p className="mt-1 text-sm text-amber-700">
              O time solicita uma contribuição financeira mensal para contratação de técnicos e materiais.
              Os valores serão informados após análise da sua inscrição.
            </p>
          </div>

          {/* Error banner — bottom (visible on mobile without needing to scroll up) */}
          {error && (
            <div ref={submitErrorRef}>
              <ErrorBanner message={error} />
            </div>
          )}

          {/* Botões */}
          <div className="flex flex-col gap-3 sm:flex-row">
            <button
              className="inline-flex min-h-12 flex-1 items-center justify-center gap-2 rounded-2xl bg-[#1565C0] px-6 font-bold text-white shadow-lg shadow-blue-900/20 transition hover:bg-[#0D47A1] disabled:opacity-60"
              disabled={isSubmitting}
              type="submit"
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="animate-spin" size={18} />
                  Enviando inscrição...
                </>
              ) : (
                <>
                  Enviar inscrição
                  <ArrowRight size={18} />
                </>
              )}
            </button>
            <Link
              to="/"
              className="inline-flex min-h-12 items-center justify-center gap-2 rounded-2xl border border-stone-200 bg-white px-6 font-bold text-[#1565C0] transition hover:bg-[#E3F2FD]"
            >
              <ArrowLeft size={18} />
              Voltar
            </Link>
          </div>
        </form>
      </div>
    </main>
  );
}
