import {
  CalendarDays,
  ChevronLeft,
  ChevronRight,
  ClipboardList,
  LayoutDashboard,
  MessageSquarePlus,
  Star,
  Trophy,
  UserCheck,
  UserRound,
  X,
} from "lucide-react";
import { useState } from "react";
import { useNavigate } from "react-router-dom";

type Slide = {
  icon: React.ElementType;
  color: string;
  title: string;
  description: string;
  path?: string;
  cta?: string;
};

const SLIDES: Slide[] = [
  {
    icon: Trophy,
    color: "text-pegasus-primary bg-pegasus-primary/10",
    title: "Bem-vindo ao Pegasus Manager!",
    description:
      "Este é o sistema do Projeto Pegasus. Aqui você acompanha seus treinos, jogos e se comunica com a equipe. Veja a seguir tudo o que está disponível para você.",
  },
  {
    icon: LayoutDashboard,
    color: "text-blue-600 bg-blue-50 dark:bg-blue-900/20",
    title: "Dashboard",
    description:
      "A tela inicial mostra um resumo do seu desempenho: sua frequência geral nos treinos, os próximos jogos e novidades do clube.",
    path: "/app",
    cta: "Ver Dashboard",
  },
  {
    icon: UserCheck,
    color: "text-emerald-600 bg-emerald-50 dark:bg-emerald-900/20",
    title: "Minha Frequência",
    description:
      "Veja sua presença em cada treino, mês a mês. Acompanhe sua frequência geral e compare com os períodos anteriores.",
    path: "/app/atleta/frequencia",
    cta: "Ver Frequência",
  },
  {
    icon: CalendarDays,
    color: "text-violet-600 bg-violet-50 dark:bg-violet-900/20",
    title: "Minhas Convocações",
    description:
      "Quando o treinador te convocar para um amistoso, você será notificado e o jogo aparece aqui. Fique por dentro das datas e adversários.",
    path: "/app/jogos/minhas-convocacoes",
    cta: "Ver Convocações",
  },
  {
    icon: Trophy,
    color: "text-amber-600 bg-amber-50 dark:bg-amber-900/20",
    title: "Jogos e Resultados",
    description:
      "Consulte o histórico de jogos do Pegasus: resultados, placares, sets e informações de cada partida disputada.",
    path: "/app/jogos",
    cta: "Ver Jogos",
  },
  {
    icon: Star,
    color: "text-yellow-500 bg-yellow-50 dark:bg-yellow-900/20",
    title: "Avaliar Treino",
    description:
      "Após cada treino você pode deixar sua avaliação: qualidade, intensidade e observações. Seu feedback ajuda o treinador a melhorar as sessões.",
    path: "/app/atleta/avaliar-treino",
    cta: "Avaliar Treino",
  },
  {
    icon: MessageSquarePlus,
    color: "text-teal-600 bg-teal-50 dark:bg-teal-900/20",
    title: "Sugestões",
    description:
      "Tem uma ideia ou algo que gostaria de ver no clube? Envie suas sugestões diretamente para a gestão do Pegasus.",
    path: "/app/atleta/sugestoes",
    cta: "Enviar Sugestão",
  },
  {
    icon: UserRound,
    color: "text-slate-600 bg-slate-100 dark:bg-slate-700",
    title: "Meu Perfil",
    description:
      "Consulte e atualize seus dados pessoais, foto e informações de contato. Mantenha seu cadastro sempre em dia.",
    path: "/app/meu-perfil",
    cta: "Ver Perfil",
  },
  {
    icon: ClipboardList,
    color: "text-pegasus-primary bg-pegasus-primary/10",
    title: "Tudo pronto!",
    description:
      "Você pode acessar todas essas telas pelo menu lateral a qualquer momento. Se tiver dúvidas, fale com a sua equipe de gestão. Bons treinos!",
  },
];

const STORAGE_KEY = "pegasus-manager:athlete-tour-seen";

export function useAthleteWelcomeTour() {
  const seen = localStorage.getItem(STORAGE_KEY) === "1";
  const [open, setOpen] = useState(!seen);

  function close() {
    localStorage.setItem(STORAGE_KEY, "1");
    setOpen(false);
  }

  function reopen() {
    setOpen(true);
  }

  return { open, close, reopen };
}

export function AthleteWelcomeTour({ onClose }: { onClose: () => void }) {
  const [step, setStep] = useState(0);
  const navigate = useNavigate();
  const slide = SLIDES[step];
  const Icon = slide.icon;
  const isLast = step === SLIDES.length - 1;
  const isFirst = step === 0;

  function handleCta() {
    if (slide.path) {
      onClose();
      navigate(slide.path);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-sm">
      <div className="panel relative flex w-full max-w-md flex-col overflow-hidden">
        {/* Fechar */}
        <button
          type="button"
          onClick={onClose}
          className="absolute right-4 top-4 rounded-lg p-1 text-slate-400 transition hover:text-slate-600 dark:hover:text-slate-200"
          aria-label="Fechar tutorial"
        >
          <X size={18} />
        </button>

        {/* Indicadores de progresso */}
        <div className="flex gap-1.5 px-6 pt-5">
          {SLIDES.map((_, i) => (
            <button
              key={i}
              type="button"
              onClick={() => setStep(i)}
              className={`h-1.5 flex-1 rounded-full transition-all ${
                i === step
                  ? "bg-pegasus-primary"
                  : i < step
                  ? "bg-pegasus-primary/30"
                  : "bg-slate-200 dark:bg-slate-700"
              }`}
              aria-label={`Ir para slide ${i + 1}`}
            />
          ))}
        </div>

        {/* Conteúdo */}
        <div className="flex flex-col items-center px-8 py-8 text-center">
          <div className={`mb-5 flex h-16 w-16 items-center justify-center rounded-2xl ${slide.color}`}>
            <Icon size={32} />
          </div>

          <h2 className="mb-3 text-xl font-black text-pegasus-navy">{slide.title}</h2>
          <p className="text-sm leading-relaxed text-slate-500">{slide.description}</p>

          {slide.path && slide.cta && (
            <button
              type="button"
              onClick={handleCta}
              className="mt-5 rounded-xl border border-pegasus-primary px-5 py-2 text-sm font-bold text-pegasus-primary transition hover:bg-pegasus-primary hover:text-white"
            >
              {slide.cta} →
            </button>
          )}
        </div>

        {/* Navegação */}
        <div className="flex items-center justify-between border-t border-blue-50 px-6 py-4 dark:border-slate-700">
          <button
            type="button"
            onClick={() => setStep((s) => s - 1)}
            disabled={isFirst}
            className="flex items-center gap-1 rounded-xl px-3 py-2 text-sm font-bold text-slate-400 transition hover:text-pegasus-navy disabled:opacity-0 dark:hover:text-slate-200"
          >
            <ChevronLeft size={16} />
            Anterior
          </button>

          <span className="text-xs text-slate-400">
            {step + 1} / {SLIDES.length}
          </span>

          {isLast ? (
            <button
              type="button"
              onClick={onClose}
              className="flex items-center gap-1 rounded-xl bg-pegasus-primary px-4 py-2 text-sm font-bold text-white transition hover:bg-pegasus-primary/90"
            >
              Começar
            </button>
          ) : (
            <button
              type="button"
              onClick={() => setStep((s) => s + 1)}
              className="flex items-center gap-1 rounded-xl px-3 py-2 text-sm font-bold text-pegasus-primary transition hover:bg-pegasus-ice dark:hover:bg-slate-700"
            >
              Próximo
              <ChevronRight size={16} />
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
