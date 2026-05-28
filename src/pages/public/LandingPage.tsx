import {
  ArrowRight,
  CheckCircle2,
  Dumbbell,
  Heart,
  Instagram,
  LogIn,
  MessageCircle,
  Shield,
  Trophy,
  Users,
  type LucideIcon,
} from "lucide-react";
import { Link } from "react-router-dom";
import logoFull from "../../assets/logo/logo-full.png";
import logoIcon from "../../assets/logo/logo-icon.png";
import { InstallPwaButton } from "../../components/pwa/InstallPwaButton";

type Feature = { icon: LucideIcon; title: string; text: string; color: string; bg: string };
type Step = { num: string; title: string; text: string };

const STATS = [
  { value: "50+", label: "Atletas ativos" },
  { value: "3×", label: "Treinos por semana" },
  { value: "Sub-19", label: "e adultos" },
  { value: "100%", label: "Foco no atleta" },
];

const FEATURES: Feature[] = [
  {
    icon: Users,
    title: "Inclusão real",
    text: "Iniciativa independente que oferece a experiência real de atleta a jovens e adultos, com foco no desenvolvimento humano e acolhimento.",
    color: "text-blue-600",
    bg: "bg-blue-50",
  },
  {
    icon: Dumbbell,
    title: "Voleibol de qualidade",
    text: "Treinos estruturados com metodologia séria, para quem está começando ou quer evoluir no esporte.",
    color: "text-emerald-600",
    bg: "bg-emerald-50",
  },
  {
    icon: Trophy,
    title: "Competição e jogos",
    text: "Participamos de competições regionais e promovemos jogos internos para que cada atleta viva a emoção do esporte.",
    color: "text-amber-600",
    bg: "bg-amber-50",
  },
  {
    icon: Heart,
    title: "Impacto comunitário",
    text: "Prevenção à evasão esportiva, fortalecimento do vínculo comunitário e estímulo à saúde física e mental.",
    color: "text-rose-600",
    bg: "bg-rose-50",
  },
  {
    icon: Shield,
    title: "Disciplina e caráter",
    text: "Formamos atletas e cidadãos. A disciplina, o respeito e a responsabilidade são pilares do nosso projeto.",
    color: "text-violet-600",
    bg: "bg-violet-50",
  },
  {
    icon: CheckCircle2,
    title: "Cronograma flexível",
    text: "Treinos nos finais de semana e noturno em dias úteis, adaptados à realidade de jovens e trabalhadores.",
    color: "text-cyan-600",
    bg: "bg-cyan-50",
  },
];

const STEPS: Step[] = [
  {
    num: "01",
    title: "Faça sua inscrição",
    text: "Preencha o formulário online em menos de 2 minutos. É gratuito.",
  },
  {
    num: "02",
    title: "Aguarde o contato",
    text: "Nossa equipe avalia e entra em contato para uma conversa e avaliação técnica.",
  },
  {
    num: "03",
    title: "Comece a treinar",
    text: "Você é ativado no sistema e já pode participar dos treinos e atividades do clube.",
  },
];

