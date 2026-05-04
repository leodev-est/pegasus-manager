import { ArrowRight, Banknote, CalendarDays, ClipboardList, Dumbbell, LogIn, Trophy, Users, type LucideIcon } from "lucide-react";
import { Link } from "react-router-dom";
import logoFull from "../../assets/logo/logo-full.png";
import { InstallPwaButton } from "../../components/pwa/InstallPwaButton";

type LandingSection = { title: string; text: string; icon: LucideIcon };

const landingSections: LandingSection[] = [
  {
    title: "Propósito e Inclusão",
    text: "Iniciativa esportiva independente com foco no desenvolvimento humano, social e comunitário, oferecendo a experiência real de atleta a jovens e adultos, com ênfase na disciplina, responsabilidade e acolhimento.",
    icon: Users,
  },
  {
    title: "Modalidade Principal",
    text: "Voleibol como atividade central, com plano de expansão para outras modalidades.",
    icon: Dumbbell,
  },
  {
    title: "Público-alvo",
    text: "Jovens Sub-19 e adultos de ambos os gêneros. Atletas em formação e reinserção esportiva.",
    icon: ClipboardList,
  },
  {
    title: "Impacto Comunitário",
    text: "Prevenção à evasão esportiva, redução da exposição de jovens a riscos sociais, estímulo à saúde física e mental, fortalecimento do vínculo comunitário.",
    icon: Banknote,
  },
  {
    title: "Cronograma Flexível",
    text: "Proposta de utilização do espaço aos finais de semana em horários variados e em dias úteis no período noturno, com total flexibilidade para alinhamento conforme a disponibilidade institucional.",
    icon: CalendarDays,
  },
  {
    title: "Foco Social e Comunitário",
    text: "Buscamos ocupar horários disponíveis das quadras por meio de parceria com foco em um legado esportivo sustentável e organizado para a comunidade local.",
    icon: Users,
  },
];

const PUBLIC_REGISTRATION_FORM_URL =
  "https://docs.google.com/forms/d/e/1FAIpQLScEitglNJVRgXHJBvBi6uELuqLouUD95BBG4Z2e67d2d2Ha2A/viewform";

