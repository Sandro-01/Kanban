# 🪟 Deployment Windows Server - Kanban ISO Compliance

## Guida Completa per Windows Server 2019/2022

---

## 📋 Requisiti

### Sistema Operativo
- **Windows Server 2019** o superiore (consigliato: 2022)
- **Windows 10/11 Pro** (solo per sviluppo/test)

### Hardware Minimo
- **CPU**: 2 core
- **RAM**: 4GB (8GB consigliato)
- **Disco**: 40GB liberi
- **Rete**: IP pubblico o privato (VPN)

### Software Richiesto (installato automaticamente)
- Node.js 20 LTS
- PostgreSQL 14
- Git
- IIS (Internet Information Services)
- URL Rewrite Module
- Application Request Routing (ARR)

---

## 🚀 METODO 1: Installazione Automatica (CONSIGLIATO)

### STEP 1: Download Script

1. **Scarica il repository**:
   ```powershell
   # Apri PowerShell come Amministratore
   cd C:\
   git clone https://github.com/Sandro-01/Kanban.git
   cd Kanban
   ```

2. **Oppure** scarica solo lo script:
   - Vai su: https://github.com/Sandro-01/Kanban
   - Download: `deploy-windows.ps1`
   - Salva in: `C:\deploy-windows.ps1`

### STEP 2: Modifica Configurazione

Apri `deploy-windows.ps1` con Notepad++ o VSCode e modifica:

```powershell
# Riga 12-15 circa
$DOMAIN = "kanban.europoligrafico.it"  # ← Il tuo dominio
$EMAIL_ADMIN = "admin@europoligrafico.it"  # ← La tua email
```

### STEP 3: Esegui Script

```powershell
# PowerShell come Amministratore
cd C:\Kanban
.\deploy-windows.ps1
```

**⏱️ Durata**: 20-30 minuti (tutto automatico)

Lo script installerà:
- ✅ Chocolatey (package manager)
- ✅ Node.js 20 LTS
- ✅ PostgreSQL 14
- ✅ Git
- ✅ IIS con URL Rewrite e ARR
- ✅ PM2 (process manager)
- ✅ Database e schema
- ✅ Applicazione (backend + frontend)
- ✅ Certificato SSL (Win-ACME)
- ✅ Backup automatici
- ✅ Firewall rules

### STEP 4: Configura Email

```powershell
notepad C:\inetpub\kanban\backend\.env
```

Modifica:
```env
EMAIL_HOST="smtp.gmail.com"
EMAIL_USER="assistenza@europoligrafico.it"
EMAIL_PASSWORD="TUA_PASSWORD_APP"
```

**Per Gmail**:
1. Google Account → Sicurezza
2. Verifica in due passaggi → Attiva
3. Password per le app → Genera
4. Copia password in `EMAIL_PASSWORD`

Restart:
```powershell
pm2 restart kanban-backend
```

### STEP 5: Installa Certificato SSL

```powershell
# Esegui Win-ACME
wacs.exe
```

Segui wizard:
1. `N` - Create certificate (default settings)
2. `2` - Single binding of an IIS site
3. Seleziona sito "Kanban"
4. Conferma dominio
5. Il certificato verrà installato automaticamente

### STEP 6: Primo Accesso

Apri browser: **https://kanban.europoligrafico.it**

Login:
```
Email: admin@europoligrafico.it
Password: admin123
```

⚠️ **CAMBIA SUBITO LA PASSWORD!**

---

## 🔧 METODO 2: Installazione Manuale

Se preferisci installare manualmente ogni componente:

### 1. Installa Chocolatey

```powershell
# PowerShell come Amministratore
Set-ExecutionPolicy Bypass -Scope Process -Force
[System.Net.ServicePointManager]::SecurityProtocol = [System.Net.ServicePointManager]::SecurityProtocol -bor 3072
iex ((New-Object System.Net.WebClient).DownloadString('https://community.chocolatey.org/install.ps1'))
```

### 2. Installa Software

```powershell
choco install nodejs-lts -y --version=20.11.0
choco install git -y
choco install postgresql14 -y --params '/Password:PostgreSQL123!'
```

