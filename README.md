# Pegasus Manager

Sistema web para gestão do Projeto Pegasus, uma iniciativa esportiva de voleibol com foco social, comunitário e organizacional.

O projeto tem landing page pública, login real com API/JWT, dashboard administrativo, controle de permissões, RH, inscrições, financeiro, gestão, marketing, treinos, operacional/escolas, comunicados e controle de acessos.

## Stack

- Frontend: React 18, Vite, TypeScript, TailwindCSS, React Router, Lucide React, Axios, dnd-kit
- Backend: Node.js, Express, TypeScript, Prisma, PostgreSQL, JWT, bcrypt, node-cron
- Integrações: Google Sheets API para importações, Evolution API para WhatsApp

## Como Rodar Local

### 1. Banco PostgreSQL

Suba um PostgreSQL local e crie o banco `pegasus_manager`, ou ajuste a URL no `.env` do backend.

```bash
postgresql://postgres:postgres@localhost:5432/pegasus_manager?schema=public
```

### 2. Backend

```bash
cd backend
npm install
copy .env.example .env
npm run prisma:generate
npm run prisma:migrate
npm run prisma:seed
npm run dev
```

API local:

```text
http://localhost:3000
```

### 3. Frontend

Em outro terminal:

```bash
npm install
copy .env.example .env
npm run dev
```

Frontend local:

```text
http://localhost:5173
```

## Variáveis de Ambiente

### Frontend `.env`

```bash
VITE_API_URL=http://localhost:3000
```

### Backend `.env`

```bash
DATABASE_URL="postgresql://postgres:postgres@localhost:5432/pegasus_manager?schema=public"
JWT_SECRET="troque_este_segredo"
PORT=3000
CORS_ORIGIN=http://localhost:5173

# Google Sheets (importações)
GOOGLE_SHEETS_CLIENT_EMAIL=
GOOGLE_SHEETS_PRIVATE_KEY=
GOOGLE_SHEETS_SPREADSHEET_ID=
GOOGLE_SHEETS_ATHLETES_RANGE=Respostas ao formulário 1!A:Z
GOOGLE_SHEETS_APPLICATIONS_SPREADSHEET_ID=
GOOGLE_SHEETS_APPLICATIONS_RANGE=Respostas ao formulário 1!A:Z

# Evolution API (WhatsApp)
EVOLUTION_API_URL=
EVOLUTION_API_KEY=
EVOLUTION_INSTANCE_NAME=pegasus
```

## Perfis e Permissões

| Perfil | Acesso |
|---|---|
| Diretor | Acesso total |
| Gestao | Dashboard, Gestão, Treinos |
| RH | Dashboard, RH, Gestão |
| Financeiro | Dashboard, Financeiro, Gestão |
| Marketing | Dashboard, Marketing, Gestão — cria/edita/exclui cards |
| ChefeMarketing | Dashboard, Marketing, Gestão — cria/edita/exclui cards + aprova/reprova/agenda publicações |
| Tecnico | Dashboard, Treinos, Chamada |
| Operacional | Dashboard, Operacional, Gestão |
| Conselheira | Dashboard, Gestão |
| Atleta | Dashboard, Perfil, Treinos |

O frontend esconde telas e botões conforme permissões. A autorização é validada também no backend por JWT e permissões granulares.

## Rotas Principais

- `/` — landing page pública
- `/login` — login
- `/app` — dashboard
- `/app/rh/atletas` — atletas
- `/app/rh/inscricoes` — inscrições recebidas
- `/app/rh/comunicados` — envio de comunicados via WhatsApp para grupos
- `/app/financeiro` — financeiro
- `/app/gestao` — kanban de gestão
- `/app/marketing` — kanban de marketing com fluxo de aprovação e agendamento
- `/app/treinos/calendario` — calendário oficial de treinos
- `/app/treinos` — planejamento de treinos
- `/app/quadra-tatica` — quadra tática para formações de voleibol
- `/app/chamada` — chamada de atletas por treino
- `/app/frequencia` — frequência geral (Diretor/Técnico)
- `/app/atleta/frequencia` — frequência própria (Atleta)
- `/app/meu-perfil` — perfil do usuário/atleta
- `/app/avaliacoes` — avaliações técnicas
- `/app/operacional/escolas` — escolas
- `/app/admin/acessos` — controle de acessos
- `/app/admin/whatsapp` — conexão WhatsApp via Evolution API

## Marketing — Fluxo de Aprovação

O kanban de marketing tem cinco colunas:

| Coluna | Descrição |
|---|---|
| Ideias | Backlog de ideias |
| Produção | Em desenvolvimento |
| Revisão | Aguardando aprovação do ChefeMarketing |
| Agendado | Aprovado com data/hora de publicação definida |
| Publicado | Publicado |

Regras:
- Apenas ChefeMarketing e Diretor podem aprovar ou reprovar cards em Revisão.
- Ao aprovar, o ChefeMarketing escolhe entre publicar imediatamente ou agendar data/hora.
- Cards agendados ficam na coluna Agendado e não podem ser arrastados.
- Um cron job roda todo minuto no backend e publica automaticamente os cards agendados quando o horário chega.
- ChefeMarketing pode abrir um card agendado e clicar "Publicar agora" para adiantar.
- O frontend atualiza automaticamente a cada 60 segundos enquanto houver cards agendados.

