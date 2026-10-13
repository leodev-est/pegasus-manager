-- statusChangedAt: quando o status mudou por último. Faltando um valor histórico real,
-- a melhor aproximação pra tasks já existentes é usar updatedAt (a última vez que a task
-- foi tocada) em vez de "agora", que zeraria o "tempo na coluna" de tudo que já existe.
ALTER TABLE "Task" ADD COLUMN "statusChangedAt" TIMESTAMP(3);
UPDATE "Task" SET "statusChangedAt" = "updatedAt";
ALTER TABLE "Task" ALTER COLUMN "statusChangedAt" SET NOT NULL;
ALTER TABLE "Task" ALTER COLUMN "statusChangedAt" SET DEFAULT CURRENT_TIMESTAMP;

-- position: ordem manual dentro da coluna. Todas as tasks existentes nascem em 0 (empatam e
-- caem no createdAt como critério de desempate); a ordem passa a ser persistida a partir do
-- primeiro drag-and-drop de cada uma.
ALTER TABLE "Task" ADD COLUMN "position" DOUBLE PRECISION NOT NULL DEFAULT 0;
