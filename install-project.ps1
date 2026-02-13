###############################################################################
# Script di Installazione Progetto Kanban ISO 9001/27001
# Installa tutte le dipendenze e configura il progetto per l'uso (Windows)
###############################################################################

# Richiede esecuzione come Amministratore
#Requires -RunAsAdministrator

# Imposta policy di esecuzione
Set-ExecutionPolicy -ExecutionPolicy RemoteSigned -Scope Process -Force

# Configura encoding console per supportare caratteri Unicode
[Console]::OutputEncoding = [System.Text.Encoding]::UTF8
$PSDefaultParameterValues['Out-File:Encoding'] = 'utf8'
$null = chcp 65001 2>$null

# Versione minima richiesta
$RequiredNodeVersion = 20

# Colori per output
function Write-ColorOutput {
    param(
        [string]$Message,
        [string]$Color = "White"
    )
    Write-Host $Message -ForegroundColor $Color
}

Write-Host ""
Write-ColorOutput "+============================================================+" "Cyan"
Write-ColorOutput "|  Script Installazione Progetto Kanban ISO 9001/27001     |" "Cyan"
Write-ColorOutput "+============================================================+" "Cyan"
Write-Host ""

# Funzione per verificare se un comando esiste
function Test-CommandExists {
    param($Command)
    $null = Get-Command $Command -ErrorAction SilentlyContinue
    return $?
}

