-- AlterTable: aggiunge campo avatarConfig (JSON cartoon avatar)
ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "avatarConfig" TEXT;
