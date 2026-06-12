import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter } from "react-router-dom";
import { AuthProvider } from "./auth/AuthContext";
import { AppRoutes } from "./routes/AppRoutes";
import { ToastProvider } from "./components/ui/Toast";
import { ErrorBoundary } from "./components/ui/ErrorBoundary";
import { ThemeProvider } from "./contexts/ThemeContext";
import { PwaUpdatePrompt } from "./components/pwa/PwaUpdatePrompt";

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: 1,
      staleTime: 5 * 60_000,       // dados ficam "frescos" por 5 min — navegar entre páginas é instantâneo
      gcTime: 30 * 60_000,          // mantém no cache por 30 min após desmontar
      refetchOnWindowFocus: false,  // não recarrega ao voltar para a aba
    },
  },
});

export default function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <ThemeProvider>
        <ToastProvider>
          <ErrorBoundary>
            <AuthProvider>
              <BrowserRouter>
                <AppRoutes />
              </BrowserRouter>
            </AuthProvider>
          </ErrorBoundary>
        </ToastProvider>
        <PwaUpdatePrompt />
      </ThemeProvider>
    </QueryClientProvider>
  );
}
