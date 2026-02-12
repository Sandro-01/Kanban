##############################################################################
# Kanban Board - Script di Download e Installazione (Windows)
#
# Questo script scarica il progetto da GitHub e installa tutte le dipendenze
# necessarie per iniziare lo sviluppo o il deployment.
#
# Uso:
#   Apri PowerShell come Amministratore ed esegui:
#
#   Set-ExecutionPolicy Bypass -Scope Process -Force
#   iex ((New-Object System.Net.WebClient).DownloadString('https://raw.githubusercontent.com/Sandro-01/Kanban/main/download-install.ps1'))
#
#   oppure scarica lo script ed eseguilo:
#
#   .\download-install.ps1
#
# Requisiti:
#   - Git per Windows
#   - Node.js 20 LTS
#   - PostgreSQL 14+ (opzionale, può essere installato dopo)
##############################################################################

# Richiedi privilegi amministratore
#Requires -RunAsAdministrator

$ErrorActionPreference = "Stop"

# Configura encoding console per supportare caratteri Unicode
[Console]::OutputEncoding = [System.Text.Encoding]::UTF8
$PSDefaultParameterValues['Out-File:Encoding'] = 'utf8'
$null = chcp 65001

# Funzioni per output colorato
function Write-Info {
    param([string]$Message)
    Write-Host "ℹ️  $Message" -ForegroundColor Cyan
}

function Write-Success {
    param([string]$Message)
    Write-Host "✅ $Message" -ForegroundColor Green
}

function Write-Warning {
    param([string]$Message)
    Write-Host "⚠️  $Message" -ForegroundColor Yellow
}

function Write-Error {
    param([string]$Message)
    Write-Host "❌ $Message" -ForegroundColor Red
}

function Test-CommandExists {
    param([string]$Command)
    $null = Get-Command $Command -ErrorAction SilentlyContinue
    return $?
}

# Funzione per trovare PostgreSQL in vari percorsi Windows
function Find-PostgreSQL {
    # Controlla se psql è già nel PATH
    if (Test-CommandExists "psql") {
        return $true
    }

    # Percorsi comuni di installazione PostgreSQL su Windows
    $pgPaths = @(
        "C:\Program Files\PostgreSQL\*\bin",
        "C:\Programmi\PostgreSQL\*\bin",
        "C:\Program Files (x86)\PostgreSQL\*\bin",
        "$env:ProgramFiles\PostgreSQL\*\bin",
        "${env:ProgramFiles(x86)}\PostgreSQL\*\bin"
    )

    foreach ($pathPattern in $pgPaths) {
        $resolvedPaths = Get-Item $pathPattern -ErrorAction SilentlyContinue
        if ($resolvedPaths) {
            # Prendi l'ultima versione trovata
            $pgBinPath = ($resolvedPaths | Sort-Object -Descending | Select-Object -First 1).FullName

            # Aggiungi temporaneamente al PATH per questa sessione
            $env:Path = "$pgBinPath;$env:Path"

            if (Test-CommandExists "psql") {
                return $true
            }
        }
    }

    return $false
}

# Banner
Write-Host ""
Write-Host "==============================================" -ForegroundColor Blue
Write-Host "  Kanban Board - Download & Install" -ForegroundColor Blue
Write-Host "  ISO 9001/27001 Compliant System" -ForegroundColor Blue
Write-Host "==============================================" -ForegroundColor Blue
Write-Host ""

# 1. Verifica Prerequisiti
Write-Info "Verificando prerequisiti..."
Write-Host ""

$MissingDeps = $false

# Verifica Git
if (Test-CommandExists "git") {
    $gitVersion = (git --version).Split(" ")[2]
    Write-Success "Git installato (versione $gitVersion)"
} else {
    Write-Error "Git non trovato. Installa Git per Windows prima di continuare."
    Write-Host "   Download: https://git-scm.com/download/win" -ForegroundColor Yellow
    $MissingDeps = $true
}

# Verifica Node.js
if (Test-CommandExists "node") {
    $nodeVersion = node --version
    Write-Success "Node.js installato ($nodeVersion)"

    # Verifica versione Node.js (deve essere >= 18)
    $nodeMajor = [int]$nodeVersion.Substring(1).Split(".")[0]
    if ($nodeMajor -lt 18) {
        Write-Warning "Node.js versione $nodeVersion trovata. Si consiglia Node.js 20 LTS."
    }
} else {
    Write-Error "Node.js non trovato. Installa Node.js 20 LTS."
    Write-Host "   Download: https://nodejs.org/" -ForegroundColor Yellow
    $MissingDeps = $true
}

