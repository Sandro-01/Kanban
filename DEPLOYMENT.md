# 🚀 Guida Deployment Produzione - Kanban ISO Compliance

## Panoramica Opzioni

### ✅ Opzione 1: Server Aziendale (CONSIGLIATO per ISO)
- **Vantaggi**: Dati in azienda, controllo totale, conformità ISO/GDPR
- **Costi**: Solo hardware
- **Complessità**: Media

### ✅ Opzione 2: VPS Cloud (Semplice e Affidabile)
- **Provider**: DigitalOcean, Hetzner, OVH, Aruba
- **Vantaggi**: Facile, scalabile, backup automatici
- **Costi**: €5-15/mese
- **Complessità**: Bassa

### ✅ Opzione 3: Cloud Enterprise (Massima Scalabilità)
- **Provider**: AWS, Azure, Google Cloud
- **Vantaggi**: Scalabilità infinita, SLA 99.99%
- **Costi**: €20-100+/mese
- **Complessità**: Alta

---

## 🏢 OPZIONE 1: Server Aziendale (CONSIGLIATO)

### Requisiti Hardware
```
Server Linux (Ubuntu 22.04 LTS)
- CPU: 2 core
- RAM: 4GB
- Disco: 20GB SSD
- Rete: IP pubblico statico
- Accesso SSH
```

### 📋 Procedura Step-by-Step

#### 1. Configura DNS
Prima di tutto, configura il DNS del tuo dominio:

```
Tipo: A Record
Host: kanban (o il nome che preferisci)
Valore: IP_DEL_TUO_SERVER
TTL: 3600
```

Esempio: `kanban.europoligrafico.it` → `203.0.113.45`

**Verifica DNS**:
```bash
nslookup kanban.europoligrafico.it
# Deve rispondere con l'IP del server
```

#### 2. Accedi al Server
```bash
ssh root@IP_DEL_TUO_SERVER
# oppure
ssh tuoutente@IP_DEL_TUO_SERVER
```

#### 3. Clona Repository
```bash
git clone <URL_REPOSITORY> /tmp/kanban
cd /tmp/kanban
```

#### 4. Modifica Script di Deployment
```bash
nano deploy-production.sh
```

**Modifica queste variabili** (righe 13-16):
```bash
DOMAIN="kanban.europoligrafico.it"  # Il tuo dominio
EMAIL_ADMIN="admin@europoligrafico.it"  # Per SSL
```

#### 5. Rendi Eseguibile ed Esegui
```bash
chmod +x deploy-production.sh
./deploy-production.sh
```

