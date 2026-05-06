import {
  CalendarDays,
  ClipboardList,
  FileSpreadsheet,
  Landmark,
  LayoutDashboard,
  Megaphone,
  MessageCircle,
  Radio,
  UserPlus,
  Users,
  UserCheck,
  UserRound,
  Volleyball,
  Star,
  type LucideIcon,
} from "lucide-react";
import { NavLink } from "react-router-dom";
import { useAuth } from "../../auth/AuthContext";
import logoIcon from "../../assets/logo/logo-icon.png";

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
    ],
  },
  {
    title: "RH",
    items: [
      { label: "Atletas", path: "/app/rh/atletas", icon: Users, permissions: ["rh"] },
      { label: "Testes", path: "/app/rh/testes", icon: ClipboardList, permissions: ["rh"] },
      { label: "Inscrições", path: "/app/rh/inscricoes", icon: UserPlus, permissions: ["rh"] },
      { label: "Comunicados", path: "/app/rh/comunicados", icon: Radio, permissions: ["rh"] },
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
        label: "Avaliações",
        path: "/app/avaliacoes",
        icon: Star,
        permissions: ["trainings:update"],
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
        label: "Minha Frequência",
        path: "/app/atleta/frequencia",
        icon: UserCheck,
        permissions: ["atleta"],
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
      { label: "WhatsApp", path: "/app/admin/whatsapp", icon: MessageCircle, permissions: ["admin"] },
    ],
  },
];

type SidebarProps = {
  isMobileOpen?: boolean;
  onNavigate?: () => void;
};

export function Sidebar({ isMobileOpen = false, onNavigate }: SidebarProps) {
  const { hasPermission } = useAuth();
  const visibleGroups = menuGroups
    .map((group) => ({
      ...group,
      items: group.items.filter((item) => hasPermission(item.permissions)),
    }))
    .filter((group) => group.items.length > 0);

  return (
    <aside
      className={`fixed inset-y-0 left-0 z-40 flex w-[min(19rem,86vw)] flex-col border-r border-blue-100 bg-pegasus-navy text-white shadow-2xl transition-transform duration-200 lg:w-72 lg:translate-x-0 lg:shadow-none ${
        isMobileOpen ? "translate-x-0" : "-translate-x-full"
      }`}
    >
      <div className="flex h-20 items-center gap-3 border-b border-white/10 px-6">
        <img
          alt="Projeto Pegasus"
          className="h-12 w-12 shrink-0 rounded-2xl object-contain shadow-sm"
          src={logoIcon}
        />
        <div>
          <p className="text-lg font-bold">Pegasus Manager</p>
          <p className="text-xs text-blue-100">Projeto esportivo</p>
        </div>
      </div>

      <nav className="flex-1 space-y-5 overflow-y-auto px-4 py-6">
        {visibleGroups.map((group) => (
          <div key={group.title}>
            <p className="mb-2 px-3 text-xs font-semibold uppercase tracking-[0.16em] text-blue-200">
              {group.title}
            </p>
            <div className="space-y-1">
              {group.items.map((item) => {
                const Icon = item.icon;

                return (
                  <NavLink
                    key={`${group.title}-${item.label}`}
                    to={item.path}
                    end
                    onClick={onNavigate}
                    className={({ isActive }) =>
                      `flex min-h-11 items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition ${
                        isActive
                          ? "bg-white text-pegasus-primary shadow-sm"
                          : "text-blue-50 hover:bg-white/10 hover:text-white"
                      }`
                    }
                  >
                    <Icon size={18} />
                    <span>{item.label}</span>
                  </NavLink>
                );
              })}
            </div>
          </div>
        ))}
      </nav>
    </aside>
  );
}