# Verifica npm
if (Test-CommandExists "npm") {
    $npmVersion = npm --version
    Write-Success "npm installato (versione $npmVersion)"
} else {
    Write-Error "npm non trovato. npm è incluso con Node.js."
    $MissingDeps = $true
}

# Verifica PostgreSQL (opzionale)
if (Find-PostgreSQL) {
    $psqlVersion = (psql --version).Split(" ")[2]
    Write-Success "PostgreSQL installato (versione $psqlVersion)"
} else {
    Write-Warning "PostgreSQL non trovato. Sarà necessario per eseguire l'applicazione."
    Write-Host "   Download: https://www.postgresql.org/download/windows/" -ForegroundColor Yellow
    Write-Host "   oppure: https://www.enterprisedb.com/downloads/postgres-postgresql-downloads" -ForegroundColor Yellow
}

Write-Host ""

if ($MissingDeps) {
    Write-Error "Alcuni prerequisiti mancano. Installali e riprova."
    exit 1
}

# 2. Richiedi directory di installazione
Write-Host ""
Write-Info "Dove vuoi installare il progetto?"
$defaultDir = "$env:USERPROFILE\Kanban"
$installDir = Read-Host "Percorso [default: $defaultDir]"
if ([string]::IsNullOrWhiteSpace($installDir)) {
    $installDir = $defaultDir
}

# Verifica se la directory esiste già
if (Test-Path $installDir) {
    Write-Warning "La directory $installDir esiste già."
    $confirm = Read-Host "Vuoi eliminarla e ricrearla? (s/n)"
    if ($confirm -eq "s" -or $confirm -eq "S") {
        Remove-Item -Path $installDir -Recurse -Force
        Write-Success "Directory eliminata"
    } else {
        Write-Error "Installazione annullata"
        exit 1
    }
}

# 3. Clone Repository
Write-Host ""
Write-Info "Clonando il repository da GitHub..."
git clone https://github.com/Sandro-01/Kanban.git "$installDir"
Write-Success "Repository clonato in $installDir"

# Entra nella directory
Set-Location $installDir

# 4. Installazione Dipendenze Backend
Write-Host ""
Write-Info "Installando dipendenze backend..."
Set-Location backend
npm install
Write-Success "Dipendenze backend installate"

# Crea file .env se non esiste
if (-not (Test-Path ".env")) {
    Write-Info "Creando file .env per backend..."
    $envContent = @"
# Database
DATABASE_URL="postgresql://postgres:postgres@localhost:5432/kanban_dev?schema=public"

# JWT
JWT_SECRET="your-super-secret-jwt-key-change-this-in-production"

# Email Configuration (Opzionale per sviluppo)
EMAIL_HOST="smtp.gmail.com"
EMAIL_PORT="587"
EMAIL_USER="your-email@gmail.com"
EMAIL_PASSWORD="your-app-password"
EMAIL_FROM="noreply@kanban.local"

# Server
PORT=5000
NODE_ENV="development"
"@
    Set-Content -Path ".env" -Value $envContent
    Write-Success "File backend\.env creato"
    Write-Warning "IMPORTANTE: Modifica backend\.env con le tue credenziali!"
} else {
    Write-Info "File backend\.env già esistente"
}

Set-Location ..

# 5. Installazione Dipendenze Frontend
Write-Host ""
Write-Info "Installando dipendenze frontend..."
Set-Location frontend
npm install
Write-Success "Dipendenze frontend installate"

# Crea file .env se non esiste
if (-not (Test-Path ".env")) {
    Write-Info "Creando file .env per frontend..."
    $envContent = "REACT_APP_API_URL=http://localhost:5000/api"
    Set-Content -Path ".env" -Value $envContent
    Write-Success "File frontend\.env creato"
}

Set-Location ..

# 6. Installazione Dipendenze Root (concurrently)
Write-Host ""
Write-Info "Installando dipendenze root..."
npm install
Write-Success "Dipendenze root installate"

