import { ArrowLeft, CheckCircle2, LogIn } from "lucide-react";
import { Link } from "react-router-dom";
import logoFull from "../../assets/logo/logo-full.png";
import { ORG_SHORT_NAME, ORG_LOGO_URL } from "../../config/org";

export function InscricaoEnviadaPage() {
  return (
    <main className="min-h-screen bg-pegasus-surface">
      {/* Header */}
      <header className="bg-[#071428] text-white">
        <div className="mx-auto flex max-w-4xl items-center justify-between gap-4 px-4 py-4 sm:px-6">
          <Link to="/" className="flex items-center gap-3">
            <img src={ORG_LOGO_URL || logoFull} alt={`Projeto ${ORG_SHORT_NAME}`} className="h-10 w-20 rounded-xl object-contain" />
            <div>
              <p className="font-bold leading-tight">Projeto {ORG_SHORT_NAME}</p>
              <p className="text-xs text-[#42A5F5]">Voleibol e comunidade</p>
            </div>
          </Link>
          <Link
            to="/login"
            className="inline-flex items-center gap-2 rounded-full bg-[#1565C0] px-4 py-2 text-sm font-bold text-white transition hover:bg-[#42A5F5] hover:text-[#071428]"
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
          Recebemos sua inscrição no <strong className="text-pegasus-navy">Projeto {ORG_SHORT_NAME}</strong>.
          Nossa equipe vai analisar seu perfil e entrará em contato em breve.
        </p>

        <div className="mt-8 w-full rounded-2xl border border-stone-200 bg-white p-6 text-left shadow-soft">
          <p className="font-bold text-pegasus-navy">Próximos passos</p>
          <ul className="mt-3 space-y-3">
            {[
              "Nossa equipe analisa seu perfil e disponibilidade.",
              "Você será contatado pelo telefone informado.",
              "Caso aprovado, passará por um período de teste no time.",
            ].map((step, i) => (
              <li key={i} className="flex items-start gap-3 text-sm text-slate-600">
                <span className="mt-0.5 grid h-5 w-5 shrink-0 place-items-center rounded-full bg-[#E3F2FD] text-xs font-black text-[#0D47A1]">
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
            className="inline-flex min-h-11 items-center justify-center gap-2 rounded-2xl bg-[#1565C0] px-6 font-bold text-white shadow-lg shadow-blue-900/20 transition hover:bg-[#0D47A1]"
          >
            Voltar ao início
          </Link>
          <Link
            to="/inscricao"
            className="inline-flex min-h-11 items-center justify-center gap-2 rounded-2xl border border-stone-200 bg-white px-6 font-bold text-[#1565C0] transition hover:bg-[#E3F2FD]"
          >
            <ArrowLeft size={17} />
            Nova inscrição
          </Link>
        </div>
      </div>
    </main>
  );
}
