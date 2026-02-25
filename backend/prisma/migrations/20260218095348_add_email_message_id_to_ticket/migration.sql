-- AlterTable
ALTER TABLE "Ticket" ADD COLUMN     "emailMessageId" TEXT;

-- CreateIndex
CREATE INDEX "Ticket_emailMessageId_idx" ON "Ticket"("emailMessageId");
