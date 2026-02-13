# Guida Installazione Windows per Kanban ISO

Questa guida ti aiuterà a configurare il sistema Kanban ISO 9001/27001 su Windows.

## 📋 Prerequisiti

- Node.js v18 o superiore
- npm v8 o superiore
- PostgreSQL 14 o superiore

## 🗄️ Installazione PostgreSQL

### Opzione 1: Installer Ufficiale (Consigliato)

1. **Scarica PostgreSQL**
   - Vai su: https://www.postgresql.org/download/windows/
   - Scarica l'installer per Windows (EDB)
   - Versione consigliata: PostgreSQL 14 o 15

2. **Esegui l'Installer**
   - Esegui il file scaricato
   - Clicca "Next" per procedere
   - Directory di installazione: lascia quella predefinita
   - Componenti: seleziona tutti (PostgreSQL Server, pgAdmin 4, Command Line Tools)

3. **Configura Password**
   - Ti verrà chiesto di impostare una password per l'utente `postgres`
   - **IMPORTANTE**: Ricorda questa password, ti servirà dopo!
   - Esempio password: `postgres123` (cambiala in produzione!)

4. **Porta**
   - Porta predefinita: `5432` (lascia questa)

5. **Locale**
   - Lascia il locale predefinito (Italian, Italy)

6. **Completa l'installazione**
   - Clicca "Next" e poi "Finish"
   - Deseleziona "Launch Stack Builder" (non necessario)

### Opzione 2: PostgreSQL Portable

Se non hai permessi di amministratore:

1. Scarica PostgreSQL Portable da: https://sourceforge.net/projects/postgresqlportable/
2. Estrai in una cartella
3. Esegui `PostgreSQLPortable.exe`

## 🔧 Verifica Installazione PostgreSQL

Apri PowerShell e verifica:

```powershell
# Verifica versione PostgreSQL
psql --version

# Se ottieni un errore, aggiungi PostgreSQL al PATH:
# Trova la directory di installazione (di solito):
# C:\Program Files\PostgreSQL\15\bin
```

## 🎯 Configurazione Database

### 1. Crea il Database

Opzione A - Usa pgAdmin (GUI):