### 3. Installa IIS

```powershell
# PowerShell come Amministratore
Install-WindowsFeature -Name Web-Server -IncludeManagementTools
Install-WindowsFeature -Name Web-Http-Redirect
Install-WindowsFeature -Name Web-Asp-Net45

# URL Rewrite e ARR
choco install urlrewrite -y
choco install iis-arr -y
```

### 4. Configura Database

```powershell
# Imposta password PostgreSQL
$env:PGPASSWORD = "PostgreSQL123!"

# Crea database
& "C:\Program Files\PostgreSQL\14\bin\psql.exe" -U postgres -c "CREATE DATABASE kanban_prod;"
& "C:\Program Files\PostgreSQL\14\bin\psql.exe" -U postgres -c "CREATE USER kanban_user WITH ENCRYPTED PASSWORD 'StrongPassword123!';"
& "C:\Program Files\PostgreSQL\14\bin\psql.exe" -U postgres -c "GRANT ALL PRIVILEGES ON DATABASE kanban_prod TO kanban_user;"
& "C:\Program Files\PostgreSQL\14\bin\psql.exe" -U postgres -c "ALTER DATABASE kanban_prod OWNER TO kanban_user;"
```

### 5. Clone Repository

```powershell
cd C:\inetpub
git clone https://github.com/Sandro-01/Kanban.git kanban
cd kanban
```

### 6. Configura Backend

```powershell
cd backend

# Crea .env
@"
DATABASE_URL="postgresql://kanban_user:StrongPassword123!@localhost:5432/kanban_prod?schema=public"
JWT_SECRET="$(New-Guid)"
EMAIL_HOST="smtp.gmail.com"
EMAIL_PORT="587"
EMAIL_USER="assistenza@europoligrafico.it"
EMAIL_PASSWORD="YOUR_PASSWORD"
EMAIL_FROM="assistenza@europoligrafico.it"
NODE_ENV="production"
PORT="4000"
APP_URL="https://kanban.europoligrafico.it"
MAX_FILE_SIZE="10485760"
"@ | Out-File .env -Encoding UTF8

# Installa e compila
npm install
npx prisma generate
npx prisma migrate deploy
npx prisma db seed
npm run build
```

### 7. Configura Frontend

```powershell
cd ..\frontend

# Crea .env.production
"REACT_APP_API_URL=https://kanban.europoligrafico.it/api" | Out-File .env.production -Encoding UTF8

# Installa e compila
npm install
npm run build
```

### 8. Installa PM2

```powershell
npm install -g pm2
npm install -g pm2-windows-startup
pm2-startup install
```

### 9. Avvia Backend con PM2

```powershell
cd C:\inetpub\kanban

# Crea ecosystem.config.js
@"
module.exports = {
  apps: [{
    name: 'kanban-backend',
    cwd: 'C:\\inetpub\\kanban\\backend',
    script: 'dist\\index.js',
    instances: 2,
    exec_mode: 'cluster',
    env: {
      NODE_ENV: 'production',
      PORT: 4000
    }
  }]
};
"@ | Out-File ecosystem.config.js -Encoding UTF8

pm2 start ecosystem.config.js
pm2 save
```

### 10. Configura IIS

```powershell
Import-Module WebAdministration

# Crea sito
New-Website -Name "Kanban" `
    -PhysicalPath "C:\inetpub\kanban\frontend\build" `
    -Port 80 `
    -HostHeader "kanban.europoligrafico.it"

# Configura Application Pool
Set-ItemProperty "IIS:\Sites\Kanban" -Name applicationPool -Value "DefaultAppPool"
```

### 11. Configura web.config

Crea `C:\inetpub\kanban\frontend\build\web.config`:

```xml
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

        <!-- Security Headers (ISO 27001) -->
        <httpProtocol>
            <customHeaders>
                <add name="X-Content-Type-Options" value="nosniff" />
                <add name="X-Frame-Options" value="SAMEORIGIN" />
                <add name="X-XSS-Protection" value="1; mode=block" />
                <add name="Strict-Transport-Security" value="max-age=31536000" />
            </customHeaders>
        </httpProtocol>

        <!-- Compressione -->
        <urlCompression doStaticCompression="true" doDynamicCompression="true" />
    </system.webServer>
