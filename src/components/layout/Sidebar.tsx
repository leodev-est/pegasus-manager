import {
  Activity,
  CalendarDays,
  ClipboardList,
  CreditCard,
  FileSpreadsheet,
  HelpCircle,
  Inbox,
  Landmark,
  LayoutDashboard,
  Megaphone,
  MessageSquare,
  MessageSquarePlus,
  Radio,
  Settings,
  ShieldCheck,
  Shirt,
  Trophy,
  UserPlus,
  Users,
  UserCheck,
  UserRound,
  Volleyball,
  Star,
  type LucideIcon,
} from "lucide-react";
import { useState } from "react";
import { NavLink } from "react-router-dom";
import { useAuth } from "../../auth/AuthContext";
import logoIcon from "../../assets/logo/logo-icon.png";
import { ORG_NAME, ORG_LOGO_URL } from "../../config/org";

export type MenuItem = {
  label: string;
  path: string;
  icon: LucideIcon;
  permissions?: string[];
};

export type MenuGroup = {
  title: string;
  items: MenuItem[];
};

export const menuGroups: MenuGroup[] = [
  {
    title: "Dashboard",
    items: [{ label: "Dashboard", path: "/app", icon: LayoutDashboard, permissions: ["dashboard"] }],
  },
  {
    title: "Gestão",
    items: [
      {
        label: "Kanban de Gestão",
        path: "/app/gestao",
        icon: ClipboardList,
        permissions: ["gestao"],
      },
      {
        label: "Uniformes",
        path: "/app/uniformes",
        icon: Shirt,
        permissions: ["gestao"],
      },
    ],
  },
  {
    title: "Jogos",
    items: [
      {
        label: "Jogos e Resultados",
        path: "/app/jogos",
        icon: Trophy,
        permissions: ["dashboard"],
      },
      {
        label: "Convocação",
        path: "/app/jogos/convocacao",
        icon: UserCheck,
        permissions: ["treinos", "dashboard"],
      },
    ],
  },
  {
    title: "RH",
    items: [
      { label: "Atletas", path: "/app/rh/atletas", icon: Users, permissions: ["rh"] },
      { label: "Testes", path: "/app/rh/testes", icon: ClipboardList, permissions: ["rh"] },
      { label: "Inscrições", path: "/app/rh/inscricoes", icon: UserPlus, permissions: ["rh"] },
      { label: "Comunicados", path: "/app/rh/comunicados", icon: Radio, permissions: ["rh"] },
      { label: "Ouvidoria", path: "/app/rh/ouvidoria", icon: Inbox, permissions: ["rh"] },
      { label: "Lesões", path: "/app/rh/lesoes", icon: Activity, permissions: ["rh"] },
      { label: "Calendário", path: "/app/rh/calendario", icon: CalendarDays, permissions: ["rh"] },
    ],
  },
  {
    title: "Financeiro",
    items: [
      {
        label: "Financeiro",
        path: "/app/financeiro",
        icon: Landmark,
        permissions: ["financeiro"],
      },
    ],
  },
  {
    title: "Treinos",
    items: [
      {
        label: "Calendário",
        path: "/app/treinos/calendario",
        icon: CalendarDays,
        permissions: ["treinos"],
      },
      { label: "Treinos", path: "/app/treinos", icon: ClipboardList, permissions: ["treinos"] },
      {
        label: "Turmas",
        path: "/app/admin/turmas",
        icon: Users,
        permissions: ["trainings:update"],
      },
      {
        label: "Quadra Tática",
        path: "/app/quadra-tatica",
        icon: Volleyball,
        permissions: ["treinos"],
      },
      {
        label: "Chamada",
        path: "/app/chamada",
        icon: ClipboardList,
        permissions: ["chamada"],
      },
      {
        label: "Frequência",
        path: "/app/frequencia",
        icon: UserCheck,
        permissions: ["trainings:update"],
      },
      {
        label: "Ranking",
        path: "/app/frequencia/ranking",
        icon: Trophy,
        permissions: ["trainings:update", "rh", "atleta"],
      },
      {
        label: "Avaliações",
        path: "/app/avaliacoes",
        icon: Star,
        permissions: ["trainings:update"],
      },
      {
        label: "Planos Individuais",
        path: "/app/treinos/planos",
        icon: ClipboardList,
        permissions: ["chamada"],
      },
    ],
  },
  {
    title: "Atleta",
    items: [
      {
        label: "Meu Perfil",
        path: "/app/meu-perfil",
        icon: UserRound,
        permissions: ["atleta", "trainings:update"],
      },
      {
        label: "Minhas Convocações",
        path: "/app/jogos/minhas-convocacoes",
        icon: Trophy,
        permissions: ["atleta"],
      },
      {
        label: "Minha Frequência",
        path: "/app/atleta/frequencia",
        icon: UserCheck,
        permissions: ["atleta"],
      },
      {
        label: "Avaliar Treino",
        path: "/app/atleta/avaliar-treino",
        icon: Star,
        permissions: ["atleta"],
      },
      {
        label: "Sugestões",
        path: "/app/atleta/sugestoes",
        icon: MessageSquarePlus,
        permissions: ["atleta"],
      },
      {
        label: "Mensalidades",
        path: "/app/atleta/mensalidades",
        icon: CreditCard,
        permissions: ["atleta"],
      },
      {
        label: "Minhas Avaliações",
        path: "/app/atleta/avaliacoes",
        icon: Star,
        permissions: ["atleta"],
      },
      {
        label: "Saúde",
        path: "/app/atleta/saude",
        icon: Activity,
        permissions: ["atleta"],
      },
      {
        label: "Meu Plano",
        path: "/app/atleta/plano",
        icon: ClipboardList,
        permissions: ["atleta"],
      },
    ],
  },
  {
    title: "Geral",
    items: [
      {
        label: "Mural de Avisos",
        path: "/app/comunicados",
        icon: MessageSquare,
        permissions: ["dashboard"],
      },
    ],
  },
  {
    title: "Marketing",
    items: [
      {
        label: "Marketing",
        path: "/app/marketing",
        icon: Megaphone,
        permissions: ["marketing"],
      },
    ],
  },
  {
    title: "Operacional",
    items: [
      {
        label: "Contato com Escolas",
        path: "/app/operacional/escolas",
        icon: FileSpreadsheet,
        permissions: ["operacional"],
      },
      {
        label: "Planilhas",
        path: "/app/operacional/planilhas",
        icon: ClipboardList,
        permissions: ["operacional"],
      },
    ],
  },
  {
    title: "Administração",
    items: [
      { label: "Acessos", path: "/app/admin/acessos", icon: Users, permissions: ["admin"] },
      { label: "Auditoria", path: "/app/admin/auditoria", icon: ShieldCheck, permissions: ["admin"] },
      // WhatsApp temporariamente desativado — item de menu oculto, rota/página intactas.
      { label: "Configurações", path: "/app/admin/configuracoes", icon: Settings, permissions: ["admin"] },
    ],
  },
];

