# Dependências do Projeto

## Instalar tudo

```bash
# Frontend
npm install

# Backend
cd backend && npm install
```

---

## Frontend (raiz)

### Produção

| Pacote | Versão | Uso |
|---|---|---|
| react | ^18.3.1 | UI |
| react-dom | ^18.3.1 | Renderização DOM |
| react-router-dom | ^6.28.0 | Roteamento SPA |
| axios | ^1.15.2 | Chamadas HTTP à API |
| lucide-react | ^0.468.0 | Ícones |
| @dnd-kit/core | ^6.3.1 | Drag and drop |
| @dnd-kit/sortable | ^10.0.0 | Drag and drop com ordenação |
| @dnd-kit/utilities | ^3.2.2 | Utilitários dnd-kit |
| @vitejs/plugin-react | ^4.3.4 | Plugin React para Vite |

### Dev

| Pacote | Versão | Uso |
|---|---|---|
| vite | ^6.0.3 | Bundler e dev server |
| vite-plugin-pwa | ^1.2.0 | PWA (service worker, manifest) |
| typescript | ^5.6.3 | TypeScript |
| tailwindcss | ^3.4.16 | CSS utilitário |
| autoprefixer | ^10.4.20 | PostCSS — prefixos CSS |
| postcss | ^8.4.49 | Processador CSS |
| @types/react | ^19.2.14 | Tipos React |
| @types/react-dom | ^19.2.3 | Tipos React DOM |

---

## Backend (`/backend`)

### Produção

| Pacote | Versão | Uso |
|---|---|---|
| express | ^4.21.2 | Servidor HTTP |
| @prisma/client | ^6.18.0 | ORM — client gerado |
| prisma | ^6.18.0 | ORM — CLI e migrations |
| jsonwebtoken | ^9.0.2 | Geração e validação de JWT |
| bcrypt | ^6.0.0 | Hash de senhas |
| cors | ^2.8.5 | Middleware CORS |
| helmet | ^8.1.0 | Headers de segurança |
| dotenv | ^16.4.7 | Variáveis de ambiente |
| morgan | ^1.10.1 | Logs de requisição |
| express-rate-limit | ^8.4.1 | Rate limiting |
| node-cron | ^4.2.1 | Tarefas agendadas (schedulers) |
| googleapis | ^171.4.0 | Google Sheets API |

### Dev

| Pacote | Versão | Uso |
|---|---|---|
| typescript | ^5.7.2 | TypeScript |
| ts-node | ^10.9.2 | Execução TypeScript |
| ts-node-dev | ^2.0.0 | Hot reload em dev |
| @types/node | ^22.10.2 | Tipos Node.js |
| @types/express | ^4.17.21 | Tipos Express |
| @types/bcrypt | ^5.0.2 | Tipos bcrypt |
| @types/cors | ^2.8.17 | Tipos cors |
| @types/jsonwebtoken | ^9.0.7 | Tipos JWT |
| @types/morgan | ^1.9.10 | Tipos morgan |
| @types/node-cron | ^3.0.11 | Tipos node-cron |
