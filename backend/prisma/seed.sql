-- Seed script for Kanban ISO database
-- Run with: psql -U postgres -h localhost -d kanban_iso -f prisma/seed.sql

-- Ensure pgcrypto extension is available
CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- Seed demo users (upsert: create or update password/status)
INSERT INTO "User" ("id", "email", "password", "firstName", "lastName", "role", "department", "status", "createdAt", "updatedAt")
VALUES
  (gen_random_uuid()::text, 'admin@europoligrafico.it', crypt('admin123', gen_salt('bf', 10)), 'Admin', 'User', 'ADMIN', NULL, 'ACTIVE', NOW(), NOW()),
  (gen_random_uuid()::text, 'riccardo@europoligrafico.it', crypt('user123', gen_salt('bf', 10)), 'Riccardo', 'Rossi', 'USER', 'HR', 'ACTIVE', NOW(), NOW()),
  (gen_random_uuid()::text, 'elisabetta@europoligrafico.it', crypt('user123', gen_salt('bf', 10)), 'Elisabetta', 'Bianchi', 'USER', 'HR', 'ACTIVE', NOW(), NOW()),
  (gen_random_uuid()::text, 'silvia@europoligrafico.it', crypt('user123', gen_salt('bf', 10)), 'Silvia', 'Verdi', 'USER', 'Amministrazione', 'ACTIVE', NOW(), NOW()),
  (gen_random_uuid()::text, 'serena@europoligrafico.it', crypt('user123', gen_salt('bf', 10)), 'Serena', 'Neri', 'USER', 'Amministrazione', 'ACTIVE', NOW(), NOW()),
  (gen_random_uuid()::text, 'sandra@europoligrafico.it', crypt('user123', gen_salt('bf', 10)), 'Sandra', 'Gialli', 'USER', 'Amministrazione', 'ACTIVE', NOW(), NOW()),
  (gen_random_uuid()::text, 'patrizia@europoligrafico.it', crypt('user123', gen_salt('bf', 10)), 'Patrizia', 'Blu', 'USER', 'Amministrazione', 'ACTIVE', NOW(), NOW()),
  (gen_random_uuid()::text, 'marco@europoligrafico.it', crypt('user123', gen_salt('bf', 10)), 'Marco', 'Viola', 'USER', 'IT', 'ACTIVE', NOW(), NOW())
ON CONFLICT ("email") DO UPDATE SET
  "password" = EXCLUDED."password",
  "status" = 'ACTIVE',
  "updatedAt" = NOW();

-- Seed default board
INSERT INTO "Board" ("id", "name", "description", "createdAt", "updatedAt")
VALUES ('default-board', 'Main Board', 'Board principale per gestione ticket', NOW(), NOW())
ON CONFLICT ("id") DO NOTHING;

-- Seed columns
INSERT INTO "Column" ("id", "boardId", "name", "order", "createdAt")
VALUES
  ('col-todo', 'default-board', 'To Do', 0, NOW()),
  ('col-progress', 'default-board', 'In Progress', 1, NOW()),
  ('col-review', 'default-board', 'In Review', 2, NOW()),
  ('col-done', 'default-board', 'Done', 3, NOW())
ON CONFLICT ("id") DO NOTHING;

-- Seed SLA configs
INSERT INTO "SLAConfig" ("id", "category", "priority", "hours", "description", "createdAt", "updatedAt")
VALUES
  (gen_random_uuid()::text, 'Bug Critico', 'CRITICAL', 4, 'Bug che blocca il sistema', NOW(), NOW()),
  (gen_random_uuid()::text, 'Bug Importante', 'HIGH', 24, 'Bug che impatta funzionalità importanti', NOW(), NOW()),
  (gen_random_uuid()::text, 'Richiesta Onboarding', 'HIGH', 24, 'Preparazione dotazioni per nuovo dipendente', NOW(), NOW()),
  (gen_random_uuid()::text, 'Richiesta Funzionalità', 'MEDIUM', 72, 'Nuova funzionalità richiesta', NOW(), NOW()),
  (gen_random_uuid()::text, 'Miglioramento', 'LOW', 168, 'Miglioramento non urgente', NOW(), NOW())
ON CONFLICT ("category") DO NOTHING;

-- Verify
SELECT 'Seed completato!' as result;
SELECT COUNT(*) || ' utenti nel database' as users FROM "User";
