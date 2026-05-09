-- Extend subscriptions table to match Prisma schema (older DBs may miss these columns).
ALTER TABLE "subscriptions" ADD COLUMN IF NOT EXISTS "planName" TEXT;
ALTER TABLE "subscriptions" ADD COLUMN IF NOT EXISTS "priceCents" INTEGER;
ALTER TABLE "subscriptions" ADD COLUMN IF NOT EXISTS "currency" TEXT;
ALTER TABLE "subscriptions" ADD COLUMN IF NOT EXISTS "interval" TEXT;

