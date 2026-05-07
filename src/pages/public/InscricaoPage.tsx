import { ArrowLeft, ArrowRight, CheckCircle2, Loader2, LogIn, Trophy } from "lucide-react";
import { FormEvent, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import logoFull from "../../assets/logo/logo-full.png";
import {
  athleteApplicationService,
  type PublicApplicationPayload,
} from "../../services/athleteApplicationService";

// ── Tipos internos ─────────────────────────────────────────────────────────────

type FormData = {
  name: string;
  phone: string;
  birthDate: string;
  availableSaturdays: "" | "sim" | "nao";
  position: "" | "Levantador" | "Central" | "Líbero" | "Ponteiro" | "Oposto";
  currentTeam: "" | "sim" | "nao";
  currentTeamName: string;
  experienceTime: string;
  level: "" | "Iniciante" | "Intermediário" | "Avançado";
  willingToCompete: "" | "sim" | "nao";
  motivation: string;
  howFound: string;
  referral: string;
};

const EMPTY: FormData = {
  name: "",
  phone: "",
  birthDate: "",
  availableSaturdays: "",
  position: "",
  currentTeam: "",
  currentTeamName: "",
  experienceTime: "",
  level: "",
  willingToCompete: "",
  motivation: "",
  howFound: "",
  referral: "",
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

function TextInput({
  label,
  required,
  value,
  onChange,
  placeholder,
  type = "text",
  disabled,
}: {
  label: string;
  required?: boolean;
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
  type?: string;
  disabled?: boolean;
}) {
  return (
    <label className="block space-y-1.5">
      <FieldLabel required={required}>{label}</FieldLabel>
      <input
        className="min-h-11 w-full rounded-2xl border border-blue-100 bg-white px-4 py-3 text-sm text-pegasus-navy placeholder:text-slate-400 focus:border-pegasus-sky focus:outline-none focus:ring-2 focus:ring-blue-100 disabled:opacity-60"
        disabled={disabled}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        required={required}
        type={type}
        value={value}
      />
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
}: {
  label: string;
  required?: boolean;
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
  disabled?: boolean;
  rows?: number;
}) {
  return (
    <label className="block space-y-1.5">
      <FieldLabel required={required}>{label}</FieldLabel>
      <textarea
        className="w-full resize-none rounded-2xl border border-blue-100 bg-white px-4 py-3 text-sm text-pegasus-navy placeholder:text-slate-400 focus:border-pegasus-sky focus:outline-none focus:ring-2 focus:ring-blue-100 disabled:opacity-60"
        disabled={disabled}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        required={required}
        rows={rows}
        value={value}
      />
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
}: {
  label: string;
  required?: boolean;
  value: T | "";
  onChange: (v: T) => void;
  options: { label: string; value: T }[];
  disabled?: boolean;
}) {
  return (
    <fieldset className="space-y-2">
      <FieldLabel required={required}>{label}</FieldLabel>
      <div className="flex flex-wrap gap-3">
        {options.map((opt) => (
          <label
            key={opt.value}
            className={`flex cursor-pointer items-center gap-2.5 rounded-2xl border px-4 py-2.5 text-sm font-semibold transition-colors ${
              value === opt.value
                ? "border-pegasus-primary bg-pegasus-ice text-pegasus-primary"
                : "border-blue-100 bg-white text-slate-600 hover:border-pegasus-sky hover:bg-pegasus-ice/50"
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
                value === opt.value ? "border-pegasus-primary bg-pegasus-primary" : "border-slate-300"
              }`}
            />
            {opt.label}
          </label>
        ))}
      </div>
    </fieldset>
  );
}

function SectionTitle({ step, title, description }: { step: number; title: string; description: string }) {
  return (
    <div className="flex items-start gap-4">
      <span className="grid h-10 w-10 shrink-0 place-items-center rounded-2xl bg-pegasus-primary font-black text-white">
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

function validate(form: FormData): string | null {
  if (!form.name.trim()) return "Por favor, informe seu nome.";
  if (!form.birthDate) return "Por favor, informe sua data de nascimento.";
  if (!form.availableSaturdays) return "Informe sua disponibilidade aos sábados.";
  if (!form.position) return "Selecione sua posição de jogo.";
  if (!form.currentTeam) return "Informe se joga em algum time atualmente.";
  if (form.currentTeam === "sim" && !form.currentTeamName.trim()) return "Informe o nome do time atual.";
  if (!form.experienceTime.trim()) return "Informe seu tempo de experiência.";
  if (!form.level) return "Selecione seu nível atual.";
  if (!form.willingToCompete) return "Informe sua disponibilidade para campeonatos.";
  if (!form.motivation.trim()) return "Conte seu motivo para entrar no time.";
  if (!form.howFound.trim()) return "Informe como você descobriu o Pegasus.";
  return null;
}

// ── Página Principal ───────────────────────────────────────────────────────────

export function InscricaoPage() {
  const navigate = useNavigate();
  const [form, setForm] = useState<FormData>(EMPTY);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function set<K extends keyof FormData>(key: K, value: FormData[K]) {
    setForm((prev) => ({ ...prev, [key]: value }));
    setError(null);
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    const validationError = validate(form);
    if (validationError) {
      setError(validationError);
      window.scrollTo({ top: 0, behavior: "smooth" });
      return;
    }

    setIsSubmitting(true);
    setError(null);

    try {
      const payload: PublicApplicationPayload = {
        name: form.name.trim(),
        phone: form.phone.trim() || undefined,
        birthDate: form.birthDate,
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
      };

      await athleteApplicationService.submitPublic(payload);
      navigate("/inscricao/enviada");
    } catch (err: any) {
      const msg =
        err?.response?.data?.message ??
        err?.response?.data?.error ??
        err?.message ??
        "Erro ao enviar inscrição. Tente novamente.";
      setError(msg);
      window.scrollTo({ top: 0, behavior: "smooth" });
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <main className="min-h-screen bg-pegasus-surface">
      {/* Header */}
      <header className="bg-pegasus-navy text-white">
        <div className="mx-auto flex max-w-4xl items-center justify-between gap-4 px-4 py-4 sm:px-6">
          <Link to="/" className="flex items-center gap-3">
            <img src={logoFull} alt="Projeto Pegasus" className="h-10 w-20 rounded-xl object-contain" />
            <div>
              <p className="font-bold leading-tight">Projeto Pegasus</p>
              <p className="text-xs text-blue-200">Caminho Para o Time</p>
            </div>
          </Link>
          <Link
            to="/login"
            className="inline-flex items-center gap-2 rounded-full bg-white px-4 py-2 text-sm font-semibold text-pegasus-primary"
          >
            <LogIn size={16} />
            Sou Atleta
          </Link>
        </div>
      </header>

      {/* Hero */}
      <section className="bg-pegasus-navy pb-8 pt-2 text-white">
        <div className="mx-auto max-w-4xl px-4 sm:px-6">
          <div className="inline-flex items-center gap-2 rounded-full border border-white/20 bg-white/10 px-4 py-1.5 text-xs font-semibold text-blue-100">
            <Trophy size={14} />
            Inscrição gratuita
          </div>
          <h1 className="mt-4 text-3xl font-black sm:text-4xl">Caminho Para o Time</h1>
          <p className="mt-3 max-w-xl text-base leading-7 text-blue-100">
            Preencha o formulário abaixo para fazer sua inscrição no <strong className="text-white">Projeto Pegasus</strong>.
            Nossa equipe analisará seu perfil e entrará em contato.
          </p>
        </div>
      </section>

      {/* Formulário */}
      <div className="mx-auto max-w-4xl px-4 py-8 sm:px-6">

        {/* Error banner */}
        {error && (
          <div className="mb-6 flex items-start gap-3 rounded-2xl border border-rose-200 bg-rose-50 px-4 py-4">
            <span className="mt-0.5 text-rose-500">⚠</span>
            <p className="text-sm font-semibold text-rose-700">{error}</p>
          </div>
        )}

        <form className="space-y-6" noValidate onSubmit={handleSubmit}>

          {/* Seção 1: Dados Pessoais */}
          <section className="rounded-3xl border border-blue-100 bg-white p-6 shadow-soft sm:p-8">
            <SectionTitle
              step={1}
              title="Dados Pessoais"
              description="Informações básicas para identificação"
            />
            <div className="mt-6 grid gap-5 sm:grid-cols-2">
              <div className="sm:col-span-2">
                <TextInput
                  disabled={isSubmitting}
                  label="Nome completo"
                  onChange={(v) => set("name", v)}
                  placeholder="Ex: João da Silva"
                  required
                  value={form.name}
                />
              </div>
              <TextInput
                disabled={isSubmitting}
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
          <section className="rounded-3xl border border-blue-100 bg-white p-6 shadow-soft sm:p-8">
            <SectionTitle
              step={2}
              title="Disponibilidade"
              description="Horários e comprometimento com o time"
            />
            <div className="mt-6 space-y-6">
              <RadioGroup
                disabled={isSubmitting}
                label="Disponível aos sábados das 17:30 às 19:00?"
                onChange={(v) => set("availableSaturdays", v)}
                options={[
                  { label: "Sim", value: "sim" },
                  { label: "Não", value: "nao" },
                ]}
                required
                value={form.availableSaturdays}
              />
              <RadioGroup
                disabled={isSubmitting}
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
          <section className="rounded-3xl border border-blue-100 bg-white p-6 shadow-soft sm:p-8">
            <SectionTitle
              step={3}
              title="Experiência no Vôlei"
              description="Conta um pouco sobre sua trajetória"
            />
            <div className="mt-6 space-y-6">
              <RadioGroup
                disabled={isSubmitting}
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
                label="Tempo de experiência com vôlei"
                onChange={(v) => set("experienceTime", v)}
                placeholder="Ex: 2 anos, 6 meses, nunca joguei..."
                required
                value={form.experienceTime}
              />
              <RadioGroup
                disabled={isSubmitting}
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
          <section className="rounded-3xl border border-blue-100 bg-white p-6 shadow-soft sm:p-8">
            <SectionTitle
              step={4}
              title="Motivação e Contato"
              description="Queremos te conhecer melhor"
            />
            <div className="mt-6 space-y-5">
              <TextareaInput
                disabled={isSubmitting}
                label="Por que você quer entrar no time?"
                onChange={(v) => set("motivation", v)}
                placeholder="Conte sua motivação, objetivos e o que espera do Projeto Pegasus..."
                required
                rows={4}
                value={form.motivation}
              />
              <TextareaInput
                disabled={isSubmitting}
                label="Como você descobriu o Projeto Pegasus?"
                onChange={(v) => set("howFound", v)}
                placeholder="Instagram, indicação de amigo, evento..."
                required
                rows={3}
                value={form.howFound}
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

          {/* Botões */}
          <div className="flex flex-col gap-3 sm:flex-row">
            <button
              className="inline-flex min-h-12 flex-1 items-center justify-center gap-2 rounded-2xl bg-pegasus-primary px-6 font-bold text-white shadow-lg shadow-blue-900/20 hover:bg-pegasus-medium disabled:opacity-60"
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
              className="inline-flex min-h-12 items-center justify-center gap-2 rounded-2xl border border-blue-100 bg-white px-6 font-bold text-pegasus-primary hover:bg-pegasus-ice"
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
