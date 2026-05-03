import type { ReactNode } from "react";
import { Navigate } from "react-router-dom";
import { Loader2 } from "lucide-react";
import { useAuth } from "../../auth/AuthContext";
import { AccessDenied } from "../ui/AccessDenied";

type ProtectedRouteProps = {
  children: ReactNode;
  permissions?: string[];
};

export function ProtectedRoute({ children, permissions }: ProtectedRouteProps) {
  const { isAuthenticated, hasPermission, isLoading, user } = useAuth();

  if (isLoading) {
    return (
      <div className="grid min-h-screen place-items-center bg-pegasus-surface">
        <div className="flex items-center gap-3 rounded-2xl border border-blue-100 bg-white px-5 py-4 text-sm font-bold text-pegasus-primary shadow-soft">
          <Loader2 className="animate-spin" size={18} />
          Carregando sessão
        </div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  if (user?.mustChangePassword) {
    return <Navigate to="/primeiro-acesso" replace />;
  }

  if (!hasPermission(permissions)) {
    return <AccessDenied />;
  }

  return children;
}
