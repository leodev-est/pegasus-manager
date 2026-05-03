import { ArrowLeft, Home, SearchX } from "lucide-react";
import { Link } from "react-router-dom";

export function NotFoundPage() {
  return (
    <main className="grid min-h-screen place-items-center bg-pegasus-surface px-4 py-10 text-pegasus-navy">
      <section className="w-full max-w-2xl rounded-3xl border border-blue-100 bg-white p-6 text-center shadow-soft sm:p-8">
        <span className="mx-auto grid h-16 w-16 place-items-center rounded-2xl bg-pegasus-ice text-pegasus-primary">
          <SearchX size={30} />
        </span>
        <p className="mt-6 text-sm font-bold uppercase tracking-[0.18em] text-pegasus-medium">
          Pagina não encontrada
        </p>
        <h1 className="mt-3 text-3xl font-black sm:text-4xl">Esse caminho não existe</h1>
        <p className="mx-auto mt-4 max-w-md text-sm leading-6 text-slate-600">
          O link pode ter mudado ou a página não está disponível no Pegasus Manager.
        </p>
        <div className="mt-8 flex flex-col gap-3 sm:flex-row sm:justify-center">
          <Link
            className="focus-ring inline-flex min-h-11 items-center justify-center gap-2 rounded-xl bg-pegasus-primary px-4 py-2.5 text-sm font-bold text-white shadow-lg shadow-blue-900/20 hover:bg-pegasus-medium"
            to="/app"
          >
            <Home size={17} />
            Voltar ao dashboard
          </Link>
          <Link
            className="focus-ring inline-flex min-h-11 items-center justify-center gap-2 rounded-xl border border-blue-100 bg-white px-4 py-2.5 text-sm font-bold text-pegasus-primary shadow-sm hover:bg-pegasus-ice"
            to="/"
          >
            <ArrowLeft size={17} />
            Ir para a landing
          </Link>
        </div>
      </section>
    </main>
  );
}


