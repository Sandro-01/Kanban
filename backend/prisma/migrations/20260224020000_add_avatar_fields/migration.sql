-- AlterTable: aggiunge campi avatar all'utente
ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "avatarColor" TEXT;
ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "avatarUrl"   TEXT;
