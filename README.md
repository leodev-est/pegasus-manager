# Pegasus Manager

Sistema web para gestão do Projeto Pegasus, uma iniciativa esportiva de voleibol com foco social, comunitário e organizacional.

O projeto tem landing page pública, login real com API/JWT, dashboard administrativo, controle de permissões, RH, inscrições, financeiro, gestão, marketing, treinos, operacional/escolas e controle de acessos.

## Stack

- Frontend: React, Vite, TypeScript, TailwindCSS, React Router, Lucide React, Axios
- Backend: Node.js, Express, TypeScript, Prisma, PostgreSQL, JWT, bcrypt
- Integrações: Google Sheets API para importações configuradas

## Como Rodar Local

### 1. Banco PostgreSQL

Suba um PostgreSQL local e crie o banco `pegasus_manager`, ou ajuste a URL no `.env` do backend.

Exemplo local:

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

No Windows, se o PowerShell bloquear scripts, use `npm.cmd`:

```bash
npm.cmd run dev
```

## Variáveis de Ambiente

### Frontend `.env`

```bash
VITE_API_URL=http://localhost:3000
```

Se `VITE_API_URL` não estiver definida, o frontend usa `http://localhost:3000`.

O link público do Google Forms da landing fica em:

```ts
src/pages/public/LandingPage.tsx
PUBLIC_REGISTRATION_FORM_URL
```

Esse Forms público apenas redireciona o visitante. Ele não integra com o backend automaticamente.

### Backend `.env`

```bash
DATABASE_URL="postgresql://postgres:postgres@localhost:5432/pegasus_manager?schema=public"
JWT_SECRET="troque_este_segredo"
PORT=3000
CORS_ORIGIN=http://localhost:5173
CORS_ORIGINS=
FRONTEND_URL=

GOOGLE_SHEETS_CLIENT_EMAIL=
GOOGLE_SHEETS_PRIVATE_KEY=
GOOGLE_SHEETS_SPREADSHEET_ID=
GOOGLE_SHEETS_ATHLETES_RANGE=Respostas ao formulário 1!A:Z
GOOGLE_SHEETS_APPLICATIONS_SPREADSHEET_ID=
GOOGLE_SHEETS_APPLICATIONS_RANGE=Respostas ao formulário 1!A:Z
```

Se a chave privada do Google ficar em uma linha, preserve quebras como `\n`.

## Usuários de Teste

Todos usam a senha:

```text
123456
```

Perfis criados pelo seed:

- Diretor: `leo@pegasus.com`
- Diretor: `allef@pegasus.com`
- RH + Financeiro: `giulia@pegasus.com`
- RH: `nina@pegasus.com`
- Financeiro: `bia@pegasus.com`
- Marketing: `vito@pegasus.com`
- Conselheiro: `victoria@pegasus.com`
- Técnico: `rafa@pegasus.com`
- Operacional: `carol@pegasus.com`

## Permissões

- Diretor: acesso total
- RH: RH e Gestão
- Financeiro: Financeiro e Gestão
- Marketing: Marketing e Gestão
- Conselheiro: Gestão
- Técnico: Treinos
- Operacional: Operacional e Gestão

O frontend esconde telas e botões conforme permissões, mas a autorização real também é validada no backend por JWT e permissões granulares.

## Rotas Principais

- `/` - landing page pública
- `/login` - login
- `/app` - dashboard
- `/app/rh/atletas` - atletas
- `/app/rh/inscrições` - inscrições recebidas
- `/app/financeiro` - financeiro
- `/app/gestão` - kanban de gestão
- `/app/marketing` - marketing
- `/app/treinos/calendario` - calendário oficial de treinos
- `/app/treinos` - planejamento de treinos
- `/app/quadra-tatica` - quadra tática para formações de voleibol
- `/app/operacional/escolas` - escolas
- `/app/admin/acessos` - controle de acessos
- `*` - página 404 amigável

## Fluxos Principais

### Autenticação

- `POST /auth/login`
- `GET /auth/me`

O token JWT fica em `localStorage` e é enviado como `Authorization: Bearer <token>`. Em `401`, o frontend limpa a sessão e envia o usuário para login.

### RH / Inscrições

- Importa respostas de Google Sheets configurado.
- Inscrições entram como `pendente`.
- Ao aprovar, a pessoa é criada em `RH / Atletas` e a inscrição muda para `aprovado`.
- A tela de inscrições abre por padrão filtrada em `pendente`.

### RH / Atletas

- CRUD de atletas.
- Importação de planilha configurada.
- Inativação mantém histórico.

### Financeiro

- Receitas, despesas, mensalidades e movimentos de caixa.
- Demonstrativo mensal com cópia rápida.

### Gestão e Marketing

- Kanbans com alteração de status por botões.
- Drag and drop avançado fica para V2.

### Treinos

