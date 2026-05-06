# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

Pegasus Manager is a sports club management system (volleyball) for a Brazilian club. It is a monorepo with:
- **Root `/`** — React 18 + Vite + TypeScript frontend (PWA)
- **`/backend`** — Express.js + TypeScript + Prisma + PostgreSQL API

The UI is in Brazilian Portuguese.

## Commands

### Frontend (root)
```bash
npm run dev        # Start dev server (Vite, default port 5173)
npm run build      # TypeScript check + production build
npm run preview    # Preview production build
```

### Backend (`/backend`)
```bash
npm run dev              # Start API with hot reload (ts-node-dev, port 3000)
npm run build            # Compile TypeScript to dist/
npm run start            # Run compiled dist/index.js (runs migrations first)
npm run prisma:migrate   # Create and apply a new migration (dev)
npm run prisma:deploy    # Apply pending migrations (production)
npm run prisma:generate  # Regenerate Prisma client after schema changes
npm run prisma:seed      # Seed the database
```

There are no automated tests in this project.

## Environment Variables

Frontend (`.env`):
- `VITE_API_URL` — Backend URL (defaults to `http://localhost:3000`)

Backend (`backend/.env`):
- `DATABASE_URL` — PostgreSQL connection string (required)
- `JWT_SECRET` — Generate with `openssl rand -hex 32` (required)
- `PORT` — Defaults to `3000`
- `CORS_ORIGIN` / `CORS_ORIGINS` / `FRONTEND_URL` — Allowed CORS origins (comma-separated in prod)
- `ATHLETE_TEMP_PASSWORD` — Default password for newly activated athletes
- `GOOGLE_SHEETS_CLIENT_EMAIL`, `GOOGLE_SHEETS_PRIVATE_KEY`, `GOOGLE_SHEETS_SPREADSHEET_ID` — Google Sheets integration for athlete imports
- `GOOGLE_SHEETS_APPLICATIONS_SPREADSHEET_ID`, `GOOGLE_SHEETS_APPLICATIONS_RANGE` — Google Sheets for athlete applications import

## Architecture

### Frontend

Entry: `src/main.tsx` → `src/App.tsx` → `src/routes/AppRoutes.tsx`

**Auth flow** (`src/auth/`):
- `AuthContext.tsx` stores the authenticated user in React context and `localStorage` (`pegasus-manager:token`, `pegasus-manager:user`)
- `permissions.ts` defines `Role` and `Permission` types and maps roles → permissions via `rolePermissions`
- `ProtectedRoute` wraps routes: redirects unauthenticated users to `/login`, users with `mustChangePassword` to `/primeiro-acesso`, and renders `<AccessDenied>` when the user lacks required permissions
- Session restoration on load via `authService.me()`. Logout is triggered either manually or by a `pegasus:auth:logout` custom DOM event (fired on 401 responses)

**Permissions model**: Roles are assigned server-side; the frontend derives permissions from roles using `rolePermissions` in `permissions.ts`. `canAccess` uses OR logic — the user only needs one of the required permissions. `canEditArea` is a separate helper for write-access checks.

**Services** (`src/services/`): Each domain has a service module (e.g., `athleteService`, `attendanceService`) that calls the backend via the shared `api` axios instance. The axios instance auto-attaches the JWT token and handles 401s globally.

**UI Components** (`src/components/ui/`): Shared primitives (Button, Input, Modal, Toast, Table, etc.). Toast notifications are also dispatched via the `pegasus:toast` custom DOM event.

**Pages** (`src/pages/`): Organized by domain — `rh/`, `finance/`, `attendance/`, `trainings/`, `marketing/`, `operational/`, `management/`, `evaluations/`, `profile/`, `admin/`, `auth/`, `public/`.

### Backend

Entry: `backend/src/index.ts` → `backend/src/app.ts` → `backend/src/routes.ts`

**Structure**: Modular by domain under `backend/src/modules/`. Each module has `*.service.ts`, `*.controller.ts`, and `*.routes.ts`.

**Auth** (`backend/src/modules/auth/`): JWT-based. `auth.middleware.ts` validates Bearer tokens and attaches `req.user`. `permission.middleware.ts` checks role/permission access.

**Database** (`backend/prisma/schema.prisma`): PostgreSQL via Prisma. Key models:
- `User` ↔ `Athlete` (optional 1:1 link via `athleteId`)
- `User` ↔ `Role` via `UserRole` junction; `Role` ↔ `Permission` via `RolePermission`
- `Training` ↔ `TrainingAttendance` ↔ `Athlete`
- `Athlete` → `Payment`, `AthleteEvaluation`
- `AthleteApplication` (inscription pipeline, independent of `Athlete`)
- `Task` (Kanban cards for management board)
- `School`, `Spreadsheet`, `Formation`, `Notification`, `CashMovement`, `TrainingSetting`

**Google Sheets integration**: `athletes-import.service.ts` and `athlete-applications-import.service.ts` pull data from configured Google Sheets using the `googleapis` package.

### Role Hierarchy

| Role | Key Permissions |
|------|-----------------|
| Diretor | All areas + admin |
| Gestao | dashboard, gestao, treinos |
| RH | dashboard, rh, gestao |
| Financeiro | dashboard, financeiro, gestao |
| Marketing / MarketingLvl1 / MarketingLvl2 | dashboard, marketing, gestao |
| Tecnico | dashboard, treinos, chamada |
| Operacional | dashboard, operacional, gestao |
| Conselheira | dashboard, gestao |
| Atleta | dashboard, atleta, treinos |

Role strings from the API are normalized via `roleAliases` in `AuthContext.tsx` to handle case variations (e.g., `"TECNICO"`, `"Técnico"`, `"Treinador"` all map to `"Tecnico"`).
