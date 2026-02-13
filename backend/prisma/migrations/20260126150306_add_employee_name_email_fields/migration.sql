-- AlterTable: Rendi userId opzionale e aggiungi campi per nuovo dipendente
ALTER TABLE "Onboarding" ALTER COLUMN "userId" DROP NOT NULL;

-- Aggiungi campi per informazioni nuovo dipendente
ALTER TABLE "Onboarding" ADD COLUMN "employeeFirstName" TEXT;
ALTER TABLE "Onboarding" ADD COLUMN "employeeLastName" TEXT;
ALTER TABLE "Onboarding" ADD COLUMN "employeeEmail" TEXT;

-- Popola i campi per gli onboarding esistenti (se esistono)
UPDATE "Onboarding" o
SET
  "employeeFirstName" = u."firstName",
  "employeeLastName" = u."lastName",
  "employeeEmail" = u.email
FROM "User" u
WHERE o."userId" = u.id AND o."userId" IS NOT NULL;

-- Rendi i nuovi campi obbligatori dopo aver popolato i dati esistenti
ALTER TABLE "Onboarding" ALTER COLUMN "employeeFirstName" SET NOT NULL;
ALTER TABLE "Onboarding" ALTER COLUMN "employeeLastName" SET NOT NULL;
ALTER TABLE "Onboarding" ALTER COLUMN "employeeEmail" SET NOT NULL;
