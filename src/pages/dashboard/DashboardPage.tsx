import {
  CalendarDays,
  ClipboardList,
  Loader2,
  Megaphone,
  School,
  UserCheck,
  UserPlus,
  WalletCards,
  type LucideIcon,
} from "lucide-react";
import { useCallback, useEffect, useMemo, useState } from "react";
import { useAuth } from "../../auth/AuthContext";
import { PageHeader } from "../../components/ui/PageHeader";
import { InstallPwaButton } from "../../components/pwa/InstallPwaButton";
import { StatCard } from "../../components/ui/StatCard";
import { useToast } from "../../components/ui/Toast";
import { athleteApplicationService, type AthleteApplication } from "../../services/athleteApplicationService";
import { athleteService, type Athlete } from "../../services/athleteService";
import { getApiErrorMessage } from "../../services/api";
import { financeService, type FinanceSummary } from "../../services/financeService";
import { kanbanService, type ManagementTask } from "../../services/kanbanService";
import { marketingService, type MarketingTask } from "../../services/marketingService";
import { operationalService, type SchoolContact } from "../../services/operationalService";
import { trainingService, type Training } from "../../services/trainingService";

type DashboardData = {
  athletes: Athlete[];
  applications: AthleteApplication[];
  trainings: Training[];
  financeSummary: FinanceSummary | null;
  managementTasks: ManagementTask[];
  marketingTasks: MarketingTask[];
  schools: SchoolContact[];
};

type DashboardStat = {
  helper: string;
  icon: LucideIcon;
  label: string;
  value: string;
};

const emptyDashboardData: DashboardData = {
  athletes: [],
  applications: [],
  trainings: [],
  financeSummary: null,
  managementTasks: [],
  marketingTasks: [],
  schools: [],
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

export function DashboardPage() {
  const { hasPermission, user } = useAuth();
  const { showToast } = useToast();
  const [data, setData] = useState<DashboardData>(emptyDashboardData);
  const [isLoading, setIsLoading] = useState(true);

  const canSeeRh = hasPermission(["rh"]);
  const canSeeFinance = hasPermission(["financeiro"]);
  const canSeeManagement = hasPermission(["gestao"]);
  const canSeeMarketing = hasPermission(["marketing"]);
  const canSeeTrainings = hasPermission(["treinos"]);
  const canSeeOperational = hasPermission(["operacional"]);

  const loadDashboard = useCallback(async () => {
    setIsLoading(true);

    try {
      const [
        athletes,
        applications,
        trainings,
        financeSummary,
        managementTasks,
        marketingTasks,
        schools,
      ] = await Promise.all([
        canSeeRh ? athleteService.getAll() : Promise.resolve([]),
        canSeeRh ? athleteApplicationService.getAll() : Promise.resolve([]),
        canSeeTrainings ? trainingService.getAll() : Promise.resolve([]),
        canSeeFinance ? financeService.getSummary() : Promise.resolve(null),
        canSeeManagement ? kanbanService.getTasks({ area: "management" }) : Promise.resolve([]),
        canSeeMarketing ? marketingService.getTasks() : Promise.resolve([]),
        canSeeOperational ? operationalService.getSchoolContacts() : Promise.resolve([]),
      ]);

      setData({
        athletes,
        applications,
        trainings,
        financeSummary,
        managementTasks,
        marketingTasks,
        schools,
      });
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
    showToast,
  ]);

  useEffect(() => {
    loadDashboard();
  }, [loadDashboard]);

  const upcomingTrainings = useMemo(() => getUpcomingTrainings(data.trainings), [data.trainings]);
  const nextTraining = upcomingTrainings[0];
  const trainingsThisWeek = data.trainings.filter((training) => isThisWeek(training.date)).length;
  const activeAthletes = countByStatus(data.athletes, "ativo");
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
        action={<InstallPwaButton label="Instalar Pegasus no celular" />}
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
          <section className="grid gap-5 md:grid-cols-2 xl:grid-cols-4">
            {stats.map((stat) => (
              <StatCard key={stat.label} {...stat} />
            ))}
          </section>

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

            <article className="panel p-6">
              <div className="flex items-center gap-3">
                <span className="rounded-2xl bg-pegasus-ice p-3 text-pegasus-primary">
                  <Megaphone size={22} />
                </span>
                <h2 className="text-xl font-bold text-pegasus-navy">Alertas Operacionais</h2>
              </div>
              <div className="mt-6 grid gap-3">
                {canSeeRh ? (
                  <div className="rounded-2xl bg-pegasus-surface p-4">
                    <p className="text-sm font-semibold text-slate-600">Inscricoes pendentes</p>
                    <strong className="mt-1 block text-2xl text-pegasus-navy">
                      {pendingApplications}
                    </strong>
                  </div>
                ) : null}
                {canSeeFinance ? (
                  <div className="rounded-2xl bg-pegasus-surface p-4">
                    <p className="text-sm font-semibold text-slate-600">Mensalidades em aberto</p>
                    <strong className="mt-1 block text-2xl text-pegasus-navy">
                      {(data.financeSummary?.pendingMonthlyPayments ?? 0) +
                        (data.financeSummary?.overdueMonthlyPayments ?? 0)}
                    </strong>
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
          </section>

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
                    ["Teste", countByStatus(data.athletes, "teste")],
                    ["Inativos", countByStatus(data.athletes, "inativo")],
                    ["Isentos", data.athletes.filter((athlete) => athlete.monthlyPaymentStatus === "isento").length],
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
