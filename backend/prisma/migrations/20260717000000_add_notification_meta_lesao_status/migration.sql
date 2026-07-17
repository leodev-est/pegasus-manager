-- Add meta field to Notification for action payloads (e.g. lesao_isencao)
ALTER TABLE "Notification" ADD COLUMN IF NOT EXISTS "meta" TEXT;
