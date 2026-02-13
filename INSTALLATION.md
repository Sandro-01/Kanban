# Guida Installazione - Kanban ISO 9001/27001

## Requisiti di Sistema

- **Node.js**: 18.x o superiore
- **PostgreSQL**: 14.x o superiore
- **npm**: 8.x o superiore
- **Git**: per il versioning

## Opzione 1: Installazione con Docker (Consigliata)

### 1. Prerequisiti
```bash
# Installa Docker e Docker Compose
# Linux:
sudo apt-get update
sudo apt-get install docker.io docker-compose

# Mac:
# Scarica Docker Desktop da https://www.docker.com/products/docker-desktop

# Windows:
# Scarica Docker Desktop da https://www.docker.com/products/docker-desktop
```

### 2. Avvia l'applicazione
```bash
# Clone repository (se non già fatto)
git clone <repository-url>
cd Kanban

# Avvia tutti i servizi
docker-compose up -d

# Attendi che i servizi siano pronti (circa 30 secondi)
# Verifica lo stato
docker-compose ps

# Esegui le migrazioni del database
docker-compose exec backend npx prisma migrate dev
docker-compose exec backend npx prisma db seed
```

### 3. Accedi all'applicazione
- **Frontend**: http://localhost:3000
- **Backend API**: http://localhost:5000
- **PostgreSQL**: localhost:5432

## Opzione 2: Installazione Manuale

### 1. Installa PostgreSQL

```bash
# Ubuntu/Debian
sudo apt-get install postgresql postgresql-contrib

# Mac (Homebrew)
brew install postgresql@14
brew services start postgresql@14

# Crea database
sudo -u postgres psql
CREATE DATABASE kanban_iso;
CREATE USER kanban_user WITH PASSWORD 'kanban_password';
GRANT ALL PRIVILEGES ON DATABASE kanban_iso TO kanban_user;
\q
```

### 2. Configura Backend

```bash
cd backend

# Installa dipendenze
npm install

# Copia e configura .env
cp .env.example .env

# Modifica .env con le tue configurazioni
# Importante: aggiorna DATABASE_URL, JWT_SECRET, EMAIL_*

# Esegui migrazioni
npx prisma generate
npx prisma migrate dev
npx prisma db seed
```

### 3. Configura Frontend

```bash
cd frontend

# Installa dipendenze
npm install

# Opzionale: crea .env.local per configurazione custom
echo "REACT_APP_API_URL=http://localhost:5000/api" > .env.local
```

### 4. Avvia Applicazione

```bash
# Terminale 1 - Backend
cd backend
npm run dev

# Terminale 2 - Frontend
cd frontend
npm start
```

### 5. Verifica Installazione

Apri browser su http://localhost:3000 e fai login con:

- **Admin**: admin@europoligrafico.it / admin123
- **Manager**: manager@europoligrafico.it / manager123
- **User**: user@europoligrafico.it / user123
- **Auditor**: auditor@europoligrafico.it / auditor123

## Configurazione Email

Per abilitare la creazione ticket via email:

### SendGrid (Consigliato)

1. Crea account su https://sendgrid.com
2. Genera API key
3. Configura webhook:
   - URL: `http://your-domain.com/api/email/webhook`
   - Eventi: Incoming Email
4. Aggiorna `.env`:
   ```
   EMAIL_HOST=smtp.sendgrid.net
   EMAIL_PORT=587
   EMAIL_USER=apikey
   EMAIL_PASSWORD=<your-api-key>
   ```

### Gmail (Sviluppo)

1. Abilita "App meno sicure" o usa "App Password"
2. Aggiorna `.env`:
   ```
   EMAIL_HOST=smtp.gmail.com
   EMAIL_PORT=587
   EMAIL_USER=assistenza@europoligrafico.it
   EMAIL_PASSWORD=<app-password>
   ```

## Configurazione Produzione

### SSL/HTTPS

```bash
# Usa Nginx come reverse proxy
sudo apt-get install nginx certbot python3-certbot-nginx

# Configura Nginx (vedi docs/nginx.conf)
sudo nano /etc/nginx/sites-available/kanban

# Ottieni certificato SSL
sudo certbot --nginx -d your-domain.com
```

### Variabili Ambiente Produzione

```bash
# backend/.env
NODE_ENV=production
DATABASE_URL=postgresql://user:pass@prod-host:5432/kanban_iso
JWT_SECRET=<strong-random-secret-key>
PORT=5000
```

### Build Frontend

```bash
cd frontend
npm run build

# Serve con Nginx o altro web server
```

## Backup e Restore

### Database Backup

```bash
# Backup
pg_dump -U kanban_user kanban_iso > backup_$(date +%Y%m%d).sql

# Restore
psql -U kanban_user kanban_iso < backup_20240101.sql
```

### File Backup

```bash
# Backup directory uploads (file immutabili)
tar -czf uploads_backup_$(date +%Y%m%d).tar.gz uploads/
```

## Troubleshooting

### Errore Connessione Database

```bash
# Verifica PostgreSQL sia attivo
sudo systemctl status postgresql

# Verifica credenziali in .env
cat backend/.env | grep DATABASE_URL
```

### Porta già in uso

```bash
# Trova processo su porta 3000/3001
lsof -i :3000
lsof -i :3001

# Termina processo
kill -9 <PID>
```

### Errori Prisma

```bash
cd backend

# Rigenera client
npx prisma generate

# Reset database (ATTENZIONE: elimina tutti i dati)
npx prisma migrate reset
```

## Sicurezza

- Cambia **SEMPRE** `JWT_SECRET` in produzione
- Usa password forti per database
- Abilita SSL/HTTPS in produzione
- Configura firewall per limitare accessi
- Fai backup regolari
- Aggiorna dipendenze regolarmente: `npm audit fix`

## Monitoraggio

```bash
# Logs Backend
cd backend
npm run dev 2>&1 | tee logs/backend.log

# Logs PostgreSQL
sudo tail -f /var/log/postgresql/postgresql-14-main.log

# Spazio disco (importante per uploads immutabili)
df -h
du -sh uploads/
```

## Supporto

Per problemi o domande:
- Email: assistenza@europoligrafico.it
- Documentazione: README.md
- Issues: GitHub Issues

## Conformità ISO

### ISO 9001
- Tutti i processi sono documentati
- Audit log traccia ogni modifica
- SLA garantisce qualità del servizio

### ISO 27001
- File e commenti immutabili
- Audit trail completo
- Processo offboarding revoca accessi
- Backup automatici