type SidebarProps = {
  isMobileOpen?: boolean;
  isDesktopCollapsed?: boolean;
  onNavigate?: () => void;
  onOpenTour?: () => void;
};

export function Sidebar({ isMobileOpen = false, isDesktopCollapsed = false, onNavigate, onOpenTour }: SidebarProps) {
  const { hasPermission } = useAuth();
  const [isHovering, setIsHovering] = useState(false);
  const visibleGroups = menuGroups
    .map((group) => ({
      ...group,
      items: group.items.filter((item) => hasPermission(item.permissions)),
    }))
    .filter((group) => group.items.length > 0);

  // On desktop, a collapsed sidebar is a narrow icon rail that expands over
  // the content (Instagram-style) on hover — it never pushes the layout.
  const isRail = isDesktopCollapsed;
  const expanded = !isRail || isHovering;
  const hideAtLg = expanded ? "" : "lg:hidden";

  return (
    <aside
      onMouseEnter={() => isRail && setIsHovering(true)}
      onMouseLeave={() => setIsHovering(false)}
      className={`fixed inset-y-0 left-0 z-40 flex w-[min(19rem,86vw)] flex-col overflow-hidden border-r border-stone-200 bg-white text-stone-900 shadow-2xl transition-[width,transform] duration-200 ease-in-out dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100 lg:shadow-none ${
        expanded ? "lg:w-72" : "lg:w-[76px]"
      } ${isRail && isHovering ? "lg:shadow-2xl" : ""} ${
        isMobileOpen ? "translate-x-0" : "-translate-x-full lg:translate-x-0"
      }`}
    >
      <div className={`flex h-20 shrink-0 items-center gap-3 border-b border-stone-100 px-5 dark:border-slate-800 ${expanded ? "" : "lg:justify-center lg:px-0"}`}>
        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-stone-100 p-1.5 dark:bg-slate-800">
          <img
            alt={`Projeto ${ORG_NAME}`}
            className="h-full w-full rounded-lg object-contain"
            src={ORG_LOGO_URL || logoIcon}
          />
        </div>
        <div className={`min-w-0 ${hideAtLg}`}>
          <p className="truncate text-[15px] font-bold tracking-tight text-stone-900 dark:text-slate-100">{ORG_NAME}</p>
          <p className="truncate text-[11px] text-stone-400">Projeto esportivo</p>
        </div>
      </div>

      <nav className="slim-scroll flex-1 space-y-3 overflow-y-auto overflow-x-hidden px-3 py-4">
        {visibleGroups.map((group, index) => {
          const isTopLevel = group.items.length === 1 && index === 0;

          return (
            <div
              key={group.title}
              className={isTopLevel ? "" : "rounded-2xl bg-stone-100/70 p-2 dark:bg-slate-800/50"}
            >
              {!isTopLevel && (
                <p className={`mb-1 px-2 pt-1 text-[10px] font-bold uppercase tracking-[0.12em] text-stone-400 ${hideAtLg}`}>
                  {group.title}
                </p>
              )}
              <div className="space-y-0.5">
                {group.items.map((item) => {
                  const Icon = item.icon;

                  return (
                    <NavLink
                      key={`${group.title}-${item.label}`}
                      to={item.path}
                      end
                      onClick={onNavigate}
                      title={expanded ? undefined : item.label}
                      className="focus-ring block rounded-lg"
                    >
                      {({ isActive }) => (
                        <div
                          className={`flex min-h-9 items-center gap-2.5 rounded-lg px-2.5 py-2 text-[13px] transition-all duration-150 ${
                            expanded ? "" : "lg:justify-center lg:px-0"
                          } ${
                            isActive
                              ? "bg-white font-semibold text-emerald-900 shadow-sm dark:bg-slate-700 dark:text-emerald-300"
                              : "font-medium text-stone-600 hover:bg-white/70 hover:text-stone-900 dark:text-slate-400 dark:hover:bg-slate-700/60 dark:hover:text-slate-100"
                          }`}
                        >
                          <span
                            className={`grid h-6 w-6 shrink-0 place-items-center rounded-md ${
                              isActive ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-500/20 dark:text-emerald-300" : "text-stone-500"
                            }`}
                          >
                            <Icon size={15} />
                          </span>
                          <span className={`truncate ${hideAtLg}`}>{item.label}</span>
                        </div>
                      )}
                    </NavLink>
                  );
                })}
              </div>
            </div>
          );
        })}
      </nav>

      {onOpenTour && (
        <div className="shrink-0 border-t border-stone-100 px-3 py-3 dark:border-slate-800">
          <button
            type="button"
            onClick={onOpenTour}
            title={expanded ? undefined : "Tutorial desta tela"}
            className={`focus-ring flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium text-stone-500 transition hover:bg-stone-100 hover:text-stone-900 dark:text-slate-400 dark:hover:bg-slate-800 dark:hover:text-slate-100 ${
              expanded ? "" : "lg:justify-center lg:px-0"
            }`}
          >
            <HelpCircle size={17} className="shrink-0" />
            <span className={hideAtLg}>Tutorial desta tela</span>
          </button>
        </div>
      )}
    </aside>
  );
}

