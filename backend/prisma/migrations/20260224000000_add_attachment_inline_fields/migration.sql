-- Add inline image tracking fields to Attachment
ALTER TABLE "Attachment" ADD COLUMN "isInline" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "Attachment" ADD COLUMN "contentId" TEXT;
