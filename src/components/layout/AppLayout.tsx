import { useState } from "react";
import { Outlet } from "react-router-dom";
import { useAuth } from "../../auth/AuthContext";
import { AthleteWelcomeTour, useAthleteWelcomeTour } from "../athlete/AthleteWelcomeTour";
import { usePushSetup } from "../../hooks/usePushSetup";
import { Sidebar } from "./Sidebar";
import { Topbar } from "./Topbar";

export function AppLayout() {
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const { user } = useAuth();
  usePushSetup();

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
      <div className="min-w-0 max-w-full lg:pl-72">
        <Topbar onMenuClick={() => setIsSidebarOpen(true)} />
        <main className="w-full min-w-0 max-w-full px-4 py-5 sm:px-5 md:px-8 md:py-8">
          <Outlet />
        </main>
      </div>

      {isAthlete && tour.open && <AthleteWelcomeTour onClose={tour.close} />}
    </div>
  );
}
