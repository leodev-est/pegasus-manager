import { Suspense, lazy } from "react";
import { Navigate, Route, Routes } from "react-router-dom";
import { ProtectedRoute } from "../components/auth/ProtectedRoute";
import { AppLayout } from "../components/layout/AppLayout";

const AccessControlPage = lazy(() => import("../pages/admin/AccessControlPage").then((m) => ({ default: m.AccessControlPage })));
const AuditLogPage = lazy(() => import("../pages/admin/AuditLogPage").then((m) => ({ default: m.AuditLogPage })));
const ConfiguracoesPage = lazy(() => import("../pages/admin/ConfiguracoesPage").then((m) => ({ default: m.ConfiguracoesPage })));
const WhatsAppPage = lazy(() => import("../pages/admin/WhatsAppPage").then((m) => ({ default: m.WhatsAppPage })));
const AttendanceAdminPage = lazy(() => import("../pages/attendance/AttendanceAdminPage").then((m) => ({ default: m.AttendanceAdminPage })));
const ChamadaPage = lazy(() => import("../pages/attendance/ChamadaPage").then((m) => ({ default: m.ChamadaPage })));
const MyFrequencyPage = lazy(() => import("../pages/attendance/MyFrequencyPage").then((m) => ({ default: m.MyFrequencyPage })));
const LoginPage = lazy(() => import("../pages/auth/LoginPage").then((m) => ({ default: m.LoginPage })));
const FirstAccessPage = lazy(() => import("../pages/auth/FirstAccessPage").then((m) => ({ default: m.FirstAccessPage })));
const DashboardPage = lazy(() => import("../pages/dashboard/DashboardPage").then((m) => ({ default: m.DashboardPage })));
const AthleteEvaluationsPage = lazy(() => import("../pages/evaluations/AthleteEvaluationsPage").then((m) => ({ default: m.AthleteEvaluationsPage })));
const FinancePage = lazy(() => import("../pages/finance/FinancePage").then((m) => ({ default: m.FinancePage })));
const ManagementKanbanPage = lazy(() => import("../pages/management/ManagementKanbanPage").then((m) => ({ default: m.ManagementKanbanPage })));
const MarketingPage = lazy(() => import("../pages/marketing/MarketingPage").then((m) => ({ default: m.MarketingPage })));
const SchoolsPage = lazy(() => import("../pages/operational/SchoolsPage").then((m) => ({ default: m.SchoolsPage })));
const SpreadsheetsPage = lazy(() => import("../pages/operational/SpreadsheetsPage").then((m) => ({ default: m.SpreadsheetsPage })));
const MyProfilePage = lazy(() => import("../pages/profile/MyProfilePage").then((m) => ({ default: m.MyProfilePage })));
const InscricaoEnviadaPage = lazy(() => import("../pages/public/InscricaoEnviadaPage").then((m) => ({ default: m.InscricaoEnviadaPage })));
const InscricaoPage = lazy(() => import("../pages/public/InscricaoPage").then((m) => ({ default: m.InscricaoPage })));
const LandingPage = lazy(() => import("../pages/public/LandingPage").then((m) => ({ default: m.LandingPage })));
const NotFoundPage = lazy(() => import("../pages/public/NotFoundPage").then((m) => ({ default: m.NotFoundPage })));
const AthleteApplicationsPage = lazy(() => import("../pages/rh/AthleteApplicationsPage").then((m) => ({ default: m.AthleteApplicationsPage })));
const AthletesPage = lazy(() => import("../pages/rh/AthletesPage").then((m) => ({ default: m.AthletesPage })));
const ComunicadosPage = lazy(() => import("../pages/rh/ComunicadosPage").then((m) => ({ default: m.ComunicadosPage })));
const GamesPage = lazy(() => import("../pages/games/GamesPage").then((m) => ({ default: m.GamesPage })));
const ConvocacaoPage = lazy(() => import("../pages/games/ConvocacaoPage").then((m) => ({ default: m.ConvocacaoPage })));
const TestesPage = lazy(() => import("../pages/rh/TestesPage").then((m) => ({ default: m.TestesPage })));
const TacticalCourtPage = lazy(() => import("../pages/tactical/TacticalCourtPage").then((m) => ({ default: m.TacticalCourtPage })));
const TrainingCalendarPage = lazy(() => import("../pages/trainings/TrainingCalendarPage").then((m) => ({ default: m.TrainingCalendarPage })));
const TrainingsPage = lazy(() => import("../pages/trainings/TrainingsPage").then((m) => ({ default: m.TrainingsPage })));
const UniformsPage = lazy(() => import("../pages/uniforms/UniformsPage").then((m) => ({ default: m.UniformsPage })));
const SugestoesPage = lazy(() => import("../pages/athlete/SugestoesPage").then((m) => ({ default: m.SugestoesPage })));
const OuvidoriaPage = lazy(() => import("../pages/rh/OuvidoriaPage").then((m) => ({ default: m.OuvidoriaPage })));
const AvaliarTreinoPage = lazy(() => import("../pages/athlete/AvaliarTreinoPage").then((m) => ({ default: m.AvaliarTreinoPage })));
const RankingFrequenciaPage = lazy(() => import("../pages/attendance/RankingFrequenciaPage").then((m) => ({ default: m.RankingFrequenciaPage })));

