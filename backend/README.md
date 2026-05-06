# Pegasus Manager — Backend

API Node.js/Express do Pegasus Manager com TypeScript, Prisma, PostgreSQL, JWT e RBAC.

## Tecnologias

- Node.js 20
- Express
- TypeScript
- Prisma + PostgreSQL
- JWT / bcrypt
- node-cron
- Evolution API (WhatsApp)
- googleapis (Google Sheets)

## Instalar

```bash
cd backend
npm install
```

## Configurar Ambiente

```bash
copy .env.example .env
```

Variáveis obrigatórias:

```env
DATABASE_URL=postgresql://...
JWT_SECRET=        # openssl rand -hex 32
PORT=3000
CORS_ORIGIN=http://localhost:5173
```

Variáveis opcionais:

```env
# WhatsApp via Evolution API
EVOLUTION_API_URL=
EVOLUTION_API_KEY=
EVOLUTION_INSTANCE_NAME=pegasus

# Google Sheets
GOOGLE_SHEETS_CLIENT_EMAIL=
GOOGLE_SHEETS_PRIVATE_KEY=
GOOGLE_SHEETS_SPREADSHEET_ID=
GOOGLE_SHEETS_ATHLETES_RANGE=Respostas ao formulário 1!A:Z
GOOGLE_SHEETS_APPLICATIONS_SPREADSHEET_ID=
GOOGLE_SHEETS_APPLICATIONS_RANGE=Respostas ao formulário 1!A:Z

# Atletas
ATHLETE_TEMP_PASSWORD=
```

## Prisma

```bash
npm run prisma:generate   # regenerar client
npm run prisma:migrate    # criar e aplicar migration (dev)
npm run prisma:deploy     # aplicar migrations (produção)
npm run prisma:seed       # popular banco com dados iniciais
```

## Rodar

```bash
npm run dev     # hot reload (ts-node-dev)
npm run build   # compilar para dist/
npm run start   # rodar dist/index.js (aplica migrations primeiro)
```

API sobe em `http://localhost:3000`.

## Schedulers

Dois jobs iniciam automaticamente com o servidor:

- **WhatsApp Scheduler** — diário às 10h UTC: lembretes de treino e alertas de pagamento próximo ao vencimento.
- **Tasks Scheduler** — todo minuto: publica cards de marketing com `scheduledAt <= now` (coluna Agendado → Publicado).

## Perfis (Roles)

| Role | Permissões-chave |
|---|---|
| Diretor | Acesso total + admin |
| Gestao | dashboard, gestao, treinos |
| RH | dashboard, rh, gestao |
| Financeiro | dashboard, financeiro, gestao |
| Marketing | dashboard, marketing, gestao — cria/edita/exclui tasks |
| ChefeMarketing | dashboard, marketing, gestao — cria/edita/exclui tasks + aprova/agenda/publica |
| Tecnico | dashboard, treinos, chamada |
| Operacional | dashboard, operacional, gestao |
| Conselheira | dashboard, gestao |
| Atleta | dashboard, atleta, treinos |

## Principais Endpoints

### Auth
- `POST /auth/login`
- `GET /auth/me`
- `PATCH /auth/change-password`

### Usuários
- `GET /users`
- `POST /users`
- `PATCH /users/:id`
- `PATCH /users/:id/roles`
- `DELETE /users/:id`
- `GET /users/by-role/:role`

### Atletas
- `GET /athletes`
- `POST /athletes`
- `PATCH /athletes/:id`
- `DELETE /athletes/:id`
- `POST /athletes/import/google-sheets`

### Tarefas (Kanban)
- `GET /tasks?area=marketing`
- `POST /tasks`
- `PATCH /tasks/:id`
- `PATCH /tasks/:id/status`
- `PATCH /tasks/:id/approve` — aprova ou agenda (`action: "publish"|"schedule"`, `scheduledAt: ISO string`)
- `PATCH /tasks/:id/reject`
- `DELETE /tasks/:id`

### Financeiro
- `GET /cash-movements`
- `POST /cash-movements`
- `GET /payments`
- `PATCH /payments/:id`

### Treinos e Frequência
- `GET /trainings`
- `POST /trainings`
- `GET /attendance/check-in/today`
- `POST /attendance/check-in`
- `GET /attendance/frequency`
- `GET /attendance/my-frequency`

### WhatsApp
- `GET /whatsapp/status`
- `POST /whatsapp/connect`
- `POST /whatsapp/disconnect`
- `GET /whatsapp/groups`
- `POST /whatsapp/broadcast`

### Outros
- `GET /roles`
- `GET /permissions`
- `GET /notifications`
- `PATCH /notifications/:id/read`
- `GET /me/profile`
- `PATCH /me/profile`

## RBAC

`authMiddleware` valida Bearer JWT e injeta `req.user` com `roles` e `permissions`.

`permissionMiddleware(key)` verifica a permissão exigida. Usuários com role `Diretor` passam por todas as verificações.

Controllers de tasks usam `ensureAreaPermission(req, area, action)` internamente.

## Deploy (Railway)

O Dockerfile em `backend/Dockerfile` usa `node:20-alpine`, compila TypeScript e roda `npm start` (que executa `prisma migrate deploy` antes de subir).

> Sempre rodar `railway up` a partir da **raiz do monorepo** (`/Pegasus`), nunca de dentro de `/backend`. O Railway está configurado com root directory `backend`.
