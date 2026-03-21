ALTER TABLE "tokens" ADD COLUMN IF NOT EXISTS "translation_status" jsonb DEFAULT '{}'::jsonb;
ALTER TABLE "tokens" ADD COLUMN IF NOT EXISTS "translation_meta" jsonb DEFAULT '{}'::jsonb;
