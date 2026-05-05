import { Navigate, Route, Routes } from "react-router-dom";
import { ProtectedRoute } from "../components/auth/ProtectedRoute";
import { AppLayout } from "../components/layout/AppLayout";
import { AccessControlPage } from "../pages/admin/AccessControlPage";
import { AttendanceAdminPage } from "../pages/attendance/AttendanceAdminPage";
import { ChamadaPage } from "../pages/attendance/ChamadaPage";
import { MyFrequencyPage } from "../pages/attendance/MyFrequencyPage";
import { LoginPage } from "../pages/auth/LoginPage";
import { FirstAccessPage } from "../pages/auth/FirstAccessPage";
import { DashboardPage } from "../pages/dashboard/DashboardPage";
import { AthleteEvaluationsPage } from "../pages/evaluations/AthleteEvaluationsPage";
import { FinancePage } from "../pages/finance/FinancePage";
import { ManagementKanbanPage } from "../pages/management/ManagementKanbanPage";
import { MarketingPage } from "../pages/marketing/MarketingPage";
import { SchoolsPage } from "../pages/operational/SchoolsPage";
import { SpreadsheetsPage } from "../pages/operational/SpreadsheetsPage";
import { MyProfilePage } from "../pages/profile/MyProfilePage";
import { LandingPage } from "../pages/public/LandingPage";
import { NotFoundPage } from "../pages/public/NotFoundPage";
import { AthleteApplicationsPage } from "../pages/rh/AthleteApplicationsPage";
import { AthletesPage } from "../pages/rh/AthletesPage";
import { TestesPage } from "../pages/rh/TestesPage";
import { TacticalCourtPage } from "../pages/tactical/TacticalCourtPage";
import { TrainingCalendarPage } from "../pages/trainings/TrainingCalendarPage";
import { TrainingsPage } from "../pages/trainings/TrainingsPage";

export function AppRoutes() {
  return (
    <Routes>
      <Route path="/" element={<LandingPage />} />
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
      </Route>
      <Route path="*" element={<NotFoundPage />} />
    </Routes>
  );
}
