@echo off
REM 🗄️ Script Setup Database Kanban

echo ╔════════════════════════════════════╗
echo ║   🗄️  Setup Database Kanban       ║
echo ╚════════════════════════════════════╝
echo.

REM Set PostgreSQL path (adjust if your version is different)
set PSQL_PATH=C:\Program Files\PostgreSQL\16\bin\psql.exe

echo 📋 Step 1: Creazione database e utente...
echo.

REM Create database and user
"%PSQL_PATH%" -U postgres -c "DROP DATABASE IF EXISTS kanban_dev;"
"%PSQL_PATH%" -U postgres -c "DROP USER IF EXISTS kanban_dev;"
"%PSQL_PATH%" -U postgres -c "CREATE DATABASE kanban_dev;"
"%PSQL_PATH%" -U postgres -c "CREATE USER kanban_dev WITH PASSWORD 'kanban123';"
"%PSQL_PATH%" -U postgres -c "GRANT ALL PRIVILEGES ON DATABASE kanban_dev TO kanban_dev;"
"%PSQL_PATH%" -U postgres -c "ALTER DATABASE kanban_dev OWNER TO kanban_dev;"

if errorlevel 1 (
    echo.
    echo ❌ Errore nella creazione del database!
    echo Verifica che PostgreSQL sia avviato e che la password di postgres sia corretta.
    pause
    exit /b 1
)

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