export function LandingPage() {
  return (
    <main className="min-h-screen bg-white text-pegasus-navy antialiased">

      {/* ── HEADER ── */}
      <header className="sticky top-0 z-50 border-b border-white/10 bg-pegasus-navy/95 backdrop-blur">
        <div className="mx-auto flex max-w-7xl items-center justify-between gap-4 px-4 py-3 sm:px-6">
          <div className="flex items-center gap-3">
            <img src={logoIcon} alt="Pegasus" className="h-9 w-9 rounded-xl object-contain" />
            <span className="font-black text-white">Projeto Pegasus</span>
          </div>
          <nav className="flex items-center gap-2">
            <Link
              to="/inscricao"
              className="hidden items-center gap-2 rounded-full bg-pegasus-sky px-4 py-2 text-sm font-bold text-pegasus-navy sm:inline-flex"
            >
              Inscrever-se
              <ArrowRight size={15} />
            </Link>
            <Link
              to="/login"
              className="inline-flex items-center gap-2 rounded-full border border-white/20 px-4 py-2 text-sm font-semibold text-white hover:bg-white/10"
            >
              <LogIn size={15} />
              Área do atleta
            </Link>
          </nav>
        </div>
      </header>

      {/* ── HERO ── */}
      <section className="relative overflow-hidden bg-pegasus-navy text-white">
        {/* decorative blobs */}
        <div className="pointer-events-none absolute inset-0">
          <div className="absolute -left-32 -top-32 h-[500px] w-[500px] rounded-full bg-blue-600/20 blur-3xl" />
          <div className="absolute -bottom-20 right-0 h-[400px] w-[400px] rounded-full bg-pegasus-sky/10 blur-3xl" />
        </div>

        <div className="relative z-10 mx-auto grid max-w-7xl gap-10 px-4 pb-0 pt-14 sm:px-6 sm:pt-20 lg:grid-cols-2 lg:items-center lg:pb-0">
          {/* text */}
          <div className="pb-14 sm:pb-20">
            <div className="inline-flex items-center gap-2 rounded-full border border-white/20 bg-white/10 px-4 py-1.5 text-sm font-semibold text-blue-100">
              <Trophy size={14} />
              Voleibol · Comunidade · Propósito
            </div>

            <h1 className="mt-6 text-5xl font-black leading-[1.08] tracking-tight sm:text-6xl lg:text-7xl">
              Esporte que<br />
              <span className="text-pegasus-sky">transforma</span><br />
              vidas.
            </h1>

            <p className="mt-6 max-w-lg text-lg leading-relaxed text-blue-100">
              O Projeto Pegasus é uma iniciativa esportiva independente que oferece a experiência
              real de atleta a jovens e adultos através do voleibol.
            </p>

            <div className="mt-8 flex flex-wrap gap-3">
              <Link
                to="/inscricao"
                className="inline-flex min-h-12 items-center gap-2 rounded-full bg-pegasus-sky px-7 py-3 font-bold text-pegasus-navy shadow-lg shadow-blue-900/30 transition hover:brightness-105"
              >
                Quero me inscrever
                <ArrowRight size={18} />
              </Link>
              <Link
                to="/login"
                className="inline-flex min-h-12 items-center gap-2 rounded-full border border-white/25 px-7 py-3 font-semibold text-white transition hover:bg-white/10"
              >
                Sou atleta
              </Link>
              <InstallPwaButton className="min-h-12 rounded-full px-6 py-3 border border-white/25 font-semibold text-white hover:bg-white/10" label="Instalar app" />
            </div>
          </div>

          {/* logo card */}
          <div className="relative hidden self-end lg:block">
            <div className="mx-auto w-full max-w-sm overflow-hidden rounded-t-[2rem] border border-white/10 bg-gradient-to-b from-white/10 to-transparent p-8 pb-0 shadow-2xl">
              <img
                src={logoFull}
                alt="Projeto Pegasus"
                className="w-full rounded-[1.25rem] object-contain drop-shadow-2xl"
              />
            </div>
          </div>
        </div>

        {/* stats strip */}
        <div className="relative z-10 border-t border-white/10 bg-white/5">
          <div className="mx-auto grid max-w-7xl grid-cols-2 gap-px sm:grid-cols-4">
            {STATS.map((stat) => (
              <div key={stat.label} className="flex flex-col items-center py-6 text-center">
                <span className="text-3xl font-black text-pegasus-sky">{stat.value}</span>
                <span className="mt-1 text-sm text-blue-200">{stat.label}</span>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── MISSÃO ── */}
      <section className="bg-white px-4 py-16 sm:px-6 sm:py-24">
        <div className="mx-auto max-w-4xl text-center">
          <p className="text-sm font-bold uppercase tracking-[0.2em] text-pegasus-primary">
            Nossa missão
          </p>
          <h2 className="mt-4 text-4xl font-black leading-tight sm:text-5xl">
            Mais do que treinos.<br />
            <span className="text-pegasus-primary">Uma comunidade.</span>
          </h2>
          <p className="mx-auto mt-6 max-w-2xl text-lg leading-relaxed text-slate-600">
            Acreditamos que o esporte é ferramenta de transformação social. Por isso, o Pegasus
            oferece estrutura séria, acompanhamento individualizado e um ambiente de respeito e
            pertencimento para quem quer jogar voleibol com propósito.
          </p>
        </div>
      </section>

      {/* ── FEATURES ── */}
      <section className="bg-slate-50 px-4 py-16 sm:px-6 sm:py-20">
        <div className="mx-auto max-w-7xl">
          <div className="mb-12 text-center">
            <p className="text-sm font-bold uppercase tracking-[0.2em] text-pegasus-primary">
              Por que o Pegasus?
            </p>
            <h2 className="mt-3 text-3xl font-black sm:text-4xl">O que nos define</h2>
          </div>
          <div className="grid gap-5 sm:grid-cols-2 xl:grid-cols-3">
            {FEATURES.map((f) => {
              const Icon = f.icon;
              return (
                <article
                  key={f.title}
                  className="group rounded-2xl border border-slate-100 bg-white p-6 shadow-sm transition hover:-translate-y-1 hover:shadow-md"
                >
                  <span className={`inline-grid h-12 w-12 place-items-center rounded-2xl ${f.bg} ${f.color}`}>
                    <Icon size={22} />
                  </span>
                  <h3 className="mt-5 text-lg font-bold text-pegasus-navy">{f.title}</h3>
                  <p className="mt-2 text-sm leading-6 text-slate-600">{f.text}</p>
                </article>
              );
            })}
          </div>
        </div>
      </section>

      {/* ── COMO ENTRAR ── */}
      <section className="bg-white px-4 py-16 sm:px-6 sm:py-24">
        <div className="mx-auto max-w-7xl">
          <div className="mb-14 text-center">
            <p className="text-sm font-bold uppercase tracking-[0.2em] text-pegasus-primary">
              É simples
            </p>
            <h2 className="mt-3 text-3xl font-black sm:text-4xl">Como fazer parte</h2>
          </div>
          <div className="grid gap-8 sm:grid-cols-3">
            {STEPS.map((step, i) => (
              <div key={step.num} className="relative flex flex-col items-center text-center sm:items-start sm:text-left">
                {i < STEPS.length - 1 && (
                  <div className="absolute left-1/2 top-6 hidden h-0.5 w-full -translate-y-1/2 bg-gradient-to-r from-pegasus-primary/30 to-transparent sm:block" />
                )}
                <div className="relative z-10 flex h-12 w-12 items-center justify-center rounded-2xl bg-pegasus-primary font-black text-white">
                  {step.num}
                </div>
                <h3 className="mt-5 text-lg font-bold text-pegasus-navy">{step.title}</h3>
                <p className="mt-2 text-sm leading-6 text-slate-600">{step.text}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── CTA ── */}
      <section className="bg-pegasus-navy px-4 py-16 sm:px-6 sm:py-20">
        <div className="relative mx-auto max-w-4xl overflow-hidden rounded-3xl bg-gradient-to-br from-pegasus-primary to-blue-700 p-8 text-center text-white shadow-2xl sm:p-14">
          <div className="pointer-events-none absolute inset-0">
            <div className="absolute -right-10 -top-10 h-48 w-48 rounded-full bg-white/10 blur-2xl" />
            <div className="absolute -bottom-10 left-0 h-48 w-48 rounded-full bg-white/10 blur-2xl" />
          </div>
          <div className="relative z-10">
            <h2 className="text-4xl font-black leading-tight sm:text-5xl">
              Pronto para<br />entrar em quadra?
            </h2>
            <p className="mx-auto mt-4 max-w-lg text-lg text-blue-100">
              Faça sua inscrição agora e junte-se ao Projeto Pegasus.
            </p>
            <div className="mt-8 flex flex-col items-center gap-3 sm:flex-row sm:justify-center">
              <Link
                to="/inscricao"
                className="inline-flex min-h-12 items-center gap-2 rounded-full bg-white px-8 py-3 font-bold text-pegasus-primary shadow-lg transition hover:brightness-105"
              >
                Fazer inscrição
                <ArrowRight size={18} />
              </Link>
              <Link
                to="/login"
                className="inline-flex min-h-12 items-center gap-2 rounded-full border border-white/30 px-8 py-3 font-semibold text-white hover:bg-white/10"
              >
                <LogIn size={16} />
                Já sou atleta
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* ── FOOTER ── */}
      <footer className="border-t border-slate-100 bg-white px-4 py-10 sm:px-6">
        <div className="mx-auto flex max-w-7xl flex-col items-center gap-6 sm:flex-row sm:justify-between">
          <div className="flex items-center gap-3">
            <img src={logoIcon} alt="Pegasus" className="h-8 w-8 rounded-lg object-contain" />
            <div>
              <p className="font-bold text-pegasus-navy">Projeto Pegasus</p>
              <p className="text-xs text-slate-500">Voleibol e comunidade</p>
            </div>
          </div>

          <div className="flex items-center gap-4">
            <a
              href="https://instagram.com/projetopegasus"
              target="_blank"
              rel="noopener noreferrer"
              className="flex h-9 w-9 items-center justify-center rounded-full border border-slate-200 text-slate-500 transition hover:border-pink-300 hover:text-pink-500"
              aria-label="Instagram"
            >
              <Instagram size={16} />
            </a>
            <a
              href="https://wa.me/5511999999999"
              target="_blank"
              rel="noopener noreferrer"
              className="flex h-9 w-9 items-center justify-center rounded-full border border-slate-200 text-slate-500 transition hover:border-emerald-300 hover:text-emerald-500"
              aria-label="WhatsApp"
            >
              <MessageCircle size={16} />
            </a>
            <Link
              to="/inscricao"
              className="rounded-full bg-pegasus-primary px-4 py-2 text-sm font-bold text-white transition hover:brightness-105"
            >
              Inscrever-se
            </Link>
          </div>
        </div>

        <div className="mx-auto mt-8 max-w-7xl border-t border-slate-100 pt-6 text-center text-xs text-slate-400">
          © {new Date().getFullYear()} Projeto Pegasus · Todos os direitos reservados
        </div>
      </footer>
    </main>
  );
}
