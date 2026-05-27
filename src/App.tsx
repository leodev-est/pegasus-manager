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
      staleTime: 60_000,
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