- Cadastro, edição, detalhes e lista de treinos.
- Calendário oficial separado em `/app/treinos/calendario`.
- Planejamento técnico separado em `/app/treinos`.
- Datas bloqueadas configuradas no backend.

### Quadra Tática

- Montagem visual de formação em quadra 2D.
- Drag and drop de atletas para Levantador, Oposto, Ponteiro 1, Ponteiro 2, Central e Líbero.
- Salvamento de formações em `/formations`.

### Operacional / Escolas

- Cadastro de escolas, contato, responsável, próxima ação e ciclo de status.

## Google Sheets

A integração usa Service Account do Google Cloud:

1. Ative Google Sheets API.
2. Crie uma Service Account.
3. Gere uma chave JSON.
4. Compartilhe a planilha com o `client_email` da Service Account.
5. Configure as variáveis `GOOGLE_SHEETS_*` no backend.
6. Reinicie o backend.

Importações disponíveis:

- `POST /athletes/import/google-sheets`
- `POST /athlete-applications/import/google-sheets`

## Tratamento de Erros

- Erros de API retornam mensagens amigáveis via toast.
- Falha de conexão com backend mostra aviso claro com a URL esperada.
- `401` expira sessão e leva o usuário ao login.
- Erros inesperados de renderização caem em uma tela global de recuperação.
- Rotas inexistentes exibem página 404 com retorno ao dashboard.

## Mobile

O sistema foi preparado para celular:

- Sidebar mobile em drawer com botão hambúrguer.
- Topbar compacta.
- Tabelas viram cards nas telas principais.
- Kanbans usam scroll horizontal suave.
- Modais ocupam quase a tela toda no mobile.
- Inputs e botões tem área de toque confortável.

## PWA / Instalação no Celular

O Pegasus Manager é um PWA instalável. O app usa `vite-plugin-pwa` com atualização automática e cache apenas de assets estáticos. Chamadas da API continuam indo para a rede para evitar cache de dados sensíveis.

### Como testar localmente

```bash
npm run build
npm run preview
```

Acesse a URL do preview no navegador. Em ambiente local, a instalação PWA funciona melhor em `localhost` ou HTTPS.

### Android / Chrome

1. Abra o Pegasus Manager no Chrome.
2. Use o botão `Instalar app`, quando disponível, ou o menu do Chrome.
3. Confirme a instalação para adicionar à tela inicial.

### iPhone / Safari

No iOS, o Safari não mostra o prompt automático. Para instalar:

1. Abra o Pegasus Manager no Safari.
2. Toque em Compartilhar.
3. Escolha `Adicionar à Tela de Início`.

### Observação de segurança

O service worker não cacheia endpoints de autenticação, usuários, atletas, financeiro, tarefas, treinos ou outras rotas de API. Tokens continuam sendo tratados pelo fluxo normal do frontend.

## Frequência e Check-in

Rotas do app:

- `/app/atleta/check-in`: atleta marca presença no treino do dia.
- `/app/atleta/frequencia`: atleta consulta a própria frequência mensal.
- `/app/frequencia`: Diretor e Técnico acompanham a frequência geral.

Endpoints da API:

- `GET /attendance/check-in/today`: retorna o treino disponível hoje e o status de check-in do usuário.
- `POST /attendance/check-in`: cria presença do atleta logado para o treino informado.
- `GET /attendance/my-frequency?month=5&year=2026`: resumo mensal do atleta logado.
- `GET /attendance/frequency?month=5&year=2026`: frequência geral para Diretor/Técnico.
- `PATCH /attendance/:id`: Diretor/Técnico ajustam status para `presente`, `falta` ou `justificada`.

Regras:

- Check-in é sempre do próprio atleta vinculado ao usuário logado.
- Não é permitido check-in duplicado para o mesmo treino.
- Se não existir treino cadastrado no sábado oficial, a API cria/usa o treino oficial Pegasus: Jerusalém, 17:30 as 19:00, Voleibol.
- Sábados oficiais contam de `25/04/2026` até dezembro de 2026.
- Datas bloqueadas não contam como falta: `30/05/2026`, `20/06/2026`, `26/09/2026`.
- Faltas são calculadas comparando treinos oficiais do mês com presenças registradas; datas futuras aparecem como programadas e não entram no percentual ainda.
- Atletas veem apenas check-in e a própria frequência. Diretor e Técnico veem a frequência geral e podem ajustar registros existentes.

## Meu Perfil e Avaliação

Rota do app:

- `/app/meu-perfil`: perfil agregado do usuário/atleta com contato, frequência, treinos, mensalidade e evolução.
- `/app/avaliacoes`: tela administrativa para Diretor/Técnico avaliarem qualquer atleta ativo.

Endpoints da API:

