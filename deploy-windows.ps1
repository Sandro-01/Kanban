# 🚀 Deployment Windows Server - Kanban ISO Compliance

## Script Automatico PowerShell per Windows Server 2019/2022

# IMPORTANTE: Esegui come Amministratore
# Click destro su PowerShell → "Esegui come amministratore"

# ============================================
# CONFIGURAZIONE - MODIFICARE QUESTI VALORI
# ============================================

$DOMAIN = "kanban.europoligrafico.it"
$APP_DIR = "C:\inetpub\kanban"
$DB_NAME = "kanban_prod"
$DB_USER = "kanban_user"
$DB_PASSWORD = -join ((65..90) + (97..122) + (48..57) | Get-Random -Count 20 | ForEach-Object {[char]$_})
$EMAIL_ADMIN = "admin@europoligrafico.it"

Write-Host "╔═══════════════════════════════════════════════════════╗" -ForegroundColor Green
Write-Host "║  KANBAN ISO COMPLIANCE - DEPLOYMENT WINDOWS SERVER   ║" -ForegroundColor Green
Write-Host "╚═══════════════════════════════════════════════════════╝" -ForegroundColor Green
Write-Host ""
Write-Host "Dominio: $DOMAIN" -ForegroundColor Yellow
Write-Host "Directory: $APP_DIR" -ForegroundColor Yellow
Write-Host "Database: $DB_NAME" -ForegroundColor Yellow
Write-Host ""

# ============================================
# 1. VERIFICA AMMINISTRATORE
# ============================================

$isAdmin = ([Security.Principal.WindowsPrincipal] [Security.Principal.WindowsIdentity]::GetCurrent()).IsInRole([Security.Principal.WindowsBuiltInRole]::Administrator)
if (-not $isAdmin) {
    Write-Host "❌ ERRORE: Devi eseguire questo script come Amministratore!" -ForegroundColor Red
    Write-Host "Click destro su PowerShell → Esegui come amministratore" -ForegroundColor Yellow
    exit 1
}

Write-Host "✅ 1. Verifica amministratore completata" -ForegroundColor Green

# ============================================
# 2. ABILITA ESECUZIONE SCRIPT
# ============================================

Write-Host "`n📋 2. Configurazione policy esecuzione script..." -ForegroundColor Cyan
Set-ExecutionPolicy Bypass -Scope Process -Force

# ============================================
# 3. INSTALLA CHOCOLATEY
# ============================================

Write-Host "`n📦 3. Installazione Chocolatey (package manager)..." -ForegroundColor Cyan

if (-not (Get-Command choco -ErrorAction SilentlyContinue)) {
    [System.Net.ServicePointManager]::SecurityProtocol = [System.Net.ServicePointManager]::SecurityProtocol -bor 3072
    Invoke-Expression ((New-Object System.Net.WebClient).DownloadString('https://community.chocolatey.org/install.ps1'))
    Write-Host "✅ Chocolatey installato" -ForegroundColor Green
} else {
    Write-Host "✅ Chocolatey già installato" -ForegroundColor Green
}

# Refresh environment
$env:Path = [System.Environment]::GetEnvironmentVariable("Path","Machine") + ";" + [System.Environment]::GetEnvironmentVariable("Path","User")

# ============================================
# 4. INSTALLA NODE.JS
# ============================================

Write-Host "`n🟢 4. Installazione Node.js 20..." -ForegroundColor Cyan

if (-not (Get-Command node -ErrorAction SilentlyContinue)) {
    choco install nodejs-lts -y --version=20.11.0
    # Refresh environment
    $env:Path = [System.Environment]::GetEnvironmentVariable("Path","Machine") + ";" + [System.Environment]::GetEnvironmentVariable("Path","User")
    Write-Host "✅ Node.js installato" -ForegroundColor Green
} else {
    Write-Host "✅ Node.js già installato - versione: $(node --version)" -ForegroundColor Green
}

