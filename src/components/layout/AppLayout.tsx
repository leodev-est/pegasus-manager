import { useState } from "react";
import { Outlet } from "react-router-dom";
import { Sidebar } from "./Sidebar";
import { Topbar } from "./Topbar";

export function AppLayout() {
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);

  return (
    <div className="min-h-screen bg-pegasus-surface">
      <Sidebar isMobileOpen={isSidebarOpen} onNavigate={() => setIsSidebarOpen(false)} />
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
    </div>
  );
}
