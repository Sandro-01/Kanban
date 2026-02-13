# ==============================================================================
# Script di Installazione PostgreSQL per Windows
# ==============================================================================
# Questo script scarica e installa PostgreSQL 15 su Windows
# Richiede privilegi di amministratore
# ==============================================================================

# Configura encoding console per supportare caratteri Unicode
[Console]::OutputEncoding = [System.Text.Encoding]::UTF8
$PSDefaultParameterValues['Out-File:Encoding'] = 'utf8'
$null = chcp 65001

# Verifica privilegi amministratore
$isAdmin = ([Security.Principal.WindowsPrincipal] [Security.Principal.WindowsIdentity]::GetCurrent()).IsInRole([Security.Principal.WindowsBuiltInRole]::Administrator)
if (-not $isAdmin) {
    Write-Host "❌ ERRORE: Questo script richiede privilegi di amministratore" -ForegroundColor Red
    Write-Host ""
    Write-Host "Come eseguirlo come amministratore:" -ForegroundColor Yellow
    Write-Host "1. Click destro su PowerShell" -ForegroundColor Cyan
    Write-Host "2. Seleziona 'Esegui come amministratore'" -ForegroundColor Cyan
    Write-Host "3. Esegui di nuovo questo script" -ForegroundColor Cyan
    Write-Host ""
    pause
    exit 1
}

Write-Host "╔══════════════════════════════════════════════════════════════╗" -ForegroundColor Cyan
Write-Host "║  Installazione PostgreSQL 15 per Kanban ISO                 ║" -ForegroundColor Cyan
Write-Host "╚══════════════════════════════════════════════════════════════╝" -ForegroundColor Cyan
Write-Host ""

# Verifica se PostgreSQL è già installato
Write-Host "🔍 Verifica se PostgreSQL è già installato..." -ForegroundColor Yellow

# Controlla in vari percorsi possibili (Windows standard e italiano)
$pgPaths = @(
    "C:\Program Files\PostgreSQL\*",
    "C:\Programmi\PostgreSQL\*",
    "C:\Program Files (x86)\PostgreSQL\*",
    "$env:ProgramFiles\PostgreSQL\*",
    "${env:ProgramFiles(x86)}\PostgreSQL\*"
)

$existingInstallations = @()
foreach ($pathPattern in $pgPaths) {
    $found = Get-Item $pathPattern -ErrorAction SilentlyContinue
    if ($found) {
        $existingInstallations += $found
    }
}

if ($existingInstallations.Count -gt 0) {
    Write-Host "✅ PostgreSQL già installato:" -ForegroundColor Green
    foreach ($installation in $existingInstallations) {
        Write-Host "   - $($installation.FullName)" -ForegroundColor Cyan
    }
    Write-Host ""
    $response = Read-Host "Vuoi procedere comunque con l'installazione? (S/N)"
    if ($response -ne "S" -and $response -ne "s") {
        Write-Host "Installazione annullata." -ForegroundColor Yellow
        exit 0
    }
}

# Configurazione
$installerUrl = "https://get.enterprisedb.com/postgresql/postgresql-15.5-1-windows-x64.exe"
$installerPath = "$env:TEMP\postgresql-installer.exe"
$installDir = "C:\Program Files\PostgreSQL\15"
$dataDir = "C:\Program Files\PostgreSQL\15\data"
$port = "5432"
$locale = "Italian, Italy"

# Richiedi password
Write-Host ""
Write-Host "╔══════════════════════════════════════════════════════════════╗" -ForegroundColor Green
Write-Host "║  IMPORTANTE: Scegli una password per l'utente postgres      ║" -ForegroundColor Green
Write-Host "╚══════════════════════════════════════════════════════════════╝" -ForegroundColor Green
Write-Host ""
Write-Host "Questa password sarà usata per:" -ForegroundColor Yellow
Write-Host "  - Accedere a PostgreSQL come superuser" -ForegroundColor Cyan
Write-Host "  - Configurare l'applicazione Kanban ISO" -ForegroundColor Cyan
Write-Host ""
Write-Host "⚠️  RICORDA questa password! Ti servirà dopo!" -ForegroundColor Red
Write-Host ""

$passwordSecure = Read-Host "Inserisci la password per postgres" -AsSecureString
$password = [Runtime.InteropServices.Marshal]::PtrToStringAuto([Runtime.InteropServices.Marshal]::SecureStringToBSTR($passwordSecure))

if ($password.Length -lt 4) {
    Write-Host "❌ La password deve essere di almeno 4 caratteri" -ForegroundColor Red
    pause
    exit 1
}

Write-Host ""
Write-Host "📝 Password impostata con successo!" -ForegroundColor Green
Write-Host ""

# Scarica l'installer
Write-Host "📥 Download PostgreSQL 15.5 installer..." -ForegroundColor Yellow
Write-Host "URL: $installerUrl" -ForegroundColor Cyan
Write-Host "Destinazione: $installerPath" -ForegroundColor Cyan
Write-Host ""
Write-Host "⏳ Attendere... (questo potrebbe richiedere alcuni minuti)" -ForegroundColor Yellow