# ============================================
# 5. INSTALLA GIT
# ============================================

Write-Host "`n📦 5. Installazione Git..." -ForegroundColor Cyan

if (-not (Get-Command git -ErrorAction SilentlyContinue)) {
    choco install git -y
    $env:Path = [System.Environment]::GetEnvironmentVariable("Path","Machine") + ";" + [System.Environment]::GetEnvironmentVariable("Path","User")
    Write-Host "✅ Git installato" -ForegroundColor Green
} else {
    Write-Host "✅ Git già installato" -ForegroundColor Green
}

# ============================================
# 6. INSTALLA POSTGRESQL
# ============================================

Write-Host "`n🗄️  6. Installazione PostgreSQL..." -ForegroundColor Cyan

if (-not (Get-Command psql -ErrorAction SilentlyContinue)) {
    choco install postgresql14 -y --params '/Password:PostgreSQL123!'
    $env:Path = [System.Environment]::GetEnvironmentVariable("Path","Machine") + ";" + [System.Environment]::GetEnvironmentVariable("Path","User")

    # Aspetta che il servizio si avvii
    Start-Sleep -Seconds 30

    Write-Host "✅ PostgreSQL installato" -ForegroundColor Green
} else {
    Write-Host "✅ PostgreSQL già installato" -ForegroundColor Green
}

# ============================================
# 7. CONFIGURA DATABASE
# ============================================

Write-Host "`n🗄️  7. Configurazione database..." -ForegroundColor Cyan

$pgPassword = "PostgreSQL123!"
$env:PGPASSWORD = $pgPassword

# Crea database e utente
$sqlCommands = @"
CREATE DATABASE $DB_NAME;
CREATE USER $DB_USER WITH ENCRYPTED PASSWORD '$DB_PASSWORD';
GRANT ALL PRIVILEGES ON DATABASE $DB_NAME TO $DB_USER;
ALTER DATABASE $DB_NAME OWNER TO $DB_USER;
"@

$sqlCommands | & "C:\Program Files\PostgreSQL\14\bin\psql.exe" -U postgres -h localhost

Write-Host "✅ Database configurato" -ForegroundColor Green
Write-Host "   Nome: $DB_NAME" -ForegroundColor Yellow
Write-Host "   User: $DB_USER" -ForegroundColor Yellow

# ============================================
# 8. CREA DIRECTORY APPLICAZIONE
# ============================================

Write-Host "`n📁 8. Creazione directory applicazione..." -ForegroundColor Cyan

if (-not (Test-Path $APP_DIR)) {
    New-Item -ItemType Directory -Path $APP_DIR -Force | Out-Null
    Write-Host "✅ Directory creata: $APP_DIR" -ForegroundColor Green
} else {
    Write-Host "✅ Directory già esistente: $APP_DIR" -ForegroundColor Green
}

# ============================================
# 9. CLONE REPOSITORY
# ============================================

Write-Host "`n📦 9. Clone repository..." -ForegroundColor Cyan

# IMPORTANTE: Modifica con il tuo repository
$REPO_URL = "https://github.com/Sandro-01/Kanban.git"

Set-Location $APP_DIR
if (Test-Path ".git") {
    git pull origin main
    Write-Host "✅ Repository aggiornato" -ForegroundColor Green
} else {
    git clone $REPO_URL .
    Write-Host "✅ Repository clonato" -ForegroundColor Green
}

# ============================================
# 10. CONFIGURA BACKEND
# ============================================

Write-Host "`n⚙️  10. Configurazione Backend..." -ForegroundColor Cyan

Set-Location "$APP_DIR\backend"

# Genera JWT Secret
$jwtSecret = -join ((65..90) + (97..122) + (48..57) | Get-Random -Count 64 | ForEach-Object {[char]$_})

# Crea file .env
$envContent = @"
# Database
DATABASE_URL="postgresql://${DB_USER}:${DB_PASSWORD}@localhost:5432/${DB_NAME}?schema=public"

