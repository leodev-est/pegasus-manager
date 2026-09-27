-- Converte Task.assignedTo de texto único para lista de textos, preservando os dados existentes
-- (cada valor antigo vira um array de 1 item; NULL/vazio vira lista vazia).
ALTER TABLE "Task" ADD COLUMN "assignedTo_new" TEXT[] NOT NULL DEFAULT '{}';

UPDATE "Task"
SET "assignedTo_new" = ARRAY["assignedTo"]
WHERE "assignedTo" IS NOT NULL AND "assignedTo" <> '';

ALTER TABLE "Task" DROP COLUMN "assignedTo";
ALTER TABLE "Task" RENAME COLUMN "assignedTo_new" TO "assignedTo";
