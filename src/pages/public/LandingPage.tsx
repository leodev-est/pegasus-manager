import {
  ArrowDown,
  ArrowRight,
  ArrowUp,
  CalendarClock,
  DollarSign,
  HandshakeIcon,
  Heart,
  Instagram,
  Mail,
  ShieldCheck,
  Star,
  Target,
  Users,
  Volleyball,
  type LucideIcon,
} from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { Link } from "react-router-dom";
import logoHero from "../../assets/logo/logo-hero.png";
import logoIcon from "../../assets/logo/logo-icon.png";

// ── Scroll Reveal ─────────────────────────────────────────────────────────────
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
        if (entry.isIntersecting) { setVisible(true); observer.disconnect(); }
      },
      { threshold: 0.1, rootMargin: "0px 0px -40px 0px" },
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

// ── Star Field ────────────────────────────────────────────────────────────────
function StarField() {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const W = canvas.offsetWidth;
    const H = canvas.offsetHeight;
    canvas.width = W;
    canvas.height = H;

    const cx = W / 2, cy = H * 0.38;
    const stars = Array.from({ length: 90 }, () => {
      let x, y, dist;
      do {
        x = Math.random() * W;
        y = Math.random() * H;
        dist = Math.hypot(x - cx, y - cy);
      } while (dist < 120);

      return {
        x, y,
        r: Math.random() * 1.2 + 0.3,
        baseOpacity: Math.random() * 0.45 + 0.08,
        speed: Math.random() * 0.6 + 0.2,
        phase: Math.random() * Math.PI * 2,
      };
    });

    let raf: number;
    let t = 0;

    function draw() {
      ctx.clearRect(0, 0, W, H);
      t += 0.016;
      for (const s of stars) {
        const opacity = s.baseOpacity * (0.55 + 0.45 * Math.sin(t * s.speed + s.phase));
        ctx.beginPath();
        ctx.arc(s.x, s.y, s.r, 0, Math.PI * 2);
        ctx.fillStyle = `rgba(180, 210, 255, ${opacity.toFixed(3)})`;
        ctx.fill();
      }
      raf = requestAnimationFrame(draw);
    }

    draw();
    return () => cancelAnimationFrame(raf);
  }, []);

  return (
    <canvas
      ref={canvasRef}
      className="pointer-events-none absolute inset-0 h-full w-full"
    />
  );
}

// ── Data ──────────────────────────────────────────────────────────────────────
type Pillar = { icon: LucideIcon; title: string; text: string };

const PILLARS: Pillar[] = [
  {
    icon: Heart,
    title: "Propósito e Inclusão",
    text: "Iniciativa esportiva independente com foco no desenvolvimento humano, social e comunitário, oferecendo a experiência real de atleta a jovens e adultos, com ênfase na disciplina, responsabilidade e acolhimento.",
  },
  {
    icon: Volleyball,
    title: "Modalidade Principal",
    text: "Voleibol como atividade central, com plano de expansão para outras modalidades esportivas.",
  },
  {
    icon: Users,
    title: "Público-alvo",
    text: "Jovens Sub-19 e adultos de ambos os gêneros. Atletas em formação e reinserção esportiva.",
  },
  {
    icon: ShieldCheck,
    title: "Impacto Comunitário",
    text: "Prevenção à evasão esportiva, redução da exposição de jovens a riscos sociais, estímulo à saúde física e mental e fortalecimento do vínculo comunitário.",
  },
  {
    icon: CalendarClock,
    title: "Cronograma Flexível",
    text: "Treinos aos finais de semana em horários variados e em dias úteis no período noturno — com total flexibilidade para se encaixar na sua rotina.",
  },
  {
    icon: Target,
    title: "Foco Social e Comunitário",
    text: "Buscamos construir um legado esportivo sustentável e organizado, com impacto real na comunidade local.",
  },
];