# Funzione per trovare PostgreSQL in vari percorsi Windows
function Find-PostgreSQL {
    # Controlla se psql e' gia' nel PATH
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

# Funzione per verificare versione Node.js
function Test-NodeVersion {
    if (-not (Test-CommandExists "node")) {
        return $false
    }

    $NodeVersionString = node -v
    $NodeVersion = [int]($NodeVersionString -replace 'v(\d+)\..*', '$1')

    return $NodeVersion -ge $RequiredNodeVersion
}

# Verifica prerequisiti
Write-ColorOutput "[1/7] Verifica prerequisiti..." "Yellow"

# Verifica Node.js
if (-not (Test-NodeVersion)) {
    Write-ColorOutput "[X] Node.js $RequiredNodeVersion LTS o superiore richiesto!" "Red"
    Write-Host ""
    Write-Host "Scarica e installa Node.js da: https://nodejs.org/"
    Write-Host ""
    Write-Host "OPPURE installa con Chocolatey:"
    Write-Host "  choco install nodejs-lts -y"
    Write-Host ""
    Write-Host "OPPURE usa Windows Package Manager:"
    Write-Host "  winget install OpenJS.NodeJS.LTS"
    Write-Host ""
    exit 1
}

$NodeVersion = node -v
Write-ColorOutput "[OK] Node.js installato: $NodeVersion" "Green"

# Verifica npm
if (-not (Test-CommandExists "npm")) {
    Write-ColorOutput "[X] npm non e' installato!" "Red"
    exit 1
}

$NpmVersion = npm -v
Write-ColorOutput "[OK] npm installato: v$NpmVersion" "Green"

# Verifica PostgreSQL (opzionale)
if (Find-PostgreSQL) {
    $PgVersion = psql --version
    Write-ColorOutput "[OK] PostgreSQL installato: $PgVersion" "Green"
}
else {
    Write-ColorOutput "[!] PostgreSQL non trovato (opzionale per sviluppo locale)" "Yellow"
    Write-Host "   Installalo da: https://www.postgresql.org/download/windows/"
}

# Installazione dipendenze root
Write-Host ""
Write-ColorOutput "[2/7] Installazione dipendenze root..." "Yellow"
npm install
if ($LASTEXITCODE -ne 0) {
    Write-ColorOutput "[X] Errore installazione dipendenze root!" "Red"
    exit 1
}
Write-ColorOutput "[OK] Dipendenze root installate" "Green"

# Installazione dipendenze backend
Write-Host ""
Write-ColorOutput "[3/7] Installazione dipendenze backend..." "Yellow"
Push-Location backend
npm install
if ($LASTEXITCODE -ne 0) {
    Pop-Location
    Write-ColorOutput "[X] Errore installazione dipendenze backend!" "Red"
    exit 1
}
Write-ColorOutput "[OK] Dipendenze backend installate" "Green"

# Configurazione .env backend
Write-Host ""
Write-ColorOutput "[4/7] Configurazione ambiente backend..." "Yellow"
if (-not (Test-Path ".env")) {
    Copy-Item ".env.example" ".env"
    Write-ColorOutput "[OK] File .env creato da .env.example" "Green"
    Write-ColorOutput "[!] IMPORTANTE: Modifica backend\.env con le tue credenziali!" "Yellow"
}
else {
    Write-ColorOutput "[!] File .env gia' esistente, non sovrascritto" "Yellow"
}

# Setup Prisma
Write-Host ""
Write-ColorOutput "[5/7] Setup Prisma ORM..." "Yellow"
npx prisma generate
if ($LASTEXITCODE -ne 0) {
    Pop-Location
    Write-ColorOutput "[X] Errore generazione Prisma client!" "Red"
    exit 1
}
Write-ColorOutput "[OK] Prisma client generato" "Green"

# Nota per database
Write-ColorOutput "[!] NOTA: Per creare il database esegui:" "Yellow"
Write-Host "  npx prisma migrate dev"
Write-Host "  npx prisma db seed"

Pop-Location

# Installazione dipendenze frontend
Write-Host ""
Write-ColorOutput "[6/7] Installazione dipendenze frontend..." "Yellow"
Push-Location frontend
npm install
if ($LASTEXITCODE -ne 0) {
    Pop-Location
    Write-ColorOutput "[X] Errore installazione dipendenze frontend!" "Red"
    exit 1
}
Write-ColorOutput "[OK] Dipendenze frontend installate" "Green"
Pop-Location

# Creazione directory uploads
Write-Host ""
Write-ColorOutput "[7/7] Configurazione directory..." "Yellow"
if (-not (Test-Path "uploads")) {
    New-Item -ItemType Directory -Path "uploads" | Out-Null
    Write-ColorOutput "[OK] Directory uploads creata" "Green"
}
else {
    Write-ColorOutput "[OK] Directory uploads gia' esistente" "Green"
}

# Riepilogo
Write-Host ""
Write-ColorOutput "+============================================================+" "Green"
Write-ColorOutput "|  [OK] Installazione completata con successo!              |" "Green"
Write-ColorOutput "+============================================================+" "Green"
Write-Host ""
Write-ColorOutput "Prossimi passi:" "Cyan"
Write-Host ""
Write-ColorOutput "1. Configura il database PostgreSQL" "Yellow"
Write-Host "   - Installa PostgreSQL se non presente"
Write-Host "   - Crea database: createdb kanban_iso"
Write-Host "   - Modifica DATABASE_URL in backend\.env"
Write-Host ""
Write-ColorOutput "2. Configura le credenziali email in backend\.env" "Yellow"
Write-Host "   - EMAIL_HOST, EMAIL_USER, EMAIL_PASSWORD"
Write-Host "   - JWT_SECRET (cambia quello di default!)"
Write-Host ""
Write-ColorOutput "3. Esegui migrazione database" "Yellow"
Write-Host "   cd backend"
Write-Host "   npx prisma migrate dev"
Write-Host "   npx prisma db seed"
Write-Host ""
Write-ColorOutput "4. Avvia il progetto in modalita' sviluppo" "Yellow"
Write-Host "   Dalla root del progetto:"
Write-ColorOutput "   npm run dev" "Green"
Write-Host ""
Write-Host "   OPPURE avvia backend e frontend separatamente:"
Write-ColorOutput "   npm run server" "Green"
Write-Host "   # Backend su http://localhost:5000"
Write-ColorOutput "   npm run client" "Green"
Write-Host "   # Frontend su http://localhost:3000"
Write-Host ""
Write-ColorOutput "Per deployment in produzione:" "Cyan"
Write-ColorOutput "   .\deploy-windows.ps1" "Green"
Write-Host "   # Windows Server con IIS e PostgreSQL"
Write-Host ""
Write-ColorOutput "Credenziali demo (dopo seed):" "Cyan"
Write-Host "   Admin:   admin@europoligrafico.it / admin123"
Write-Host "   Manager: manager@europoligrafico.it / manager123"
Write-Host "   User:    user@europoligrafico.it / user123"
Write-Host ""
Write-ColorOutput "[!] Cambia le password in produzione!" "Yellow"
Write-Host ""