# JWT Secret
JWT_SECRET="$jwtSecret"

# Email Configuration - MODIFICARE CON LE TUE CREDENZIALI
EMAIL_HOST="smtp.gmail.com"
EMAIL_PORT="587"
EMAIL_SECURE="false"
EMAIL_USER="assistenza@europoligrafico.it"
EMAIL_PASSWORD="YOUR_EMAIL_PASSWORD"
EMAIL_FROM="assistenza@europoligrafico.it"

# App Configuration
NODE_ENV="production"
PORT="4000"
APP_URL="https://$DOMAIN"

# File Upload
MAX_FILE_SIZE="10485760"
"@

$envContent | Out-File -FilePath ".env" -Encoding UTF8
Write-Host "✅ File .env creato" -ForegroundColor Green
Write-Host "⚠️  IMPORTANTE: Modifica $APP_DIR\backend\.env con credenziali email" -ForegroundColor Yellow

# Installa dipendenze
Write-Host "`nInstallazione dipendenze backend..." -ForegroundColor Cyan
npm install

# Genera Prisma Client
Write-Host "`nGenerazione Prisma Client..." -ForegroundColor Cyan
npx prisma generate

# Esegui migrazioni
Write-Host "`nEsecuzione migrazioni database..." -ForegroundColor Cyan
npx prisma migrate deploy

# Seed database
Write-Host "`nSeeding database..." -ForegroundColor Cyan
npx prisma db seed

# Build backend
Write-Host "`nBuild backend..." -ForegroundColor Cyan
npm run build

Write-Host "✅ Backend configurato e compilato" -ForegroundColor Green

# ============================================
# 11. CONFIGURA FRONTEND
# ============================================

Write-Host "`n⚙️  11. Configurazione Frontend..." -ForegroundColor Cyan

Set-Location "$APP_DIR\frontend"

# Crea file .env.production
$frontendEnv = @"
REACT_APP_API_URL=https://$DOMAIN/api
"@

$frontendEnv | Out-File -FilePath ".env.production" -Encoding UTF8

# Installa dipendenze
Write-Host "`nInstallazione dipendenze frontend..." -ForegroundColor Cyan
npm install

# Build frontend
Write-Host "`nBuild frontend..." -ForegroundColor Cyan
npm run build

Write-Host "✅ Frontend compilato" -ForegroundColor Green

# ============================================
# 12. INSTALLA PM2 WINDOWS
# ============================================

Write-Host "`n🔄 12. Installazione PM2 per Windows..." -ForegroundColor Cyan

npm install -g pm2
npm install -g pm2-windows-startup

# Configura PM2 come servizio Windows
pm2-startup install

Write-Host "✅ PM2 installato" -ForegroundColor Green

# ============================================
# 13. CONFIGURA PM2
# ============================================

Write-Host "`n⚙️  13. Configurazione PM2..." -ForegroundColor Cyan

Set-Location $APP_DIR

# Crea ecosystem.config.js
$ecosystemConfig = @"
module.exports = {
  apps: [{
    name: 'kanban-backend',
    cwd: '$APP_DIR\\backend',
    script: 'dist\\index.js',
    instances: 2,
    exec_mode: 'cluster',
    env: {
      NODE_ENV: 'production',
      PORT: 4000
    },
    error_file: '$APP_DIR\\logs\\backend-error.log',
    out_file: '$APP_DIR\\logs\\backend-out.log',
    log_date_format: 'YYYY-MM-DD HH:mm:ss'
  }]
};
"@

$ecosystemConfig | Out-File -FilePath "ecosystem.config.js" -Encoding UTF8

# Crea directory logs
New-Item -ItemType Directory -Path "$APP_DIR\logs" -Force | Out-Null

# Avvia con PM2
pm2 start ecosystem.config.js
pm2 save

Write-Host "✅ PM2 configurato e avviato" -ForegroundColor Green

# ============================================
# 14. INSTALLA IIS
# ============================================

