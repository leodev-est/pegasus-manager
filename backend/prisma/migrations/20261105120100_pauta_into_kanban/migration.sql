-- Pauta de Conteúdo → Kanban de marketing.
-- 1) Coluna que liga o card ao item da Pauta de onde veio (aditiva; índice único evita duplicar).
ALTER TABLE "Task" ADD COLUMN IF NOT EXISTS "sourceContentItemId" TEXT;
CREATE UNIQUE INDEX IF NOT EXISTS "Task_sourceContentItemId_key" ON "Task"("sourceContentItemId");

-- 2) Copia cada item da Pauta para um card. A tabela "ContentItem" NÃO é alterada nem apagada:
--    fica como estava, para conferência ou volta atrás. Rodar de novo não duplica (NOT EXISTS).
--    referencia → Ideias | definido → Produção | gravado → Produção (Roteiro e Gravar feitos)
--    editado → Revisão (aguarda aprovação) | postado → Publicado (marcado como migrado)
INSERT INTO "Task" (
    "id", "title", "description", "status", "area", "assignedTo", "dueDate", "priority",
    "channel", "labels", "comments", "checklist", "approvalStatus", "format", "stagesDone",
    "statusChangedAt", "sourceContentItemId", "createdAt", "updatedAt"
)
SELECT
    gen_random_uuid()::text,
    ci."title",
    ci."description",
    CASE ci."status"
        WHEN 'definido' THEN 'production'
        WHEN 'gravado' THEN 'production'
        WHEN 'editado' THEN 'review'
        WHEN 'postado' THEN 'published'
        ELSE 'ideas'
    END,
    'marketing',
    COALESCE(ci."assignedTo", ARRAY[]::TEXT[]),
    ci."date",
    'media',
    NULL,
    '["Pauta"]'::jsonb,
    '[]'::jsonb,
    '[]'::jsonb,
    CASE WHEN ci."status" = 'postado' THEN 'migrated' ELSE NULL END,
    'video',
    CASE ci."status"
        WHEN 'gravado' THEN ARRAY['roteiro', 'gravar']::TEXT[]
        WHEN 'editado' THEN ARRAY['roteiro', 'gravar', 'editar']::TEXT[]
        WHEN 'postado' THEN ARRAY['roteiro', 'gravar', 'editar', 'thumbnail']::TEXT[]
        ELSE ARRAY[]::TEXT[]
    END,
    ci."updatedAt",
    ci."id",
    ci."createdAt",
    ci."updatedAt"
FROM "ContentItem" ci
WHERE NOT EXISTS (
    SELECT 1 FROM "Task" t WHERE t."sourceContentItemId" = ci."id"
);
