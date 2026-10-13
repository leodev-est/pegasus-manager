# Unificação Pauta de Conteúdo → Kanban de Marketing

Status: **implementação concluída** (`tsc` e `vite build` limpos no frontend e no backend). Nada foi commitado ainda — está tudo no working tree, esperando aprovação pra subir.

## O que foi pedido

A Pauta de Conteúdo (tela separada, modelo `ContentItem`) e o Kanban de Marketing (`Task`) tinham propósitos parecidos e redundantes: a Pauta não tinha aprovação da chefe de marketing, e a esteira de produção (referência → arte → gravação → etc.) já existia duplicada no Kanban. Pedido do usuário:

1. Unir as duas telas num só fluxo.
2. O Kanban passa a detectar o "formato" do card (vídeo, vídeo+arte, só arte, evento, tarefa solta) e montar a esteira de produção a partir disso.
3. Toda tarefa passa pela aprovação da ChefeMarketing (reaproveitando a coluna "Revisão" que já existia).
4. Responsáveis escolhidos por checkbox com "Nome — Função", não mais texto livre.
5. O botão da Curadoria que virava item da pauta passa a se chamar **"Criar card para produção"**.

## O que foi feito

### Backend
- **`backend/prisma/schema.prisma`**: `Task` ganhou `contentFormat` e `contentStep` (ambos `String?`). `ReferenceVideo` ganhou `taskId` (substituindo `contentItemId` como vínculo ativo). O model `ContentItem` foi **removido do schema.prisma** (só isso — não apaga a tabela real, ver seção "Importante" abaixo).
- **Migration nova**: `backend/prisma/migrations/20261014090000_unify_pauta_into_task_kanban/migration.sql`
  - `ALTER TABLE` aditivo pra adicionar as colunas novas.
  - `INSERT INTO "Task" ... SELECT ... FROM "ContentItem"` — copia cada item da Pauta pro Kanban **preservando o mesmo id**. Itens já "postado" entram como `published`; os demais como `production` com a etapa (`contentStep`) que já tinham.
  - `ReferenceVideo.taskId` preenchido a partir do `contentItemId` antigo (mesmo valor, já que os ids foram preservados na cópia).
  - Nenhum `DROP`. Migrations deste projeto são só aditivas (regra do próprio usuário, `.env` local aponta pra produção).
- **`backend/src/modules/marketing/marketing.shared.ts`**: novo formato `evento` (`referencia → definido → arte → cobertura → postado`) e nova etapa `cobertura`. `FUNCTION_STEPS.eventos` passou a cobrir `cobertura`.
- **`backend/src/modules/tasks/tasks.service.ts`**: `resolveContentFields()` decide o par `(contentFormat, contentStep)` final a partir do payload — valida, e se o formato mudar sem etapa explícita, realoca a etapa pro caminho novo (ou pro início, se for card novo). Notifica quem cuida da próxima etapa (`notifyUsersForStep`) quando a etapa muda, e grava no audit log (`task.step`).
- **`backend/src/modules/references/references.service.ts`**: `toContentItem()` virou **`toTask()`** — cria um `Task` de verdade (via `tasksService.create`, reaproveitando toda a lógica de posição/notificação) em vez de um `ContentItem`. Rota mudou de `POST /references/:id/content-item` pra `POST /references/:id/task`.
- **Módulo `content-items` inteiro removido** (`controller`/`routes`/`service`), desmontado de `routes.ts`.

### Frontend
- **`src/utils/contentPipeline.ts`**: espelha as mudanças do backend (formato `evento`, etapa `cobertura`).
- **`src/components/kanban/AdvancedKanban.tsx`** (compartilhado por Marketing e Gestão, mas os recursos novos são opt-in via props):
  - Campo **"Formato"** no modal do card (só aparece se a página passar `contentFormatOptions`) + campo "Etapa atual".
  - **Esteira de produção no próprio card** (pontinhos clicáveis), igual ao que a Pauta antiga tinha — só aparece em cards com `contentFormat` definido.
  - **Deep link**: prop `openTaskId` — se a URL tiver `?task=<id>`, abre o modal de detalhes desse card direto (usado pelo Calendário pra "voltar" pro card certo).
- **`src/pages/marketing/MarketingPage.tsx`**: liga o formato (`contentFormatOptions={FORMAT_OPTIONS}`), e os responsáveis (`responsibleOptions`) agora mostram **"Nome — Função"** (ex. "Leonardo — Chefe de marketing") em vez de só o nome.
- **`src/pages/marketing/ContentCalendarPage.tsx`**: reescrita do zero. Era uma tela de CRUD própria sobre `ContentItem`; agora é uma **visão de calendário só leitura + criação rápida** sobre os `Task` de marketing (com prazo) e os `Event`. Clicar num card navega pra `/app/marketing?task=<id>` e abre o card de verdade no Kanban — toda edição acontece lá agora.
- **`src/pages/marketing/CuratoriaPage.tsx`**: botão renomeado pra **"Criar card para produção"**, texto do modal e dos toasts atualizados, campo `reference.task` (era `reference.contentItem`).
- **`src/components/layout/Sidebar.tsx`**: label do menu mudou de "Pauta de Conteúdo" pra **"Calendário"**.
- **Removido**: `src/services/contentItemService.ts` (não tinha mais nenhum uso).

## Importante: a tabela `ContentItem` continua existindo no banco

Como as migrations deste projeto são só aditivas (nunca `DROP`), a tabela física `ContentItem` **não foi apagada** — ela só parou de ser usada pelo código (removi o model do `schema.prisma`, então o Prisma Client nem sabe mais que ela existe). Os dados antigos já foram copiados pra `Task` na migration. Se quiser limpar essa tabela órfã de vez, isso precisa ser feito manualmente num acesso direto ao banco de produção (fora do que eu consigo fazer por aqui com segurança) — não é urgente, ela só ocupa espaço sem causar nenhum problema.

## Verificação feita

- `npx tsc --noEmit` (backend): limpo.
- `npx tsc --noEmit -p tsconfig.app.json` (frontend): limpo.
- `npx vite build`: limpo.
- `npx prisma generate`: limpo (só codegen, não tocou no banco).

## O que falta pra "acabar"

Tecnicamente **nada** — a implementação está completa e verificada. O que falta é decisão do usuário:

1. **Revisar visualmente** (não testei no navegador — recomendo abrir o Kanban de Marketing, criar um card de cada formato, testar a esteira, e abrir o Calendário pra ver o deep link funcionando).
2. **Aprovar o commit/push.** Nada foi commitado ainda. Ao subir, o deploy do Render vai rodar `prisma migrate deploy`, que aplica a migration de unificação (inclusive a cópia de dados reais da Pauta pro Kanban) — vale avisar se há itens importantes na Pauta em produção agora, pra confirmar que a cópia preserva tudo certo.
