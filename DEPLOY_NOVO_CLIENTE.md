# Deploy de uma instância nova (novo cliente)

Este projeto não é multi-tenant: cada cliente tem seu próprio banco de dados e seu
próprio deploy (frontend + backend), gerados a partir do mesmo código-base. Este guia
cobre o checklist para provisionar uma instância nova.

O que **não** precisa ser editado no código para um cliente novo: nome da organização,
logo, cor do tema do PWA, papéis de usuário (RH, Financeiro, Marketing, etc. já são
dados no banco, não enum) e integração com genderize.io. Tudo isso é configuração
(env vars ou tela de Configurações). O que **precisa** ser editado manualmente: o
conteúdo editorial da landing page (`src/pages/public/LandingPage.tsx` — missão,
depoimentos, texto "sobre nós") e contatos (e-mail, Instagram) nela.

## 1. Banco de dados

1. Crie um banco Postgres novo (Render Postgres, Neon, Supabase — qualquer um serve).
2. Preencha `DATABASE_URL` em `backend/.env` (dev) ou nas env vars do serviço de
   produção com a connection string do banco novo. **Nunca aponte para o banco do
   Pegasus real.**

## 2. Variáveis de ambiente

### Backend (`backend/.env`, veja `backend/.env.example`)

- `DATABASE_URL` — obrigatório, banco do cliente novo.
- `JWT_SECRET` — gere um novo com `openssl rand -hex 32`. Não reutilize o do Pegasus.
- `CORS_ORIGIN` / `CORS_ORIGINS` / `FRONTEND_URL` — domínio do frontend do cliente novo.
- `ATHLETE_TEMP_PASSWORD` — senha temporária para atletas ativados.
- Integrações opcionais (Google Sheets, WhatsApp/Evolution, Mercado Pago, e-mail) —
  configure só o que o cliente for usar; todas têm checagem de "não configurado".
- **Não existe `ORG_NAME` no backend.** O nome da organização usado em PDFs, e-mails,
  WhatsApp e notificações vem do campo `systemName` da tabela `TrainingSetting`
  (singleton), editável pela tela **Configurações → Sistema** do próprio app, sem
  precisar de redeploy. Ajuste esse campo depois do primeiro login do admin.

### Frontend (raiz do projeto, veja `.env.example`)

- `VITE_API_URL` — URL do backend do cliente novo.
- `VITE_ORG_NAME` — nome completo exibido no header, sidebar, telas de login/inscrição
  e no manifest do PWA (fallback: "Pegasus Manager").
- `VITE_ORG_SHORT_NAME` — nome curto usado no manifest PWA e notificações push
  (fallback: "Pegasus").
- `VITE_ORG_LOGO_URL` — URL pública de uma imagem de logo (se vazio, usa o logo padrão
  em `src/assets/logo/`).
- `VITE_THEME_PRIMARY_COLOR` — cor hex usada no `theme-color` do PWA e no manifest
  (fallback: `#0B2E59`). **Não** muda o tema visual do app em si (Tailwind) — isso
  ainda está hardcoded e exigiria trabalho adicional se o cliente precisar de outra
  paleta completa.
- `VITE_FEATURE_GENDERIZE_API` — `false` desativa a sugestão automática de gênero
  (genderize.io) no cadastro de atletas. Deixe em branco/`true` para manter ativado.

## 3. Migrations e seed inicial

No diretório `backend`, com `DATABASE_URL` já apontando pro banco novo:

```bash
npx prisma migrate deploy   # aplica o schema
npx prisma db seed          # roda backend/prisma/seed.ts — cria só roles e permissions
```

**Não rode `backend/prisma/seed-pegasus-team.ts`** em um cliente novo — esse script é
exclusivo do time real do Pegasus (cria usuários com nomes fixos: Leo, Allef, Giulia,
Victoria, Vito). Ele existe separado do `seed.ts` justamente para não vazar pra outros
clientes. `npx prisma db seed` (que roda `seed.ts`) é seguro e genérico — só popula
roles (Diretor, RH, Financeiro, Marketing, Tecnico, Operacional, Gestao, Atleta, etc.)
e permissions.

Em produção, `npm run start` já roda `prisma migrate deploy` e o seed genérico
automaticamente via `prestart` — não precisa rodar esse passo manualmente se o deploy
já usa esse script.

## 4. Criar o administrador inicial do cliente

Não existe endpoint público de "criar admin" (por segurança). Use
`backend/scripts/create-test-user.ts` como base:

1. Copie o script ou rode-o ajustando `username`, `name` e a senha antes de executar.
2. Rode com `DATABASE_URL` do cliente novo:
   ```bash
   npx ts-node scripts/create-test-user.ts
   ```
3. O script atribui a role `Diretor` (acesso total) ao usuário criado.
4. Troque a senha assim que possível — o usuário criado por esse script tem
   `mustChangePassword: false`, então ajuste manualmente se quiser forçar troca no
   primeiro login.

## 5. Build e deploy

### Frontend (Vercel)

1. Crie um projeto Vercel novo apontando pro mesmo repositório (ou um fork/branch
   dedicado, se o cliente precisar de customizações de código como a landing page).
2. Configure as env vars da seção 2 (frontend) no painel do projeto.
3. Build command: `npm run build`. Output: `dist/`.

### Backend (Render)

1. Crie um Web Service novo no Render, Docker, apontando pro `backend/Dockerfile`.
2. Configure as env vars da seção 2 (backend) no painel do serviço.
3. O `prestart` já roda migrations + seed genérico automaticamente no boot.
4. Confirme `CORS_ORIGIN`/`FRONTEND_URL` batendo com o domínio do frontend Vercel do
   cliente antes de testar login.

## 6. Pós-deploy

- Login com o admin criado no passo 4.
- Ir em **Configurações → Sistema** e preencher `systemName`, horário/local de treino,
  mensalidade padrão, etc.
- Revisar manualmente `src/pages/public/LandingPage.tsx` (missão, depoimentos, e-mail
  de contato, Instagram) se o cliente for usar a landing pública — esse conteúdo não é
  parametrizável por env var.
