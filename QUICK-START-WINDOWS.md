# 🪟 Guida Rapida Windows - Installa in 30 Minuti

## Per utenti non tecnici con Windows Server

---

## 📋 Cosa Ti Serve

1. **Windows Server** (uno di questi):
   - Windows Server 2019/2022 (in azienda)
   - Windows 10/11 Pro (solo per test, max 10 utenti)

2. **Accesso Amministratore** al server

3. **30 minuti** di tempo

---

## 🎯 Installazione SUPER FACILE

### STEP 1: Prepara il Server (2 minuti)

1. **Accendi il server Windows**

2. **Controlla versione Windows**:
   - Premi `Windows + R`
   - Digita: `winver`
   - Premi INVIO
   - Verifica: Windows Server 2019 o superiore

3. **Accedi come Amministratore**:
   - Click destro su PowerShell
   - "Esegui come amministratore"

✅ **Sei pronto!**

---

### STEP 2: Scarica il Codice (3 minuti)

#### Opzione A: Con Git (se già installato)

```powershell
cd C:\
git clone https://github.com/Sandro-01/Kanban.git
cd Kanban
```

#### Opzione B: Senza Git (download ZIP)

1. Vai su: https://github.com/Sandro-01/Kanban
2. Click su **"Code"** → **"Download ZIP"**
3. Estrai ZIP in: `C:\Kanban`
4. Apri PowerShell come Amministratore:
   ```powershell
   cd C:\Kanban
   ```

✅ **Codice scaricato!**

---

### STEP 3: Configura lo Script (5 minuti)

1. **Apri lo script** con Notepad:
   ```powershell
   notepad deploy-windows.ps1
   ```

2. **Trova queste righe** (circa riga 12-16):
   ```powershell
   $DOMAIN = "kanban.europoligrafico.it"
   $EMAIL_ADMIN = "admin@europoligrafico.it"
   ```

3. **Modifica** con i tuoi dati:
   ```powershell
   $DOMAIN = "kanban.tuodominio.it"  # ← Cambia qui
   $EMAIL_ADMIN = "tua@email.it"     # ← Cambia qui
   ```

4. **Salva**: `File → Salva` (CTRL+S)

5. **Chiudi** Notepad

✅ **Configurazione completata!**

---

### STEP 4: Esegui Installazione Automatica (15 minuti)

**In PowerShell** (già aperto):

```powershell
.\deploy-windows.ps1
```

**Cosa succede ora** (tutto automatico):
- ⏳ Installa Chocolatey (package manager)
- ⏳ Installa Node.js 20
- ⏳ Installa PostgreSQL (database)
- ⏳ Installa Git
- ⏳ Installa IIS (web server)
- ⏳ Crea database
- ⏳ Compila applicazione
- ⏳ Configura backup automatici
- ⏳ Configura firewall

**Vedrai molte righe verdi** ✅ scorrere.

**⚠️ Non chiudere la finestra!**

**⏱️ Aspetta 15-20 minuti**

Alla fine vedrai:
```
╔═══════════════════════════════════════════════════════╗
║         🎉 DEPLOYMENT COMPLETATO CON SUCCESSO!       ║
╚═══════════════════════════════════════════════════════╝
```

✅ **Sistema installato!**

---

### STEP 5: Configura Email (5 minuti)

L'applicazione è installata, ma devi configurare l'email per ricevere i ticket.

#### Opzione 1: Gmail (Più Semplice)

1. **Apri file configurazione**:
   ```powershell
   notepad C:\inetpub\kanban\backend\.env
   ```

2. **Trova queste righe**:
   ```env
   EMAIL_HOST="smtp.gmail.com"
   EMAIL_USER="assistenza@europoligrafico.it"
   EMAIL_PASSWORD="YOUR_EMAIL_PASSWORD"
   ```

3. **Ottieni Password App Gmail**:
   - Vai su: https://myaccount.google.com/security
   - Click: **"Verifica in due passaggi"** → Attiva
   - Torna indietro
   - Click: **"Password per le app"**
   - App: **Posta**
   - Dispositivo: **Altro** (scrivi "Kanban")
   - Click: **"Genera"**
   - **Copia** la password (16 caratteri)

