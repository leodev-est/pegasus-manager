import { Bell, LogOut, Menu, Search, ShieldCheck } from "lucide-react";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../../auth/AuthContext";
import logoIcon from "../../assets/logo/logo-icon.png";
import { notificationService, type Notification } from "../../services/notificationService";
import { Button } from "../ui/Button";

function getInitials(name?: string) {
  if (!name) return "PM";

  return name
    .split(" ")
    .map((part) => part[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();
}

function formatNotificationDate(value: string) {
  return new Intl.DateTimeFormat("pt-BR", {
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    month: "2-digit",
  }).format(new Date(value));
}

function typeLabel(type: Notification["type"]) {
  const labels: Record<Notification["type"], string> = {
    avaliacao: "Avaliacao",
    financeiro: "Financeiro",
    frequencia: "Frequencia",
    sistema: "Sistema",
    treino: "Treino",
  };

  return labels[type];
}

type TopbarProps = {
  onMenuClick: () => void;
};

export function Topbar({ onMenuClick }: TopbarProps) {
  const { logout, user } = useAuth();
  const navigate = useNavigate();
  const userRole = user?.roleLabels?.join(" + ") ?? user?.roles.join(" + ") ?? "Perfil";
  const dropdownRef = useRef<HTMLDivElement | null>(null);
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

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsNotificationsOpen(false);
      }
    }

    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

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
    <header className="sticky top-0 z-20 w-full max-w-full border-b border-blue-100 bg-pegasus-surface/90 px-4 py-3 backdrop-blur md:px-8 md:py-4">
      <div className="flex min-w-0 items-center justify-between gap-3">
        <div className="flex min-w-0 items-center gap-3">
          <button
            aria-label="Abrir menu"
            className="focus-ring grid h-11 w-11 shrink-0 place-items-center rounded-full border border-blue-100 bg-white text-pegasus-primary shadow-sm lg:hidden"
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
            <p className="hidden text-xs text-slate-500 sm:block">Gestao integrada do Projeto Pegasus</p>
          </div>
        </div>

        <div className="flex shrink-0 items-center gap-2 sm:gap-3">
          <label className="hidden min-w-72 items-center gap-2 rounded-full border border-blue-100 bg-white px-4 py-2 text-sm text-slate-500 shadow-sm xl:flex">
            <Search size={17} />
            <input
              className="w-full bg-transparent text-slate-700 outline-none placeholder:text-slate-400"
              placeholder="Buscar no sistema"
            />
          </label>

          <div className="relative" ref={dropdownRef}>
            <button
              aria-label="Notificacoes"
              className="focus-ring relative grid h-10 w-10 place-items-center rounded-full border border-blue-100 bg-white text-pegasus-primary shadow-sm"
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
              <section className="absolute right-0 top-12 z-50 w-[min(22rem,calc(100vw-2rem))] overflow-hidden rounded-2xl border border-blue-100 bg-white shadow-2xl">
                <header className="flex items-center justify-between gap-3 border-b border-blue-100 p-4">
                  <div>
                    <p className="font-black text-pegasus-navy">Notificacoes</p>
                    <p className="text-xs text-slate-500">{unreadCount} nao lida(s)</p>
                  </div>
                  <button
                    className="text-xs font-bold text-pegasus-primary disabled:opacity-50"
                    disabled={unreadCount === 0}
                    onClick={handleMarkAllAsRead}
                    type="button"
                  >
                    Marcar todas
                  </button>
                </header>

                <div className="max-h-[24rem] overflow-y-auto">
                  {isLoadingNotifications ? (
                    <div className="p-4 text-sm font-bold text-pegasus-primary">Carregando notificacoes</div>
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
                            <p className="font-black text-pegasus-navy">{notification.title}</p>
                            <p className="mt-1 text-sm leading-5 text-slate-600">{notification.message}</p>
                          </div>
                          {!notification.read ? (
                            <span className="mt-1 h-2.5 w-2.5 shrink-0 rounded-full bg-pegasus-primary" />
                          ) : null}
                        </div>
                        <div className="mt-3 flex items-center justify-between gap-3 text-xs font-bold text-slate-500">
                          <span>{typeLabel(notification.type)}</span>
                          <span>{formatNotificationDate(notification.createdAt)}</span>
                        </div>
                      </button>
                    ))
                  ) : (
                    <div className="p-6 text-center text-sm text-slate-500">Nenhuma notificacao</div>
                  )}
                </div>
              </section>
            ) : null}
          </div>

          <div className="flex min-w-0 items-center gap-2 rounded-full border border-blue-100 bg-white py-1 pl-1 pr-2 shadow-sm sm:pr-3">
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
