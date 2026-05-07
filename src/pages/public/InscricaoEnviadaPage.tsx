import { ArrowLeft, CheckCircle2, LogIn } from "lucide-react";
import { Link } from "react-router-dom";
import logoFull from "../../assets/logo/logo-full.png";

export function InscricaoEnviadaPage() {
  return (
    <main className="min-h-screen bg-pegasus-surface">
      {/* Header */}
      <header className="bg-pegasus-navy text-white">
        <div className="mx-auto flex max-w-4xl items-center justify-between gap-4 px-4 py-4 sm:px-6">
          <Link to="/" className="flex items-center gap-3">
            <img src={logoFull} alt="Projeto Pegasus" className="h-10 w-20 rounded-xl object-contain" />
            <div>
              <p className="font-bold leading-tight">Projeto Pegasus</p>
              <p className="text-xs text-blue-200">Voleibol e comunidade</p>
            </div>
          </Link>
          <Link
            to="/login"
            className="inline-flex items-center gap-2 rounded-full bg-white px-4 py-2 text-sm font-semibold text-pegasus-primary"
          >
            <LogIn size={16} />
            Sou Atleta
          </Link>
        </div>
      </header>

      {/* Conteúdo */}
      <div className="mx-auto flex max-w-2xl flex-col items-center px-4 py-16 text-center sm:px-6">
        <div className="grid h-24 w-24 place-items-center rounded-full bg-emerald-100 text-emerald-600">
          <CheckCircle2 size={48} strokeWidth={1.5} />
        </div>

        <h1 className="mt-6 text-3xl font-black text-pegasus-navy sm:text-4xl">
          Inscrição enviada!
        </h1>

        <p className="mt-4 text-lg leading-7 text-slate-600">
          Recebemos sua inscrição no <strong className="text-pegasus-navy">Projeto Pegasus</strong>.
          Nossa equipe vai analisar seu perfil e entrará em contato em breve.
        </p>

        <div className="mt-8 w-full rounded-2xl border border-blue-100 bg-white p-6 text-left shadow-soft">
          <p className="font-bold text-pegasus-navy">Próximos passos</p>
          <ul className="mt-3 space-y-3">
            {[
              "Nossa equipe analisa seu perfil e disponibilidade.",
              "Você será contatado pelo telefone informado.",
              "Caso aprovado, passará por um período de teste no time.",
            ].map((step, i) => (
              <li key={i} className="flex items-start gap-3 text-sm text-slate-600">
                <span className="mt-0.5 grid h-5 w-5 shrink-0 place-items-center rounded-full bg-pegasus-ice text-xs font-black text-pegasus-primary">
                  {i + 1}
                </span>
                {step}
              </li>
            ))}
          </ul>
        </div>

        <div className="mt-8 flex flex-col gap-3 sm:flex-row">
          <Link
            to="/"
            className="inline-flex min-h-11 items-center justify-center gap-2 rounded-2xl bg-pegasus-primary px-6 font-bold text-white shadow-lg shadow-blue-900/20 hover:bg-pegasus-medium"
          >
            Voltar ao início
          </Link>
          <Link
            to="/inscricao"
            className="inline-flex min-h-11 items-center justify-center gap-2 rounded-2xl border border-blue-100 bg-white px-6 font-bold text-pegasus-primary hover:bg-pegasus-ice"
          >
            <ArrowLeft size={17} />
            Nova inscrição
          </Link>
        </div>
      </div>
    </main>
  );
}
