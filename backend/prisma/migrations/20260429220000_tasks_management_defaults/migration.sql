-- Backfill existing tasks before tightening defaults.
UPDATE "Task" SET "area" = 'management' WHERE "area" IS NULL OR "area" = '';
UPDATE "Task" SET "priority" = 'media' WHERE "priority" IS NULL OR "priority" = '';

-- AlterTable
ALTER TABLE "Task" ALTER COLUMN "area" SET DEFAULT 'management';
ALTER TABLE "Task" ALTER COLUMN "priority" SET DEFAULT 'media';
ALTER TABLE "Task" ALTER COLUMN "priority" SET NOT NULL;