const FOR_WHOM = [
  {
    icon: Star,
    label: "Jovens atletas",
    title: "Você quer ser atleta",
    text: "Já tentou em outros clubes, ouviu que não era bom o suficiente — ou simplesmente nunca teve oportunidade. Aqui você começa do zero, sem julgamento.",
    cta: "Quero me inscrever",
    href: "/inscricao",
    border: "border-[#1565C0]/40",
    bg: "bg-[#0D1F3C]",
    iconBg: "bg-[#1565C0]",
    ctaColor: "text-[#42A5F5] border-[#42A5F5]/30 hover:bg-[#42A5F5]/20 hover:border-[#42A5F5]/60",
  },
  {
    icon: Users,
    label: "Pais e responsáveis",
    title: "Seu filho quer jogar",
    text: "Ambiente saudável, disciplinado e com acompanhamento próximo. Prezamos pela segurança, evolução e caráter de cada atleta.",
    cta: "Conhecer o projeto",
    href: "/inscricao",
    border: "border-[#42A5F5]/30",
    bg: "bg-[#0A1A30]",
    iconBg: "bg-[#42A5F5]",
    ctaColor: "text-[#42A5F5] border-[#42A5F5]/30 hover:bg-[#42A5F5]/20 hover:border-[#42A5F5]/60",
  },
  {
    icon: DollarSign,
    label: "Parceiros e patrocinadores",
    title: "Apoie o projeto",
    text: "Apoiar o Pegasus é investir em impacto social real. Um projeto sério, organizado, que conecta sua marca a valores que importam.",
    cta: "Fale conosco",
    href: "mailto:pegasus.sportteam@gmail.com",
    border: "border-white/10",
    bg: "bg-[#061224]",
    iconBg: "bg-white/10",
    ctaColor: "text-white/80 border-white/20 hover:bg-white/10 hover:border-white/40",
  },
];

const NAV_ITEMS = [
  { id: "sobre", label: "Sobre" },
  { id: "pilares", label: "Pilares" },
  { id: "para-quem", label: "Para quem" },
];

