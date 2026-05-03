import { LockKeyhole } from "lucide-react";
import { Link } from "react-router-dom";
import { EmptyState } from "./EmptyState";

export function AccessDenied() {
  return (
    <div className="grid min-h-[calc(100vh-10rem)] place-items-center">
      <div className="w-full max-w-xl">
        <EmptyState
          icon={LockKeyhole}
          title="Acesso negado"
          description="Seu perfil não possui permissão para acessar esta área do Pegasus Manager."
        />
        <div className="mt-5 flex justify-center">
          <Link
            to="/app"
            className="focus-ring inline-flex items-center justify-center rounded-xl bg-pegasus-primary px-4 py-2 text-sm font-bold text-white shadow-lg shadow-blue-900/20"
          >
            Voltar ao dashboard
          </Link>
        </div>
      </div>
    </div>
  );
}


