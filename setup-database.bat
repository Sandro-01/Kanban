@echo off
REM 🗄️ Script Setup Database Kanban

echo ╔════════════════════════════════════╗
echo ║   🗄️  Setup Database Kanban       ║
echo ╚════════════════════════════════════╝
echo.

REM Set PostgreSQL path (adjust if your version is different)
set PSQL_PATH=C:\Program Files\PostgreSQL\16\bin\psql.exe

echo 📋 Step 0: Verifica file .env...
if not exist "backend\.env" (
    echo Creazione file .env...
    (
        echo DATABASE_URL="postgresql://kanban_dev:kanban123@localhost:5432/kanban_dev?schema=public"
        echo.
        echo PORT=4000
        echo NODE_ENV=development
        echo.
        echo JWT_SECRET=development-secret-key-change-in-production
        echo.
        echo EMAIL_HOST=smtp.gmail.com
        echo EMAIL_PORT=587
        echo EMAIL_SECURE=false
        echo EMAIL_USER=assistenza@europoligrafico.it
        echo EMAIL_PASSWORD=
        echo EMAIL_FROM=assistenza@europoligrafico.it
        echo.
        echo MAX_FILE_SIZE=10485760
        echo UPLOAD_DIR=../uploads
        echo.
        echo SLA_CRITICAL=4
        echo SLA_HIGH=24
        echo SLA_MEDIUM=72
        echo SLA_LOW=168
    ) > backend\.env
    echo ✅ File .env creato!
) else (
    echo ✅ File .env già esistente
)
echo.

echo 📋 Step 1: Creazione database e utente...
echo.
echo ATTENZIONE: Ti verrà chiesta la password di PostgreSQL (utente postgres)
echo.

REM Create a temporary SQL file
echo DROP DATABASE IF EXISTS kanban_dev; > temp_setup.sql
echo DROP USER IF EXISTS kanban_dev; >> temp_setup.sql
echo CREATE DATABASE kanban_dev; >> temp_setup.sql
echo CREATE USER kanban_dev WITH PASSWORD 'kanban123' CREATEDB; >> temp_setup.sql
echo GRANT ALL PRIVILEGES ON DATABASE kanban_dev TO kanban_dev; >> temp_setup.sql
echo ALTER DATABASE kanban_dev OWNER TO kanban_dev; >> temp_setup.sql

REM Execute all commands in a single connection
"%PSQL_PATH%" -U postgres -f temp_setup.sql

if errorlevel 1 (
    echo.
    echo ❌ Errore nella creazione del database!
    echo Verifica che PostgreSQL sia avviato e che la password di postgres sia corretta.
    del temp_setup.sql
    pause
    exit /b 1
)

REM Clean up temp file
del temp_setup.sql

echo ✅ Database creato!
echo.

echo 📋 Step 2: Generazione Prisma Client...
cd backend
call npx prisma generate

if errorlevel 1 (
    echo.
    echo ❌ Errore nella generazione del Prisma Client!
    pause
    exit /b 1
)

echo ✅ Prisma Client generato!
echo.

echo 📋 Step 3: Creazione e esecuzione migrazioni database...
call npx prisma migrate dev --name init

if errorlevel 1 (
    echo.
    echo ❌ Errore nelle migrazioni!
    pause
    exit /b 1
)

echo ✅ Migrazioni completate!
echo.

echo 📋 Step 4: Popolamento database con dati iniziali...
call npx prisma db seed

if errorlevel 1 (
    echo.
    echo ❌ Errore nel seed del database!
    pause
    exit /b 1
)

echo ✅ Database popolato!
cd ..

echo.
echo ╔════════════════════════════════════╗
echo ║     ✅ SETUP COMPLETATO!          ║
echo ╚════════════════════════════════════╝
echo.
echo Utenti creati:
echo - Admin:   admin@europoligrafico.it / admin123
echo - Manager: manager@europoligrafico.it / manager123
echo - User:    user@europoligrafico.it / user123
echo - Auditor: auditor@europoligrafico.it / auditor123
echo.
echo Ora puoi avviare l'applicazione con: start.bat
echo.
pause
