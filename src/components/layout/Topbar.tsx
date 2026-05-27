import { Bell, LogOut, Menu, Moon, Search, ShieldCheck, Sun } from "lucide-react";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../../auth/AuthContext";
import { useTheme } from "../../contexts/ThemeContext";
import logoIcon from "../../assets/logo/logo-icon.png";
import { api } from "../../services/api";
import { notificationService, type Notification } from "../../services/notificationService";
import { Button } from "../ui/Button";
import { NotificationsButton } from "../pwa/NotificationsButton";

type SearchResult = {
  id: string;
  label: string;
  sublabel?: string;
  category: string;
  href: string;
};

async function runGlobalSearch(query: string): Promise<SearchResult[]> {
  if (!query.trim()) return [];
  const q = query.trim();
  const results: SearchResult[] = [];

  try {
    const [athletesRes, mgmtRes, mktRes] = await Promise.allSettled([
      api.get("/athletes", { params: { search: q } }),
      api.get("/tasks", { params: { area: "management", search: q } }),
      api.get("/tasks", { params: { area: "marketing", search: q } }),
    ]);

    if (athletesRes.status === "fulfilled") {
      const athletes = athletesRes.value.data as Array<{ id: string; name: string; position?: string }>;
      athletes.slice(0, 4).forEach((a) =>
        results.push({ id: a.id, label: a.name, sublabel: a.position ?? "Atleta", category: "Atletas", href: "/rh/atletas" }),
      );
    }

    if (mgmtRes.status === "fulfilled") {
      const tasks = mgmtRes.value.data as Array<{ id: string; title: string; status: string }>;
      tasks.slice(0, 3).forEach((t) =>
        results.push({ id: t.id, label: t.title, sublabel: t.status, category: "Gestão", href: "/gestao" }),
      );
    }

    if (mktRes.status === "fulfilled") {
      const tasks = mktRes.value.data as Array<{ id: string; title: string; status: string }>;
      tasks.slice(0, 3).forEach((t) =>
        results.push({ id: t.id, label: t.title, sublabel: t.status, category: "Marketing", href: "/marketing" }),
      );
    }
  } catch {
    // silent
  }

  return results;
}

