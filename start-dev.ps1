# 🚀 Script Avvio Kanban - Sviluppo Locale (Windows)

Write-Host "╔════════════════════════════════════════════════════╗" -ForegroundColor Green
Write-Host "║   🎯 KANBAN ISO - Avvio Ambiente Sviluppo        ║" -ForegroundColor Green
Write-Host "╚════════════════════════════════════════════════════╝" -ForegroundColor Green
Write-Host ""

# Verifica Node.js
try {
    $nodeVersion = node --version
    Write-Host "✅ Node.js: $nodeVersion" -ForegroundColor Green
} catch {
    Write-Host "❌ Node.js non trovato!" -ForegroundColor Red
    Write-Host "Installa Node.js da: https://nodejs.org" -ForegroundColor Yellow
    exit 1
}

# Verifica PostgreSQL
try {
    $pgVersion = psql --version
    Write-Host "✅ PostgreSQL: $pgVersion" -ForegroundColor Green
} catch {
    Write-Host "❌ PostgreSQL non trovato!" -ForegroundColor Red
    Write-Host "Installa PostgreSQL 14+" -ForegroundColor Yellow
    exit 1
}

Write-Host ""

# Verifica se .env esiste
if (-not (Test-Path "backend\.env")) {
    Write-Host "⚠️  File .env non trovato, lo creo..." -ForegroundColor Yellow

    $envContent = @"
DATABASE_URL="postgresql://kanban_dev:kanban123@localhost:5432/kanban_dev?schema=public"
JWT_SECRET="development-secret-key"
EMAIL_HOST="smtp.gmail.com"
EMAIL_PORT="587"
EMAIL_SECURE="false"
EMAIL_USER="assistenza@europoligrafico.it"
EMAIL_PASSWORD=""
EMAIL_FROM="assistenza@europoligrafico.it"
NODE_ENV="development"
PORT="4000"
APP_URL="http://localhost:3000"
MAX_FILE_SIZE="10485760"
"@

    $envContent | Out-File -FilePath "backend\.env" -Encoding UTF8
    Write-Host "✅ File .env creato" -ForegroundColor Green
}

# Installa dipendenze se necessario
Write-Host ""
Write-Host "📦 Controllo dipendenze..." -ForegroundColor Yellow

if (-not (Test-Path "backend\node_modules")) {
    Write-Host "Installazione dipendenze backend..." -ForegroundColor Cyan
    Set-Location backend
    npm install
    Set-Location ..
}

if (-not (Test-Path "frontend\node_modules")) {
    Write-Host "Installazione dipendenze frontend..." -ForegroundColor Cyan
    Set-Location frontend
    npm install
    Set-Location ..
}

# Setup database se necessario
Write-Host ""
Write-Host "🗄️  Controllo database..." -ForegroundColor Yellow

# Verifica servizio PostgreSQL
$pgService = Get-Service -Name "postgresql*" -ErrorAction SilentlyContinue
if ($pgService.Status -ne "Running") {
    Write-Host "Avvio PostgreSQL..." -ForegroundColor Cyan
    Start-Service $pgService.Name
    Start-Sleep -Seconds 3
}

# Controlla se il database esiste
$env:PGPASSWORD = "postgres"
$dbExists = & "C:\Program Files\PostgreSQL\14\bin\psql.exe" -U postgres -lqt | Select-String -Pattern "kanban_dev"

if (-not $dbExists) {
    Write-Host "Creazione database..." -ForegroundColor Cyan

    $sqlCommands = @"
CREATE DATABASE kanban_dev;
CREATE USER kanban_dev WITH PASSWORD 'kanban123';
GRANT ALL PRIVILEGES ON DATABASE kanban_dev TO kanban_dev;
ALTER DATABASE kanban_dev OWNER TO kanban_dev;
"@

    $sqlCommands | & "C:\Program Files\PostgreSQL\14\bin\psql.exe" -U postgres

    Write-Host "Esecuzione migrazioni..." -ForegroundColor Cyan
    Set-Location backend
    npx prisma generate
    npx prisma migrate deploy
    npx prisma db seed
    Set-Location ..
    Write-Host "✅ Database configurato" -ForegroundColor Green
} else {
    Write-Host "✅ Database già esistente" -ForegroundColor Green
}

# Funzione per terminare i processi
function Stop-Services {
    Write-Host ""
    Write-Host "🛑 Arresto servizi..." -ForegroundColor Yellow
    if ($backendJob) { Stop-Job $backendJob; Remove-Job $backendJob }
    if ($frontendJob) { Stop-Job $frontendJob; Remove-Job $frontendJob }
    # Termina processi Node.js
    Get-Process node -ErrorAction SilentlyContinue | Where-Object { $_.Path -like "*Kanban*" } | Stop-Process -Force
    exit 0
}

# Handler CTRL+C
Register-EngineEvent -SourceIdentifier PowerShell.Exiting -Action { Stop-Services }

# Avvia Backend in background
Write-Host ""
Write-Host "🚀 Avvio Backend (http://localhost:4000)..." -ForegroundColor Green
Set-Location backend
$backendJob = Start-Job -ScriptBlock {
    Set-Location $using:PWD
    npm run dev
}
Set-Location ..

# Aspetta che backend sia pronto
Write-Host "Attendo avvio backend..." -ForegroundColor Cyan
Start-Sleep -Seconds 8

# Avvia Frontend in background
Write-Host ""
Write-Host "🎨 Avvio Frontend (http://localhost:3000)..." -ForegroundColor Green
Set-Location frontend
$frontendJob = Start-Job -ScriptBlock {
    Set-Location $using:PWD
    npm start
}
Set-Location ..

Write-Host ""
Write-Host "╔════════════════════════════════════════════════════╗" -ForegroundColor Green
Write-Host "║              ✅ SISTEMA AVVIATO!                  ║" -ForegroundColor Green
Write-Host "╚════════════════════════════════════════════════════╝" -ForegroundColor Green
Write-Host ""
Write-Host "🌐 Frontend: " -NoNewline -ForegroundColor Green
Write-Host "http://localhost:3000"
Write-Host "🔌 Backend:  " -NoNewline -ForegroundColor Green
Write-Host "http://localhost:4000"
Write-Host ""
Write-Host "📧 Login:" -ForegroundColor Yellow
Write-Host "   Email:    admin@europoligrafico.it"
Write-Host "   Password: admin123"
Write-Host ""
Write-Host "⚠️  Premi CTRL+C per fermare tutto" -ForegroundColor Red
Write-Host ""
Write-Host "📊 Visualizza output:" -ForegroundColor Cyan
Write-Host "   Backend:  Receive-Job `$backendJob -Keep"
Write-Host "   Frontend: Receive-Job `$frontendJob -Keep"
Write-Host ""

# Mantieni lo script in esecuzione e mostra output
try {
    while ($true) {
        # Mostra output backend
        $backendOutput = Receive-Job $backendJob -Keep
        if ($backendOutput) {
            Write-Host "Backend: " -NoNewline -ForegroundColor Cyan
            Write-Host $backendOutput
        }

        # Mostra output frontend
        $frontendOutput = Receive-Job $frontendJob -Keep
        if ($frontendOutput) {
            Write-Host "Frontend: " -NoNewline -ForegroundColor Magenta
            Write-Host $frontendOutput
        }

        Start-Sleep -Seconds 2

        # Verifica se i job sono ancora in esecuzione
        if ($backendJob.State -ne "Running" -or $frontendJob.State -ne "Running") {
            Write-Host "⚠️  Un servizio si è fermato!" -ForegroundColor Red
            Stop-Services
        }
    }
} finally {
    Stop-Services
}
