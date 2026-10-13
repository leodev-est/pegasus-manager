-- Unifica a Pauta de Conteúdo (ContentItem) com o Kanban de marketing (Task).
-- Só aditivo: nenhuma tabela ou coluna é apagada; a ContentItem antiga fica no banco,
-- sem uso, como histórico inerte.

ALTER TABLE "Task" ADD COLUMN "contentFormat" TEXT;
ALTER TABLE "Task" ADD COLUMN "contentStep" TEXT;

-- Copia cada item da Pauta pra dentro do Kanban, preservando o mesmo id (assim o
-- vínculo da Curadoria pode ser remapeado abaixo sem precisar de join).
-- Itens já "postado" vão direto pra "published" (já estão prontos, não faz sentido
-- pedir aprovação retroativa); os demais entram em "production" com a etapa que já tinham.
INSERT INTO "Task" (
  id, title, description, status, area, "assignedTo", "dueDate", priority, channel,
  labels, comments, checklist, "approvalStatus", "scheduledAt", links,
  "statusChangedAt", position, "contentFormat", "contentStep", "createdAt", "updatedAt"
)
SELECT
  "ContentItem".id,
  "ContentItem".title,
  "ContentItem".description,
  CASE WHEN "ContentItem".status = 'postado' THEN 'published' ELSE 'production' END,
  'marketing',
  "ContentItem"."assignedTo",
  "ContentItem".date,
  'media',
  NULL,
  '[]', '[]', '[]',
  NULL,
  NULL,
  "ContentItem".links,
  "ContentItem"."updatedAt",
  0,
  "ContentItem".format,
  "ContentItem".status,
  "ContentItem"."createdAt",
  "ContentItem"."updatedAt"
FROM "ContentItem"
WHERE NOT EXISTS (SELECT 1 FROM "Task" WHERE "Task".id = "ContentItem".id);

-- Curadoria passa a apontar pra Task (o novo "card de produção"); o vínculo antigo
-- com ContentItem fica pra trás, intacto.
ALTER TABLE "ReferenceVideo" ADD COLUMN "taskId" TEXT;
UPDATE "ReferenceVideo" SET "taskId" = "contentItemId" WHERE "contentItemId" IS NOT NULL;
CREATE INDEX "ReferenceVideo_taskId_idx" ON "ReferenceVideo"("taskId");
ALTER TABLE "ReferenceVideo"
  ADD CONSTRAINT "ReferenceVideo_taskId_fkey" FOREIGN KEY ("taskId") REFERENCES "Task"("id")
  ON DELETE SET NULL ON UPDATE CASCADE;