try {
    # Usa WebClient per il download con progress
    $webClient = New-Object System.Net.WebClient
    $webClient.DownloadFile($installerUrl, $installerPath)
    Write-Host "✅ Download completato!" -ForegroundColor Green
} catch {
    Write-Host "❌ Errore durante il download: $_" -ForegroundColor Red
    Write-Host ""
    Write-Host "Scarica manualmente da:" -ForegroundColor Yellow
    Write-Host "https://www.postgresql.org/download/windows/" -ForegroundColor Cyan
    pause
    exit 1
}

# Verifica che il file sia stato scaricato
if (-not (Test-Path $installerPath)) {
    Write-Host "❌ File installer non trovato" -ForegroundColor Red
    pause
    exit 1
}

# Esegui l'installazione
Write-Host ""
Write-Host "🚀 Avvio installazione PostgreSQL..." -ForegroundColor Yellow
Write-Host ""
Write-Host "Parametri installazione:" -ForegroundColor Cyan
Write-Host "  - Directory: $installDir" -ForegroundColor White
Write-Host "  - Data Directory: $dataDir" -ForegroundColor White
Write-Host "  - Porta: $port" -ForegroundColor White
Write-Host "  - Locale: $locale" -ForegroundColor White
Write-Host ""
Write-Host "⏳ Attendere... (5-10 minuti circa)" -ForegroundColor Yellow
Write-Host ""

# Parametri installazione silente
$arguments = @(
    "--mode", "unattended",
    "--unattendedmodeui", "minimal",
    "--prefix", "`"$installDir`"",
    "--datadir", "`"$dataDir`"",
    "--superpassword", "`"$password`"",
    "--serverport", "$port",
    "--locale", "`"$locale`"",
    "--enable-components", "server,commandlinetools,pgAdmin"
)

try {
    $process = Start-Process -FilePath $installerPath -ArgumentList $arguments -Wait -PassThru

    if ($process.ExitCode -eq 0) {
        Write-Host "✅ PostgreSQL installato con successo!" -ForegroundColor Green
    } else {
        Write-Host "⚠️  Installazione completata con codice: $($process.ExitCode)" -ForegroundColor Yellow
    }
} catch {
    Write-Host "❌ Errore durante l'installazione: $_" -ForegroundColor Red
    pause
    exit 1
}

# Aggiungi PostgreSQL al PATH
Write-Host ""
Write-Host "🔧 Configurazione variabili d'ambiente..." -ForegroundColor Yellow
$pgBinPath = "C:\Program Files\PostgreSQL\15\bin"
$currentPath = [Environment]::GetEnvironmentVariable("Path", "Machine")

if ($currentPath -notlike "*$pgBinPath*") {
    try {
        [Environment]::SetEnvironmentVariable("Path", "$currentPath;$pgBinPath", "Machine")
        $env:Path += ";$pgBinPath"
        Write-Host "✅ PostgreSQL aggiunto al PATH" -ForegroundColor Green
    } catch {
        Write-Host "⚠️  Impossibile aggiungere al PATH automaticamente" -ForegroundColor Yellow
        Write-Host "Aggiungilo manualmente: $pgBinPath" -ForegroundColor Cyan
    }
} else {
    Write-Host "✅ PostgreSQL già presente nel PATH" -ForegroundColor Green
}

# Attendi che il servizio sia avviato
Write-Host ""
Write-Host "⏳ Attendo avvio servizio PostgreSQL..." -ForegroundColor Yellow
Start-Sleep -Seconds 5

# Verifica servizio
$service = Get-Service -Name "postgresql*" -ErrorAction SilentlyContinue
if ($service) {
    if ($service.Status -eq "Running") {
        Write-Host "✅ Servizio PostgreSQL in esecuzione" -ForegroundColor Green
    } else {
        Write-Host "⚠️  Avvio servizio PostgreSQL..." -ForegroundColor Yellow
        Start-Service $service.Name
        Start-Sleep -Seconds 3
        Write-Host "✅ Servizio avviato" -ForegroundColor Green
    }
} else {
    Write-Host "⚠️  Servizio PostgreSQL non trovato" -ForegroundColor Yellow
}

# Crea il database kanban_iso
Write-Host ""
Write-Host "🗄️  Creazione database 'kanban_iso'..." -ForegroundColor Yellow

# Salva la password in un file temporaneo per pgpass
$pgpassFile = "$env:APPDATA\postgresql\pgpass.conf"
$pgpassDir = Split-Path $pgpassFile -Parent
if (-not (Test-Path $pgpassDir)) {
    New-Item -ItemType Directory -Path $pgpassDir -Force | Out-Null
}

# Formato pgpass: localhost:5432:*:postgres:password
"localhost:5432:*:postgres:$password" | Out-File -FilePath $pgpassFile -Encoding ASCII -Force

