import {
  CalendarDays,
  Cake,
  ClipboardList,
  CreditCard,
  Loader2,
  MessageSquare,
  Star,
  TrendingUp,
  Trophy,
  UserCheck,
  UserPlus,
  Users,
  WalletCards,
  type LucideIcon,
} from "lucide-react";
import { useCallback, useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { CartesianGrid, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { useAuth } from "../../auth/AuthContext";
import { useTour } from "../../tours/useTour";
import { ORG_NAME } from "../../config/org";
import { Skeleton } from "../../components/ui/Skeleton";
import { useToast } from "../../components/ui/Toast";
import { athleteApplicationService, type AthleteApplication } from "../../services/athleteApplicationService";
import { muralService, type MuralPost } from "../../services/muralService";
import { athleteService, type MonthlyBirthday } from "../../services/athleteService";
import { useAthletes } from "../../hooks/useAthletes";
import { getApiErrorMessage } from "../../services/api";
import { attendanceService, type MonthlyAttendanceStat, type TotalFrequency } from "../../services/attendanceService";
import { evaluationService, type AthleteEvaluation } from "../../services/evaluationService";
import { financeService, type FinanceSummary } from "../../services/financeService";
import { gameConvocationService, type MyConvocation } from "../../services/gameConvocationService";
import { gamesService, type Game } from "../../services/gamesService";
import { kanbanService, type ManagementTask } from "../../services/kanbanService";
import { marketingService, type MarketingTask } from "../../services/marketingService";
import { trainingService, type Training } from "../../services/trainingService";

type DashboardData = {
  applications: AthleteApplication[];
  trainings: Training[];
  financeSummary: FinanceSummary | null;
  managementTasks: ManagementTask[];
  marketingTasks: MarketingTask[];
  upcomingGames: Game[];
};

type DashboardStat = {
  helper: string;
  href: string;
  icon: LucideIcon;
  label: string;
  value: string;
};

const emptyDashboardData: DashboardData = {
  applications: [],
  trainings: [],
  financeSummary: null,
  managementTasks: [],
  marketingTasks: [],
  upcomingGames: [],
};

function formatCurrency(value: number) {
  return new Intl.NumberFormat("pt-BR", {
    currency: "BRL",
    style: "currency",
  }).format(value);
}

function formatDateTime(value: string) {
  const date = new Date(value);

  if (Number.isNaN(date.getTime())) return "-";

  return new Intl.DateTimeFormat("pt-BR", {
    dateStyle: "short",
    timeStyle: "short",
  }).format(date);
}

function isThisWeek(value: string) {
  const date = new Date(value);

  if (Number.isNaN(date.getTime())) return false;

  const now = new Date();
  const start = new Date(now);
  const day = start.getDay();
  start.setDate(start.getDate() - day);
  start.setHours(0, 0, 0, 0);

  const end = new Date(start);
  end.setDate(start.getDate() + 7);

  return date >= start && date < end;
}

function getUpcomingTrainings(trainings: Training[]) {
  const now = new Date();

  return trainings
    .filter((training) => new Date(training.date) >= now)
    .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
}

function countByStatus<T extends { status: string }>(items: T[], status: string) {
  return items.filter((item) => item.status === status).length;
}

function isDashboardStat(stat: DashboardStat | null): stat is DashboardStat {
  return Boolean(stat);
}

function formatMonth(value: string) {
  const [year, month] = value.split("-").map(Number);
  return new Date(year, month - 1).toLocaleDateString("pt-BR", { month: "short", year: "2-digit" });
}

const TOUR_STEPS = [
  {
    popover: {
      title: `🏠 Dashboard ${ORG_NAME}`,
      description: "Visão geral do clube em tempo real. Os indicadores visíveis dependem do seu perfil de acesso.",
    },
  },
  {
    element: "[data-tour='dash-stats']",
    popover: {
      title: "Indicadores principais",
      description: "Atletas, treinos, caixa, tarefas e escolas — tudo consolidado numa leitura rápida.",
      side: "bottom" as const,
    },
  },
  {
    element: "[data-tour='dash-mural']",
    popover: {
      title: "Avisos do clube",
      description: "Últimos comunicados publicados pelo RH ou gestão. Clique em 'Ver todos' para a lista completa.",
      side: "top" as const,
    },
  },
];

export function DashboardPage() {
  const { hasPermission, user } = useAuth();
  const { showToast } = useToast();
  const [data, setData] = useState<DashboardData>(emptyDashboardData);
  const [isLoading, setIsLoading] = useState(true);
  const [monthlyBirthdays, setMonthlyBirthdays] = useState<MonthlyBirthday[]>([]);
  const [myFrequency, setMyFrequency] = useState<TotalFrequency | null>(null);
  const [monthlyStats, setMonthlyStats] = useState<MonthlyAttendanceStat[]>([]);
  const [myEvaluation, setMyEvaluation] = useState<AthleteEvaluation | null>(null);
  const [myConvocations, setMyConvocations] = useState<MyConvocation[]>([]);
  const [muralPosts, setMuralPosts] = useState<MuralPost[]>([]);

  const canSeeRh = hasPermission(["rh"]);
  const { data: athletes = [] } = useAthletes(undefined, { enabled: canSeeRh });
  const canSeeFinance = hasPermission(["financeiro"]);
  const canSeeManagement = hasPermission(["gestao"]);
  const canSeeMarketing = hasPermission(["marketing"]);
  const canSeeTrainings = hasPermission(["treinos"]);
  const isAthlete =
    hasPermission(["atleta"]) &&
    !hasPermission(["rh"]) &&
    !hasPermission(["gestao"]) &&
    !hasPermission(["financeiro"]);

  const loadDashboard = useCallback(async () => {
    setIsLoading(true);

    try {
      const currentMonth = new Date().toISOString().slice(0, 7);
      const nextMonth = (() => {
        const d = new Date();
        d.setMonth(d.getMonth() + 1);
        return d.toISOString().slice(0, 7);
      })();

      function ok<T>(result: PromiseSettledResult<T>, fallback: T): T {
        return result.status === "fulfilled" ? result.value : fallback;
      }

      const [
        applicationsRes,
        trainingsRes,
        financeSummaryRes,
        managementTasksRes,
        marketingTasksRes,
        gamesThisMonthRes,
        gamesNextMonthRes,
      ] = await Promise.allSettled([
        canSeeRh ? athleteApplicationService.getAll() : Promise.resolve([]),
        canSeeTrainings ? trainingService.getAll() : Promise.resolve([]),
        canSeeFinance ? financeService.getSummary() : Promise.resolve(null),
        canSeeManagement ? kanbanService.getTasks({ area: "management" }) : Promise.resolve([]),
        canSeeMarketing ? marketingService.getTasks() : Promise.resolve([]),
        gamesService.getAll(currentMonth),
        gamesService.getAll(nextMonth),
      ]);

      const gamesThisMonth = ok(gamesThisMonthRes, []);
      const gamesNextMonth = ok(gamesNextMonthRes, []);
      const now = new Date();
      const upcomingGames = [...gamesThisMonth, ...gamesNextMonth]
        .filter((g) => new Date(g.date) >= now)
        .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime())
        .slice(0, 5);

      setData({
        applications: ok(applicationsRes, []),
        trainings: ok(trainingsRes, []),
        financeSummary: ok(financeSummaryRes, null),
        managementTasks: ok(managementTasksRes, []),
        marketingTasks: ok(marketingTasksRes, []),
        upcomingGames,
      });

      athleteService.getBirthdaysThisMonth().then(setMonthlyBirthdays).catch(() => {});

      if (canSeeTrainings) {
        attendanceService.getMonthlyStats().then(setMonthlyStats).catch(() => {});
      }

      if (isAthlete) {
        attendanceService.getMyTotalFrequency().then(setMyFrequency).catch(() => {});
        evaluationService.getMyEvaluation().then(setMyEvaluation).catch(() => {});
        gameConvocationService.getMyConvocations().then(setMyConvocations).catch(() => {});
      }
      muralService.list().then((posts) => setMuralPosts(posts.slice(0, 3))).catch(() => {});
    } catch (error) {
      showToast(getApiErrorMessage(error), "error");
    } finally {
      setIsLoading(false);
    }
  }, [
    canSeeFinance,
    canSeeManagement,
    canSeeMarketing,
    canSeeRh,
    canSeeTrainings,
    isAthlete,
    showToast,
  ]);

  useEffect(() => {
    loadDashboard();
  }, [loadDashboard]);

  useTour("dashboard:v1", isLoading ? [] : TOUR_STEPS);

  const upcomingTrainings = useMemo(() => getUpcomingTrainings(data.trainings), [data.trainings]);
  const nextTraining = upcomingTrainings[0];
  const trainingsThisWeek = data.trainings.filter((training) => isThisWeek(training.date)).length;
  const activeAthletes = countByStatus(athletes, "ativo");
  const testeAthletes = countByStatus(athletes, "teste");
  const pendingApplications = countByStatus(data.applications, "pendente");
  const activeTasks = [
    ...data.managementTasks.filter((task) => task.status !== "done"),
    ...data.marketingTasks.filter((task) => task.status !== "published"),
  ];

  const stats = [
    canSeeRh
      ? {
          helper: `${pendingApplications} inscrição(ões) pendente(s)`,
          href: "/app/rh/atletas",
          icon: UserCheck,
          label: "Atletas ativos",
          value: String(activeAthletes),
        }
      : null,
    canSeeRh
      ? {
          helper: "Aguardando aprovação para ativo",
          href: "/app/rh/atletas?status=teste",
          icon: Users,
          label: "Atletas em teste",
          value: String(testeAthletes),
        }
      : null,
    canSeeTrainings
      ? {
          helper: nextTraining ? formatDateTime(nextTraining.date) : "Nenhum treino futuro",
          href: "/app/treinos",
          icon: CalendarDays,
          label: "Treinos esta semana",
          value: String(trainingsThisWeek),
        }
      : null,
    canSeeFinance
      ? {
          helper: "Saldo consolidado do financeiro",
          href: "/app/financeiro",
          icon: WalletCards,
          label: "Caixa atual",
          value: formatCurrency(data.financeSummary?.currentCash ?? 0),
        }
      : null,
    canSeeManagement || canSeeMarketing
      ? {
          helper: "Gestão e marketing",
          href: "/app/gestao/kanban",
          icon: ClipboardList,
          label: "Tarefas em andamento",
          value: String(activeTasks.length),
        }
      : null,
    canSeeRh
      ? {
          helper: "Aguardando análise",
          href: "/app/rh/inscricoes",
          icon: UserPlus,
          label: "Inscrições pendentes",
          value: String(pendingApplications),
        }
      : null,
    canSeeFinance
      ? {
          helper: `${data.financeSummary?.overdueMonthlyPayments ?? 0} em atraso`,
          href: "/app/financeiro",
          icon: CreditCard,
          label: "Mensalidades em aberto",
          value: String(
            (data.financeSummary?.pendingMonthlyPayments ?? 0) +
              (data.financeSummary?.overdueMonthlyPayments ?? 0),
          ),
        }
      : null,
  ].filter(isDashboardStat);

  return (
    <div className="w-full max-w-full space-y-6 overflow-hidden">
      <div className="flex items-baseline gap-2.5">
        <h1 className="text-2xl font-black text-pegasus-navy">Dashboard</h1>
        <span className="text-sm text-stone-400">Bem-vindo, {user?.name?.split(" ")[0]}</span>
      </div>

      {isLoading ? (
        <div className="space-y-6">
          <section className="panel flex flex-wrap divide-x divide-stone-100 overflow-hidden dark:divide-slate-700">
            {Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className="flex min-w-[220px] flex-1 items-center gap-3.5 px-6 py-5">
                <Skeleton className="h-10 w-10 shrink-0 rounded-lg" />
                <div className="min-w-0 flex-1 space-y-2">
                  <Skeleton className="h-2.5 w-20" />
                  <Skeleton className="h-5 w-12" />
                </div>
              </div>
            ))}
          </section>
          <section className="panel p-5">
            <Skeleton className="h-4 w-40" />
            <Skeleton className="mt-2 h-3 w-56" />
            <Skeleton className="mt-5 h-44 w-full" />
          </section>
          <section className="grid gap-6 xl:grid-cols-[1.2fr_0.8fr]">
            <div className="panel space-y-3 p-6">
              <Skeleton className="h-5 w-40" />
              <Skeleton className="h-14 w-full" />
              <Skeleton className="h-14 w-full" />
            </div>
            <div className="panel space-y-3 p-6">
              <Skeleton className="h-5 w-32" />
              <Skeleton className="h-10 w-full" />
              <Skeleton className="h-10 w-full" />
            </div>
          </section>
        </div>
      ) : (
        <>
          <section data-tour="dash-stats" className="panel flex flex-wrap divide-x divide-stone-100 overflow-hidden dark:divide-slate-700">
            {stats.map((stat) => {
              const Icon = stat.icon;
              return (
                <Link
                  key={stat.label}
                  to={stat.href}
                  className="focus-ring flex min-w-[220px] flex-1 items-center gap-3.5 px-6 py-5 transition hover:bg-stone-50 dark:hover:bg-slate-700/40"
                >
                  <span className="grid h-10 w-10 shrink-0 place-items-center rounded-lg bg-emerald-50 text-emerald-600 dark:bg-emerald-500/10 dark:text-emerald-400">
                    <Icon size={19} />
                  </span>
                  <div className="min-w-0">
                    <p className="truncate text-[11px] font-bold uppercase tracking-wide text-stone-400">{stat.label}</p>
                    <p className="mt-0.5 text-xl font-black text-pegasus-navy tabular-nums">{stat.value}</p>
                  </div>
                </Link>
              );
            })}
          </section>

          {/* Painel do atleta */}
          {isAthlete && (
            <section className="space-y-5">
              {/* Próximo treino — destaque */}
              <div className="rounded-2xl bg-pegasus-navy p-5 text-white">
                <p className="text-xs font-semibold uppercase tracking-[0.18em] text-stone-400">
                  Próximo treino
                </p>
                {nextTraining ? (
                  <>
                    <p className="mt-1 text-2xl font-black">{nextTraining.title}</p>
                    <p className="mt-1 text-sm text-stone-300">{formatDateTime(nextTraining.date)}</p>
                    {nextTraining.category && (
                      <span className="mt-2 inline-block rounded-full bg-white/10 px-3 py-0.5 text-xs font-semibold text-stone-200">
                        {nextTraining.category}
                      </span>
                    )}
                  </>
                ) : (
                  <p className="mt-1 text-lg font-bold text-stone-300">
                    Nenhum treino futuro agendado.
                  </p>
                )}
              </div>

              {/* Convocações + Avaliação */}
              <div className="grid gap-5 xl:grid-cols-2">
                {/* Minhas convocações */}
                <div className="panel p-5">
                  <div className="mb-4 flex items-center gap-3">
                    <Trophy className="text-pegasus-primary" size={20} />
                    <div>
                      <h2 className="font-black text-pegasus-navy">Minhas Convocações</h2>
                      <p className="text-sm text-slate-500">Jogos futuros em que você está convocado(a)</p>
                    </div>
                  </div>
                  {myConvocations.length === 0 ? (
                    <p className="rounded-lg bg-pegasus-surface p-4 text-sm text-slate-500">
                      Nenhuma convocação para jogos futuros.
                    </p>
                  ) : (
                    <div className="space-y-2">
                      {myConvocations.map((conv) => {
                        const daysUntil = Math.ceil(
                          (new Date(conv.game.date).getTime() - Date.now()) / 86_400_000,
                        );
                        return (
                          <div
                            key={conv.id}
                            className="flex items-center justify-between rounded-lg bg-pegasus-surface p-3"
                          >
                            <div>
                              <p className="text-sm font-bold text-pegasus-navy">
                                vs {conv.game.opponent}
                              </p>
                              <p className="text-xs text-slate-500">
                                {new Date(conv.game.date).toLocaleDateString("pt-BR", {
                                  weekday: "short",
                                  day: "2-digit",
                                  month: "short",
                                  timeZone: "UTC",
                                })}
                              </p>
                            </div>
                            <span
                              className={`rounded-full px-2.5 py-0.5 text-xs font-bold ${
                                daysUntil <= 0
                                  ? "bg-rose-100 text-rose-700"
                                  : daysUntil === 1
                                  ? "bg-amber-100 text-amber-700"
                                  : "bg-emerald-100 text-emerald-700"
                              }`}
                            >
                              {daysUntil <= 0 ? "Hoje!" : daysUntil === 1 ? "Amanhã!" : `Em ${daysUntil} dias`}
                            </span>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>

                {/* Avaliação do treinador */}
                <div className="panel p-5">
                  <div className="mb-4 flex items-center gap-3">
                    <Star className="text-pegasus-primary" size={20} />
                    <div>
                      <h2 className="font-black text-pegasus-navy">Avaliação do Treinador</h2>
                      <p className="text-sm text-slate-500">Notas mais recentes</p>
                    </div>
                  </div>
                  {!myEvaluation || myEvaluation.overall === null ? (
                    <p className="rounded-lg bg-pegasus-surface p-4 text-sm text-slate-500">
                      Nenhuma avaliação do treinador ainda.
                    </p>
                  ) : (
                    <div className="space-y-2">
                      {(
                        [
                          { label: "Técnico", value: myEvaluation.technical },
                          { label: "Físico", value: myEvaluation.physical },
                          { label: "Tático", value: myEvaluation.tactical },
                          { label: "Mental", value: myEvaluation.mental },
                        ] as { label: string; value: number | null }[]
                      )
                        .filter((i) => i.value !== null)
                        .map((item) => (
                          <div key={item.label} className="flex items-center gap-3">
                            <span className="w-16 text-xs font-semibold text-slate-500">
                              {item.label}
                            </span>
                            <div className="h-2 flex-1 overflow-hidden rounded-full bg-slate-100 dark:bg-slate-700">
                              <div
                                className="h-full rounded-full bg-pegasus-primary"
                                style={{ width: `${((item.value ?? 0) / 10) * 100}%` }}
                              />
                            </div>
                            <span className="w-6 text-right text-sm font-bold text-pegasus-navy">
                              {item.value}
                            </span>
                          </div>
                        ))}
                      <div className="mt-3 rounded-lg bg-pegasus-ice p-3 text-center dark:bg-slate-700/50">
                        <p className="text-xs text-slate-500">Nota geral</p>
                        <p className="text-3xl font-black text-pegasus-primary">{myEvaluation.overall}</p>
                      </div>
                    </div>
                  )}
                </div>
              </div>

              {/* Frequência */}
              <div className="panel overflow-hidden">
                <div className="flex items-center gap-3 border-b border-stone-100 p-5 dark:border-slate-700">
                  <TrendingUp className="text-pegasus-primary" size={20} />
                  <div>
                    <h2 className="font-black text-pegasus-navy">Minha Frequência</h2>
                    <p className="text-sm text-slate-500">Presença em todos os treinos</p>
                  </div>
                </div>
                {myFrequency ? (
                  <div className="grid gap-4 p-5 sm:grid-cols-4">
                    {[
                      { label: "Treinos", value: myFrequency.totalTreinos, color: "text-pegasus-navy" },
                      { label: "Presenças", value: myFrequency.presencas, color: "text-emerald-600" },
                      { label: "Justificadas", value: myFrequency.justificadas, color: "text-amber-600" },
                      { label: "Faltas", value: myFrequency.faltas, color: "text-rose-600" },
                    ].map((item) => (
                      <div
                        key={item.label}
                        className="rounded-lg bg-slate-50 p-4 text-center dark:bg-slate-700/50"
                      >
                        <p className={`text-3xl font-black ${item.color}`}>{item.value}</p>
                        <p className="mt-1 text-sm text-slate-500">{item.label}</p>
                      </div>
                    ))}
                    <div className="col-span-full">
                      <div className="mb-1.5 flex items-center justify-between">
                        <span className="text-sm font-semibold text-slate-500">Aproveitamento geral</span>
                        <span
                          className={`text-lg font-black ${
                            (myFrequency.percentual ?? 0) >= 80
                              ? "text-emerald-600"
                              : (myFrequency.percentual ?? 0) >= 60
                              ? "text-amber-600"
                              : "text-rose-600"
                          }`}
                        >
                          {myFrequency.percentual ?? 0}%
                        </span>
                      </div>
                      <div className="h-3 overflow-hidden rounded-full bg-slate-100 dark:bg-slate-700">
                        <div
                          className={`h-full rounded-full transition-all ${
                            (myFrequency.percentual ?? 0) >= 80
                              ? "bg-emerald-500"
                              : (myFrequency.percentual ?? 0) >= 60
                              ? "bg-amber-500"
                              : "bg-rose-500"
                          }`}
                          style={{ width: `${myFrequency.percentual ?? 0}%` }}
                        />
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="flex items-center gap-2 p-5 text-sm text-slate-500">
                    <Loader2 className="animate-spin" size={16} /> Carregando...
                  </div>
                )}
              </div>
            </section>
          )}

          {/* Avisos do clube + Aniversariantes do mês + Próximos treinos */}
          {(() => {
            const cards = [
              muralPosts.length > 0 ? "mural" : null,
              "birthdays",
              canSeeTrainings ? "trainings" : null,
            ].filter((c): c is string => Boolean(c));
            const colsClass =
              cards.length === 1 ? "lg:grid-cols-1" : cards.length === 2 ? "lg:grid-cols-2" : "lg:grid-cols-3";

            if (cards.length === 0) return null;

            return (
              <section className={`grid gap-4 ${colsClass}`}>
                {muralPosts.length > 0 && (
                  <article data-tour="dash-mural" className="panel flex flex-col p-4">
                    <div className="mb-3 flex items-center justify-between gap-2">
                      <div className="flex items-center gap-2.5">
                        <span className="rounded-lg bg-pegasus-ice p-2 text-pegasus-primary">
                          <MessageSquare size={16} />
                        </span>
                        <h2 className="text-sm font-bold text-pegasus-navy">Avisos do clube</h2>
                      </div>
                      <Link to="/app/comunicados" className="text-xs font-semibold text-pegasus-primary hover:underline">
                        Ver todos
                      </Link>
                    </div>
                    <div className="max-h-56 space-y-2 overflow-y-auto slim-scroll pr-1">
                      {muralPosts.map((post) => (
                        <div key={post.id} className="rounded-lg bg-pegasus-surface p-2.5">
                          <div className="flex flex-wrap items-center gap-1.5">
                            <span className={`rounded-full px-2 py-0.5 text-[10px] font-bold ${
                              post.category === "urgente" ? "bg-rose-100 text-rose-700" :
                              post.category === "evento" ? "bg-violet-100 text-violet-700" :
                              "bg-stone-100 text-stone-600"
                            }`}>
                              {post.category === "urgente" ? "Urgente" : post.category === "evento" ? "Evento" : "Info"}
                            </span>
                            <span className="text-[10px] text-slate-400">
                              {new Intl.DateTimeFormat("pt-BR", { day: "2-digit", month: "short" }).format(new Date(post.createdAt))}
                            </span>
                          </div>
                          <p className="mt-1 truncate text-xs font-bold text-pegasus-navy">{post.title}</p>
                          <p className="mt-0.5 line-clamp-2 text-xs text-slate-500">{post.body}</p>
                        </div>
                      ))}
                    </div>
                  </article>
                )}

                <article className="panel flex flex-col p-4">
                  <div className="mb-3 flex items-center gap-2.5">
                    <span className="rounded-lg bg-pink-50 p-2 text-pink-600">
                      <Cake size={16} />
                    </span>
                    <h2 className="text-sm font-bold text-pegasus-navy">Aniversariantes do mês</h2>
                  </div>
                  {monthlyBirthdays.length > 0 ? (
                    <div className="grid max-h-56 grid-cols-1 gap-2 overflow-y-auto slim-scroll pr-1">
                      {monthlyBirthdays.map((a) => (
                        <div
                          key={a.id}
                          className={`flex items-center gap-2.5 rounded-lg p-2 ${a.isToday ? "bg-pink-50" : "bg-pegasus-surface"}`}
                        >
                          <span className="grid h-7 w-7 shrink-0 place-items-center rounded-full bg-pink-100 text-[10px] font-bold text-pink-700">
                            {a.day}
                          </span>
                          <div className="min-w-0">
                            <p className="truncate text-xs font-bold text-pegasus-navy">{a.name}</p>
                            <p className={`text-[10px] font-semibold ${a.isToday ? "text-pink-600" : "text-slate-500"}`}>
                              {a.isToday ? "Hoje!" : `Dia ${a.day}`}
                            </p>
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="flex flex-1 items-center justify-center rounded-lg bg-pegasus-surface p-4 text-center">
                      <p className="text-xs text-slate-500">Nenhum aniversariante este mês.</p>
                    </div>
                  )}
                </article>

                {canSeeTrainings && (
                  <article className="panel flex flex-col p-4">
                    <div className="mb-3 flex items-center gap-2.5">
                      <span className="rounded-lg bg-pegasus-ice p-2 text-pegasus-primary">
                        <CalendarDays size={16} />
                      </span>
                      <h2 className="text-sm font-bold text-pegasus-navy">Próximos treinos</h2>
                    </div>
                    <div className="max-h-56 space-y-2 overflow-y-auto slim-scroll pr-1">
                      {upcomingTrainings.slice(0, 6).map((training) => (
                        <div key={training.id} className="rounded-lg bg-pegasus-surface p-2.5">
                          <p className="truncate text-xs font-bold text-pegasus-navy">{training.title}</p>
                          <p className="text-[10px] text-slate-500">
                            {training.category ?? "Sem categoria"} · {formatDateTime(training.date)}
                          </p>
                        </div>
                      ))}
                      {upcomingTrainings.length === 0 ? (
                        <p className="rounded-lg bg-pegasus-surface p-2.5 text-xs text-slate-600">
                          Nenhum treino futuro cadastrado.
                        </p>
                      ) : null}
                    </div>
                  </article>
                )}
              </section>
            );
          })()}

          {/* Gráfico de frequência mensal */}
          {canSeeTrainings && monthlyStats.length > 0 && (
            <section className="panel p-4">
              <div className="mb-2 flex items-center gap-2.5">
                <Star className="text-pegasus-primary" size={16} />
                <h2 className="text-sm font-bold text-pegasus-navy">Frequência por mês</h2>
              </div>
              <ResponsiveContainer width="100%" height={190}>
                <LineChart data={monthlyStats.map((s) => ({ ...s, label: formatMonth(s.month) }))}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#e7e5e4" />
                  <XAxis dataKey="label" tick={{ fontSize: 11 }} />
                  <YAxis domain={[0, 100]} tick={{ fontSize: 11 }} tickFormatter={(v) => `${v}%`} />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: "var(--chart-tooltip-bg)",
                      border: "1px solid var(--chart-tooltip-border)",
                      borderRadius: 10,
                      fontSize: 12.5,
                    }}
                    labelStyle={{ color: "var(--chart-tooltip-text)", fontWeight: 700, marginBottom: 4 }}
                    itemStyle={{ color: "#22c55e", fontWeight: 700 }}
                    formatter={(v) => [`${v}%`, "Frequência"]}
                  />
                  <Line
                    type="monotone"
                    dataKey="percentual"
                    stroke="#059669"
                    strokeWidth={2.5}
                    dot={{ fill: "#059669", r: 3 }}
                    activeDot={{ r: 5 }}
                  />
                </LineChart>
              </ResponsiveContainer>
            </section>
          )}

          {data.upcomingGames.length > 0 ? (
            <article className="panel p-5">
              <div className="flex items-center gap-3">
                <span className="rounded-lg bg-pegasus-ice p-3 text-pegasus-primary">
                  <Trophy size={22} />
                </span>
                <div>
                  <h2 className="text-xl font-bold text-pegasus-navy">Próximos Jogos</h2>
                  <p className="text-sm text-slate-500">{data.upcomingGames.length} jogo(s) agendado(s)</p>
                </div>
              </div>
              <div className="mt-4 grid gap-2.5 sm:grid-cols-2 lg:grid-cols-3">
                {data.upcomingGames.map((game) => (
                  <div key={game.id} className="rounded-lg bg-pegasus-surface p-4">
                    <p className="font-bold text-pegasus-navy">vs {game.opponent}</p>
                    <p className="mt-1 text-sm text-slate-500">
                      {new Date(game.date).toLocaleDateString("pt-BR", { day: "2-digit", month: "short", timeZone: "UTC" })}
                      {" · "}
                      {game.location === "casa" ? "Em casa" : "Fora"}
                    </p>
                  </div>
                ))}
              </div>
            </article>
          ) : null}

        </>
      )}
    </div>
  );
}
