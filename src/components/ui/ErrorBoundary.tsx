import { Component, type ErrorInfo, type ReactNode } from "react";
import { AlertTriangle, RefreshCw } from "lucide-react";
import { Button } from "./Button";

type ErrorBoundaryProps = {
  children: ReactNode;
};

type ErrorBoundaryState = {
  hasError: boolean;
};

export class ErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  state: ErrorBoundaryState = { hasError: false };

  static getDerivedStateFromError() {
    return { hasError: true };
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    console.error("Pegasus Manager render error", error, info);
  }

  render() {
    if (this.state.hasError) {
      return (
        <main className="grid min-h-screen place-items-center bg-pegasus-surface px-4">
          <section className="w-full max-w-lg rounded-3xl border border-blue-100 bg-white p-6 text-center shadow-soft">
            <span className="mx-auto grid h-14 w-14 place-items-center rounded-2xl bg-rose-50 text-rose-700">
              <AlertTriangle size={26} />
            </span>
            <h1 className="mt-5 text-2xl font-black text-pegasus-navy">
              Algo saiu do lugar
            </h1>
            <p className="mt-3 text-sm leading-6 text-slate-600">
              Não foi possível carregar esta tela agora. Atualize a página e tente novamente.
            </p>
            <Button className="mt-6 w-full sm:w-auto" onClick={() => window.location.reload()}>
              <RefreshCw size={17} />
              Recarregar
            </Button>
          </section>
        </main>
      );
    }

    return this.props.children;
  }
}