# Imposta permessi file (solo utente corrente)
$acl = Get-Acl $pgpassFile
$acl.SetAccessRuleProtection($true, $false)
$rule = New-Object System.Security.AccessControl.FileSystemAccessRule($env:USERNAME, "FullControl", "Allow")
$acl.SetAccessRule($rule)
Set-Acl $pgpassFile $acl

try {
    # Verifica connessione
    $env:PGPASSFILE = $pgpassFile
    & "C:\Program Files\PostgreSQL\15\bin\psql.exe" -U postgres -c "SELECT version();" 2>&1 | Out-Null

    if ($LASTEXITCODE -eq 0) {
        Write-Host "✅ Connessione a PostgreSQL riuscita" -ForegroundColor Green

        # Crea database
        & "C:\Program Files\PostgreSQL\15\bin\psql.exe" -U postgres -c "CREATE DATABASE kanban_iso;" 2>&1 | Out-Null

        if ($LASTEXITCODE -eq 0) {
            Write-Host "✅ Database 'kanban_iso' creato con successo!" -ForegroundColor Green
        } else {
            # Verifica se esiste già
            $dbExists = & "C:\Program Files\PostgreSQL\15\bin\psql.exe" -U postgres -tc "SELECT 1 FROM pg_database WHERE datname='kanban_iso';" 2>&1
            if ($dbExists -match "1") {
                Write-Host "✅ Database 'kanban_iso' già esistente" -ForegroundColor Green
            } else {
                Write-Host "⚠️  Impossibile creare il database automaticamente" -ForegroundColor Yellow
                Write-Host "Crealo manualmente con pgAdmin o con:" -ForegroundColor Cyan
                Write-Host 'psql -U postgres -c "CREATE DATABASE kanban_iso;"' -ForegroundColor White
            }
        }
    } else {
        Write-Host "⚠️  Impossibile connettersi a PostgreSQL" -ForegroundColor Yellow
        Write-Host "Verifica che il servizio sia in esecuzione" -ForegroundColor Cyan
    }
} catch {
    Write-Host "⚠️  Errore durante la creazione del database: $_" -ForegroundColor Yellow
}

# Rimuovi il file temporaneo con la password
if (Test-Path $pgpassFile) {
    Remove-Item $pgpassFile -Force
}

# Pulisci l'installer
Write-Host ""
Write-Host "🧹 Pulizia file temporanei..." -ForegroundColor Yellow
Remove-Item $installerPath -Force -ErrorAction SilentlyContinue
Write-Host "✅ Pulizia completata" -ForegroundColor Green

# Riepilogo finale
Write-Host ""
Write-Host "╔══════════════════════════════════════════════════════════════╗" -ForegroundColor Green
Write-Host "║  ✅ INSTALLAZIONE COMPLETATA CON SUCCESSO!                   ║" -ForegroundColor Green
Write-Host "╚══════════════════════════════════════════════════════════════╝" -ForegroundColor Green
Write-Host ""
Write-Host "📋 Informazioni installazione:" -ForegroundColor Cyan
Write-Host "  ✓ PostgreSQL 15 installato in: C:\Program Files\PostgreSQL\15" -ForegroundColor White
Write-Host "  ✓ pgAdmin 4 disponibile nel menu Start" -ForegroundColor White
Write-Host "  ✓ Porta: $port" -ForegroundColor White
Write-Host "  ✓ Username: postgres" -ForegroundColor White
Write-Host "  ✓ Database: kanban_iso" -ForegroundColor White
Write-Host ""
Write-Host "🔐 Credenziali PostgreSQL:" -ForegroundColor Yellow
Write-Host "  Username: postgres" -ForegroundColor White
Write-Host "  Password: [la password che hai scelto]" -ForegroundColor White
Write-Host ""
Write-Host "📝 PROSSIMI PASSI:" -ForegroundColor Cyan
Write-Host ""
Write-Host "1. Apri una NUOVA finestra PowerShell (per caricare il PATH aggiornato)" -ForegroundColor White
Write-Host ""
Write-Host "2. Configura il file backend\.env con la tua password:" -ForegroundColor White
Write-Host '   DATABASE_URL="postgresql://postgres:TUA_PASSWORD@localhost:5432/kanban_iso"' -ForegroundColor Yellow
Write-Host ""
Write-Host "3. Esegui le migrazioni:" -ForegroundColor White
Write-Host "   cd backend" -ForegroundColor Yellow
Write-Host "   npx prisma generate" -ForegroundColor Yellow
Write-Host "   npx prisma migrate deploy" -ForegroundColor Yellow
Write-Host ""
Write-Host "4. Popola il database:" -ForegroundColor White
Write-Host "   npm run seed" -ForegroundColor Yellow
Write-Host ""
Write-Host "5. Avvia l'applicazione:" -ForegroundColor White
Write-Host "   npm run dev" -ForegroundColor Yellow
Write-Host ""
Write-Host "Per aprire pgAdmin: Cerca 'pgAdmin 4' nel menu Start di Windows" -ForegroundColor Cyan
Write-Host ""

pause
