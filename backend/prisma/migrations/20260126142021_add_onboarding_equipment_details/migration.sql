-- AlterTable
ALTER TABLE "Onboarding" ADD COLUMN     "additionalMonitor" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "additionalNotes" TEXT,
ADD COLUMN     "computerType" TEXT,
ADD COLUMN     "department" TEXT,
ADD COLUMN     "needsHeadset" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "needsMicrosoft365" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "needsWebcam" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "phoneType" TEXT,
ADD COLUMN     "role" TEXT,
ADD COLUMN     "sede" TEXT,
ADD COLUMN     "softwareNeeded" TEXT,
ADD COLUMN     "systemAccess" TEXT;

-- CreateIndex
CREATE INDEX "Onboarding_department_idx" ON "Onboarding"("department");