4. **Incolla nel file** .env:
   ```env
   EMAIL_PASSWORD="abcd efgh ijkl mnop"  # ← Incolla qui
   ```

5. **Salva** e chiudi: `CTRL+S`

6. **Restart applicazione**:
   ```powershell
   pm2 restart kanban-backend
   ```

#### Opzione 2: Email Aziendale

Chiedi al tuo tecnico IT:
- Host SMTP
- Porta
- Username
- Password

Poi modifica `.env`:
```env
EMAIL_HOST="smtp.tuaazienda.it"
EMAIL_PORT="587"
EMAIL_USER="assistenza@tuaazienda.it"
EMAIL_PASSWORD="password"
```

Restart:
```powershell
pm2 restart kanban-backend
```

✅ **Email configurata!**

---

### STEP 6: Configura DNS (Esterno)

**Se il server è in azienda** (LAN):

1. Chiedi all'IT di aggiungere record DNS:
   ```
   Tipo: A
   Host: kanban
   IP: [IP_DEL_SERVER]  # esempio: 192.168.1.50
   ```

2. Risultato: `http://kanban.europoligrafico.it` → funziona in rete aziendale

**Se il server ha IP pubblico**:

1. Vai al pannello del tuo provider DNS (Aruba, Register.it)
2. Aggiungi record:
   ```
   Tipo: A
   Host: kanban
   Valore: [IP_PUBBLICO_SERVER]
   ```

3. Salva e aspetta 10-60 minuti (propagazione DNS)

✅ **DNS configurato!**

---

### STEP 7: Installa Certificato SSL (5 minuti)

Per avere **HTTPS** (lucchetto verde):

1. **In PowerShell**:
   ```powershell
   wacs.exe
   ```

2. **Menu interattivo**:
   - Premi `N` e INVIO
   - Premi `2` e INVIO (Single binding IIS site)
   - Scegli: `Kanban` (il tuo sito)
   - Conferma dominio: `kanban.europoligrafico.it`
   - Aspetta...

3. **Win-ACME verificherà** il dominio e installerà il certificato

**⚠️ IMPORTANTE**: Il DNS deve già funzionare (STEP 6)

4. **Rinnovo automatico**: Già configurato! (ogni 60 giorni)

✅ **HTTPS attivo!** 🔒

---

### STEP 8: Primo Accesso! 🎉

1. **Apri browser** (Chrome, Edge, Firefox)

2. **Vai su**: https://kanban.europoligrafico.it

3. **Login**:
   ```
   Email: admin@europoligrafico.it
   Password: admin123
   ```

4. **Cambia SUBITO la password**:
   - Dashboard → Profilo → Cambia Password

✅ **SEI DENTRO!** 🎉

---

## 🎓 Cosa Puoi Fare Ora

### Dashboard
- Vedi statistiche ISO compliance
- Ticket aperti/chiusi
- SLA metrics

### Kanban Board
- Crea ticket
- Trascina tra colonne
- Assegna a utenti
- Aggiungi file (IMMUTABILI)

### Onboarding
- Gestisci inserimento nuovi dipendenti
- Checklist automatica

### Offboarding
- Gestisci uscita dipendenti
- Revoca accessi (ISO 27001)

### SLA Tracking
- Monitora tempi risposta
- Alert violazioni

### Audit Logs
- Vedi tutte le azioni
- Export CSV
- Conformità ISO 9001/27001

---

## 👥 Crea Altri Utenti

1. **Login come Admin**

2. **Menu → Utenti**

3. **+ Nuovo Utente**

4. **Compila**:
   - Nome, Cognome
   - Email
   - Ruolo:
     - **Admin**: Gestisce tutto
     - **Manager**: Gestisce team
     - **User**: Usa il sistema
     - **Auditor**: Solo lettura audit

5. **Salva**

6. **L'utente riceve email** con credenziali

---

## 📧 Creare Ticket via Email

### Come Funziona

**Gli utenti inviano email a**: `assistenza@europoligrafico.it`

**Il sistema automaticamente**:
- ✅ Crea un ticket
- ✅ Determina priorità (da keywords)
- ✅ Calcola SLA
- ✅ Notifica via email

### Setup Completo (Opzionale)

#### Con SendGrid (Gratis - 100 email/giorno)

