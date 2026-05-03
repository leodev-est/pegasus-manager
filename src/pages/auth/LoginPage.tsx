import { ArrowLeft, Loader2, LockKeyhole, LogIn, Mail } from "lucide-react";
import type { FormEvent } from "react";
import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "../../auth/AuthContext";
import logoFull from "../../assets/logo/logo-full.png";
import { Button } from "../../components/ui/Button";
import { useToast } from "../../components/ui/Toast";

export function LoginPage() {
  const { isAuthenticated, isLoading, login, user } = useAuth();
  const { showToast } = useToast();
  const navigate = useNavigate();
  const [email, setEmail] = useState("leo@pegasus.com");
  const [password, setPassword] = useState("123456");
  const [error, setError] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (isAuthenticated && user?.mustChangePassword) {
      navigate("/primeiro-acesso", { replace: true });
      return;
    }

    if (isAuthenticated) {
      navigate("/app", { replace: true });
    }
  }, [isAuthenticated, navigate, user?.mustChangePassword]);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    setIsSubmitting(true);

    try {
      await login(email, password);
      showToast("Login realizado com sucesso.", "success");
    } catch (loginError) {
      const message =
        loginError instanceof Error ? loginError.message : "E-mail ou senha inválidos.";
      setError(message);
      showToast(message, "error");
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <main className="relative grid min-h-screen place-items-center overflow-hidden bg-pegasus-navy px-6 py-10 text-white">
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_18%_18%,rgba(66,165,245,0.45)_0,transparent_28%),linear-gradient(135deg,#0B2E59_0%,#0D47A1_55%,#1565C0_100%)]" />
      <div className="absolute inset-0 opacity-20 [background-image:linear-gradient(135deg,transparent_0,transparent_48%,rgba(255,255,255,0.22)_49%,transparent_50%)]" />

      <section className="relative z-10 w-full max-w-md">
        <div>
          <Link
            to="/"
            className="mb-8 inline-flex items-center gap-2 text-sm font-semibold text-blue-50"
          >
            <ArrowLeft size={17} />
            Voltar para o site
          </Link>

          <div className="rounded-3xl border border-white/20 bg-white p-8 text-pegasus-navy shadow-2xl shadow-blue-950/30">
            <div className="text-center">
              <img
                src={logoFull}
                alt="Projeto Pegasus"
                className="mx-auto h-auto w-full max-w-[280px] rounded-2xl object-contain shadow-lg sm:max-w-[320px]"
              />
              <h1 className="mt-6 text-3xl font-black">Pegasus Manager</h1>
              <p className="mt-1 text-sm font-semibold text-pegasus-medium">
                Gestão esportiva com propósito
              </p>
            </div>

            <form className="mt-8 space-y-5" onSubmit={handleSubmit}>
              <label className="block">
                <span className="text-sm font-semibold text-pegasus-navy">Usuário</span>
                <span className="mt-2 flex items-center gap-3 rounded-2xl border border-blue-100 bg-white px-4 py-3">
                  <Mail className="text-pegasus-medium" size={18} />
                  <input
                    type="text"
                    required
                    value={email}
                    onChange={(event) => setEmail(event.target.value)}
                    disabled={isSubmitting}
                    placeholder="leo ou leo@pegasus.com"
                    className="w-full outline-none placeholder:text-slate-400"
                  />
                </span>
              </label>

              <label className="block">
                <span className="text-sm font-semibold text-pegasus-navy">Senha</span>
                <span className="mt-2 flex items-center gap-3 rounded-2xl border border-blue-100 bg-white px-4 py-3">
                  <LockKeyhole className="text-pegasus-medium" size={18} />
                  <input
                    type="password"
                    required
                    value={password}
                    onChange={(event) => setPassword(event.target.value)}
                    disabled={isSubmitting}
                    placeholder="123456"
                    className="w-full outline-none placeholder:text-slate-400"
                  />
                </span>
              </label>

              {error ? (
                <p className="rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm font-semibold text-rose-700">
                  {error}
                </p>
              ) : null}

              <Button
                type="submit"
                disabled={isSubmitting || isLoading}
                className="w-full rounded-2xl py-3"
              >
                {isSubmitting || isLoading ? (
                  <Loader2 className="animate-spin" size={18} />
                ) : (
                  <LogIn size={18} />
                )}
                {isSubmitting || isLoading ? "Entrando..." : "Entrar"}
              </Button>
            </form>
          </div>
        </div>
      </section>
    </main>
  );
}