</configuration>
```

### 12. Configura Firewall

```powershell
New-NetFirewallRule -DisplayName "Kanban HTTP" -Direction Inbound -LocalPort 80 -Protocol TCP -Action Allow
New-NetFirewallRule -DisplayName "Kanban HTTPS" -Direction Inbound -LocalPort 443 -Protocol TCP -Action Allow
```

### 13. Restart IIS

```powershell
iisreset /restart
```

---

## 🔒 Certificato SSL con Win-ACME

### Installazione

```powershell
choco install win-acme -y
```

### Configurazione

```powershell
# Esegui
wacs.exe
```

**Menu interattivo**:
1. Premi `N` per "Create certificate"
2. Scegli `2` - "Single binding of an IIS site"
3. Seleziona il sito "Kanban"
4. Conferma dominio: `kanban.europoligrafico.it`
5. Win-ACME verificherà il dominio e installerà il certificato

**Rinnovo automatico**: Win-ACME crea un Task Scheduler per rinnovare automaticamente ogni 60 giorni

### Verifica Certificato

```powershell
# Task Scheduler
taskschd.msc

# Cerca: "win-acme renew"
# Dovrebbe essere presente e abilitato
```

---

## 💾 Backup Automatico

### Script Creato Automaticamente

Lo script di deployment crea: `C:\Scripts\kanban-backup.ps1`

### Esegui Backup Manuale

```powershell
C:\Scripts\kanban-backup.ps1
```

### Verifica Backup Automatici

```powershell
# Apri Task Scheduler
taskschd.msc

# Cerca: "Kanban Backup"
# Trigger: Daily alle 2:00 AM
```

### Backup Remoti (Opzionale)

#### Azure Blob Storage

```powershell
# Installa AzCopy
choco install azcopy10 -y

# Aggiungi a kanban-backup.ps1 (alla fine):
azcopy copy "C:\Backups\Kanban\*" "https://yourstore.blob.core.windows.net/kanban-backups?<SAS-TOKEN>"
```

#### OneDrive/SharePoint

```powershell
# Monta OneDrive come drive
# Aggiungi a kanban-backup.ps1:
Copy-Item -Path "C:\Backups\Kanban\*" -Destination "O:\Backups\Kanban\" -Recurse
```

---

## 📊 Monitoraggio

### Comandi Utili PM2

```powershell
# Status applicazione
pm2 status

# Logs in tempo reale
pm2 logs kanban-backend

# Monitor risorse
pm2 monit

# Restart
pm2 restart kanban-backend

# Stop
pm2 stop kanban-backend

# Reload (zero-downtime)
pm2 reload kanban-backend
```

### Logs IIS

```powershell
# Logs IIS
Get-Content "C:\inetpub\logs\LogFiles\W3SVC1\*.log" -Tail 100

# Errori applicazione
Get-EventLog -LogName Application -Newest 50 | Where-Object {$_.Source -eq "IIS"}
```

### Performance Monitor

```powershell
# Apri Performance Monitor
perfmon.msc

# Aggiungi contatori:
# - Processor Time
# - Available Memory
# - Network Interface
# - IIS Global (Requests/sec)
```

### Windows Performance Monitor

```powershell
# CPU e Memoria
Get-Counter '\Processor(_Total)\% Processor Time'
Get-Counter '\Memory\Available MBytes'

# IIS
Get-Counter '\Web Service(_Total)\Current Connections'
```

---

## 🔧 Configurazione DNS

### Se il server è in LAN aziendale

Configura DNS interno:

```
Tipo: A
Host: kanban
Dominio: europoligrafico.it
IP: 192.168.X.X (IP del server Windows)
```

### Se il server ha IP pubblico

Provider DNS (Aruba, Register.it):

```
Tipo: A
Host: kanban
Valore: IP_PUBBLICO_SERVER
TTL: 3600
```

### Verifica DNS

```powershell
# Da PowerShell
nslookup kanban.europoligrafico.it