1. **Signup**: https://sendgrid.com
2. **Crea API Key**: Settings → API Keys
3. **Modifica `.env`**:
   ```env
   EMAIL_HOST="smtp.sendgrid.net"
   EMAIL_USER="apikey"
   EMAIL_PASSWORD="SG.xxxxx"  # ← API Key
   ```
4. **Configura Inbound Parse**:
   - SendGrid → Settings → Inbound Parse
   - Domain: `europoligrafico.it`
   - Subdomain: `assistenza`
   - URL: `https://kanban.europoligrafico.it/api/email/webhook`

5. **DNS** (nel pannello dominio):
   ```
   Tipo: MX
   Host: assistenza
   Valore: mx.sendgrid.net
   Priorità: 10
   ```

6. **Restart**:
   ```powershell
   pm2 restart kanban-backend
   ```

**FATTO!** Ora le email a `assistenza@europoligrafico.it` creano ticket!

---

## 🔧 Comandi Utili

### Restart Applicazione
```powershell
pm2 restart kanban-backend
```

### Vedere Logs
```powershell
pm2 logs kanban-backend
```

### Status Applicazione
```powershell
pm2 status
```

### Restart IIS
```powershell
iisreset /restart
```

### Backup Manuale
```powershell
C:\Scripts\kanban-backup.ps1
```

### Vedere Backup
```powershell
dir C:\Backups\Kanban
```

---

## 🆘 Problemi Comuni

### ❌ "Impossibile raggiungere il sito"

**Soluzione 1**: Verifica DNS
```powershell
nslookup kanban.europoligrafico.it
```
Se non risponde → aspetta propagazione DNS (1-24 ore)

**Soluzione 2**: Verifica IIS
```powershell
Get-Service W3SVC  # Deve essere "Running"
# Se no:
Start-Service W3SVC
```

**Soluzione 3**: Verifica Firewall
```powershell
# Disabilita temporaneamente per test
Set-NetFirewallProfile -Profile Domain,Public,Private -Enabled False

# Se funziona, il problema è il firewall
# Riabilita e aggiungi regola:
Set-NetFirewallProfile -Profile Domain,Public,Private -Enabled True
New-NetFirewallRule -DisplayName "Kanban HTTP" -Direction Inbound -LocalPort 80 -Protocol TCP -Action Allow
```

### ❌ "Certificato non sicuro"

**Causa**: SSL non installato

**Soluzione**:
```powershell
wacs.exe
```
Segui wizard (STEP 7)

### ❌ "Errore 500" o "Internal Server Error"

**Soluzione**: Controlla backend
```powershell
# Vedi logs
pm2 logs kanban-backend

# Restart
pm2 restart kanban-backend
```

### ❌ "Non riesco a fare login"

**Verifica**:
- Email: `admin@europoligrafico.it`
- Password: `admin123`
- Maiuscole/minuscole contano!

**Se hai dimenticato la password**:
```powershell
cd C:\inetpub\kanban\backend
# Reset password (chiedi al tecnico)
```

### ❌ "Email non vengono inviate"

**Soluzione 1**: Verifica .env
```powershell
notepad C:\inetpub\kanban\backend\.env
```
Controlla credenziali email

**Soluzione 2**: Test SMTP
```powershell
Test-NetConnection smtp.gmail.com -Port 587
```
Deve dire: `TcpTestSucceeded : True`

**Soluzione 3**: Restart
```powershell
pm2 restart kanban-backend
```

---

## 💾 Backup

### Automatici (Già Configurati)

- ✅ **Ogni notte alle 2:00**
- ✅ Database → `C:\Backups\Kanban\db_*.zip`
- ✅ File → `C:\Backups\Kanban\uploads_*.zip`
- ✅ Conservati 30 giorni

### Verifica Backup

```powershell
# Vedi backup esistenti
dir C:\Backups\Kanban

# Ultimo backup
dir C:\Backups\Kanban | Sort-Object LastWriteTime -Descending | Select-Object -First 5
```

### Backup su Cloud (Opzionale)

#### OneDrive/SharePoint

1. **Monta OneDrive** come drive di rete

2. **Modifica script backup**:
   ```powershell
   notepad C:\Scripts\kanban-backup.ps1
   ```