// ── Component ─────────────────────────────────────────────────────────────────
export function LandingPage() {
  const [menuOpen, setMenuOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const [showScrollTop, setShowScrollTop] = useState(false);
  const [activeSection, setActiveSection] = useState<string>("");

  function scrollTo(id: string) {
    document.getElementById(id)?.scrollIntoView({ behavior: "smooth" });
    setMenuOpen(false);
  }

  function scrollToTop() {
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  // Header shadow + scroll-to-top visibility
  useEffect(() => {
    function onScroll() {
      setScrolled(window.scrollY > 50);
      setShowScrollTop(window.scrollY > 500);
    }
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  // Active section tracking
  useEffect(() => {
    const observers = NAV_ITEMS.map(({ id }) => {
      const el = document.getElementById(id);
      if (!el) return null;
      const obs = new IntersectionObserver(
        ([entry]) => { if (entry.isIntersecting) setActiveSection(id); },
        { threshold: 0.4 },
      );
      obs.observe(el);
      return obs;
    });
    return () => observers.forEach((obs) => obs?.disconnect());
  }, []);

  // Close mobile menu on Escape
  useEffect(() => {
    function onKey(e: KeyboardEvent) { if (e.key === "Escape") setMenuOpen(false); }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  return (
    <main className="min-h-screen bg-[#071428] text-white antialiased">

      {/* ── HEADER ── */}
      <header
        className={`fixed top-0 z-50 w-full border-b border-white/10 bg-[#071428]/95 backdrop-blur transition-all duration-300 ${
          scrolled ? "shadow-xl shadow-black/50" : ""
        }`}
      >
        <div className="mx-auto flex max-w-7xl items-center justify-between gap-4 px-5 py-3 sm:px-8">
          {/* Logo / brand — clicking goes to top */}
          <button onClick={scrollToTop} className="flex items-center gap-2.5 transition hover:opacity-80">
            <img src={logoIcon} alt="Pegasus" className="h-8 w-8 rounded-lg object-contain" />
            <span className="font-black text-white">Projeto Pegasus</span>
          </button>

          <div className="flex items-center gap-3">
            {/* Desktop nav */}
            <nav className="hidden items-center gap-1 sm:flex">
              {NAV_ITEMS.map((item) => (
                <button
                  key={item.id}
                  onClick={() => scrollTo(item.id)}
                  className={`rounded-lg px-3 py-1.5 text-sm font-semibold transition-colors duration-150 ${
                    activeSection === item.id
                      ? "text-white"
                      : "text-blue-300/80 hover:text-white"
                  }`}
                >
                  {item.label}
                </button>
              ))}
            </nav>

            <Link
              to="/login"
              className="rounded-full bg-[#1565C0] px-4 py-1.5 text-sm font-bold text-white transition hover:bg-[#42A5F5] hover:text-[#071428]"
            >
              Área do atleta
            </Link>

            {/* Mobile hamburger */}
            <button
              onClick={() => setMenuOpen((v) => !v)}
              className="grid h-9 w-9 place-items-center rounded-lg text-white/70 transition hover:bg-white/10 sm:hidden"
              aria-label={menuOpen ? "Fechar menu" : "Abrir menu"}
            >
              <span className="relative flex h-[18px] w-5 flex-col justify-between">
                <span
                  className={`block h-0.5 w-full origin-center bg-current transition-all duration-300 ${
                    menuOpen ? "translate-y-[8px] rotate-45" : ""
                  }`}
                />
                <span
                  className={`block h-0.5 w-full bg-current transition-all duration-300 ${
                    menuOpen ? "scale-x-0 opacity-0" : ""
                  }`}
                />
                <span
                  className={`block h-0.5 w-full origin-center bg-current transition-all duration-300 ${
                    menuOpen ? "-translate-y-[8px] -rotate-45" : ""
                  }`}
                />
              </span>
            </button>
          </div>
        </div>

        {/* Mobile dropdown */}
        <div
          className={`overflow-hidden transition-all duration-300 ease-in-out sm:hidden ${
            menuOpen ? "max-h-48 opacity-100" : "max-h-0 opacity-0"
          }`}
        >
          <nav className="flex flex-col border-t border-white/10 bg-[#071428] px-5 pb-4 pt-2">
            {NAV_ITEMS.map((item) => (
              <button
                key={item.id}
                onClick={() => scrollTo(item.id)}
                className={`py-3 text-left text-sm font-semibold transition-colors duration-150 ${
                  activeSection === item.id ? "text-white" : "text-blue-300/80"
                }`}
              >
                {item.label}
              </button>
            ))}
          </nav>
        </div>
      </header>

      {/* ── HERO ── */}
      <section
        className="relative flex min-h-screen flex-col items-center justify-center overflow-hidden px-5 pt-20 text-center sm:px-8"
        style={{ background: "radial-gradient(ellipse 80% 60% at 50% 40%, #1a3a6b 0%, #0a1e3d 45%, #071428 100%)" }}
      >
        <StarField />

        <div className="pointer-events-none absolute inset-0 overflow-hidden">
          <div className="absolute left-1/2 top-0 h-[500px] w-[900px] -translate-x-1/2 rounded-full bg-[#1565C0]/20 blur-3xl" />
          <div className="absolute -left-32 bottom-10 h-[300px] w-[300px] rounded-full bg-[#42A5F5]/10 blur-3xl" />
          <div className="absolute -right-32 bottom-10 h-[300px] w-[300px] rounded-full bg-[#0D47A1]/20 blur-3xl" />
        </div>

        <div className="relative z-10 flex max-w-4xl flex-col items-center">
          <Reveal>
            <img
              src={logoHero}
              alt="Projeto Pegasus"
              className="mx-auto mb-2 h-72 w-auto sm:h-96"
              style={{ filter: "drop-shadow(0 0 40px rgba(66,165,245,0.5))" }}
            />
          </Reveal>

          <Reveal delay={100}>
            <div className="mb-5 inline-flex items-center gap-2 rounded-full border border-[#42A5F5]/30 bg-[#42A5F5]/10 px-4 py-1.5 text-sm font-semibold text-[#42A5F5]">
              ✦ Voleibol · Inclusão · Propósito
            </div>
          </Reveal>

          <Reveal delay={200}>
            <h1 className="text-6xl font-black leading-[1.05] tracking-tight text-white sm:text-7xl md:text-8xl">
              PEGASUS
            </h1>
          </Reveal>

          <Reveal delay={300}>
            <p className="mt-6 max-w-2xl text-xl leading-relaxed text-blue-200 sm:text-2xl">
              O esporte tem o poder de transformar quem você é.
              <br className="hidden sm:block" />
              <span className="font-bold text-[#42A5F5]"> Aqui, todo mundo joga.</span>
            </p>
          </Reveal>

          <Reveal delay={400}>
            <div className="mt-10 flex flex-col gap-3 sm:flex-row">
              <Link
                to="/inscricao"
                className="inline-flex min-h-12 items-center justify-center gap-2 rounded-full bg-[#42A5F5] px-8 py-3.5 text-base font-bold text-[#071428] shadow-lg shadow-[#42A5F5]/20 transition hover:brightness-110 active:scale-[0.97]"
              >
                Quero fazer parte
                <ArrowRight size={18} />
              </Link>
              <button
                onClick={() => scrollTo("sobre")}
                className="inline-flex min-h-12 items-center justify-center gap-2 rounded-full border-2 border-white/20 px-8 py-3.5 text-base font-semibold text-white transition hover:bg-white/10 active:scale-[0.97]"
              >
                Saiba mais
                <ArrowDown size={18} />
              </button>
            </div>
          </Reveal>
        </div>

        <button
          onClick={() => scrollTo("sobre")}
          className="absolute bottom-8 left-1/2 -translate-x-1/2 animate-bounce text-white/30 transition hover:text-white/60"
          aria-label="Rolar para baixo"
        >
          <ArrowDown size={24} />
        </button>
      </section>

      {/* ── SOBRE NÓS ── */}
      <section
        id="sobre"
        className="px-5 py-24 sm:px-8 sm:py-32"
        style={{ background: "linear-gradient(180deg, #0a1e3d 0%, #071428 100%)" }}
      >
        <div className="mx-auto grid max-w-6xl gap-12 lg:grid-cols-2 lg:items-center">
          <Reveal direction="left">
            <div className="flex flex-col gap-4">
              <span className="text-sm font-bold uppercase tracking-[0.2em] text-[#42A5F5]">
                Sobre nós
              </span>
              <h2 className="text-4xl font-black leading-tight text-white sm:text-5xl">
                Para quem o esporte
                <br />
                ainda não abriu a porta.
              </h2>
              <p className="text-lg leading-relaxed text-blue-200">
                Muitos jovens sonham com o esporte, mas encontram portas fechadas — peneiras
                difíceis, federações inacessíveis, times que não têm espaço pra quem está
                começando. O talento existe. A vontade existe. A oportunidade, não.
              </p>
              <p className="text-lg leading-relaxed text-blue-200">
                O Projeto Pegasus nasceu pra mudar isso. Somos uma{" "}
                <span className="font-bold text-white">iniciativa esportiva independente</span> com
                foco no desenvolvimento humano, social e comunitário — oferecendo a experiência real
                de atleta, com disciplina, responsabilidade e acolhimento.
              </p>
              <p className="text-lg font-bold text-[#42A5F5]">
                Não importa de onde você vem. Importa pra onde você quer ir.
              </p>
            </div>
          </Reveal>

          <Reveal direction="right" delay={150}>
            <div className="relative">
              <div
                className="overflow-hidden rounded-3xl border border-[#1565C0]/40 p-10 text-white shadow-2xl shadow-black/50"
                style={{ background: "linear-gradient(135deg, #0D47A1 0%, #1565C0 100%)" }}
              >
                <p className="text-3xl font-black leading-snug sm:text-4xl">
                  "Não é sobre quem já chegou.<br />É sobre quem quer chegar."
                </p>
                <div className="mt-8 flex items-center gap-3 border-t border-white/20 pt-6">
                  <img src={logoIcon} alt="Pegasus" className="h-10 w-10 rounded-xl object-contain" />
                  <div>
                    <p className="font-bold text-white">Projeto Pegasus</p>
                    <p className="text-sm text-[#42A5F5]">Voleibol e comunidade</p>
                  </div>
                </div>
              </div>
              <div className="absolute -bottom-5 -right-5 -z-10 h-28 w-28 rounded-full bg-[#42A5F5]/20 blur-xl" />
              <div className="absolute -left-5 -top-5 -z-10 h-20 w-20 rounded-full bg-[#1565C0]/30 blur-xl" />
            </div>
          </Reveal>
        </div>
      </section>

      {/* ── PILARES ── */}
      <section
        id="pilares"
        className="px-5 py-24 sm:px-8 sm:py-32"
        style={{ background: "linear-gradient(180deg, #071428 0%, #0a1e3d 100%)" }}
      >
        <div className="mx-auto max-w-6xl">
          <Reveal>
            <div className="mb-14 text-center">
              <span className="text-sm font-bold uppercase tracking-[0.2em] text-[#42A5F5]">
                O que nos define
              </span>
              <h2 className="mt-3 text-4xl font-black text-white sm:text-5xl">
                Nossos pilares
              </h2>
              <p className="mx-auto mt-4 max-w-xl text-lg text-blue-200">
                Seis valores que guiam tudo o que fazemos dentro e fora de quadra.
              </p>
            </div>
          </Reveal>

          <div className="grid gap-5 sm:grid-cols-2 xl:grid-cols-3">
            {PILLARS.map((p, i) => {
              const Icon = p.icon;
              return (
                <Reveal key={p.title} delay={i * 80}>
                  <article
                    className="flex gap-4 rounded-2xl border border-[#1565C0]/30 p-6 transition duration-200 hover:-translate-y-1 hover:border-[#42A5F5]/50 hover:shadow-lg hover:shadow-[#1565C0]/20"
                    style={{ background: "linear-gradient(135deg, #0d1f3c 0%, #0a1830 100%)" }}
                  >
                    <div className="mt-0.5 grid h-11 w-11 shrink-0 place-items-center rounded-xl bg-[#1565C0]/30 text-[#42A5F5]">
                      <Icon size={22} />
                    </div>
                    <div>
                      <h3 className="font-black text-white">{p.title}</h3>
                      <p className="mt-1.5 text-sm leading-6 text-blue-200">{p.text}</p>
                    </div>
                  </article>
                </Reveal>
              );
            })}
          </div>
        </div>
      </section>

      {/* ── PARA QUEM É ── */}
      <section
        id="para-quem"
        className="px-5 py-24 sm:px-8 sm:py-32"
        style={{ background: "linear-gradient(180deg, #0a1e3d 0%, #071428 100%)" }}
      >
        <div className="mx-auto max-w-6xl">
          <Reveal>
            <div className="mb-14 text-center">
              <span className="text-sm font-bold uppercase tracking-[0.2em] text-[#42A5F5]">
                Para quem é
              </span>
              <h2 className="mt-3 text-4xl font-black text-white sm:text-5xl">
                Esta página é pra você?
              </h2>
              <p className="mx-auto mt-4 max-w-xl text-lg text-blue-200">
                O Pegasus reúne jovens, famílias e empresas em torno de um objetivo comum.
              </p>
            </div>
          </Reveal>

          <div className="grid gap-6 md:grid-cols-3">
            {FOR_WHOM.map((card, i) => {
              const Icon = card.icon;
              return (
                <Reveal key={card.label} delay={i * 120}>
                  <article
                    className={`flex h-full flex-col rounded-2xl border p-7 ${card.bg} ${card.border} transition duration-200 hover:-translate-y-1 hover:shadow-xl hover:shadow-black/40`}
                  >
                    <span className={`inline-grid h-11 w-11 place-items-center rounded-xl ${card.iconBg} text-white`}>
                      <Icon size={20} />
                    </span>
                    <p className="mt-4 text-xs font-bold uppercase tracking-widest text-[#42A5F5]/80">
                      {card.label}
                    </p>
                    <h3 className="mt-1 text-xl font-black text-white">{card.title}</h3>
                    <p className="mt-3 flex-1 text-sm leading-6 text-blue-200">{card.text}</p>
                    <a
                      href={card.href}
                      className={`mt-6 inline-flex items-center gap-2 self-start rounded-full border px-5 py-2.5 text-sm font-bold transition duration-200 active:scale-[0.97] ${card.ctaColor}`}
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

      {/* ── CTA FINAL ── */}
      <section
        className="px-5 py-24 sm:px-8 sm:py-32"
        style={{ background: "radial-gradient(ellipse 90% 70% at 50% 50%, #1a3a6b 0%, #071428 100%)" }}
      >
        <div
          className="relative mx-auto max-w-4xl overflow-hidden rounded-3xl border border-[#1565C0]/40 p-10 text-center text-white shadow-2xl shadow-black/60 sm:p-16"
          style={{ background: "linear-gradient(135deg, #0D47A1 0%, #1565C0 60%, #0a1e3d 100%)" }}
        >
          <div className="pointer-events-none absolute inset-0">
            <div className="absolute -right-20 -top-20 h-72 w-72 rounded-full bg-[#42A5F5]/20 blur-3xl" />
            <div className="absolute -bottom-20 -left-20 h-72 w-72 rounded-full bg-[#0D47A1]/30 blur-3xl" />
          </div>

          <div className="relative z-10">
            <Reveal direction="none">
              <img src={logoIcon} alt="Pegasus" className="mx-auto mb-6 h-16 w-16 rounded-2xl object-contain" />
              <h2 className="text-4xl font-black leading-tight sm:text-5xl md:text-6xl">
                Sua vez de entrar<br />em quadra.
              </h2>
              <p className="mx-auto mt-5 max-w-lg text-lg text-blue-100">
                Você não precisa de peneira, de histórico, de experiência prévia.
                Precisa só de vontade.{" "}
                <span className="font-bold text-[#42A5F5]">Vem fazer parte do Pegasus.</span>
              </p>
              <div className="mt-10 flex flex-col items-center gap-3 sm:flex-row sm:justify-center">
                <Link
                  to="/inscricao"
                  className="inline-flex min-h-12 items-center gap-2 rounded-full bg-[#42A5F5] px-10 py-4 text-lg font-black text-[#071428] shadow-xl shadow-[#42A5F5]/20 transition hover:brightness-105 active:scale-[0.97]"
                >
                  Quero fazer parte do Pegasus
                  <ArrowRight size={20} />
                </Link>
                <a
                  href="mailto:pegasus.sportteam@gmail.com"
                  className="inline-flex min-h-12 items-center gap-2 rounded-full border border-white/25 px-8 py-4 text-base font-semibold text-white transition hover:bg-white/10 active:scale-[0.97]"
                >
                  <Mail size={16} />
                  Fale com a gente
                </a>
              </div>
            </Reveal>
          </div>
        </div>
      </section>

      {/* ── FOOTER ── */}
      <footer className="border-t border-white/10 bg-[#040e1e] px-5 pb-10 pt-10 sm:px-8">
        <div className="mx-auto max-w-6xl">
          <div className="flex flex-col items-center gap-6 sm:flex-row sm:justify-between">
            <button onClick={scrollToTop} className="flex items-center gap-3 transition hover:opacity-80">
              <img src={logoIcon} alt="Pegasus" className="h-9 w-9 rounded-xl object-contain" />
              <div className="text-left">
                <p className="font-black text-white">Projeto Pegasus</p>
                <p className="text-xs text-[#42A5F5]">Voleibol · Inclusão · Propósito</p>
              </div>
            </button>

            <div className="flex flex-wrap items-center justify-center gap-3">
              <a
                href="https://instagram.com/volei_pegasus"
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-2 rounded-full border border-white/15 px-4 py-2 text-sm font-semibold text-white/80 transition hover:border-pink-400 hover:text-pink-400"
              >
                <Instagram size={15} />
                @volei_pegasus
              </a>
              <a
                href="mailto:pegasus.sportteam@gmail.com"
                className="flex items-center gap-2 rounded-full border border-white/15 px-4 py-2 text-sm font-semibold text-white/80 transition hover:border-[#42A5F5] hover:text-[#42A5F5]"
              >
                <Mail size={15} />
                pegasus.sportteam@gmail.com
              </a>
            </div>
          </div>

          <p className="mt-8 text-center text-xs text-blue-400/50">
            © {new Date().getFullYear()} Projeto Pegasus · Todos os direitos reservados.
          </p>
        </div>
      </footer>

      {/* ── SCROLL TO TOP ── */}
      <button
        onClick={scrollToTop}
        className={`fixed bottom-6 right-6 z-40 grid h-11 w-11 place-items-center rounded-full border border-white/20 bg-[#071428]/90 text-white/60 shadow-lg shadow-black/40 backdrop-blur transition-all duration-300 hover:border-[#42A5F5]/60 hover:text-[#42A5F5] active:scale-95 ${
          showScrollTop ? "translate-y-0 opacity-100" : "pointer-events-none translate-y-4 opacity-0"
        }`}
        aria-label="Voltar ao topo"
      >
        <ArrowUp size={18} />
      </button>
    </main>
  );
}