function getInitials(name?: string) {
  if (!name) return "PM";

  return name
    .split(" ")
    .map((part) => part[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();
}

function formatRelativeTime(value: string): string {
  const diffMs = Date.now() - new Date(value).getTime();
  const diffMinutes = Math.floor(diffMs / 60_000);
  if (diffMinutes < 1) return "agora";
  if (diffMinutes < 60) return `há ${diffMinutes} minuto${diffMinutes === 1 ? "" : "s"}`;
  const diffHours = Math.floor(diffMinutes / 60);
  if (diffHours < 24) return `há ${diffHours} hora${diffHours === 1 ? "" : "s"}`;
  const diffDays = Math.floor(diffHours / 24);
  return `há ${diffDays} dia${diffDays === 1 ? "" : "s"}`;
}

function typeLabel(type: Notification["type"]) {
  const labels: Record<Notification["type"], string> = {
    avaliacao: "Avaliação",
    financeiro: "Financeiro",
    frequencia: "Frequência",
    sistema: "Sistema",
    treino: "Treino",
  };

  return labels[type];
}

type TopbarProps = {
  onMenuClick: () => void;
};

const ROLE_HIERARCHY: Array<{ role: string; label: string }> = [
  { role: "Diretor", label: "Diretor" },
  { role: "Gestao", label: "Gestão" },
  { role: "Gestão", label: "Gestão" },
  { role: "ChefeMarketing", label: "Chefe Marketing" },
  { role: "Marketing", label: "Marketing" },
  { role: "RH", label: "RH" },
  { role: "Financeiro", label: "Financeiro" },
  { role: "Tecnico", label: "Técnico" },
  { role: "Operacional", label: "Operacional" },
  { role: "Gestor", label: "Gestor" },
  { role: "Conselheira", label: "Gestor" },
  { role: "Conselheiro", label: "Gestor" },
  { role: "Atleta", label: "Atleta" },
];

function getHighestRole(roleLabels?: string[], roles?: string[]): string {
  const allRoles = [...(roleLabels ?? []), ...(roles ?? [])];
  for (const { role, label } of ROLE_HIERARCHY) {
    if (allRoles.some((r) => r === role || r.toLowerCase() === role.toLowerCase())) {
      return label;
    }
  }
  return "Perfil";
}

export function Topbar({ onMenuClick }: TopbarProps) {
  const { logout, user } = useAuth();
  const { theme, toggleTheme } = useTheme();
  const navigate = useNavigate();
  const userRole = getHighestRole(user?.roleLabels, user?.roles);
  const dropdownRef = useRef<HTMLDivElement | null>(null);
  const searchRef = useRef<HTMLDivElement | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState<SearchResult[]>([]);
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [isNotificationsOpen, setIsNotificationsOpen] = useState(false);
  const [isLoadingNotifications, setIsLoadingNotifications] = useState(false);
  const unreadCount = useMemo(
    () => notifications.filter((notification) => !notification.read).length,
    [notifications],
  );

  const loadNotifications = useCallback(async () => {
    if (!user) return;
    setIsLoadingNotifications(true);

    try {
      setNotifications(await notificationService.getNotifications());
    } catch {
      setNotifications([]);
    } finally {
      setIsLoadingNotifications(false);
    }
  }, [user]);

  useEffect(() => {
    loadNotifications();
  }, [loadNotifications]);

  // Poll for new notifications every 60 seconds (push notifications handle real-time delivery)
  useEffect(() => {
    if (!user) return;
    const interval = setInterval(loadNotifications, 60_000);
    return () => clearInterval(interval);
  }, [user, loadNotifications]);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsNotificationsOpen(false);
      }
      if (searchRef.current && !searchRef.current.contains(event.target as Node)) {
        setIsSearchOpen(false);
      }
    }

    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  useEffect(() => {
    if (!searchQuery.trim()) {
      setSearchResults([]);
      setIsSearchOpen(false);
      return;
    }
    const timeout = setTimeout(async () => {
      const results = await runGlobalSearch(searchQuery);
      setSearchResults(results);
      setIsSearchOpen(results.length > 0);
    }, 350);
    return () => clearTimeout(timeout);
  }, [searchQuery]);

  function handleLogout() {
    logout();
    navigate("/login", { replace: true });
  }

  async function handleNotificationClick(notification: Notification) {
    if (!notification.read) {
      const updated = await notificationService.markAsRead(notification.id);
      setNotifications((current) =>
        current.map((item) => (item.id === updated.id ? updated : item)),
      );
    }
  }

  async function handleMarkAllAsRead() {
    setNotifications(await notificationService.markAllAsRead());
  }

  return (
    <header className="sticky top-0 z-20 w-full max-w-full border-b border-blue-100 bg-pegasus-surface/90 px-4 py-3 backdrop-blur dark:border-slate-700 dark:bg-slate-900/90 md:px-8 md:py-4">
      <div className="flex min-w-0 items-center justify-between gap-3">
        <div className="flex min-w-0 items-center gap-3">
          <button
            aria-label="Abrir menu"
            className="focus-ring grid h-11 w-11 shrink-0 place-items-center rounded-full border border-blue-100 bg-white text-pegasus-primary shadow-sm dark:border-slate-700 dark:bg-slate-800 dark:text-blue-400 lg:hidden"
            onClick={onMenuClick}
            type="button"
          >
            <Menu size={20} />
          </button>
          <img
            alt="Pegasus"
            className="hidden h-9 w-9 shrink-0 rounded-xl object-contain shadow-sm sm:block lg:hidden xl:block"
            src={logoIcon}
          />
          <div className="min-w-0">
            <p className="text-sm font-semibold text-pegasus-medium">Sistema administrativo</p>
            <p className="hidden text-xs text-slate-500 sm:block">Gestão integrada do Projeto Pegasus</p>
          </div>
        </div>

        <div className="flex shrink-0 items-center gap-2 sm:gap-3">
          <div className="relative hidden min-w-72 xl:block" ref={searchRef}>
            <label className="flex items-center gap-2 rounded-full border border-blue-100 bg-white px-4 py-2 text-sm text-slate-500 shadow-sm dark:border-slate-700 dark:bg-slate-800 dark:text-slate-400">
              <Search size={17} />
              <input
                className="w-full bg-transparent text-slate-700 outline-none placeholder:text-slate-400"
                onChange={(e) => setSearchQuery(e.target.value)}
                onFocus={() => searchResults.length > 0 && setIsSearchOpen(true)}
                placeholder="Buscar no sistema"
                value={searchQuery}
              />
            </label>
            {isSearchOpen && searchResults.length > 0 ? (
              <div className="absolute left-0 top-12 z-50 w-full overflow-hidden rounded-2xl border border-blue-100 bg-white shadow-2xl dark:border-slate-700 dark:bg-slate-800">
                {Object.entries(
                  searchResults.reduce<Record<string, SearchResult[]>>((acc, result) => {
                    if (!acc[result.category]) acc[result.category] = [];
                    acc[result.category].push(result);
                    return acc;
                  }, {}),
                ).map(([category, items]) => (
                  <div key={category}>
                    <p className="border-b border-blue-50 bg-pegasus-surface px-4 py-2 text-xs font-black uppercase tracking-[0.12em] text-pegasus-primary">
                      {category}
                    </p>
                    {items.map((result) => (
                      <button
                        className="block w-full px-4 py-3 text-left transition hover:bg-pegasus-ice"
                        key={result.id}
                        onClick={() => {
                          navigate(result.href);
                          setIsSearchOpen(false);
                          setSearchQuery("");
                        }}
                        type="button"
                      >
                        <p className="font-bold text-pegasus-navy">{result.label}</p>
                        {result.sublabel ? <p className="text-xs text-slate-500">{result.sublabel}</p> : null}
                      </button>
                    ))}
                  </div>
                ))}
              </div>
            ) : null}
          </div>

          <button
            aria-label={theme === "dark" ? "Modo claro" : "Modo escuro"}
            className="focus-ring grid h-10 w-10 shrink-0 place-items-center rounded-full border border-blue-100 bg-white text-slate-500 shadow-sm transition hover:text-pegasus-primary dark:border-slate-700 dark:bg-slate-800 dark:text-slate-400 dark:hover:text-blue-400"
            onClick={toggleTheme}
            type="button"
          >
            {theme === "dark" ? <Sun size={18} /> : <Moon size={18} />}
          </button>

          <NotificationsButton />

          <div className="relative" ref={dropdownRef}>
            <button
              aria-label="Notificações"
              className="focus-ring relative grid h-10 w-10 place-items-center rounded-full border border-blue-100 bg-white text-pegasus-primary shadow-sm dark:border-slate-700 dark:bg-slate-800 dark:text-blue-400"
              onClick={() => {
                setIsNotificationsOpen((current) => !current);
                loadNotifications();
              }}
              type="button"
            >
              <Bell size={18} />
              {unreadCount > 0 ? (
                <span className="absolute -right-1 -top-1 grid h-5 min-w-5 place-items-center rounded-full bg-rose-600 px-1 text-[10px] font-black text-white">
                  {unreadCount > 9 ? "9+" : unreadCount}
                </span>
              ) : null}
            </button>

            {isNotificationsOpen ? (
              <section className="fixed inset-x-2 top-[4.5rem] z-50 overflow-hidden rounded-2xl border border-blue-100 bg-white shadow-2xl dark:border-slate-700 dark:bg-slate-800 sm:absolute sm:inset-x-auto sm:right-0 sm:top-12 sm:w-[22rem]">
                <header className="flex items-center justify-between gap-3 border-b border-blue-100 p-4">
                  <div>
                    <p className="font-black text-pegasus-navy">Notificações</p>
                    <p className="text-xs text-slate-500">{unreadCount} não lida(s)</p>
                  </div>
                  <button
                    className="text-xs font-bold text-pegasus-primary disabled:opacity-50"
                    disabled={unreadCount === 0}
                    onClick={handleMarkAllAsRead}
                    type="button"
                  >
                    Marcar todas como lidas
                  </button>
                </header>

                <div className="max-h-[24rem] overflow-y-auto">
                  {isLoadingNotifications ? (
                    <div className="p-4 text-sm font-bold text-pegasus-primary">Carregando notificações</div>
                  ) : notifications.length > 0 ? (
                    notifications.slice(0, 10).map((notification) => (
                      <button
                        className={`block w-full border-b border-blue-50 p-4 text-left transition hover:bg-pegasus-ice ${
                          notification.read ? "bg-white" : "bg-blue-50/70"
                        }`}
                        key={notification.id}
                        onClick={() => handleNotificationClick(notification)}
                        type="button"
                      >
                        <div className="flex items-start justify-between gap-3">
                          <div>
                            <p className="break-words font-black text-pegasus-navy">{notification.title}</p>
                            <p className="mt-1 break-words text-sm leading-5 text-slate-600">{notification.message}</p>
                          </div>
                          {!notification.read ? (
                            <span className="mt-1 h-2.5 w-2.5 shrink-0 rounded-full bg-pegasus-primary" />
                          ) : null}
                        </div>
                        <div className="mt-3 flex items-center justify-between gap-3 text-xs font-bold text-slate-500">
                          <span>{typeLabel(notification.type)}</span>
                          <span>{formatRelativeTime(notification.createdAt)}</span>
                        </div>
                      </button>
                    ))
                  ) : (
                    <div className="p-6 text-center text-sm text-slate-500">Nenhuma notificação</div>
                  )}
                </div>
              </section>
            ) : null}
          </div>

          <div className="flex min-w-0 items-center gap-2 rounded-full border border-blue-100 bg-white py-1 pl-1 pr-2 shadow-sm dark:border-slate-700 dark:bg-slate-800 sm:pr-3">
            <span className="grid h-8 w-8 place-items-center rounded-full bg-pegasus-primary text-xs font-bold text-white">
              {getInitials(user?.name)}
            </span>
            <span className="hidden text-sm font-semibold text-pegasus-navy sm:inline">{user?.name}</span>
            <span className="hidden text-xs font-semibold text-slate-500 lg:inline">{userRole}</span>
            <ShieldCheck className="hidden text-pegasus-medium sm:block" size={16} />
          </div>
          <Button onClick={handleLogout} variant="secondary" className="min-h-10 rounded-full px-3">
            <LogOut size={17} />
            <span className="hidden sm:inline">Sair</span>
          </Button>
        </div>
      </div>
    </header>
  );
}
