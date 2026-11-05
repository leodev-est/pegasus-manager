-- Ordem dos cards dentro da coluna do Kanban. Só adiciona coluna; nenhum dado existente é alterado.
ALTER TABLE "Task" ADD COLUMN IF NOT EXISTS "position" DOUBLE PRECISION;