# Dovrebbe rispondere con l'IP del server
```

---

## 🌐 Accesso da Internet

### Port Forwarding (se dietro router)

Sul router aziendale, configura:

```
Servizio: HTTP
Porta esterna: 80
Porta interna: 80
IP destinazione: 192.168.X.X (server Windows)

Servizio: HTTPS
Porta esterna: 443
Porta interna: 443
IP destinazione: 192.168.X.X (server Windows)
```

### Firewall Windows

```powershell
# Verifica regole
Get-NetFirewallRule | Where-Object {$_.DisplayName -like "*Kanban*"}

# Se non esistono, crea:
New-NetFirewallRule -DisplayName "Kanban HTTP" -Direction Inbound -LocalPort 80 -Protocol TCP -Action Allow
New-NetFirewallRule -DisplayName "Kanban HTTPS" -Direction Inbound -LocalPort 443 -Protocol TCP -Action Allow
```

---

## 🆘 Troubleshooting Windows

### ❌ Errore "Cannot find module"

```powershell
cd C:\inetpub\kanban\backend
npm install
npx prisma generate
pm2 restart kanban-backend
```

### ❌ Database connection error

```powershell
# Verifica servizio PostgreSQL
Get-Service -Name postgresql*

# Se non è avviato:
Start-Service postgresql-x64-14

# Test connessione
& "C:\Program Files\PostgreSQL\14\bin\psql.exe" -U postgres -h localhost -c "\l"
```

### ❌ IIS non risponde

```powershell
# Verifica servizio
Get-Service -Name W3SVC

# Restart IIS
iisreset /restart

# Verifica Application Pool
Get-IISAppPool | Where-Object {$_.Name -eq "DefaultAppPool"}
```

### ❌ PM2 non funziona dopo riavvio

```powershell
# Reinstalla startup
pm2 unstartup
pm2-startup install

# Ricrea configurazione
pm2 start C:\inetpub\kanban\ecosystem.config.js
pm2 save
```

### ❌ Errore 500 sull'API

```powershell
# Controlla logs backend
pm2 logs kanban-backend

# Controlla .env
notepad C:\inetpub\kanban\backend\.env

# Restart
pm2 restart kanban-backend
```

### ❌ Certificato SSL non installato

```powershell
# Verifica binding HTTPS
Get-IISSiteBinding -Name "Kanban"

# Se manca HTTPS, esegui di nuovo:
wacs.exe
```

### ❌ Email non vengono inviate

```powershell
# Verifica .env
notepad C:\inetpub\kanban\backend\.env

# Test SMTP
Test-NetConnection smtp.gmail.com -Port 587

# Se usi Gmail, verifica "Password per le app"
# Se usi SMTP aziendale, verifica credenziali con IT
```

---

## 🔄 Aggiornamento Applicazione

### Da Git

```powershell
cd C:\inetpub\kanban

# Backup prima di aggiornare
C:\Scripts\kanban-backup.ps1

# Pull nuova versione
git pull origin main

# Backend
cd backend
npm install
npx prisma migrate deploy
npm run build
pm2 restart kanban-backend

# Frontend
cd ..\frontend
npm install
npm run build

# Restart IIS
iisreset /restart
```

### Manuale

1. Scarica nuova versione ZIP
2. Backup: `C:\Scripts\kanban-backup.ps1`
3. Estrai in `C:\inetpub\kanban`
4. Segui passi sopra (npm install, build, restart)

---

## 🔐 Sicurezza Windows

### Antivirus

Escludi da scansione:
- `C:\inetpub\kanban\`
- `C:\Backups\Kanban\`
- `C:\Program Files\PostgreSQL\`

### Windows Updates

```powershell
# Abilita aggiornamenti automatici
# Impostazioni → Windows Update → Opzioni avanzate
# Spunta: "Ricevi aggiornamenti per altri prodotti Microsoft"
```

### Hardening IIS

```powershell
# Rimuovi intestazioni non necessarie
Set-WebConfigurationProperty -Filter system.webServer/httpProtocol/customHeaders -PSPath 'IIS:\Sites\Kanban' -Name Collection -Value @{name='Server';value=''}

