-- Kanban de marketing: formato de produção, sub-etapas feitas, quando o card entrou na coluna
-- e arquivamento manual. Só adiciona colunas; nenhum dado existente é alterado.
ALTER TABLE "Task" ADD COLUMN IF NOT EXISTS "format" TEXT;
ALTER TABLE "Task" ADD COLUMN IF NOT EXISTS "stagesDone" TEXT[] DEFAULT ARRAY[]::TEXT[];
ALTER TABLE "Task" ADD COLUMN IF NOT EXISTS "statusChangedAt" TIMESTAMP(3);
ALTER TABLE "Task" ADD COLUMN IF NOT EXISTS "archivedAt" TIMESTAMP(3);

-- Função de cada pessoa na equipe de marketing (texto livre, opcional).
ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "marketingFunction" TEXT;
