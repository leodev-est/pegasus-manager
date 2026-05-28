import {
  ArrowDown,
  ArrowRight,
  DollarSign,
  Heart,
  Instagram,
  Mail,
  Star,
  Target,
  Users,
  Zap,
  type LucideIcon,
} from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { Link } from "react-router-dom";
import logoFull from "../../assets/logo/logo-full.png";
import logoIcon from "../../assets/logo/logo-icon.png";

// ── Scroll Reveal ────────────────────────────────────────────────────────────
function Reveal({
  children,
  className = "",
  delay = 0,
  direction = "up",
}: {
  children: React.ReactNode;
  className?: string;
  delay?: number;
  direction?: "up" | "left" | "right" | "none";
}) {
  const ref = useRef<HTMLDivElement>(null);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setVisible(true);
          observer.disconnect();
        }
      },
      { threshold: 0.12, rootMargin: "0px 0px -40px 0px" },
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  const initial = {
    up: "opacity-0 translate-y-10",
    left: "opacity-0 -translate-x-10",
    right: "opacity-0 translate-x-10",
    none: "opacity-0",
  }[direction];

  return (
    <div
      ref={ref}
      style={{ transitionDelay: `${delay}ms` }}
      className={`transition-all duration-700 ease-out ${visible ? "opacity-100 translate-x-0 translate-y-0" : initial} ${className}`}
    >
      {children}
    </div>
  );
}

// ── Data ─────────────────────────────────────────────────────────────────────
type Value = { icon: LucideIcon; title: string; text: string };

const VALUES: Value[] = [
  {
    icon: Heart,
    title: "Inclusão",
    text: "Todo mundo merece uma chance no esporte, independente de onde veio ou o que já ouviu sobre si mesmo.",
  },
  {
    icon: Zap,
    title: "Superação",
    text: "Cada treino é uma oportunidade de ser melhor do que ontem. Celebramos cada evolução.",
  },
  {
    icon: Users,
    title: "Trabalho em equipe",
    text: "Dentro e fora de quadra, crescemos juntos. O time vem antes do indivíduo.",
  },
  {
    icon: Target,
    title: "Propósito",
    text: "Esporte com sentido. Formamos pessoas, não apenas atletas.",
  },
];

const FOR_WHOM = [
  {
    icon: Star,
    label: "Jovens atletas",
    title: "Você quer ser atleta",
    text: "Já tentou em outros clubes, ouviu que não era bom o suficiente — ou simplesmente nunca teve oportunidade. Aqui você começa do zero sem julgamento.",
    cta: "Quero me inscrever",
    href: "/inscricao",
    accent: "bg-blue-50 border-blue-100",
    iconColor: "bg-pegasus-primary text-white",
  },
  {
    icon: Users,
    label: "Pais e responsáveis",
    title: "Seu filho quer jogar",
    text: "Buscamos um ambiente saudável, disciplinado e com acompanhamento próximo. Prezamos pela segurança, evolução e caráter dos nossos atletas.",
    cta: "Conhecer o projeto",
    href: "/inscricao",
    accent: "bg-emerald-50 border-emerald-100",
    iconColor: "bg-emerald-600 text-white",
  },
  {
    icon: DollarSign,
    label: "Parceiros e patrocinadores",
    title: "Você quer fazer parte",
    text: "Apoiar o Pegasus é investir em impacto social real. Temos estrutura, organização e um projeto sério que conecta sua marca a valores que importam.",
    cta: "Fale conosco",
    href: "mailto:contato@projetopegasus.com.br",
    accent: "bg-violet-50 border-violet-100",
    iconColor: "bg-violet-600 text-white",
  },
];

