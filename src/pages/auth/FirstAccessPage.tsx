import { ArrowLeft, Loader2, LockKeyhole } from "lucide-react";
import type { FormEvent } from "react";
import { useEffect, useState } from "react";
import { Link, Navigate, useNavigate } from "react-router-dom";
import { useAuth } from "../../auth/AuthContext";
import logoFull from "../../assets/logo/logo-full.png";
import { Button } from "../../components/ui/Button";
import { useToast } from "../../components/ui/Toast";

export function FirstAccessPage() {
  const { changeFirstPassword, isAuthenticated, user } = useAuth();
  const { showToast } = useToast();
  const navigate = useNavigate();
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [error, setError] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (isAuthenticated && user && !user.mustChangePassword) {
      navigate("/app", { replace: true });
    }
  }, [isAuthenticated, navigate, user]);

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    setIsSubmitting(true);

    try {
      await changeFirstPassword(newPassword, confirmPassword);
      showToast("Senha criada com sucesso.", "success");
      navigate("/app", { replace: true });
    } catch (changeError) {
      const message = changeError instanceof Error ? changeError.message : "Não foi possível criar a senha.";
      setError(message);
      showToast(message, "error");
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <main className="relative grid min-h-screen place-items-center overflow-hidden bg-pegasus-navy px-6 py-10 text-white">
      <div className="absolute inset-0 bg-[linear-gradient(135deg,#0B2E59_0%,#0D47A1_55%,#1565C0_100%)]" />
      <section className="relative z-10 w-full max-w-md">
        <Link to="/login" className="mb-8 inline-flex items-center gap-2 text-sm font-semibold text-blue-50">
          <ArrowLeft size={17} />
          Voltar ao login
        </Link>
        <div className="rounded-3xl border border-white/20 bg-white p-8 text-pegasus-navy shadow-2xl shadow-blue-950/30">
          <div className="text-center">
            <img
              src={logoFull}
              alt="Projeto Pegasus"
              className="mx-auto h-auto w-full max-w-[280px] rounded-2xl object-contain shadow-lg sm:max-w-[320px]"
            />
            <h1 className="mt-6 text-3xl font-black">Primeiro acesso</h1>
            <p className="mt-1 text-sm font-semibold text-pegasus-medium">
              Crie sua senha para continuar.
            </p>
          </div>

          <form className="mt-8 space-y-5" onSubmit={handleSubmit}>
            <label className="block">
              <span className="text-sm font-semibold text-pegasus-navy">Nova senha</span>
              <span className="mt-2 flex items-center gap-3 rounded-2xl border border-blue-100 bg-white px-4 py-3">
                <LockKeyhole className="text-pegasus-medium" size={18} />
                <input
                  className="w-full outline-none placeholder:text-slate-400"
                  disabled={isSubmitting}
                  minLength={6}
                  onChange={(event) => setNewPassword(event.target.value)}
                  required
                  type="password"
                  value={newPassword}
                />
              </span>
            </label>
            <label className="block">
              <span className="text-sm font-semibold text-pegasus-navy">Confirmar senha</span>
              <span className="mt-2 flex items-center gap-3 rounded-2xl border border-blue-100 bg-white px-4 py-3">
                <LockKeyhole className="text-pegasus-medium" size={18} />
                <input
                  className="w-full outline-none placeholder:text-slate-400"
                  disabled={isSubmitting}
                  minLength={6}
                  onChange={(event) => setConfirmPassword(event.target.value)}
                  required
                  type="password"
                  value={confirmPassword}
                />
              </span>
            </label>
            {error ? (
              <p className="rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm font-semibold text-rose-700">
                {error}
              </p>
            ) : null}
            <Button className="w-full rounded-2xl py-3" disabled={isSubmitting} type="submit">
              {isSubmitting ? <Loader2 className="animate-spin" size={18} /> : <LockKeyhole size={18} />}
              {isSubmitting ? "Salvando..." : "Criar senha"}
            </Button>
          </form>
        </div>
      </section>
    </main>
  );
}