Write-Host "`n🌐 14. Installazione IIS..." -ForegroundColor Cyan

Install-WindowsFeature -Name Web-Server -IncludeManagementTools
Install-WindowsFeature -Name Web-Http-Redirect
Install-WindowsFeature -Name Web-Asp-Net45

Write-Host "✅ IIS installato" -ForegroundColor Green

# ============================================
# 15. INSTALLA URL REWRITE E ARR
# ============================================

Write-Host "`n🔄 15. Installazione URL Rewrite e ARR..." -ForegroundColor Cyan

# URL Rewrite
choco install urlrewrite -y

# Application Request Routing
choco install iis-arr -y

Write-Host "✅ URL Rewrite e ARR installati" -ForegroundColor Green

# ============================================
# 16. CONFIGURA IIS SITO
# ============================================

Write-Host "`n🌐 16. Configurazione sito IIS..." -ForegroundColor Cyan

Import-Module WebAdministration

# Rimuovi sito default se esiste
if (Get-Website -Name "Default Web Site" -ErrorAction SilentlyContinue) {
    Remove-Website -Name "Default Web Site"
}

# Crea nuovo sito
New-Website -Name "Kanban" `
    -PhysicalPath "$APP_DIR\frontend\build" `
    -Port 80 `
    -HostHeader $DOMAIN `
    -Force

# Configura Application Pool
Set-ItemProperty "IIS:\Sites\Kanban" -Name applicationPool -Value "DefaultAppPool"
Set-ItemProperty "IIS:\AppPools\DefaultAppPool" -Name managedRuntimeVersion -Value ""

Write-Host "✅ Sito IIS configurato" -ForegroundColor Green

# ============================================
# 17. CONFIGURA REVERSE PROXY
# ============================================

Write-Host "`n🔄 17. Configurazione reverse proxy per API..." -ForegroundColor Cyan

$webConfigPath = "$APP_DIR\frontend\build\web.config"

$webConfig = @"
<?xml version="1.0" encoding="UTF-8"?>
<configuration>
    <system.webServer>
        <rewrite>
            <rules>
                <!-- API Reverse Proxy -->
                <rule name="API Reverse Proxy" stopProcessing="true">
                    <match url="^api/(.*)" />
                    <action type="Rewrite" url="http://localhost:4000/{R:1}" />
                </rule>

                <!-- React Router -->
                <rule name="React Routes" stopProcessing="true">
                    <match url=".*" />
                    <conditions logicalGrouping="MatchAll">
                        <add input="{REQUEST_FILENAME}" matchType="IsFile" negate="true" />
                        <add input="{REQUEST_FILENAME}" matchType="IsDirectory" negate="true" />
                    </conditions>
                    <action type="Rewrite" url="/" />
                </rule>
            </rules>
        </rewrite>

        <!-- MIME Types -->
        <staticContent>
            <mimeMap fileExtension=".json" mimeType="application/json" />
            <mimeMap fileExtension=".woff" mimeType="application/font-woff" />
            <mimeMap fileExtension=".woff2" mimeType="application/font-woff2" />
        </staticContent>

        <!-- Security Headers (ISO 27001) -->
        <httpProtocol>
            <customHeaders>
                <add name="X-Content-Type-Options" value="nosniff" />
                <add name="X-Frame-Options" value="SAMEORIGIN" />
                <add name="X-XSS-Protection" value="1; mode=block" />
            </customHeaders>
        </httpProtocol>
    </system.webServer>
</configuration>
"@

$webConfig | Out-File -FilePath $webConfigPath -Encoding UTF8
Write-Host "✅ Reverse proxy configurato" -ForegroundColor Green

# ============================================
# 18. CONFIGURA FIREWALL
# ============================================

Write-Host "`n🔥 18. Configurazione Firewall..." -ForegroundColor Cyan