export function LandingPage() {
  return (
    <main className="min-h-screen bg-white text-pegasus-navy">
      <section className="relative overflow-hidden bg-pegasus-navy text-white">
        <div className="absolute inset-0 opacity-25">
          <div className="h-full w-full bg-[radial-gradient(circle_at_20%_20%,#42A5F5_0,transparent_32%),linear-gradient(135deg,transparent_0,transparent_48%,rgba(255,255,255,0.18)_49%,transparent_50%)]" />
        </div>

        <header className="relative z-10 mx-auto flex max-w-7xl items-center justify-between gap-4 px-4 py-5 sm:px-6 sm:py-6">
          <div className="flex items-center gap-3">
            <img
              src={logoFull}
              alt="Projeto Pegasus"
              className="h-12 w-24 rounded-xl object-contain sm:h-14 sm:w-28"
            />
            <div>
              <p className="font-bold">Projeto Pegasus</p>
              <p className="text-xs text-blue-100">Voleibol e comunidade</p>
            </div>
          </div>
          <Link
            to="/login"
            className="focus-ring inline-flex items-center gap-2 rounded-full bg-white px-4 py-2 text-sm font-semibold text-pegasus-primary shadow-sm"
          >
            <LogIn size={17} />
            Sou Atleta
          </Link>
        </header>

        <div className="relative z-10 mx-auto grid max-w-7xl gap-8 px-4 pb-12 pt-8 sm:px-6 sm:pb-16 sm:pt-10 lg:grid-cols-[1.05fr_0.95fr] lg:items-center lg:pb-20">
          <div>
            <div className="inline-flex items-center gap-2 rounded-full border border-white/20 bg-white/10 px-4 py-2 text-sm font-semibold text-blue-50">
              <Trophy size={17} />
              Sistema esportivo social e organizado
            </div>
            <h1 className="mt-8 max-w-3xl text-4xl font-black leading-tight sm:text-5xl md:text-6xl">
              Projeto Pegasus
            </h1>
            <p className="mt-6 max-w-2xl text-base leading-7 text-blue-50 sm:text-lg sm:leading-8">
              Uma iniciativa esportiva independente com foco no desenvolvimento humano,
              disciplina, acolhimento e impacto comunitário através do voleibol.
            </p>
            <div className="mt-8 flex flex-col gap-3 sm:flex-row">
              <a
                href={PUBLIC_REGISTRATION_FORM_URL}
                className="focus-ring inline-flex min-h-12 items-center justify-center gap-2 rounded-full bg-pegasus-sky px-6 py-3 font-bold text-pegasus-navy shadow-lg"
                rel="noopener noreferrer"
                target="_blank"
              >
                Quero me inscrever
                <ArrowRight size={18} />
              </a>
              <Link
                to="/login"
                className="focus-ring inline-flex min-h-12 items-center justify-center gap-2 rounded-full border border-white/30 px-6 py-3 font-bold text-white hover:bg-white/10"
            >
              Sou Atleta
              </Link>
              <InstallPwaButton className="min-h-12 rounded-full px-6 py-3" label="Instalar app" />
            </div>
          </div>

          <div className="relative overflow-hidden rounded-[1.5rem] border border-white/15 bg-white/[0.07] p-3 shadow-2xl shadow-blue-950/20 sm:rounded-[2rem] sm:p-4">
            <div className="rounded-[1.25rem] border border-white/10 bg-[#06182f]/75 p-3 sm:rounded-[1.75rem] sm:p-4">
              <img
                src={logoFull}
                alt="Projeto Pegasus"
                className="mx-auto h-auto w-full rounded-[1rem] object-contain shadow-xl sm:rounded-[1.25rem]"
              />
              <div className="mt-5 px-1 pb-1">
                <p className="text-sm font-semibold uppercase tracking-[0.2em] text-blue-100">
                  Voleibol
                </p>
                <p className="mt-3 max-w-md text-2xl font-black leading-tight sm:text-3xl">
                  Treinos, gestão e comunidade em um só lugar.
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="bg-pegasus-surface px-4 py-12 sm:px-6 sm:py-16">
        <div className="mx-auto grid max-w-7xl gap-5 md:grid-cols-2 xl:grid-cols-3">
          {landingSections.map((section) => {
            const Icon = section.icon;

            return (
              <article key={section.title} className="rounded-2xl border border-blue-100 bg-white p-6 shadow-soft">
                <span className="grid h-12 w-12 place-items-center rounded-2xl bg-pegasus-ice text-pegasus-primary">
                  <Icon size={22} />
                </span>
                <h2 className="mt-5 text-xl font-bold text-pegasus-navy">{section.title}</h2>
                <p className="mt-3 text-sm leading-6 text-slate-600">{section.text}</p>
              </article>
            );
          })}
        </div>
      </section>

      <section id="inscrição" className="px-4 py-12 sm:px-6 sm:py-14">
        <div className="mx-auto flex max-w-7xl flex-col gap-5 rounded-2xl bg-pegasus-primary p-5 text-white sm:rounded-3xl sm:p-8 md:flex-row md:items-center md:justify-between">
          <div>
            <p className="text-sm font-semibold uppercase tracking-[0.18em] text-blue-100">
              Inscrições e administração
            </p>
            <h2 className="mt-2 text-3xl font-black">Pegasus Manager</h2>
            <p className="mt-2 max-w-2xl text-blue-50">
              Plataforma preparada para organizar atletas, treinos, financeiro, operação e
              comunicação do projeto.
            </p>
          </div>
          <div className="flex w-full flex-col gap-3 sm:w-auto sm:flex-row">
            <a
              href={PUBLIC_REGISTRATION_FORM_URL}
              className="focus-ring inline-flex min-h-12 items-center justify-center gap-2 rounded-full bg-white px-6 py-3 font-bold text-pegasus-primary"
              rel="noopener noreferrer"
              target="_blank"
            >
              Quero participar
              <ArrowRight size={18} />
            </a>
            <Link
              to="/login"
              className="focus-ring inline-flex min-h-12 items-center justify-center gap-2 rounded-full border border-white/30 px-6 py-3 font-bold text-white hover:bg-white/10"
            >
              Sou Atleta
            </Link>
          </div>
        </div>
      </section>
    </main>
  );
}