1. Apri pgAdmin 4 (installato con PostgreSQL)
2. Connettiti al server locale (password: quella impostata durante l'installazione)
3. Click destro su "Databases" → "Create" → "Database"
4. Nome database: `kanban_iso`
5. Owner: `postgres`
6. Clicca "Save"

Opzione B - Usa Command Line:

```powershell
# Connettiti a PostgreSQL (inserisci la password quando richiesta)
psql -U postgres

# Crea il database
CREATE DATABASE kanban_iso;

# Verifica
\l

# Esci
\q
```

### 2. Configura il File .env

1. Il file `.env` è già stato creato in `backend/.env`
2. Aprilo con un editor di testo
3. Modifica la riga `DATABASE_URL`:

```env
# PRIMA (non funziona):
DATABASE_URL="postgresql://user:password@localhost:5432/kanban_iso"

# DOPO (con le tue credenziali):
DATABASE_URL="postgresql://postgres:LA_TUA_PASSWORD@localhost:5432/kanban_iso"
```

**Esempio completo**:
```env
DATABASE_URL="postgresql://postgres:postgres123@localhost:5432/kanban_iso"
```

Sostituisci `postgres123` con la password che hai impostato durante l'installazione!

### 3. Esegui le Migrazioni Database

```powershell
# Vai nella cartella backend
cd backend

# Installa le dipendenze (se non già fatto)
npm install

# Genera Prisma Client
npx prisma generate

# Esegui le migrazioni
npx prisma migrate deploy

# Se vedi errori, prova:
npx prisma migrate dev
```

### 4. Popola il Database (Seed)

```powershell
# Crea i dati iniziali
npm run seed
```

Questo creerà:
- 👑 **Admin user**:
  - Email: `admin@example.com`
  - Password: `admin123`
- 👥 Utenti di test
- 📋 Ticket di esempio

## 🚀 Avvio Applicazione

### 1. Backend

```powershell
# In una finestra PowerShell
cd backend
npm run dev
```

Dovresti vedere:
```
🚀 Server in ascolto su porta 3001
📊 SLA Monitor avviato
Database connesso con successo
```

### 2. Frontend

```powershell
# In una NUOVA finestra PowerShell
cd frontend
npm start
```

Il browser si aprirà automaticamente su `http://localhost:3000`

## 🔐 Login Iniziale

Usa queste credenziali per il primo accesso:

- **Email**: `admin@example.com`
- **Password**: `admin123`

⚠️ **IMPORTANTE**: Cambia la password dopo il primo login!

## 🐛 Troubleshooting

### Errore: "psql: command not found"

PostgreSQL non è nel PATH. Aggiungi manualmente:

1. Trova la cartella bin di PostgreSQL (es: `C:\Program Files\PostgreSQL\15\bin`)
2. Vai su: Pannello di Controllo → Sistema → Impostazioni Avanzate → Variabili d'Ambiente
3. In "Variabili di sistema", seleziona "Path" → Modifica
4. Aggiungi il percorso alla cartella bin
5. Riavvia PowerShell

### Errore: "P1000: Authentication failed"

Le credenziali nel file `.env` sono sbagliate. Verifica:

1. Username PostgreSQL (di solito `postgres`)
2. Password (quella impostata durante l'installazione)
3. Porta (dovrebbe essere `5432`)
4. Nome database (deve essere `kanban_iso`)

### Errore: "database 'kanban_iso' does not exist"

Il database non è stato creato. Usa pgAdmin o:

```powershell
psql -U postgres -c "CREATE DATABASE kanban_iso;"
```

### Errore: "Port 3001 is already in use"

Un altro processo sta usando la porta 3001. Cambia porta nel file `.env`:

```env
PORT=3002
```

### Errore: "npm run seed: Missing script"

Il seed script verrà creato automaticamente. Se manca:

```powershell
# Genera manualmente il database schema
cd backend
npx prisma db push

# Crea utente admin manualmente via pgAdmin
```

## 📚 Comandi Utili

```powershell
# Verifica stato PostgreSQL (Windows Services)
Get-Service postgresql*

# Avvia servizio PostgreSQL
Start-Service postgresql-x64-15

# Ferma servizio PostgreSQL
Stop-Service postgresql-x64-15

# Reset completo database (⚠️ cancella tutti i dati!)
cd backend
npx prisma migrate reset

# Visualizza dati nel database
npx prisma studio
```

## 🔄 Aggiornamento Codice da Git

Quando scarichi nuove modifiche:

```powershell
# 1. Ferma backend e frontend (Ctrl+C)

# 2. Aggiorna codice
git pull origin claude/add-download-install-scripts-oU8iV

# 3. Aggiorna dipendenze
cd backend
npm install
cd ../frontend
npm install

# 4. Aggiorna database
cd ../backend
npx prisma migrate deploy

# 5. Riavvia applicazione
npm run dev  # backend
cd ../frontend
npm start    # frontend
```

## 📞 Supporto

Se riscontri problemi:

1. Verifica i log del backend nella console
2. Verifica i log del browser (F12 → Console)
3. Controlla che PostgreSQL sia in esecuzione
4. Verifica le credenziali in `.env`

## ✅ Checklist Installazione

- [ ] PostgreSQL installato e in esecuzione
- [ ] Database `kanban_iso` creato
- [ ] File `.env` configurato con credenziali corrette
- [ ] Backend dependencies installate (`npm install`)
- [ ] Frontend dependencies installate (`npm install`)
- [ ] Migrazioni database eseguite (`npx prisma migrate deploy`)
- [ ] Seed database eseguito (`npm run seed`)
- [ ] Backend avviato su porta 3001
- [ ] Frontend avviato su porta 3000
- [ ] Login con admin@example.com funzionante

Buon lavoro! 🎉