New-NetFirewallRule -DisplayName "Kanban HTTP" -Direction Inbound -LocalPort 80 -Protocol TCP -Action Allow
New-NetFirewallRule -DisplayName "Kanban HTTPS" -Direction Inbound -LocalPort 443 -Protocol TCP -Action Allow

Write-Host "✅ Firewall configurato" -ForegroundColor Green

# ============================================
# 19. INSTALLA CERTIFICATO SSL (WIN-ACME)
# ============================================

Write-Host "`n🔒 19. Setup certificato SSL..." -ForegroundColor Cyan

choco install win-acme -y

Write-Host "✅ Win-ACME installato" -ForegroundColor Green
Write-Host ""
Write-Host "⚠️  PER OTTENERE CERTIFICATO SSL:" -ForegroundColor Yellow
Write-Host "1. Assicurati che il DNS punti a questo server" -ForegroundColor White
Write-Host "2. Esegui: wacs.exe" -ForegroundColor White
Write-Host "3. Scegli opzione: N - Create certificate (default settings)" -ForegroundColor White
Write-Host "4. Inserisci dominio: $DOMAIN" -ForegroundColor White
Write-Host "5. Il certificato verrà installato automaticamente in IIS" -ForegroundColor White

# ============================================
# 20. CONFIGURA BACKUP AUTOMATICO
# ============================================

Write-Host "`n💾 20. Configurazione backup automatico..." -ForegroundColor Cyan

$backupDir = "C:\Backups\Kanban"
New-Item -ItemType Directory -Path $backupDir -Force | Out-Null

# Script di backup
$backupScript = @"
`$date = Get-Date -Format "yyyyMMdd_HHmmss"
`$backupDir = "$backupDir"