export function AppRoutes() {
  return (
    <Suspense fallback={null}>
      <Routes>
        <Route path="/" element={<LandingPage />} />
        <Route path="/inscricao" element={<InscricaoPage />} />
        <Route path="/inscricao/enviada" element={<InscricaoEnviadaPage />} />
        <Route path="/login" element={<LoginPage />} />
        <Route path="/primeiro-acesso" element={<FirstAccessPage />} />
        <Route
          path="/app"
          element={
            <ProtectedRoute>
              <AppLayout />
            </ProtectedRoute>
          }
        >
          <Route index element={<DashboardPage />} />
          <Route
            path="rh/testes"
            element={
              <ProtectedRoute permissions={["rh"]}>
                <TestesPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="rh/inscricoes"
            element={
              <ProtectedRoute permissions={["rh"]}>
                <AthleteApplicationsPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="rh/atletas"
            element={
              <ProtectedRoute permissions={["rh"]}>
                <AthletesPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="rh/comunicados"
            element={
              <ProtectedRoute permissions={["rh"]}>
                <ComunicadosPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="rh/ouvidoria"
            element={
              <ProtectedRoute permissions={["rh"]}>
                <OuvidoriaPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="atleta/sugestoes"
            element={
              <ProtectedRoute permissions={["atleta"]}>
                <SugestoesPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="atleta/avaliar-treino"
            element={
              <ProtectedRoute permissions={["atleta"]}>
                <AvaliarTreinoPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="financeiro"
            element={
              <ProtectedRoute permissions={["financeiro"]}>
                <FinancePage />
              </ProtectedRoute>
            }
          />
          <Route
            path="gestao"
            element={
              <ProtectedRoute permissions={["gestao"]}>
                <ManagementKanbanPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="jogos"
            element={
              <ProtectedRoute permissions={["dashboard"]}>
                <GamesPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="jogos/convocacao"
            element={
              <ProtectedRoute permissions={["treinos", "dashboard"]}>
                <ConvocacaoPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="uniformes"
            element={
              <ProtectedRoute permissions={["gestao"]}>
                <UniformsPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="marketing"
            element={
              <ProtectedRoute permissions={["marketing"]}>
                <MarketingPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="treinos/calendario"
            element={
              <ProtectedRoute permissions={["treinos"]}>
                <TrainingCalendarPage />
              </ProtectedRoute>
            }
          />
          <Route path="treinos/calendario-antigo" element={<Navigate to="/app/treinos/calendario" replace />} />
          <Route
            path="treinos"
            element={
              <ProtectedRoute permissions={["treinos"]}>
                <TrainingsPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="quadra-tatica"
            element={
              <ProtectedRoute permissions={["treinos"]}>
                <TacticalCourtPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="meu-perfil"
            element={
              <ProtectedRoute permissions={["atleta", "trainings:update"]}>
                <MyProfilePage />
              </ProtectedRoute>
            }
          />
          <Route
            path="atleta/frequencia"
            element={
              <ProtectedRoute permissions={["atleta"]}>
                <MyFrequencyPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="chamada"
            element={
              <ProtectedRoute permissions={["chamada"]}>
                <ChamadaPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="frequencia"
            element={
              <ProtectedRoute permissions={["trainings:update"]}>
                <AttendanceAdminPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="frequencia/ranking"
            element={
              <ProtectedRoute permissions={["trainings:update", "rh"]}>
                <RankingFrequenciaPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="avaliacoes"
            element={
              <ProtectedRoute permissions={["trainings:update"]}>
                <AthleteEvaluationsPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="operacional/escolas"
            element={
              <ProtectedRoute permissions={["operacional"]}>
                <SchoolsPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="operacional/planilhas"
            element={
              <ProtectedRoute permissions={["operacional"]}>
                <SpreadsheetsPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="admin/acessos"
            element={
              <ProtectedRoute permissions={["admin"]}>
                <AccessControlPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="admin/auditoria"
            element={
              <ProtectedRoute permissions={["admin"]}>
                <AuditLogPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="admin/whatsapp"
            element={
              <ProtectedRoute permissions={["admin"]}>
                <WhatsAppPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="admin/configuracoes"
            element={
              <ProtectedRoute permissions={["admin"]}>
                <ConfiguracoesPage />
              </ProtectedRoute>
            }
          />
        </Route>
        <Route path="*" element={<NotFoundPage />} />
      </Routes>
    </Suspense>
  );
}