const TESTIMONIALS = [
  {
    name: "Mateus, 17 anos",
    role: "Atleta desde 2024",
    avatar: "M",
    color: "bg-pegasus-primary",
    text: "Tentei entrar em três clubes e sempre ouvi que era tarde demais. No Pegasus ninguém falou isso. Hoje treino três vezes por semana e pela primeira vez me sinto um atleta de verdade.",
  },
  {
    name: "Lara, 15 anos",
    role: "Atleta desde 2023",
    avatar: "L",
    color: "bg-emerald-600",
    text: "Era tímida demais e sempre ficava pra trás nas escolinhas. Aqui aprendi que evolução é pessoal. Já melhoro muito e o mais importante: quero ir pra cada treino.",
  },
  {
    name: "Dona Cláudia",
    role: "Mãe do atleta Caio, 16 anos",
    avatar: "C",
    color: "bg-violet-600",
    text: "Fiquei com receio no começo, mas a organização e o cuidado com meu filho me conquistaram. Ele mudou muito — em responsabilidade, disciplina e autoestima. Recomendo demais.",
  },
];

// ── Component ─────────────────────────────────────────────────────────────────
export function LandingPage() {
  function scrollTo(id: string) {
    document.getElementById(id)?.scrollIntoView({ behavior: "smooth" });
  }

  return (
    <main className="min-h-screen bg-white text-slate-800 antialiased">

      {/* ── HEADER ── */}
      <header className="fixed top-0 z-50 w-full border-b border-slate-100 bg-white/90 backdrop-blur">
        <div className="mx-auto flex max-w-7xl items-center justify-between gap-4 px-5 py-3 sm:px-8">
          <div className="flex items-center gap-2.5">
            <img src={logoIcon} alt="Pegasus" className="h-8 w-8 rounded-lg object-contain" />
            <span className="font-black text-pegasus-navy">Projeto Pegasus</span>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => scrollTo("sobre")}
              className="hidden text-sm font-medium text-slate-600 hover:text-pegasus-primary sm:block"
            >
              Sobre
            </button>
            <button
              onClick={() => scrollTo("valores")}
              className="hidden text-sm font-medium text-slate-600 hover:text-pegasus-primary sm:block"
            >
              Valores
            </button>
            <Link
              to="/login"
              className="ml-2 rounded-full border border-slate-200 px-4 py-1.5 text-sm font-semibold text-slate-700 hover:border-pegasus-primary hover:text-pegasus-primary"
            >
              Área do atleta
            </Link>
          </div>
        </div>
      </header>

      {/* ── HERO ── */}
      <section className="relative flex min-h-screen flex-col items-center justify-center overflow-hidden bg-gradient-to-br from-white via-blue-50/60 to-slate-100 px-5 pt-20 text-center sm:px-8">
        {/* Decorative background circles */}
        <div className="pointer-events-none absolute inset-0 overflow-hidden">
          <div className="absolute -right-40 top-10 h-[600px] w-[600px] rounded-full bg-blue-100/60 blur-3xl" />
          <div className="absolute -left-40 bottom-0 h-[400px] w-[400px] rounded-full bg-slate-200/60 blur-3xl" />
        </div>

        <div className="relative z-10 flex max-w-4xl flex-col items-center">
          <Reveal>
            <img
              src={logoFull}
              alt="Projeto Pegasus"
              className="mx-auto mb-8 h-32 w-auto drop-shadow-xl sm:h-40"
            />
          </Reveal>

          <Reveal delay={100}>
            <div className="mb-4 inline-flex items-center gap-2 rounded-full bg-pegasus-primary/10 px-4 py-1.5 text-sm font-semibold text-pegasus-primary">
              ✦ Voleibol · Inclusão · Propósito
            </div>
          </Reveal>

          <Reveal delay={200}>
            <h1 className="text-6xl font-black leading-[1.05] tracking-tight text-pegasus-navy sm:text-7xl md:text-8xl">
              PEGASUS
            </h1>
          </Reveal>

          <Reveal delay={300}>
            <p className="mt-5 max-w-2xl text-xl leading-relaxed text-slate-600 sm:text-2xl">
              O esporte tem o poder de transformar quem você é.
              <br className="hidden sm:block" />
              <span className="font-semibold text-pegasus-primary"> Aqui, todo mundo joga.</span>
            </p>
          </Reveal>

          <Reveal delay={400}>
            <div className="mt-10 flex flex-col gap-3 sm:flex-row">
              <Link
                to="/inscricao"
                className="inline-flex min-h-13 items-center justify-center gap-2 rounded-full bg-pegasus-primary px-8 py-3.5 text-base font-bold text-white shadow-lg shadow-blue-200 transition hover:brightness-105"
              >
                Quero fazer parte
                <ArrowRight size={18} />
              </Link>
              <button
                onClick={() => scrollTo("sobre")}
                className="inline-flex min-h-13 items-center justify-center gap-2 rounded-full border-2 border-slate-200 px-8 py-3.5 text-base font-semibold text-slate-700 transition hover:border-pegasus-primary hover:text-pegasus-primary"
              >
                Saiba mais
                <ArrowDown size={18} />
              </button>
            </div>
          </Reveal>
        </div>

        {/* scroll hint */}
        <button
          onClick={() => scrollTo("sobre")}
          className="absolute bottom-8 left-1/2 -translate-x-1/2 animate-bounce text-slate-400"
          aria-label="Rolar para baixo"
        >
          <ArrowDown size={24} />
        </button>
      </section>

      {/* ── SOBRE NÓS ── */}
      <section id="sobre" className="bg-white px-5 py-24 sm:px-8 sm:py-32">
        <div className="mx-auto grid max-w-6xl gap-12 lg:grid-cols-2 lg:items-center">
          <Reveal direction="left">
            <div className="flex flex-col gap-3">
              <span className="text-sm font-bold uppercase tracking-[0.2em] text-pegasus-primary">
                Sobre nós
              </span>
              <h2 className="text-4xl font-black leading-tight text-pegasus-navy sm:text-5xl">
                Feitos para quem
                <br />
                ficou pra trás.
              </h2>
              <p className="mt-2 text-lg leading-relaxed text-slate-600">
                O Projeto Pegasus nasceu de uma realidade que muitos jovens conhecem bem: chegar em
                um clube, dar tudo de si — e ouvir que não é suficiente. Federações fechadas,
                peneiras elitistas, falta de oportunidade.
              </p>
              <p className="text-lg leading-relaxed text-slate-600">
                Nossa missão é simples: <strong className="text-pegasus-navy">oferecer a experiência real de atleta</strong> a
                quem sempre quis mas nunca teve chance. Com treinos sérios, acompanhamento próximo e
                um ambiente que acolhe, desenvolvemos pessoas através do voleibol.
              </p>
              <p className="text-lg leading-relaxed text-slate-600">
                Aqui não existe "você não serve". Existe evolução, existe propósito, existe time.
              </p>
            </div>
          </Reveal>

          <Reveal direction="right" delay={150}>
            <div className="relative">
              <div className="overflow-hidden rounded-3xl bg-gradient-to-br from-pegasus-primary to-blue-700 p-10 text-white shadow-2xl">
                <p className="text-4xl font-black leading-tight">
                  "Não é sobre quem já chegou. É sobre quem quer chegar."
                </p>
                <div className="mt-8 flex items-center gap-3 border-t border-white/20 pt-6">
                  <img src={logoIcon} alt="Pegasus" className="h-10 w-10 rounded-xl object-contain" />
                  <div>
                    <p className="font-bold">Projeto Pegasus</p>
                    <p className="text-sm text-blue-200">Voleibol e comunidade</p>
                  </div>
                </div>
              </div>
              {/* decorative dots */}
              <div className="absolute -bottom-4 -right-4 -z-10 h-24 w-24 rounded-full bg-pegasus-sky/30" />
              <div className="absolute -left-4 -top-4 -z-10 h-16 w-16 rounded-full bg-blue-100" />
            </div>
          </Reveal>
        </div>
      </section>

      {/* ── PARA QUEM É ── */}
      <section className="bg-slate-50 px-5 py-24 sm:px-8 sm:py-32">
        <div className="mx-auto max-w-6xl">
          <Reveal>
            <div className="mb-14 text-center">
              <span className="text-sm font-bold uppercase tracking-[0.2em] text-pegasus-primary">
                Para quem é
              </span>
              <h2 className="mt-3 text-4xl font-black text-pegasus-navy sm:text-5xl">
                Esta página é pra você?
              </h2>
              <p className="mx-auto mt-4 max-w-xl text-lg text-slate-600">
                O Pegasus reúne jovens, famílias e empresas em torno de um objetivo comum.
              </p>
            </div>
          </Reveal>

          <div className="grid gap-6 md:grid-cols-3">
            {FOR_WHOM.map((card, i) => {
              const Icon = card.icon;
              return (
                <Reveal key={card.label} delay={i * 120}>
                  <article className={`flex h-full flex-col rounded-2xl border p-7 ${card.accent} transition hover:-translate-y-1 hover:shadow-lg`}>
                    <span className={`inline-grid h-11 w-11 place-items-center rounded-xl ${card.iconColor}`}>
                      <Icon size={20} />
                    </span>
                    <p className="mt-4 text-xs font-bold uppercase tracking-widest text-slate-500">
                      {card.label}
                    </p>
                    <h3 className="mt-1 text-xl font-black text-pegasus-navy">{card.title}</h3>
                    <p className="mt-3 flex-1 text-sm leading-6 text-slate-600">{card.text}</p>
                    <a
                      href={card.href}
                      className="mt-6 inline-flex items-center gap-1.5 text-sm font-bold text-pegasus-primary hover:underline"
                    >
                      {card.cta}
                      <ArrowRight size={14} />
                    </a>
                  </article>
                </Reveal>
              );
            })}
          </div>
        </div>
      </section>

      {/* ── NOSSOS VALORES ── */}
      <section id="valores" className="bg-white px-5 py-24 sm:px-8 sm:py-32">
        <div className="mx-auto max-w-6xl">
          <Reveal>
            <div className="mb-14 text-center">
              <span className="text-sm font-bold uppercase tracking-[0.2em] text-pegasus-primary">
                Nossos valores
              </span>
              <h2 className="mt-3 text-4xl font-black text-pegasus-navy sm:text-5xl">
                O que nos move
              </h2>
            </div>
          </Reveal>

          <div className="grid gap-8 sm:grid-cols-2 lg:grid-cols-4">
            {VALUES.map((v, i) => {
              const Icon = v.icon;
              return (
                <Reveal key={v.title} delay={i * 100}>
                  <div className="flex flex-col items-center text-center">
                    <div className="grid h-16 w-16 place-items-center rounded-2xl bg-pegasus-primary/10 text-pegasus-primary">
                      <Icon size={28} />
                    </div>
                    <h3 className="mt-5 text-lg font-black text-pegasus-navy">{v.title}</h3>
                    <p className="mt-2 text-sm leading-6 text-slate-600">{v.text}</p>
                  </div>
                </Reveal>
              );
            })}
          </div>
        </div>
      </section>

      {/* ── DEPOIMENTOS ── */}
      <section className="bg-gradient-to-br from-slate-50 to-blue-50 px-5 py-24 sm:px-8 sm:py-32">
        <div className="mx-auto max-w-6xl">
          <Reveal>
            <div className="mb-14 text-center">
              <span className="text-sm font-bold uppercase tracking-[0.2em] text-pegasus-primary">
                Depoimentos
              </span>
              <h2 className="mt-3 text-4xl font-black text-pegasus-navy sm:text-5xl">
                Quem já faz parte
              </h2>
            </div>
          </Reveal>

          <div className="grid gap-6 md:grid-cols-3">
            {TESTIMONIALS.map((t, i) => (
              <Reveal key={t.name} delay={i * 120}>
                <article className="flex h-full flex-col rounded-2xl border border-slate-100 bg-white p-7 shadow-sm">
                  <div className="flex items-center gap-3">
                    <div className={`grid h-11 w-11 shrink-0 place-items-center rounded-full ${t.color} text-lg font-black text-white`}>
                      {t.avatar}
                    </div>
                    <div>
                      <p className="font-bold text-pegasus-navy">{t.name}</p>
                      <p className="text-xs text-slate-500">{t.role}</p>
                    </div>
                  </div>
                  <div className="mt-4 flex gap-0.5">
                    {Array.from({ length: 5 }).map((_, k) => (
                      <Star key={k} size={14} className="fill-amber-400 text-amber-400" />
                    ))}
                  </div>
                  <p className="mt-4 flex-1 text-sm leading-6 text-slate-600">
                    "{t.text}"
                  </p>
                </article>
              </Reveal>
            ))}
          </div>
        </div>
      </section>

      {/* ── CTA FINAL ── */}
      <section className="bg-pegasus-navy px-5 py-24 sm:px-8 sm:py-32">
        <div className="relative mx-auto max-w-4xl overflow-hidden rounded-3xl bg-gradient-to-br from-pegasus-primary via-blue-600 to-blue-700 p-10 text-center text-white shadow-2xl sm:p-16">
          {/* decorative */}
          <div className="pointer-events-none absolute inset-0">
            <div className="absolute -right-16 -top-16 h-64 w-64 rounded-full bg-white/10 blur-2xl" />
            <div className="absolute -bottom-16 left-0 h-48 w-48 rounded-full bg-white/10 blur-2xl" />
          </div>

          <div className="relative z-10">
            <Reveal direction="none">
              <img src={logoIcon} alt="Pegasus" className="mx-auto mb-6 h-16 w-16 rounded-2xl object-contain" />
              <h2 className="text-4xl font-black leading-tight sm:text-5xl md:text-6xl">
                Sua vez de entrar<br />em quadra.
              </h2>
              <p className="mx-auto mt-5 max-w-lg text-lg text-blue-100">
                Não espere a oportunidade perfeita. Essa é ela.
                Faça parte do Projeto Pegasus hoje.
              </p>
              <div className="mt-10">
                <Link
                  to="/inscricao"
                  className="inline-flex min-h-13 items-center gap-2 rounded-full bg-white px-10 py-4 text-lg font-black text-pegasus-primary shadow-xl transition hover:brightness-105"
                >
                  Quero fazer parte do Pegasus
                  <ArrowRight size={20} />
                </Link>
              </div>
            </Reveal>
          </div>
        </div>
      </section>

      {/* ── FOOTER ── */}
      <footer className="bg-pegasus-navy px-5 pb-10 pt-4 sm:px-8">
        <div className="mx-auto max-w-6xl border-t border-white/10 pt-10">
          <div className="flex flex-col items-center gap-6 sm:flex-row sm:justify-between">
            <div className="flex items-center gap-3">
              <img src={logoIcon} alt="Pegasus" className="h-9 w-9 rounded-xl object-contain" />
              <div>
                <p className="font-black text-white">Projeto Pegasus</p>
                <p className="text-xs text-blue-300">Voleibol · Inclusão · Propósito</p>
              </div>
            </div>

            <div className="flex items-center gap-4">
              <a
                href="https://instagram.com/volei_pegasus"
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-2 rounded-full border border-white/20 px-4 py-2 text-sm font-semibold text-white transition hover:border-pink-400 hover:text-pink-400"
              >
                <Instagram size={15} />
                @volei_pegasus
              </a>
              <a
                href="mailto:contato@projetopegasus.com.br"
                className="flex items-center gap-2 rounded-full border border-white/20 px-4 py-2 text-sm font-semibold text-white transition hover:border-blue-300 hover:text-blue-300"
              >
                <Mail size={15} />
                contato@projetopegasus.com.br
              </a>
            </div>
          </div>

          <p className="mt-8 text-center text-xs text-blue-400">
            © {new Date().getFullYear()} Projeto Pegasus · Todos os direitos reservados.
          </p>
        </div>
      </footer>
    </main>
  );
}