3. **Aggiungi alla fine**:
   ```powershell
   # Copia su OneDrive
   Copy-Item -Path "C:\Backups\Kanban\*" -Destination "O:\Backups\Kanban\" -Recurse -Force
   ```

4. Salva

#### Azure/AWS (Avanzato)

Consulta DEPLOYMENT-WINDOWS.md per istruzioni dettagliate

---

## 📊 Monitoraggio

### Verifica Sistema

```powershell
# Applicazione
pm2 status

# Database
Get-Service postgresql*

# IIS
Get-Service W3SVC

# Tutto deve essere "Running"
```

### Alert Automatici (Opzionale)

**UptimeRobot** (Gratis):
1. Vai su: https://uptimerobot.com
2. Sign up
3. Add Monitor:
   - Type: HTTPS
   - URL: https://kanban.europoligrafico.it
   - Interval: 5 minutes
4. Email alert: tua@email.it

**Riceverai email** se il sistema va offline!

---

## 🔐 Sicurezza

### Checklist

- [ ] Password admin cambiata
- [ ] HTTPS attivo (lucchetto verde)
- [ ] Firewall Windows attivo
- [ ] Backup automatici funzionano
- [ ] Windows Update attivo
- [ ] Antivirus attivo (escludi `C:\inetpub\kanban`)

### Windows Update

```powershell
# Verifica aggiornamenti
Get-WindowsUpdate

# Installa aggiornamenti
Install-WindowsUpdate -AcceptAll -AutoReboot
```

### Aggiornamenti Mensili

**1° di ogni mese**:
```powershell
# 1. Windows Updates
# Impostazioni → Windows Update

# 2. Verifica backup
dir C:\Backups\Kanban

# 3. Verifica logs
pm2 logs kanban-backend --lines 50

# 4. Verifica spazio disco
Get-PSDrive C
# Deve avere almeno 5GB liberi

# Tutto ok? ✅ Fatto!
```

---

## 💰 Costi

### Se Hai Già Windows Server

```
Server Windows: €0 (già presente)
Dominio: ~€12/anno (~€1/mese)
SendGrid: €0 (gratis 100 email/giorno)
────────────────────────────
TOTALE: ~€1/mese
```

### Se Devi Comprare Windows Server

**Opzione A**: Windows Server Licenza
- Windows Server 2022: ~€900 (una tantum)
- CAL: ~€40/utente

**Opzione B**: Cloud con Windows (più economico)
- Azure VM Windows: ~€50-100/mese (include licenza)
- AWS EC2 Windows: ~€40-80/mese (include licenza)

**Opzione C**: Windows 10/11 Pro (Solo per test - max 10 utenti)
- Licenza: già inclusa
- Costo: €0

---

## 📚 Altre Guide

- **DEPLOYMENT-WINDOWS.md**: Guida tecnica completa
- **FEATURES.md**: Tutte le funzionalità ISO
- **README.md**: Panoramica generale

---

## ✅ Checklist Finale

- [ ] Script eseguito con successo
- [ ] Email configurata
- [ ] DNS configurato
- [ ] SSL installato (HTTPS)
- [ ] Primo login effettuato
- [ ] Password admin cambiata
- [ ] Utenti creati
- [ ] Test ticket creato
- [ ] Test file caricato
- [ ] Backup verificati

---

## 🎉 Complimenti!

Hai installato un **sistema Kanban professionale conforme ISO 9001/27001** su Windows Server!

### Accesso

**URL**: https://kanban.europoligrafico.it
**Email Ticket**: assistenza@europoligrafico.it

### Credenziali

Salvate in: `C:\inetpub\kanban\.credentials.txt`

### Prossimi Passi

1. ✅ Forma il team
2. ✅ Crea utenti
3. ✅ Inizia a usare il sistema!

**Buon lavoro! 💪**

---

## 📞 Serve Aiuto?

### Logs

```powershell
# Applicazione
pm2 logs kanban-backend

# IIS
C:\inetpub\logs\LogFiles\

# Database
C:\Program Files\PostgreSQL\14\data\log\
```

### Info Sistema

```powershell
# Versione Windows
winver

# Info server
systeminfo

# Spazio disco
Get-PSDrive C
```

**Il tuo sistema è online e funzionante! 🚀**
