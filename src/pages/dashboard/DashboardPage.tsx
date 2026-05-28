import {
  CalendarDays,
  Cake,
  ClipboardList,
  Loader2,
  Megaphone,
  MessageSquare,
  School,
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
import { PageHeader } from "../../components/ui/PageHeader";
import { StatCard } from "../../components/ui/StatCard";
import { useToast } from "../../components/ui/Toast";
import { athleteApplicationService, type AthleteApplication } from "../../services/athleteApplicationService";
import { muralService, type MuralPost } from "../../services/muralService";
import { athleteService, type BirthdaysResult } from "../../services/athleteService";
import { useAthletes } from "../../hooks/useAthletes";
import { getApiErrorMessage } from "../../services/api";
import { attendanceService, type MonthlyAttendanceStat, type TotalFrequency } from "../../services/attendanceService";
import { evaluationService, type AthleteEvaluation } from "../../services/evaluationService";
import { financeService, type FinanceSummary } from "../../services/financeService";
import { gameConvocationService, type MyConvocation } from "../../services/gameConvocationService";
import { gamesService, type Game } from "../../services/gamesService";
import { kanbanService, type ManagementTask } from "../../services/kanbanService";
import { marketingService, type MarketingTask } from "../../services/marketingService";
import { operationalService, type SchoolContact } from "../../services/operationalService";
import { trainingService, type Training } from "../../services/trainingService";

type DashboardData = {
  applications: AthleteApplication[];
  trainings: Training[];
  financeSummary: FinanceSummary | null;
  managementTasks: ManagementTask[];
  marketingTasks: MarketingTask[];
  schools: SchoolContact[];
  upcomingGames: Game[];
};

type DashboardStat = {
  helper: string;
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
  schools: [],
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
      title: "🏠 Dashboard Pegasus",
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
  const [birthdays, setBirthdays] = useState<BirthdaysResult>({ today: [], week: [] });
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
  const canSeeOperational = hasPermission(["operacional"]);
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
        schoolsRes,
        gamesThisMonthRes,
        gamesNextMonthRes,
      ] = await Promise.allSettled([
        canSeeRh ? athleteApplicationService.getAll() : Promise.resolve([]),
        canSeeTrainings ? trainingService.getAll() : Promise.resolve([]),
        canSeeFinance ? financeService.getSummary() : Promise.resolve(null),
        canSeeManagement ? kanbanService.getTasks({ area: "management" }) : Promise.resolve([]),
        canSeeMarketing ? marketingService.getTasks() : Promise.resolve([]),
        canSeeOperational ? operationalService.getSchoolContacts() : Promise.resolve([]),
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
        schools: ok(schoolsRes, []),
        upcomingGames,
      });

      if (canSeeRh) {
        athleteService.getBirthdays().then(setBirthdays).catch(() => {});
      }

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
    canSeeOperational,
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
  const openSchools = data.schools.filter((school) => !school.sent).length;

  const stats = [
    canSeeRh
      ? {
          helper: `${pendingApplications} inscricao(oes) pendente(s)`,
          icon: UserCheck,
          label: "Atletas ativos",
          value: String(activeAthletes),
        }
      : null,
    canSeeRh
      ? {
          helper: "Aguardando aprovacao para ativo",
          icon: Users,
          label: "Atletas em teste",
          value: String(testeAthletes),
        }
      : null,
    canSeeTrainings
      ? {
          helper: nextTraining ? formatDateTime(nextTraining.date) : "Nenhum treino futuro",
          icon: CalendarDays,
          label: "Treinos esta semana",
          value: String(trainingsThisWeek),
        }
      : null,
    canSeeFinance
      ? {
          helper: "Saldo consolidado do financeiro",
          icon: WalletCards,
          label: "Caixa atual",
          value: formatCurrency(data.financeSummary?.currentCash ?? 0),
        }
      : null,
    canSeeManagement || canSeeMarketing
      ? {
          helper: "Gestao e marketing",
          icon: ClipboardList,
          label: "Tarefas em andamento",
          value: String(activeTasks.length),
        }
      : null,
    canSeeOperational
      ? {
          helper: `${openSchools} escola(s) sem envio`,
          icon: School,
          label: "Escolas cadastradas",
          value: String(data.schools.length),
        }
      : null,
  ].filter(isDashboardStat);

  return (
    <div className="w-full max-w-full space-y-8 overflow-hidden">
      <PageHeader
        title="Dashboard"
        description="Visao geral operacional, financeira e esportiva do Projeto Pegasus."
      />

      <section className="rounded-3xl bg-pegasus-navy p-6 text-white shadow-soft">
        <p className="text-sm font-semibold uppercase tracking-[0.18em] text-blue-100">
          Area administrativa
        </p>
        <h2 className="mt-2 text-3xl font-black">Bem-vindo, {user?.name}</h2>
        <p className="mt-2 max-w-2xl text-sm leading-6 text-blue-50">
          Os indicadores abaixo refletem os dados atuais das telas que seu perfil pode acessar.
        </p>
      </section>

      {isLoading ? (
        <section className="panel flex items-center gap-3 p-6 text-sm font-bold text-pegasus-primary">
          <Loader2 className="animate-spin" size={18} />
          Carregando indicadores do sistema
        </section>
      ) : (
        <>
          <section data-tour="dash-stats" className="grid gap-5 md:grid-cols-2 xl:grid-cols-4">
            {stats.map((stat) => (
              <StatCard key={stat.label} {...stat} />
            ))}
          </section>

          {/* Painel do atleta */}
          {isAthlete && (
            <section className="space-y-5">
              {/* Próximo treino — destaque */}
              <div className="rounded-3xl bg-pegasus-navy p-5 text-white">
                <p className="text-xs font-semibold uppercase tracking-[0.18em] text-blue-200">
                  Próximo treino
                </p>
                {nextTraining ? (
                  <>
                    <p className="mt-1 text-2xl font-black">{nextTraining.title}</p>
                    <p className="mt-1 text-sm text-blue-100">{formatDateTime(nextTraining.date)}</p>
                    {nextTraining.category && (
                      <span className="mt-2 inline-block rounded-full bg-white/10 px-3 py-0.5 text-xs font-semibold text-blue-100">
                        {nextTraining.category}
                      </span>
                    )}
                  </>
                ) : (
                  <p className="mt-1 text-lg font-bold text-blue-200">
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
                    <p className="rounded-2xl bg-pegasus-surface p-4 text-sm text-slate-500">
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
                            className="flex items-center justify-between rounded-2xl bg-pegasus-surface p-3"
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
                                  : "bg-blue-100 text-blue-700"
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
                    <p className="rounded-2xl bg-pegasus-surface p-4 text-sm text-slate-500">
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
                      <div className="mt-3 rounded-2xl bg-pegasus-ice p-3 text-center dark:bg-slate-700/50">
                        <p className="text-xs text-slate-500">Nota geral</p>
                        <p className="text-3xl font-black text-pegasus-primary">{myEvaluation.overall}</p>
                      </div>
                    </div>
                  )}
                </div>
              </div>

              {/* Frequência */}
              <div className="panel overflow-hidden">
                <div className="flex items-center gap-3 border-b border-blue-100 p-5 dark:border-slate-700">
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
                        className="rounded-2xl bg-slate-50 p-4 text-center dark:bg-slate-700/50"
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

          {/* Mural de Avisos */}
          {muralPosts.length > 0 && (
            <article data-tour="dash-mural" className="panel p-6">
              <div className="mb-4 flex items-center justify-between gap-3">
                <div className="flex items-center gap-3">
                  <span className="rounded-2xl bg-pegasus-ice p-3 text-pegasus-primary">
                    <MessageSquare size={20} />
                  </span>
                  <div>
                    <h2 className="text-xl font-bold text-pegasus-navy">Avisos do clube</h2>
                    <p className="text-sm text-slate-500">Comunicados recentes</p>
                  </div>
                </div>
                <Link
                  to="/app/comunicados"
                  className="text-sm font-semibold text-pegasus-primary hover:underline"
                >
                  Ver todos
                </Link>
              </div>
              <div className="space-y-3">
                {muralPosts.map((post) => (
                  <div key={post.id} className="rounded-2xl bg-pegasus-surface p-4">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className={`rounded-full px-2.5 py-0.5 text-xs font-bold ${
                        post.category === "urgente" ? "bg-rose-100 text-rose-700" :
                        post.category === "evento" ? "bg-violet-100 text-violet-700" :
                        "bg-blue-100 text-blue-700"
                      }`}>
                        {post.category === "urgente" ? "Urgente" : post.category === "evento" ? "Evento" : "Info"}
                      </span>
                      <span className="text-xs text-slate-400">
                        {new Intl.DateTimeFormat("pt-BR", { day: "2-digit", month: "short" }).format(new Date(post.createdAt))}
                      </span>
                    </div>
                    <p className="mt-1.5 font-bold text-pegasus-navy">{post.title}</p>
                    <p className="mt-1 line-clamp-2 text-sm text-slate-500">{post.body}</p>
                  </div>
                ))}
              </div>
            </article>
          )}

          {/* Gráfico de frequência mensal */}
          {canSeeTrainings && monthlyStats.length > 0 && (
            <section className="panel p-6">
              <div className="mb-6 flex items-center gap-3">
                <Star className="text-pegasus-primary" size={20} />
                <div>
                  <h2 className="font-black text-pegasus-navy">Frequência por mês</h2>
                  <p className="text-sm text-slate-500">Percentual de presença do elenco por treino</p>
                </div>
              </div>
              <ResponsiveContainer width="100%" height={220}>
                <LineChart data={monthlyStats.map((s) => ({ ...s, label: formatMonth(s.month) }))}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                  <XAxis dataKey="label" tick={{ fontSize: 12 }} />
                  <YAxis domain={[0, 100]} tick={{ fontSize: 12 }} tickFormatter={(v) => `${v}%`} />
                  <Tooltip formatter={(v) => [`${v}%`, "Frequência"]} />
                  <Line
                    type="monotone"
                    dataKey="percentual"
                    stroke="#2563eb"
                    strokeWidth={2.5}
                    dot={{ fill: "#2563eb", r: 4 }}
                    activeDot={{ r: 6 }}
                  />
                </LineChart>
              </ResponsiveContainer>
            </section>
          )}

          <section className="grid gap-6 xl:grid-cols-[1.2fr_0.8fr]">
            {canSeeTrainings ? (
              <article className="panel p-6">
                <div className="flex items-center gap-3">
                  <span className="rounded-2xl bg-pegasus-ice p-3 text-pegasus-primary">
                    <CalendarDays size={22} />
                  </span>
                  <div>
                    <h2 className="text-xl font-bold text-pegasus-navy">Proximos Treinos</h2>
                    <p className="text-sm text-slate-500">
                      {upcomingTrainings.length} treino(s) futuro(s) cadastrado(s)
                    </p>
                  </div>
                </div>
                <div className="mt-6 grid gap-3">
                  {upcomingTrainings.slice(0, 4).map((training) => (
                    <div
                      key={training.id}
                      className="flex flex-col gap-2 rounded-2xl bg-pegasus-surface p-4 sm:flex-row sm:items-center sm:justify-between"
                    >
                      <div>
                        <p className="font-bold text-pegasus-navy">{training.title}</p>
                        <p className="text-sm text-slate-500">
                          {training.category ?? "Sem categoria"} | {formatDateTime(training.date)}
                        </p>
                      </div>
                      <span className="text-sm font-semibold text-pegasus-primary">
                        {training.createdBy}
                      </span>
                    </div>
                  ))}
                  {upcomingTrainings.length === 0 ? (
                    <p className="rounded-2xl bg-pegasus-surface p-4 text-sm text-slate-600">
                      Nenhum treino futuro cadastrado.
                    </p>
                  ) : null}
                </div>
              </article>
            ) : null}

            {(canSeeRh || canSeeFinance || canSeeOperational) && (
            <article className="panel p-6">
              <div className="flex items-center gap-3">
                <span className="rounded-2xl bg-pegasus-ice p-3 text-pegasus-primary">
                  <Megaphone size={22} />
                </span>
                <h2 className="text-xl font-bold text-pegasus-navy">Alertas Operacionais</h2>
              </div>
              <div className="mt-6 grid gap-3">
                {canSeeRh ? (
                  <div className={`rounded-2xl p-4 ${pendingApplications > 0 ? "bg-amber-50" : "bg-pegasus-surface"}`}>
                    <p className="text-sm font-semibold text-slate-600">Inscrições pendentes</p>
                    <strong className={`mt-1 block text-2xl ${pendingApplications > 0 ? "text-amber-700" : "text-pegasus-navy"}`}>
                      {pendingApplications}
                    </strong>
                  </div>
                ) : null}
                {canSeeFinance ? (
                  <div className={`rounded-2xl p-4 ${(data.financeSummary?.overdueMonthlyPayments ?? 0) > 0 ? "bg-rose-50" : "bg-pegasus-surface"}`}>
                    <p className="text-sm font-semibold text-slate-600">Mensalidades em aberto</p>
                    <strong className={`mt-1 block text-2xl ${(data.financeSummary?.overdueMonthlyPayments ?? 0) > 0 ? "text-rose-700" : "text-pegasus-navy"}`}>
                      {(data.financeSummary?.pendingMonthlyPayments ?? 0) +
                        (data.financeSummary?.overdueMonthlyPayments ?? 0)}
                    </strong>
                    {(data.financeSummary?.overdueMonthlyPayments ?? 0) > 0 && (
                      <p className="mt-0.5 text-xs font-semibold text-rose-600">
                        {data.financeSummary?.overdueMonthlyPayments} em atraso
                      </p>
                    )}
                  </div>
                ) : null}
                {canSeeOperational ? (
                  <div className="rounded-2xl bg-pegasus-surface p-4">
                    <p className="text-sm font-semibold text-slate-600">Escolas sem envio</p>
                    <strong className="mt-1 block text-2xl text-pegasus-navy">{openSchools}</strong>
                  </div>
                ) : null}
              </div>
            </article>
            )}
          </section>

          {data.upcomingGames.length > 0 ? (
            <article className="panel p-6">
              <div className="flex items-center gap-3">
                <span className="rounded-2xl bg-pegasus-ice p-3 text-pegasus-primary">
                  <Trophy size={22} />
                </span>
                <div>
                  <h2 className="text-xl font-bold text-pegasus-navy">Próximos Jogos</h2>
                  <p className="text-sm text-slate-500">{data.upcomingGames.length} jogo(s) agendado(s)</p>
                </div>
              </div>
              <div className="mt-6 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                {data.upcomingGames.map((game) => (
                  <div key={game.id} className="rounded-2xl bg-pegasus-surface p-4">
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

          {canSeeRh && (birthdays.today.length > 0 || birthdays.week.length > 0) ? (
            <article className="panel p-6">
              <div className="flex items-center gap-3">
                <span className="rounded-2xl bg-pink-50 p-3 text-pink-600">
                  <Cake size={22} />
                </span>
                <div>
                  <h2 className="text-xl font-bold text-pegasus-navy">Aniversários</h2>
                  <p className="text-sm text-slate-500">
                    {birthdays.today.length > 0
                      ? `${birthdays.today.length} aniversário(s) hoje`
                      : `${birthdays.week.length} aniversário(s) esta semana`}
                  </p>
                </div>
              </div>
              <div className="mt-6 grid gap-3 sm:grid-cols-2">
                {birthdays.today.map((a) => (
                  <div key={a.id} className="flex items-center gap-3 rounded-2xl bg-pink-50 p-4">
                    <span className="text-2xl">🎂</span>
                    <div>
                      <p className="font-bold text-pegasus-navy">{a.name}</p>
                      <p className="text-xs font-semibold text-pink-600">Hoje!</p>
                    </div>
                  </div>
                ))}
                {birthdays.week.map((a) => {
                  const d = new Date(a.birthDate);
                  const day = d.toLocaleDateString("pt-BR", { weekday: "short", day: "2-digit", month: "short" });
                  return (
                    <div key={a.id} className="flex items-center gap-3 rounded-2xl bg-pegasus-surface p-4">
                      <span className="text-2xl">🎁</span>
                      <div>
                        <p className="font-bold text-pegasus-navy">{a.name}</p>
                        <p className="text-xs text-slate-500 capitalize">{day}</p>
                      </div>
                    </div>
                  );
                })}
              </div>
            </article>
          ) : null}

          <section className="grid gap-6 xl:grid-cols-3">
            {canSeeFinance ? (
              <article className="panel p-6">
                <div className="flex items-center gap-3">
                  <WalletCards className="text-pegasus-primary" size={22} />
                  <h2 className="text-xl font-bold text-pegasus-navy">Financeiro</h2>
                </div>
                <div className="mt-6 grid gap-4">
                  <div className="rounded-2xl bg-emerald-50 p-4 text-emerald-700">
                    <p className="text-sm font-semibold">Receitas do mes</p>
                    <strong className="mt-1 block text-2xl">
                      {formatCurrency(data.financeSummary?.monthlyRevenue ?? 0)}
                    </strong>
                  </div>
                  <div className="rounded-2xl bg-rose-50 p-4 text-rose-700">
                    <p className="text-sm font-semibold">Despesas do mes</p>
                    <strong className="mt-1 block text-2xl">
                      {formatCurrency(data.financeSummary?.monthlyExpenses ?? 0)}
                    </strong>
                  </div>
                  <div className="rounded-2xl bg-blue-50 p-4 text-blue-700">
                    <p className="text-sm font-semibold">Balanco do mes</p>
                    <strong className="mt-1 block text-2xl">
                      {formatCurrency(data.financeSummary?.monthlyBalance ?? 0)}
                    </strong>
                  </div>
                </div>
              </article>
            ) : null}

            {canSeeRh ? (
              <article className="panel p-6">
                <div className="flex items-center gap-3">
                  <UserPlus className="text-pegasus-primary" size={22} />
                  <h2 className="text-xl font-bold text-pegasus-navy">RH</h2>
                </div>
                <div className="mt-6 grid gap-4">
                  {[
                    ["Ativos", activeAthletes],
                    ["Teste", countByStatus(athletes, "teste")],
                    ["Inativos", countByStatus(athletes, "inativo")],
                    ["Isentos", athletes.filter((athlete) => athlete.monthlyPaymentStatus === "isento").length],
                  ].map(([label, value]) => (
                    <div
                      key={label}
                      className="flex items-center justify-between rounded-2xl bg-pegasus-surface p-4"
                    >
                      <span className="font-semibold text-slate-600">{label}</span>
                      <strong className="text-2xl text-pegasus-primary">{value}</strong>
                    </div>
                  ))}
                </div>
              </article>
            ) : null}

            {canSeeManagement || canSeeMarketing ? (
              <article className="panel p-6">
                <div className="flex items-center gap-3">
                  <ClipboardList className="text-pegasus-primary" size={22} />
                  <h2 className="text-xl font-bold text-pegasus-navy">Tarefas</h2>
                </div>
                <div className="mt-6 grid gap-4">
                  {canSeeManagement ? (
                    <>
                      <div className="flex items-center justify-between rounded-2xl bg-pegasus-surface p-4">
                        <span className="font-semibold text-slate-600">Gestao a fazer</span>
                        <strong className="text-2xl text-pegasus-primary">
                          {countByStatus(data.managementTasks, "todo")}
                        </strong>
                      </div>
                      <div className="flex items-center justify-between rounded-2xl bg-pegasus-surface p-4">
                        <span className="font-semibold text-slate-600">Gestao em andamento</span>
                        <strong className="text-2xl text-pegasus-primary">
                          {countByStatus(data.managementTasks, "doing")}
                        </strong>
                      </div>
                    </>
                  ) : null}
                  {canSeeMarketing ? (
                    <>
                      <div className="flex items-center justify-between rounded-2xl bg-pegasus-surface p-4">
                        <span className="font-semibold text-slate-600">Marketing em producao</span>
                        <strong className="text-2xl text-pegasus-primary">
                          {countByStatus(data.marketingTasks, "production")}
                        </strong>
                      </div>
                      <div className="flex items-center justify-between rounded-2xl bg-pegasus-surface p-4">
                        <span className="font-semibold text-slate-600">Marketing em revisao</span>
                        <strong className="text-2xl text-pegasus-primary">
                          {countByStatus(data.marketingTasks, "review")}
                        </strong>
                      </div>
                    </>
                  ) : null}
                </div>
              </article>
            ) : null}
          </section>
        </>
      )}
    </div>
  );
}