# Backup database
`$env:PGPASSWORD = "$pgPassword"
& "C:\Program Files\PostgreSQL\14\bin\pg_dump.exe" -U postgres -h localhost $DB_NAME | Out-File "`$backupDir\db_`$date.sql"

# Comprimi SQL
Compress-Archive -Path "`$backupDir\db_`$date.sql" -DestinationPath "`$backupDir\db_`$date.zip"
Remove-Item "`$backupDir\db_`$date.sql"

# Backup uploads
Compress-Archive -Path "$APP_DIR\uploads" -DestinationPath "`$backupDir\uploads_`$date.zip"

# Rimuovi backup più vecchi di 30 giorni
Get-ChildItem `$backupDir -Filter *.zip | Where-Object { `$_.CreationTime -lt (Get-Date).AddDays(-30) } | Remove-Item

Write-Host "Backup completato: `$date"
"@

$backupScriptPath = "C:\Scripts\kanban-backup.ps1"
New-Item -ItemType Directory -Path "C:\Scripts" -Force | Out-Null
$backupScript | Out-File -FilePath $backupScriptPath -Encoding UTF8

# Crea Task Scheduler per backup giornaliero
$action = New-ScheduledTaskAction -Execute "PowerShell.exe" -Argument "-ExecutionPolicy Bypass -File $backupScriptPath"
$trigger = New-ScheduledTaskTrigger -Daily -At 2am
$principal = New-ScheduledTaskPrincipal -UserId "SYSTEM" -LogonType ServiceAccount -RunLevel Highest
Register-ScheduledTask -TaskName "Kanban Backup" -Action $action -Trigger $trigger -Principal $principal -Force

Write-Host "✅ Backup automatico configurato (giornaliero alle 2:00)" -ForegroundColor Green

# ============================================
# 21. SALVA CREDENZIALI
# ============================================

Write-Host "`n💾 21. Salvataggio credenziali..." -ForegroundColor Cyan

$credentials = @"
KANBAN ISO COMPLIANCE - CREDENZIALI
====================================

Database Configuration:
-----------------------
Host: localhost
Port: 5432
Database: $DB_NAME
User: $DB_USER
Password: $DB_PASSWORD

PostgreSQL Admin:
-----------------
User: postgres
Password: PostgreSQL123!

Login Applicazione:
-------------------
Admin:   admin@europoligrafico.it / admin123
Manager: manager@europoligrafico.it / manager123
User:    user@europoligrafico.it / user123
Auditor: auditor@europoligrafico.it / auditor123

Directory Importanti:
---------------------
Applicazione: $APP_DIR
Logs: $APP_DIR\logs
Backup: $backupDir
Scripts: C:\Scripts

⚠️  IMPORTANTE: Conserva questo file in modo sicuro!
⚠️  Cambia le password di default appena possibile!
"@

$credentialsPath = "$APP_DIR\.credentials.txt"
$credentials | Out-File -FilePath $credentialsPath -Encoding UTF8

# ============================================
# 22. RESTART IIS
# ============================================

Write-Host "`n🔄 22. Restart IIS..." -ForegroundColor Cyan
iisreset /restart
Write-Host "✅ IIS riavviato" -ForegroundColor Green

# ============================================
# RIEPILOGO FINALE
# ============================================

Write-Host ""
Write-Host "╔═══════════════════════════════════════════════════════╗" -ForegroundColor Green
Write-Host "║         🎉 DEPLOYMENT COMPLETATO CON SUCCESSO!       ║" -ForegroundColor Green
Write-Host "╚═══════════════════════════════════════════════════════╝" -ForegroundColor Green
Write-Host ""
Write-Host "📋 INFORMAZIONI SISTEMA:" -ForegroundColor Yellow
Write-Host "   🌐 URL: http://$DOMAIN (https dopo SSL)" -ForegroundColor White
Write-Host "   📁 Directory: $APP_DIR" -ForegroundColor White
Write-Host "   🗄️  Database: $DB_NAME" -ForegroundColor White
Write-Host ""
Write-Host "👤 CREDENZIALI LOGIN:" -ForegroundColor Yellow
Write-Host "   Admin:   admin@europoligrafico.it / admin123" -ForegroundColor White
Write-Host "   Manager: manager@europoligrafico.it / manager123" -ForegroundColor White
Write-Host "   User:    user@europoligrafico.it / user123" -ForegroundColor White
Write-Host "   Auditor: auditor@europoligrafico.it / auditor123" -ForegroundColor White
Write-Host ""
Write-Host "⚙️  COMANDI UTILI:" -ForegroundColor Yellow
Write-Host "   Restart app:  pm2 restart kanban-backend" -ForegroundColor White
Write-Host "   View logs:    pm2 logs kanban-backend" -ForegroundColor White
Write-Host "   Stop app:     pm2 stop kanban-backend" -ForegroundColor White
Write-Host "   Backup DB:    C:\Scripts\kanban-backup.ps1" -ForegroundColor White
Write-Host "   Restart IIS:  iisreset" -ForegroundColor White
Write-Host ""
Write-Host "⚠️  AZIONI RICHIESTE:" -ForegroundColor Red
Write-Host "   1. Configura DNS: $DOMAIN → IP di questo server" -ForegroundColor White
Write-Host "   2. Modifica $APP_DIR\backend\.env con credenziali email" -ForegroundColor White
Write-Host "   3. Restart: pm2 restart kanban-backend" -ForegroundColor White
Write-Host "   4. Installa SSL: esegui 'wacs.exe' e segui wizard" -ForegroundColor White
Write-Host "   5. Cambia password utenti di default" -ForegroundColor White
Write-Host ""
Write-Host "📚 FILE IMPORTANTI:" -ForegroundColor Yellow
Write-Host "   Credenziali: $credentialsPath" -ForegroundColor White
Write-Host "   Logs Backend: $APP_DIR\logs\" -ForegroundColor White
Write-Host "   Logs IIS: C:\inetpub\logs\LogFiles\" -ForegroundColor White
Write-Host "   Backup: $backupDir" -ForegroundColor White
Write-Host ""
Write-Host "✅ Sistema pronto all'uso!" -ForegroundColor Green
Write-Host ""

# Apri browser (opzionale)
# Start-Process "http://$DOMAIN"
