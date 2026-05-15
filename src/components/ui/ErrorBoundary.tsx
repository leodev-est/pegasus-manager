import { Component, type ErrorInfo, type ReactNode } from "react";
import { AlertTriangle, RefreshCw, RotateCcw, ChevronDown } from "lucide-react";
import { Button } from "./Button";

type Props = { children: ReactNode };

type State = {
  hasError: boolean;
  error: Error | null;
  errorInfo: ErrorInfo | null;
  showDetails: boolean;
};

const isDev = import.meta.env.DEV;

export class ErrorBoundary extends Component<Props, State> {
  state: State = { hasError: false, error: null, errorInfo: null, showDetails: false };

  static getDerivedStateFromError(error: Error): Partial<State> {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    this.setState({ errorInfo: info });
    console.error("[Pegasus] Render error:", error, info.componentStack);
  }

  reset = () => this.setState({ hasError: false, error: null, errorInfo: null, showDetails: false });

  render() {
    if (!this.state.hasError) return this.props.children;

    const { error, errorInfo, showDetails } = this.state;

    return (
      <main className="grid min-h-screen place-items-center bg-pegasus-surface px-4 py-12">
        <section className="w-full max-w-lg space-y-4">
          <div className="rounded-3xl border border-rose-100 bg-white p-8 text-center shadow-soft">
            <span className="mx-auto grid h-14 w-14 place-items-center rounded-2xl bg-rose-50 text-rose-600">
              <AlertTriangle size={26} />
            </span>
            <h1 className="mt-5 text-2xl font-black text-pegasus-navy">Algo saiu do lugar</h1>
            <p className="mt-3 text-sm leading-6 text-slate-500">
              Um erro inesperado impediu o carregamento desta tela.
              {isDev
                ? " Veja os detalhes abaixo."
                : " Atualize a página ou tente novamente."}
            </p>

            <div className="mt-6 flex flex-col gap-3 sm:flex-row sm:justify-center">
              <Button onClick={this.reset} variant="secondary">
                <RotateCcw size={16} />
                Tentar novamente
              </Button>
              <Button onClick={() => window.location.reload()}>
                <RefreshCw size={16} />
                Recarregar página
              </Button>
            </div>
          </div>

          {isDev && error && (
            <div className="rounded-2xl border border-slate-200 bg-slate-950 text-left text-xs">
              <button
                type="button"
                onClick={() => this.setState((s) => ({ showDetails: !s.showDetails }))}
                className="flex w-full items-center justify-between gap-2 px-4 py-3 text-slate-400 hover:text-slate-200"
              >
                <span className="font-mono font-semibold text-rose-400">
                  {error.name}: {error.message}
                </span>
                <ChevronDown
                  size={14}
                  className={`shrink-0 transition-transform ${showDetails ? "rotate-180" : ""}`}
                />
              </button>
              {showDetails && (
                <div className="border-t border-slate-800 px-4 pb-4 pt-3">
                  {error.stack && (
                    <pre className="overflow-x-auto whitespace-pre-wrap text-slate-400">
                      {error.stack}
                    </pre>
                  )}
                  {errorInfo?.componentStack && (
                    <>
                      <p className="mt-4 font-semibold text-slate-500">Component stack:</p>
                      <pre className="mt-1 overflow-x-auto whitespace-pre-wrap text-slate-500">
                        {errorInfo.componentStack}
                      </pre>
                    </>
                  )}
                </div>
              )}
            </div>
          )}
        </section>
      </main>
    );
  }
}