# 7. Setup Database (se PostgreSQL è installato)
Write-Host ""
if (Test-CommandExists "psql") {
    Write-Info "Vuoi configurare il database ora? (richiede PostgreSQL in esecuzione)"
    $setupDb = Read-Host "Configurare database? (s/n)"

    if ($setupDb -eq "s" -or $setupDb -eq "S") {
        Set-Location backend

        Write-Info "Generando client Prisma..."
        npx prisma generate
        Write-Success "Client Prisma generato"

        Write-Info "Eseguendo migrazioni database..."
        npx prisma migrate dev --name init
        Write-Success "Migrazioni completate"

        Write-Info "Popolando database con dati iniziali..."
        npx prisma db seed
        Write-Success "Database popolato"

        Set-Location ..
    } else {
        Write-Warning "Setup database saltato. Eseguilo manualmente in seguito:"
        Write-Host "   cd backend" -ForegroundColor Yellow
        Write-Host "   npx prisma generate" -ForegroundColor Yellow
        Write-Host "   npx prisma migrate dev" -ForegroundColor Yellow
        Write-Host "   npx prisma db seed" -ForegroundColor Yellow
    }
} else {
    Write-Warning "PostgreSQL non disponibile. Setup database saltato."
}

# 8. Riepilogo Finale
Write-Host ""
Write-Host "==============================================" -ForegroundColor Green
Write-Host "  ✅ Installazione Completata!" -ForegroundColor Green
Write-Host "==============================================" -ForegroundColor Green
Write-Host ""
Write-Success "Il progetto Kanban è stato scaricato e installato in: $installDir"
Write-Host ""

Write-Info "Prossimi Passi:"
Write-Host ""
Write-Host "1️⃣  Configura le credenziali:" -ForegroundColor White
Write-Host "   - Modifica backend\.env (database, email, JWT)" -ForegroundColor Yellow
Write-Host ""
Write-Host "2️⃣  Se non hai configurato il database:" -ForegroundColor White
Write-Host "   cd $installDir\backend" -ForegroundColor Yellow
Write-Host "   npx prisma generate" -ForegroundColor Yellow
Write-Host "   npx prisma migrate dev" -ForegroundColor Yellow
Write-Host "   npx prisma db seed" -ForegroundColor Yellow
Write-Host ""
Write-Host "3️⃣  Avvia l'applicazione in modalità sviluppo:" -ForegroundColor White
Write-Host "   cd $installDir" -ForegroundColor Yellow
Write-Host "   npm run dev" -ForegroundColor Yellow
Write-Host ""
Write-Host "4️⃣  Accedi all'applicazione:" -ForegroundColor White
Write-Host "   🌐 Frontend: http://localhost:3000" -ForegroundColor Cyan
Write-Host "   🔧 Backend:  http://localhost:5000" -ForegroundColor Cyan
Write-Host ""
Write-Host "5️⃣  Credenziali di test:" -ForegroundColor White
Write-Host "   Admin:   admin@europoligrafico.it / admin123" -ForegroundColor Yellow
Write-Host "   Manager: manager@europoligrafico.it / manager123" -ForegroundColor Yellow
Write-Host "   User:    user@europoligrafico.it / user123" -ForegroundColor Yellow
Write-Host ""
Write-Warning "⚠️  Cambia le password prima del deployment in produzione!"
Write-Host ""
Write-Info "Per il deployment in produzione, consulta:"
Write-Host "   - 🪟 Windows: DEPLOYMENT-WINDOWS.md o deploy-windows.ps1" -ForegroundColor Cyan
Write-Host "   - 🐧 Linux:   DEPLOYMENT.md o deploy-production.sh" -ForegroundColor Cyan
Write-Host ""
Write-Info "Per maggiori informazioni:"
Write-Host "   📖 README.md - Panoramica completa" -ForegroundColor Cyan
Write-Host "   📚 INSTALLATION.md - Setup sviluppo dettagliato" -ForegroundColor Cyan
Write-Host "   ✨ FEATURES.md - Funzionalità e conformità ISO" -ForegroundColor Cyan
Write-Host ""
Write-Host "Made with ❤️  for Europoligrafico" -ForegroundColor Blue
Write-Host ""

# Pausa finale
Write-Host "Premi un tasto per uscire..." -ForegroundColor Gray
$null = $Host.UI.RawUI.ReadKey("NoEcho,IncludeKeyDown")