- `GET /me/profile`: retorna usuário logado, atleta vinculado, mensalidades, frequência do mês, próximos treinos e avaliação.
- `PATCH /me/profile`: atualiza apenas `email` e `phone` do próprio perfil.
- `GET /evaluations/me`: atleta ou staff vinculado vê sua própria avaliação.
- `PATCH /evaluations/self`: atualiza autoavaliação (`selfRating`, `strengths`, `improvements`).
- `GET /evaluations/:athleteId`: Diretor/Técnico veem avaliação de um atleta.
- `PATCH /evaluations/:athleteId`: Diretor/Técnico atualizam avaliação técnica (`technical`, `physical`, `tactical`, `mental`, `coachNotes`).

Regras:

- Atleta não pode editar status, categoria, posição, roles, mensalidade ou avaliação técnica.
- Notas aceitam valores de `0` a `10`.
- Overall estilo FIFA é calculado pela média das notas técnicas existentes: técnica, físico, tático e mental.
- Se nenhuma nota técnica existir, o overall fica vazio e a tela mostra que ainda não há avaliação técnica.
- Diretor e Técnico podem editar avaliação técnica; atleta edita apenas autoavaliação.
- A avaliação técnica de outros atletas é feita em `/app/avaliacoes`, escolhendo o atleta ativo na lista.

## Notificações

O sistema possui notificações internas no sino da Topbar.

Endpoints:

- `GET /notifications`: lista notificações do usuário logado.
- `PATCH /notifications/:id/read`: marca uma notificação como lida.
- `PATCH /notifications/read-all`: marca todas como lidas.
- `POST /notifications`: cria notificação para um usuário, disponível para Diretor/Técnico.

Tipos:

- `treino`
- `financeiro`
- `frequencia`
- `avaliacao`
- `sistema`

Disparos automáticos:

- Avaliação técnica atualizada: notifica o atleta.
- Mensalidade marcada como atrasada: notifica o atleta vinculado.
- Frequência ajustada para falta: notifica o atleta.
- Check-in aberto em dia de treino: notifica o atleta uma vez no dia.

Cada usuário enxerga apenas as próprias notificações.

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

## Pre-Deploy Checklist

- Rodar `npm run build` no frontend.
- Rodar `npm run build` no backend.
- Confirmar `DATABASE_URL` de produção.
- Definir `JWT_SECRET` forte.
- Definir `CORS_ORIGIN`, `CORS_ORIGINS` ou `FRONTEND_URL` com a URL final do frontend. O backend também aceita `localhost`, `127.0.0.1` e domínios `*.vercel.app`.
- Definir `VITE_API_URL` com a URL final da API.
- Rodar migrations no banco de produção com `npm run prisma:deploy`.
- Rodar seed somente quando fizer sentido criar usuários iniciais.
- Confirmar variáveis do Google Sheets se a importacao estiver ativa.

## Deploy

### Banco PostgreSQL

Use um PostgreSQL gerenciado. Configure:

```bash
DATABASE_URL=postgresql://usuário:senha@host:5432/database?schema=public
```

Depois rode:

```bash
cd backend
npm run prisma:generate
npm run prisma:deploy
```

### Backend

Deploy como serviço Node.js:

```bash
cd backend
npm install
npm run build
npm run prisma:deploy
npm run start
```

Variáveis obrigatórias:

- `DATABASE_URL`
- `JWT_SECRET`
- `PORT`
- `CORS_ORIGIN` ou `CORS_ORIGINS` ou `FRONTEND_URL`

Scripts esperados em produção:

- Build: `npm run build` executa `prisma generate` antes de `tsc`.
- Start: `npm run start` executa `node dist/index.js`.
- Migrations: `npm run prisma:deploy` executa `prisma migrate deploy`.

Variáveis opcionais se usar importacao:

- `GOOGLE_SHEETS_CLIENT_EMAIL`
- `GOOGLE_SHEETS_PRIVATE_KEY`
- `GOOGLE_SHEETS_SPREADSHEET_ID`
- `GOOGLE_SHEETS_ATHLETES_RANGE`
- `GOOGLE_SHEETS_APPLICATIONS_SPREADSHEET_ID`
- `GOOGLE_SHEETS_APPLICATIONS_RANGE`

### Frontend

Deploy como app Vite estático:

```bash
npm install
npm run build
```

Publicar a pasta:

```text
dist/
```

Variável obrigatória:

```bash
VITE_API_URL=https://url-da-api
```

Para Vercel ou outro host estático com React Router, configure fallback de SPA para servir `index.html` em rotas internas como `/app`, `/app/meu-perfil` e `/login`. Este projeto inclui `vercel.json` com esse rewrite.

## Roadmap

V1 antes da publicação:

- Validar deploy real com banco de produção.
- Conferir CORS e variáveis finais.
- Revisar usuários iniciais e remover acessos de teste se necessário.

V2:

- Drag and drop nos kanbans.
- Testes automatizados.
- Auditoria/logs de ações sensíveis.
- Melhorias de relatórios financeiros.
- Fluxo público de inscrição integrado ao backend quando for decidido.



