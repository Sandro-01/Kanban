-- AlterTable: add isOutgoingEmail and toEmails to Comment
ALTER TABLE "Comment" ADD COLUMN IF NOT EXISTS "isOutgoingEmail" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "Comment" ADD COLUMN IF NOT EXISTS "toEmails" TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[];
