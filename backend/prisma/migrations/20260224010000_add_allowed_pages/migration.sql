-- Add page access control to User
ALTER TABLE "User" ADD COLUMN "allowedPages" TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[];
