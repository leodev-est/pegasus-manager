-- AlterTable
ALTER TABLE "Turma" ADD COLUMN     "gender" TEXT;

-- DataMigration: infere o gênero das turmas já cadastradas pelo nome
UPDATE "Turma" SET "gender" = 'feminino' WHERE "name" ILIKE '%femin%';
UPDATE "Turma" SET "gender" = 'masculino' WHERE "name" ILIKE '%masc%' AND "gender" IS NULL;