## WhatsApp — Evolution API

A integração usa a [Evolution API](https://github.com/EvolutionAPI/evolution-api) como servidor intermediário (Docker).

Fluxo:
1. Diretor acessa `/app/admin/whatsapp` e clica em Conectar.
2. Um QR Code é gerado via Evolution API — escaneie no WhatsApp do número do projeto.
3. Após conectar, a seção de Comunicados em RH permite enviar mensagens para grupos do WhatsApp.
4. O scheduler envia lembretes de treino (diário às 07h BRT) e alertas de pagamento próximo do vencimento.

Variáveis necessárias no backend:
- `EVOLUTION_API_URL` — URL do servidor Evolution API (ex: `http://evolution-api.railway.internal:8080`)
- `EVOLUTION_API_KEY` — chave de autenticação
- `EVOLUTION_INSTANCE_NAME` — nome da instância (padrão: `pegasus`)

## Autenticação

- `POST /auth/login`
- `GET /auth/me`

Token JWT fica em `localStorage` e é enviado como `Authorization: Bearer <token>`. Em `401`, o frontend limpa a sessão e redireciona para login.

## RH / Inscrições

- Importa respostas de Google Sheets configurado.
- Inscrições entram como `pendente`.
- Ao aprovar, o atleta é criado em RH e a inscrição muda para `aprovado`.

## Financeiro

- Receitas, despesas, mensalidades e movimentos de caixa.
- Demonstrativo mensal com cópia rápida.

## Treinos e Frequência

- Cadastro, edição, detalhes e lista de treinos.
- Calendário oficial em `/app/treinos/calendario`.
- Chamada de atletas por treino.
- Frequência mensal por atleta e geral.
- Check-in pelo próprio atleta em dia de treino.

## Quadra Tática

- Montagem visual de formação em quadra 2D.
- Drag and drop de atletas para posições (Levantador, Oposto, Ponteiros, Central, Líbero).
- Salvamento de formações.

## Notificações

Notificações internas no sino da Topbar. Disparos automáticos em:
- Avaliação técnica atualizada
- Mensalidade atrasada
- Frequência ajustada para falta
- Check-in aberto em dia de treino

## Schedulers (Backend)

Dois schedulers rodam automaticamente ao iniciar o servidor:

- **WhatsApp Scheduler** — diário às 10h UTC (07h BRT): lembretes de treino e alertas de pagamento.
- **Tasks Scheduler** — todo minuto: publica cards de marketing com `scheduledAt <= now`.

## Google Sheets

1. Ative Google Sheets API no Google Cloud.
2. Crie uma Service Account e gere uma chave JSON.
3. Compartilhe a planilha com o `client_email` da Service Account.
4. Configure as variáveis `GOOGLE_SHEETS_*` no backend.

Endpoints de importação:
- `POST /athletes/import/google-sheets`
- `POST /athlete-applications/import/google-sheets`

## Tratamento de Erros

- Erros de API retornam mensagens amigáveis via toast.
- `401` expira sessão e redireciona para login.
- Rotas inexistentes exibem página 404 com retorno ao dashboard.

## Mobile / PWA

O sistema é um PWA instalável. Sidebar em drawer mobile, kanbans com scroll horizontal, modais responsivos.

- **Android/Chrome**: botão "Instalar app" ou menu do Chrome.
- **iPhone/Safari**: Compartilhar → Adicionar à Tela de Início.

## Scripts

Frontend:

```bash
npm run dev
npm run build
npm run preview
```

Backend:

```bash
cd backend
npm run dev
npm run build
npm run start
npm run prisma:generate
npm run prisma:migrate
npm run prisma:deploy
npm run prisma:seed
```

## Deploy (Railway)

O projeto roda no Railway com backend Node.js + PostgreSQL.

> **Importante**: sempre rodar `railway up` a partir da **raiz do projeto** (`/Pegasus`), nunca de dentro de `/backend`. O Railway está configurado com root directory `backend` e espera encontrar essa pasta dentro do upload.

### Backend

Variáveis obrigatórias:
- `DATABASE_URL`
- `JWT_SECRET`
- `PORT`
- `CORS_ORIGIN` / `CORS_ORIGINS` / `FRONTEND_URL`

Variáveis opcionais:
- `GOOGLE_SHEETS_*` para importações
- `EVOLUTION_API_URL`, `EVOLUTION_API_KEY`, `EVOLUTION_INSTANCE_NAME` para WhatsApp
- `ATHLETE_TEMP_PASSWORD` para senha padrão de atletas ativados

### Frontend

Deploy como app Vite estático (Vercel ou similar).

```bash
npm install && npm run build
```

Publicar a pasta `dist/`. Variável obrigatória: `VITE_API_URL=https://url-da-api`.

Para hosts com React Router, configure fallback SPA para `index.html`. O `vercel.json` já inclui esse rewrite.

## Roadmap

V2:
- Testes automatizados.
- Auditoria/logs de ações sensíveis.
- Melhorias de relatórios financeiros.
- Fluxo público de inscrição integrado ao backend.
