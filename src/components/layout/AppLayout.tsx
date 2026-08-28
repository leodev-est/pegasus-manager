import { useState } from "react";
import { Outlet, useLocation } from "react-router-dom";
import { useAuth } from "../../auth/AuthContext";
import { AthleteWelcomeTour, useAthleteWelcomeTour } from "../athlete/AthleteWelcomeTour";
import { usePushSetup } from "../../hooks/usePushSetup";
import { Sidebar } from "./Sidebar";
import { Topbar } from "./Topbar";

const SIDEBAR_COLLAPSED_KEY = "pegasus-manager:sidebar-collapsed";

export function AppLayout() {
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [isDesktopCollapsed, setIsDesktopCollapsed] = useState(
    () => localStorage.getItem(SIDEBAR_COLLAPSED_KEY) === "1",
  );
  const { user } = useAuth();
  const location = useLocation();
  usePushSetup();

  function toggleSidebar() {
    if (window.innerWidth >= 1024) {
      setIsDesktopCollapsed((prev) => {
        const next = !prev;
        localStorage.setItem(SIDEBAR_COLLAPSED_KEY, next ? "1" : "0");
        return next;
      });
    } else {
      setIsSidebarOpen(true);
    }
  }

  const isAthlete =
    user?.permissions?.includes("atleta") &&
    !user?.permissions?.includes("rh") &&
    !user?.permissions?.includes("gestao") &&
    !user?.permissions?.includes("financeiro");

  const tour = useAthleteWelcomeTour();

  function handleOpenTour() {
    const detail = { handled: false };
    window.dispatchEvent(new CustomEvent("pegasus:tour:current", { detail }));
    if (!detail.handled) {
      window.dispatchEvent(new CustomEvent("pegasus:toast", {
        detail: { message: "Esta tela não tem tutorial disponível.", type: "info" },
      }));
    }
  }

  return (
    <div className="min-h-screen bg-pegasus-surface dark:bg-slate-900">
      <Sidebar
        isMobileOpen={isSidebarOpen}
        isDesktopCollapsed={isDesktopCollapsed}
        onNavigate={() => setIsSidebarOpen(false)}
        onOpenTour={handleOpenTour}
      />
      {isSidebarOpen ? (
        <button
          aria-label="Fechar menu"
          className="fixed inset-0 z-30 bg-pegasus-navy/50 backdrop-blur-sm lg:hidden"
          onClick={() => setIsSidebarOpen(false)}
          type="button"
        />
      ) : null}
      <div
        className={`min-w-0 max-w-full transition-[padding-left] duration-200 ease-in-out ${
          isDesktopCollapsed ? "lg:pl-[76px]" : "lg:pl-72"
        }`}
      >
        <Topbar onMenuClick={toggleSidebar} />
        <main className="w-full min-w-0 max-w-full px-4 py-5 sm:px-5 md:px-8 md:py-8">
          <div key={location.pathname} className="page-enter">
            <Outlet />
          </div>
        </main>
      </div>

      {isAthlete && tour.open && <AthleteWelcomeTour onClose={tour.close} />}
    </div>
  );
}