# Abilita HSTS
# (già configurato in web.config)
```

### Audit Logging Windows

```powershell
# Abilita audit per accessi file
auditpol /set /subcategory:"File System" /success:enable /failure:enable

# Audit PostgreSQL
# Modifica C:\Program Files\PostgreSQL\14\data\postgresql.conf:
# log_statement = 'all'
# logging_collector = on
```

---

## 📱 Accesso Mobile/Remoto

### VPN Aziendale

Se il server è in LAN:
1. Configura VPN aziendale
2. Dipendenti si connettono via VPN
3. Accedono a: http://kanban.europoligrafico.it

### Azure AD Application Proxy (Opzionale)

Per accesso sicuro senza VPN:
- Azure AD → Application Proxy
- Installa connector su server Windows
- Pubblica applicazione
- Accesso con autenticazione Azure AD

---

## 💰 Costi Windows Server

### Licenze

- **Windows Server 2022 Standard**: ~€900 (una tantum) o inclusa se già presente
- **CAL (Client Access License)**: ~€40/utente (se non già coperto)
- **SQL Server**: €0 (usiamo PostgreSQL gratuito)

### Alternative Economiche

#### Windows Server su Cloud

- **Azure VM**: €50-150/mese (include licenza Windows)
- **AWS EC2**: €40-120/mese (include licenza Windows)

#### Windows 10/11 Pro (Solo Test/Piccoli Team)

- Licenza: già inclusa se hai Windows Pro
- Limitazioni: max 20 connessioni simultanee
- Sufficiente per: 5-10 utenti

---

## 📊 Monitoraggio Uptime (Opzionale)

### UptimeRobot

```powershell
# Setup manuale su: https://uptimerobot.com
# Crea monitor:
# - Type: HTTPS
# - URL: https://kanban.europoligrafico.it
# - Interval: 5 minutes
# - Alert: admin@europoligrafico.it
```

### Azure Monitor (se usi Azure)

```powershell
# Dalla Azure Portal:
# Monitor → Alerts → New Alert Rule
# Resource: La tua VM
# Condition: CPU > 80% o Memory > 90%
# Action: Email
```

---

## ✅ Checklist Post-Installazione

- [ ] DNS configurato correttamente
- [ ] Certificato SSL installato (HTTPS funziona)
- [ ] Firewall configurato (porte 80, 443)
- [ ] PM2 avviato correttamente
- [ ] IIS funziona (sito accessibile)
- [ ] Database connesso
- [ ] Email SMTP configurato
- [ ] Backup automatici attivi
- [ ] Password di default cambiate
- [ ] Utenti creati
- [ ] Test creazione ticket
- [ ] Test upload file
- [ ] Test email notifications
- [ ] Monitoraggio configurato

---

## 📞 Supporto

### Logs da Controllare

```powershell
# Backend
pm2 logs kanban-backend

# IIS
C:\inetpub\logs\LogFiles\

# PostgreSQL
C:\Program Files\PostgreSQL\14\data\log\

# Windows Event Log
eventvwr.msc → Application
```

### Informazioni Sistema

```powershell
# Info Windows
systeminfo

# Info PostgreSQL
& "C:\Program Files\PostgreSQL\14\bin\psql.exe" -U postgres -c "SELECT version();"

# Info Node.js
node --version
npm --version

# Info PM2
pm2 info kanban-backend
```

---

## 🎉 Conclusione

Il sistema è ora installato su Windows Server e pronto per l'uso!

**URL**: https://kanban.europoligrafico.it
**Credenziali**: Vedi file `C:\inetpub\kanban\.credentials.txt`

**Manutenzione Mensile**:
```powershell
# Windows Updates
# PM2: pm2 update
# Verifica backup: dir C:\Backups\Kanban
# Verifica logs: pm2 logs
# Verifica SSL: wacs.exe (rinnovo automatico)
```

**Sistema pronto! 🚀**
