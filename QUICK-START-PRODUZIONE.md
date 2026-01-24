# 🚀 Guida Rapida - Metti Online il Sistema in 30 Minuti

## Per chi non ha competenze tecniche

### 📋 Cosa Ti Serve

1. **Un server** (scegline uno):
   - Server aziendale esistente
   - VPS cloud (consiglio: **Hetzner** - €4/mese, europeo)

2. **Un dominio** (esempio: `kanban.europoligrafico.it`)

3. **30 minuti di tempo**

---

## 🎯 Opzione SEMPLICE: Hetzner Cloud (CONSIGLIATO)

### STEP 1: Crea Account Hetzner (5 minuti)

1. Vai su: https://www.hetzner.com/cloud
2. Clicca **"Sign Up"** (in alto a destra)
3. Compila:
   - Email
   - Password
   - Dati aziendali (Europoligrafico)
4. Verifica email
5. Aggiungi metodo di pagamento

**Costo**: €4.15/mese (CPX11 - 2 vCPU, 2GB RAM)

---

### STEP 2: Crea Server (3 minuti)

1. Login su Hetzner
2. Clicca **"+ New Project"**
   - Nome: `Kanban ISO`
3. Clicca **"Add Server"**
4. Configurazione:
   - **Location**: 📍 Falkenstein, Germany (più vicino all'Italia)
   - **Image**: Ubuntu 22.04
   - **Type**: CPX11 (€4.15/mese)
   - **SSH Key**: Clicca "Add SSH key"
     - Se non sai cosa sia, salta (userai password)
   - **Name**: `kanban-production`
5. Clicca **"Create & Buy Now"**

⏱️ Attendi 1 minuto - il server si avvia

**Copia questi dati** (ti serviranno):
```
IP Server: xxx.xxx.xxx.xxx (lo vedi nella dashboard)
Password Root: xxxxxxxx (ricevuta via email)
```

---

### STEP 3: Configura DNS (5 minuti)

#### Opzione A: Hai accesso al pannello dominio?

1. Accedi al pannello del tuo provider (es. Aruba, Register.it)
2. Vai su **"Gestione DNS"** del dominio `europoligrafico.it`
3. Aggiungi un **Record A**:
   ```
   Tipo: A
   Nome/Host: kanban
   Valore/IP: [IP_SERVER_HETZNER]
   TTL: 3600
   ```
4. Salva

**Risultato**: `kanban.europoligrafico.it` → punta al server

#### Opzione B: Non hai accesso al DNS?

Chiedi al tuo tecnico IT di fare lo STEP 3A, poi continua allo STEP 4

---

### STEP 4: Connettiti al Server (2 minuti)

#### Su Windows:
1. Scarica **PuTTY**: https://www.putty.org/
2. Installa PuTTY
3. Apri PuTTY
4. In **"Host Name"**: inserisci `IP_SERVER_HETZNER`
5. Clicca **"Open"**
6. Login:
   - Username: `root`
   - Password: `[PASSWORD_RICEVUTA_EMAIL]`

#### Su Mac/Linux:
1. Apri **Terminale**
2. Digita:
   ```bash
   ssh root@IP_SERVER_HETZNER
   ```
3. Inserisci password quando richiesta

**Sei dentro!** Dovresti vedere qualcosa tipo: `root@kanban-production:~#`

---

### STEP 5: Installa il Sistema (10 minuti - automatico)

Copia e incolla questi comandi **UNO ALLA VOLTA** nel terminale:

#### 1. Scarica il codice
```bash
git clone https://github.com/TUO_USERNAME/Kanban.git /tmp/kanban
cd /tmp/kanban
```

#### 2. Modifica configurazione
```bash
nano deploy-production.sh
```

**Cosa modificare** (usa le frecce per spostarti):
```bash
DOMAIN="kanban.europoligrafico.it"  # ← Metti il tuo dominio
EMAIL_ADMIN="admin@europoligrafico.it"  # ← La tua email admin
```

**Salvare**:
- Premi `CTRL + X`
- Premi `Y` (per confermare)
- Premi `INVIO`

#### 3. Avvia installazione automatica
```bash
chmod +x deploy-production.sh
./deploy-production.sh
```

⏱️ **ATTENDI 10 minuti** - lo script installa tutto automaticamente:
- Node.js
- Database PostgreSQL
- Nginx (web server)
- Certificato SSL (HTTPS gratis)
- Backup automatici

Vedrai scorrere tante righe verdi ✅

**IMPORTANTE**: Quando chiede:
```
Premi INVIO quando il DNS è configurato correttamente...
```

Verifica che il DNS funzioni:
- Apri browser
- Vai su: http://kanban.europoligrafico.it
- Se vedi qualcosa (anche errore) → **INVIO**
- Se non si apre → aspetta 10 minuti (DNS si sta propagando)

---

### STEP 6: Configura Email (5 minuti)

Lo script ha installato tutto, ma devi configurare l'email per ricevere ticket.

#### Opzione A: Usa Gmail (Più Semplice)

1. Apri file configurazione:
   ```bash
   nano /var/www/kanban/backend/.env
   ```

2. Trova queste righe e modifica:
   ```env
   EMAIL_HOST="smtp.gmail.com"
   EMAIL_PORT="587"
   EMAIL_USER="assistenza@europoligrafico.it"
   EMAIL_PASSWORD="METTI_QUI_PASSWORD"
   ```

3. **Ottieni Password App Gmail**:
   - Vai su: https://myaccount.google.com/security
   - Clicca **"Verifica in due passaggi"** → Attiva
   - Torna indietro
   - Clicca **"Password per le app"**
   - Seleziona: App: **Posta**, Dispositivo: **Altro** (scrivi "Kanban")
   - Clicca **"Genera"**
   - Copia la password (16 caratteri)
   - Incolla in `EMAIL_PASSWORD="QUI"`

4. Salva: `CTRL+X` → `Y` → `INVIO`

#### Opzione B: Usa Email Aziendale

Chiedi al tuo tecnico IT:
- Host SMTP
- Porta
- Username
- Password

Poi inserisci in `.env`

#### Restart applicazione
```bash
pm2 restart kanban-backend
```

---

### STEP 7: Primo Accesso! 🎉

1. Apri browser
2. Vai su: **https://kanban.europoligrafico.it**
3. Login:
   ```
   Email: admin@europoligrafico.it
   Password: admin123
   ```

**⚠️ IMPORTANTE**:
1. Vai su **Impostazioni → Profilo**
2. **Cambia subito la password!**

---

## ✅ Sistema Installato!

### Cosa puoi fare ora:

1. **Dashboard**: Vedi statistiche ISO compliance
2. **Kanban Board**: Crea e gestisci ticket
3. **Onboarding**: Gestisci inserimento nuovi dipendenti
4. **Offboarding**: Gestisci uscita dipendenti
5. **SLA Metrics**: Monitora tempi risposta
6. **Audit Logs**: Vedi tutte le azioni (ISO compliance)

### Crea altri utenti:

1. Dashboard → **Utenti** (solo Admin)
2. **+ Nuovo Utente**
3. Compila dati
4. Scegli ruolo:
   - **Admin**: Gestisce tutto
   - **Manager**: Gestisce team e processi
   - **User**: Usa il sistema
   - **Auditor**: Solo lettura audit logs

---

## 🎓 Forma il Team

### Invia queste istruzioni ai tuoi colleghi:

```
Ciao!

Abbiamo attivato il nuovo sistema Kanban per la gestione ticket
conforme ISO 9001/27001.

🌐 URL: https://kanban.europoligrafico.it

👤 Le tue credenziali ti verranno inviate via email.

📧 Puoi creare ticket anche via email inviando a:
   assistenza@europoligrafico.it

📚 Guida utente: https://kanban.europoligrafico.it/help
```

---

## 📧 Ricevere Ticket via Email

### Setup Finale Email → Ticket

#### Opzione 1: SendGrid (CONSIGLIATO - Gratis)

1. Vai su: https://sendgrid.com/signup
2. Crea account (gratis fino a 100 email/giorno)
3. Verifica email
4. **Settings → API Keys → Create API Key**
   - Nome: `Kanban ISO`
   - Permessi: **Full Access**
   - Copia API Key
5. Modifica configurazione:
   ```bash
   nano /var/www/kanban/backend/.env
   ```
   Cambia:
   ```env
   EMAIL_HOST="smtp.sendgrid.net"
   EMAIL_PORT="587"
   EMAIL_USER="apikey"
   EMAIL_PASSWORD="[API_KEY_COPIATA]"
   ```
6. **Configura Inbound Parse**:
   - SendGrid → Settings → **Inbound Parse**
   - **Add Host & URL**:
     - Domain: `europoligrafico.it`
     - Subdomain: `assistenza`
     - URL: `https://kanban.europoligrafico.it/api/email/webhook`
     - Spunta: **POST the raw, full MIME message**
   - Salva

7. **Configura DNS** (nel pannello dominio):
   ```
   Tipo: MX
   Nome: assistenza
   Valore: mx.sendgrid.net
   Priorità: 10
   ```

8. Restart app:
   ```bash
   pm2 restart kanban-backend
   ```

**Fatto!** Ora inviando email a `assistenza@europoligrafico.it` si crea automaticamente un ticket!

---

## 🔒 Sicurezza - Checklist

Dopo l'installazione, verifica:

- [ ] Password admin cambiata
- [ ] HTTPS attivo (lucchetto verde nel browser)
- [ ] Firewall attivo
- [ ] Backup automatici configurati (alle 2:00 ogni notte)
- [ ] Monitoraggio attivo (opzionale - vedi sotto)

---

## 📊 Monitoraggio Uptime (OPZIONALE - 5 minuti)

Per ricevere avviso se il sistema va offline:

1. Vai su: https://uptimerobot.com
2. **Sign Up** (gratis)
3. **Add New Monitor**:
   - Monitor Type: **HTTP(s)**
   - Friendly Name: `Kanban Europoligrafico`
   - URL: `https://kanban.europoligrafico.it`
   - Monitoring Interval: **5 minutes**
4. **Alert Contacts**:
   - Aggiungi email: `admin@europoligrafico.it`
5. Salva

**Riceverai email se il sistema va offline!**

---

## 🆘 Problemi Comuni

### ❌ "Sito non raggiungibile"

**Causa**: DNS non propagato
**Soluzione**: Aspetta 1-24 ore, poi riprova

Verifica DNS:
```bash
nslookup kanban.europoligrafico.it
```

### ❌ "Certificato non valido"

**Causa**: SSL non installato correttamente
**Soluzione**:
```bash
sudo certbot --nginx -d kanban.europoligrafico.it
```

### ❌ "Email non vengono inviate"

**Causa**: Credenziali email errate
**Soluzione**:
1. Controlla file `.env`
2. Verifica password Gmail
3. Restart: `pm2 restart kanban-backend`

### ❌ "Non riesco a fare login"

**Soluzione**: Controlla se hai digitato correttamente:
- Email: `admin@europoligrafico.it`
- Password: `admin123` (poi cambiala!)

---

## 💰 Costi Totali

```
Hetzner CPX11:     €4.15/mese
Dominio:           ~€1/mese (€12/anno)
SendGrid:          €0 (gratis fino a 100 email/giorno)
Backup cloud:      €0 (opzionale - €5/mese per cloud backup)
──────────────────────────────
TOTALE:            €5.15/mese
```

**vs Software Commerciali**: €50-200/mese 💸

---

## 📞 Hai Bisogno di Aiuto?

### Documentazione Completa
- `README.md` - Introduzione
- `DEPLOYMENT.md` - Guida deployment dettagliata
- `FEATURES.md` - Tutte le funzionalità

### Comandi Utili

```bash
# Vedere stato applicazione
pm2 status

# Vedere log in tempo reale
pm2 logs kanban-backend

# Restart applicazione
pm2 restart kanban-backend

# Backup manuale database
/usr/local/bin/kanban-backup.sh

# Vedere backup esistenti
ls -lh /var/backups/kanban/
```

### Log Files
```bash
# Log applicazione
tail -f /var/www/kanban/logs/backend-out.log

# Log errori
tail -f /var/www/kanban/logs/backend-error.log

# Log Nginx
tail -f /var/log/nginx/kanban-access.log
```

---

## 🎉 Congratulazioni!

Hai installato un sistema Kanban professionale conforme ISO 9001/27001!

### Prossimi Passi:

1. ✅ Forma il team sull'uso
2. ✅ Crea gli account utenti
3. ✅ Configura i processi onboarding/offboarding
4. ✅ Imposta le categorie SLA
5. ✅ Inizia a usare il sistema!

### Manutenzione Mensile:

```bash
# Login al server
ssh root@IP_SERVER

# Aggiorna sistema
sudo apt update && sudo apt upgrade -y

# Verifica backup
ls -lh /var/backups/kanban/

# Verifica spazio disco
df -h

# Tutto ok? Fatto! 🎉
```

---

**Il tuo sistema è online e pronto! 🚀**

**URL**: https://kanban.europoligrafico.it
**Email Ticket**: assistenza@europoligrafico.it
**Backup**: Automatici ogni notte alle 2:00

**Buon lavoro! 💪**
