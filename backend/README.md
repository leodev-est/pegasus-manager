# Pegasus Manager Backend

API Node.js/Express do Pegasus Manager com TypeScript, Prisma, PostgreSQL, JWT, bcrypt e RBAC.

## Tecnologias

- Node.js
- Express
- TypeScript
- Prisma
- PostgreSQL
- JWT
- bcrypt
- cors
- dotenv

## Instalar

```bash
cd backend
npm install
```

## Configurar Ambiente

Crie o arquivo `.env` a partir do exemplo:

```bash
copy .env.example .env
```

Conteudo esperado:

```env
DATABASE_URL=
JWT_SECRET=
PORT=
CORS_ORIGIN=
```

Garanta que o PostgreSQL esteja rodando e que o banco `pegasus_manager` exista.

## Prisma

Gerar client:

```bash
npm run prisma:generate
```

Rodar migrations:

```bash
npm run prisma:migrate
```

Rodar migrations em produção:

```bash
npm run prisma:deploy
```

Rodar seed:

```bash
npm run prisma:seed
```

## Rodar API

```bash
npm run dev
```

A API sobe em:

```bash
http://localhost:3000
```

Em produção, use:

```bash
npm run build
npm run prisma:deploy
npm run start
```

Healthcheck:

```bash
http://localhost:3000/health
```

## Testar Login

PowerShell:

```powershell
Invoke-RestMethod http://localhost:3000/auth/login `
  -Method POST `
  -ContentType "application/json" `
  -Body '{"email":"leo@pegasus.com","password":"123456"}'
```

## Usuarios Iniciais

Todos usam a senha `123456`.

| Nome | E-mail | Perfil |
| --- | --- | --- |
| Leo | `leo@pegasus.com` | Diretor |
| Allef | `allef@pegasus.com` | Diretor |
| Giulia | `giulia@pegasus.com` | RH + Financeiro |
| Victoria | `victoria@pegasus.com` | Conselheiro |
| Vito | `vito@pegasus.com` | Marketing |

## Endpoints

- `POST /auth/login`
- `GET /auth/me`
- `GET /users`
- `POST /users`
- `PATCH /users/:id`
- `DELETE /users/:id`
- `GET /roles`
- `POST /roles`
- `PATCH /roles/:id`
- `GET /permissions`

## RBAC

O middleware `authMiddleware` valida JWT e injeta `req.user`.

O middleware `permissionMiddleware(permissionKey)` valida a permissao exigida. Usuarios com role `Diretor` passam por todas as permissoes.

## Observacoes

Os models futuros (`Athlete`, `Payment`, `Task`, `Training`, `School`) ja existem no Prisma, mas seus CRUDs ainda nao foram implementados nesta etapa.