Lo script installerà automaticamente:
- ✅ Node.js 20
- ✅ PostgreSQL
- ✅ Nginx
- ✅ Certificato SSL (Let's Encrypt)
- ✅ PM2 (process manager)
- ✅ Firewall
- ✅ Backup automatici

**Tempo stimato**: 10-15 minuti

#### 6. Configura Email
Dopo l'installazione, modifica le credenziali email:

```bash
nano /var/www/kanban/backend/.env
```

Aggiorna queste righe:
```env
EMAIL_HOST="smtp.gmail.com"  # o smtp.europoligrafico.it
EMAIL_PORT="587"
EMAIL_USER="assistenza@europoligrafico.it"
EMAIL_PASSWORD="la_tua_password_email"
```

**Per Gmail**:
1. Abilita "Accesso app meno sicure" OPPURE
2. Usa "Password per le app" (consigliato)

**Per server email aziendale**:
- Chiedi al tuo IT le credenziali SMTP

#### 7. Restart Applicazione
```bash
pm2 restart kanban-backend
```

#### 8. Verifica Installazione
```bash
# Controlla status
pm2 status

# Controlla logs
pm2 logs kanban-backend

# Testa URL
curl https://kanban.europoligrafico.it
```

#### 9. Primo Accesso
Vai a: **https://kanban.europoligrafico.it**

Login con:
```
Email: admin@europoligrafico.it
Password: admin123
```

⚠️ **IMPORTANTE**: Cambia subito la password!

---

## ☁️ OPZIONE 2: VPS Cloud (DigitalOcean, Hetzner, OVH)

### A. DigitalOcean (Più Popolare)

#### 1. Crea Droplet
1. Vai su https://www.digitalocean.com
2. Crea account
3. Crea Droplet:
   - **Immagine**: Ubuntu 22.04 LTS
   - **Piano**: Basic - $6/mese (2GB RAM)
   - **Datacenter**: Frankfurt (più vicino all'Italia)
   - **Hostname**: kanban-europoligrafico

#### 2. Configura DNS in DigitalOcean
1. Vai su Networking → Domains
2. Aggiungi dominio: `europoligrafico.it`
3. Crea record A:
   ```
   Host: kanban
   IP: IP_DEL_DROPLET
   ```

4. Aggiorna nameserver del dominio con:
   ```
   ns1.digitalocean.com
   ns2.digitalocean.com
   ns3.digitalocean.com
   ```

#### 3. Segui Procedura Server Aziendale
Una volta creato il Droplet, segui gli step dell'Opzione 1 (dal punto 2 in poi)

### B. Hetzner (Più Economico - Europeo)

#### 1. Crea Server
1. Vai su https://www.hetzner.com/cloud
2. Crea Cloud Server:
   - **Tipo**: CPX11 - €4.15/mese
   - **Immagine**: Ubuntu 22.04
   - **Location**: Falkenstein, Germania
   - **Nome**: kanban-europoligrafico

#### 2. Configura DNS
Usa Hetzner DNS o il tuo provider DNS esistente

#### 3. Segui Procedura Server Aziendale

### C. Aruba Cloud (Provider Italiano)

#### 1. Crea Server
1. Vai su https://www.cloud.it
2. Cloud Servers → Crea Server
   - **Piano**: Small - €3/mese
   - **Sistema**: Ubuntu 22.04
   - **Data Center**: Italia

#### 2. Segui Procedura Server Aziendale

---

## 🌐 OPZIONE 3: Cloud Enterprise (AWS, Azure)

### AWS - Elastic Beanstalk (Modo Semplice)

#### 1. Setup
```bash
# Installa AWS CLI
brew install awscli  # Mac
# oppure
sudo apt install awscli  # Linux

# Configura AWS
aws configure
```

#### 2. Deploy
```bash
cd Kanban
zip -r kanban.zip . -x "*.git*"

# Crea applicazione Elastic Beanstalk
# Dalla console AWS
```

### Azure - App Service

Usa Azure Portal per creare:
1. App Service per frontend
2. App Service per backend
3. Azure Database for PostgreSQL

---

## 🔧 Configurazione Post-Deployment

### 1. Configurazione Email per Ticket

#### Opzione A: Gmail (Sviluppo/Piccole Aziende)
```env
EMAIL_HOST="smtp.gmail.com"
EMAIL_PORT="587"
EMAIL_USER="assistenza@europoligrafico.it"
EMAIL_PASSWORD="password-app-gmail"
```

**Setup Gmail**:
1. Account Google → Sicurezza
2. Verifica in due passaggi → Attiva
3. Password per le app → Genera
4. Copia password generata in EMAIL_PASSWORD

#### Opzione B: SendGrid (Professionale - CONSIGLIATO)
```env
EMAIL_HOST="smtp.sendgrid.net"
EMAIL_PORT="587"
EMAIL_USER="apikey"
EMAIL_PASSWORD="SG.xxxxx"  # API Key SendGrid
```

**Setup SendGrid**:
1. Registrati su https://sendgrid.com (Free fino a 100 email/giorno)
2. Settings → API Keys → Create API Key
3. Copia API Key
4. Setup → Domain Authentication → Verifica dominio

**Webhook per Email → Ticket**:
```bash
# URL webhook per SendGrid:
https://kanban.europoligrafico.it/api/email/webhook
```

Configura in SendGrid:
- Settings → Inbound Parse
- Hostname: assistenza.europoligrafico.it
- URL: https://kanban.europoligrafico.it/api/email/webhook

#### Opzione C: Server Email Aziendale
Se avete già un server email aziendale:
```env
EMAIL_HOST="smtp.europoligrafico.it"
EMAIL_PORT="587"  # o 465 per SSL
EMAIL_SECURE="false"  # true se porta 465
EMAIL_USER="assistenza@europoligrafico.it"
EMAIL_PASSWORD="password"
```

### 2. Configurazione SMTP Avanzata

#### Autenticazione SPF/DKIM
Per evitare che le email finiscano in spam:

**SPF Record** (DNS):
```
Tipo: TXT
Host: @
Valore: v=spf1 include:_spf.google.com ~all
```

**DKIM** (se usi SendGrid):
Automaticamente configurato da SendGrid

### 3. Cambio Password Utenti

```bash
# Accedi come admin
# Vai su: Dashboard → Impostazioni → Utenti
# Cambia password per ogni utente
```

Oppure via database:
```bash
cd /var/www/kanban/backend
npx ts-node -e "
const bcrypt = require('bcryptjs');
const password = bcrypt.hashSync('NUOVA_PASSWORD', 10);
console.log(password);
"
```

### 4. Configurazione Backup

Il sistema crea backup automatici giornalieri:
- Database: `/var/backups/kanban/db_*.sql.gz`
- File: `/var/backups/kanban/uploads_*.tar.gz`

**Backup manuale**:
```bash
/usr/local/bin/kanban-backup.sh
```

**Backup remoto** (consigliato):
```bash
# Installa rclone
curl https://rclone.org/install.sh | sudo bash

# Configura cloud storage (Dropbox, Google Drive, etc.)
rclone config

# Aggiungi a cron per backup automatico cloud
# Edit: /usr/local/bin/kanban-backup.sh
# Aggiungi alla fine:
rclone sync /var/backups/kanban remote:kanban-backups
```

---

## 📊 Monitoraggio e Manutenzione

### Comandi Utili

```bash
# Status applicazione
pm2 status

# Logs in tempo reale
pm2 logs kanban-backend

# Restart applicazione
pm2 restart kanban-backend

# Stop applicazione
pm2 stop kanban-backend

# Reload (zero-downtime)
pm2 reload kanban-backend

# Monitoraggio risorse
pm2 monit

# Logs Nginx
tail -f /var/log/nginx/kanban-access.log
tail -f /var/log/nginx/kanban-error.log

# Spazio disco
df -h

# Uso memoria
free -h

# Processi
top
```

### Aggiornamento Applicazione

```bash
cd /var/www/kanban
git pull origin main

# Backend
cd backend
npm install
npx prisma migrate deploy
npm run build
pm2 restart kanban-backend

# Frontend
cd ../frontend
npm install
npm run build

# Restart Nginx
sudo systemctl reload nginx
```

### Monitoraggio Uptime

Usa servizi gratuiti come:
- **UptimeRobot**: https://uptimerobot.com (gratis)
- **Pingdom**: https://www.pingdom.com
- **StatusCake**: https://www.statuscake.com

Configurazione:
```
URL da monitorare: https://kanban.europoligrafico.it
Intervallo: 5 minuti
Email alert: admin@europoligrafico.it
```

---

## 🔒 Sicurezza Produzione

### Checklist Sicurezza

- [ ] Firewall attivo (UFW)
- [ ] SSL/HTTPS attivo
- [ ] Password database complessa
- [ ] JWT_SECRET randomizzato
- [ ] Password utenti cambiate
- [ ] Backup automatici configurati
- [ ] Aggiornamenti automatici:
  ```bash
  sudo apt install unattended-upgrades
  sudo dpkg-reconfigure --priority=low unattended-upgrades
  ```

### Fail2ban (Anti Brute Force)

```bash
sudo apt install fail2ban
sudo systemctl enable fail2ban
```

Configurazione:
```bash
sudo nano /etc/fail2ban/jail.local
```

```ini
[nginx-limit-req]
enabled = true
filter = nginx-limit-req
logpath = /var/log/nginx/kanban-error.log
```

---

## 📱 Accesso da Mobile

L'applicazione è responsive e funziona su:
- ✅ Desktop (Chrome, Firefox, Safari, Edge)
- ✅ Tablet (iPad, Android)
- ✅ Smartphone (iOS, Android)

Nessuna app nativa necessaria!

---

## 🆘 Troubleshooting

### Problema: Certificato SSL non si installa

**Causa**: DNS non propagato
```bash
# Verifica DNS
nslookup kanban.europoligrafico.it

# Aspetta 1-24 ore per propagazione DNS
# Riprova certbot:
sudo certbot --nginx -d kanban.europoligrafico.it
```

### Problema: Email non vengono inviate

**Debug**:
```bash
pm2 logs kanban-backend | grep -i email
```

**Soluzioni**:
1. Verifica credenziali in `.env`
2. Controlla firewall porta 587:
   ```bash
   telnet smtp.gmail.com 587
   ```
3. Usa SendGrid invece di Gmail

### Problema: Database connection error

**Verifica**:
```bash
sudo -u postgres psql -l
# Controlla che il database esista

# Test connessione
psql -h localhost -U kanban_user -d kanban_prod
```

### Problema: Applicazione non risponde

```bash
# Controlla status
pm2 status

# Restart
pm2 restart kanban-backend

# Controlla logs
pm2 logs kanban-backend --lines 100
```

---

## 💰 Stima Costi Mensili

### Server Aziendale
- Costo server: €0 (se già presente)
- Dominio: €10-20/anno
- **Totale: ~€1.50/mese**

### VPS Cloud
- Hetzner CPX11: €4.15/mese
- DigitalOcean Basic: €6/mese
- Aruba Small: €3/mese
- Dominio: €10-20/anno
- **Totale: €3-7/mese**

### Cloud Enterprise
- AWS Lightsail: €10-20/mese
- Azure App Service: €15-30/mese
- **Totale: €10-30/mese**

### Servizi Aggiuntivi (Opzionali)
- SendGrid (email): Gratis fino a 100/giorno
- Backup cloud: €5/mese
- Monitoring: Gratis (UptimeRobot)

---

## 📞 Supporto

### Documentazione
- README.md - Introduzione
- FEATURES.md - Funzionalità dettagliate
- INSTALLATION.md - Installazione sviluppo
- DEPLOYMENT.md - Questo file

### Log Files
- Backend: `/var/www/kanban/logs/`
- Nginx: `/var/log/nginx/kanban-*.log`
- PM2: `pm2 logs`

### Best Practices
1. **Backup prima di ogni aggiornamento**
2. **Testa su ambiente di staging**
3. **Monitora i log giornalmente**
4. **Aggiorna sistema mensilmente**
5. **Audit ISO trimestrale**

---

## ✅ Checklist Go-Live

- [ ] Server configurato
- [ ] DNS punta al server
- [ ] SSL certificato attivo
- [ ] Database creato e migrato
- [ ] Email SMTP configurato
- [ ] Webhook email configurato (opzionale)
- [ ] Password utenti cambiate
- [ ] Backup automatici attivi
- [ ] Firewall configurato
- [ ] Monitoring attivo
- [ ] Team formato sull'uso del sistema
- [ ] Documentazione ISO preparata
- [ ] Test completi effettuati

---

**Sistema pronto per la produzione! 🚀**
