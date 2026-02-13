# 💻 Avvio Rapido su PC Locale - Sviluppo

## Per far partire il sistema sul tuo computer

---

## ✅ STEP 1: Verifica Requisiti

### Controlla se hai installato:

```bash
# Node.js (deve essere versione 18 o superiore)
node --version
# Dovrebbe mostrare: v20.x.x o v18.x.x

# npm
npm --version
# Dovrebbe mostrare: 9.x.x o superiore

# PostgreSQL (deve essere 14 o superiore)
psql --version
# Dovrebbe mostrare: psql (PostgreSQL) 14.x o superiore
```

### ❌ Se NON hai installato qualcosa:

#### **Node.js**
- Windows: https://nodejs.org/en/download (scarica LTS)
- Mac: `brew install node@20`
- Linux: `sudo apt install nodejs npm`

#### **PostgreSQL**
- Windows: https://www.postgresql.org/download/windows/
- Mac: `brew install postgresql@14`
- Linux: `sudo apt install postgresql postgresql-contrib`

---

## 🚀 STEP 2: Setup Database

### **Windows (PowerShell come Amministratore):**

```powershell
# Verifica servizio PostgreSQL
Get-Service -Name postgresql*

# Se non è avviato:
Start-Service postgresql-x64-14

# Crea database
& "C:\Program Files\PostgreSQL\14\bin\psql.exe" -U postgres -c "CREATE DATABASE kanban_iso;"
& "C:\Program Files\PostgreSQL\14\bin\psql.exe" -U postgres -c "CREATE USER kanban_iso WITH PASSWORD 'kanban123';"
& "C:\Program Files\PostgreSQL\14\bin\psql.exe" -U postgres -c "GRANT ALL PRIVILEGES ON DATABASE kanban_iso TO kanban_iso;"
```

### **Mac/Linux:**

```bash
# Avvia PostgreSQL (se non è avviato)
# Mac:
brew services start postgresql@14

# Linux:
sudo systemctl start postgresql

# Crea database
sudo -u postgres psql <<EOF
CREATE DATABASE kanban_iso;
CREATE USER kanban_iso WITH PASSWORD 'kanban123';
GRANT ALL PRIVILEGES ON DATABASE kanban_iso TO kanban_iso;
ALTER DATABASE kanban_iso OWNER TO kanban_iso;
\q
EOF
```

✅ **Database creato!**

---

## 📦 STEP 3: Installa Dipendenze Backend

```bash
# Vai nella cartella backend
cd backend

# Installa dipendenze
npm install

# Questo installerà tutti i pacchetti necessari
# Tempo: 2-3 minuti
```

---

## ⚙️ STEP 4: Configura Backend

### Crea file `.env` da template:

```bash
# Copia file esempio
cp .env.example .env

# Apri file per modificarlo
# Windows:
notepad .env

# Mac/Linux:
nano .env
```

### Modifica `.env` con questi valori:

```env
# Database (usa questi valori esatti)
DATABASE_URL="postgresql://kanban_iso:kanban123@localhost:5432/kanban_iso?schema=public"

# JWT Secret (genera uno casuale)
JWT_SECRET="development-secret-key-change-in-production"

# Email (per sviluppo, usa Gmail o lascia così)
EMAIL_HOST="smtp.gmail.com"
EMAIL_PORT="587"
EMAIL_SECURE="false"
EMAIL_USER="assistenza@europoligrafico.it"
EMAIL_PASSWORD="tua-password-gmail"
EMAIL_FROM="assistenza@europoligrafico.it"

# App
NODE_ENV="development"
PORT="4000"
APP_URL="http://localhost:3000"

# Upload
MAX_FILE_SIZE="10485760"
```

**💡 Nota Email**: Per ora puoi lasciare password vuota, le email non funzioneranno ma l'app partirà comunque.

### Salva file (CTRL+S o CTRL+X per nano)

---

## 🗄️ STEP 5: Setup Database Schema

```bash
# Ancora in cartella backend

# 1. Genera Prisma Client
npx prisma generate

# 2. Esegui migrazioni (crea tabelle)
npx prisma migrate dev --name init

# 3. Inserisci dati di esempio
npx prisma db seed

# Vedrai:
# ✅ Users created
# ✅ Board and columns created
# ✅ SLA configs created
# ✅ Sample tickets created
```

✅ **Database pronto con dati di test!**

---

## 🚀 STEP 6: Avvia Backend

```bash
# Ancora in cartella backend
npm run dev

# Vedrai:
# > backend@1.0.0 dev
# > nodemon src/index.ts
# 🚀 Server running on http://localhost:4000
```

**✅ Backend avviato!**

**⚠️ LASCIA QUESTO TERMINALE APERTO**

---

## 🎨 STEP 7: Installa Dipendenze Frontend

**Apri un NUOVO terminale** (lascia l'altro aperto)

```bash
# Vai nella cartella frontend
cd frontend

# Installa dipendenze
npm install

# Tempo: 2-3 minuti
```

---

## 🌐 STEP 8: Avvia Frontend

```bash
# Ancora in cartella frontend
npm start

# Vedrai:
# Compiled successfully!
#
# You can now view frontend in the browser.
#   Local:            http://localhost:3000
```

**Il browser si aprirà automaticamente** su http://localhost:3000

✅ **Sistema avviato!**

---

## 🎉 STEP 9: Primo Login

### Credenziali di Test:

```
📧 Email: admin@europoligrafico.it
🔑 Password: admin123
```

**Altri utenti di test**:
- Manager: manager@europoligrafico.it / manager123
- User: user@europoligrafico.it / user123
- Auditor: auditor@europoligrafico.it / auditor123

---

## 🔧 Comandi Utili

### Backend (terminale 1):
```bash
cd backend

# Avvia in sviluppo (con auto-reload)
npm run dev

# Build produzione
npm run build

# Vedi database con interfaccia grafica
npx prisma studio
# Apre http://localhost:5555
```

### Frontend (terminale 2):
```bash
cd frontend

# Avvia in sviluppo
npm start

# Build produzione
npm run build

# Test
npm test
```

### Database:
```bash
# Reset completo database
cd backend
npx prisma migrate reset
# Rimuove tutto e ricrea da zero

# Seed (solo dati)
npx prisma db seed

# Apri Prisma Studio (interfaccia grafica)
npx prisma studio
```

---

## 🆘 Risoluzione Errori Comuni

### ❌ Errore: "Cannot find module"

**Soluzione**:
```bash
# Backend
cd backend
rm -rf node_modules
npm install

# Frontend
cd frontend
rm -rf node_modules
npm install
```

### ❌ Errore: "Port 4000 already in use"

**Soluzione Windows**:
```powershell
# Trova processo sulla porta 4000
netstat -ano | findstr :4000

# Termina processo (sostituisci PID)
taskkill /PID numero_pid /F
```

**Soluzione Mac/Linux**:
```bash
# Trova e termina processo
lsof -ti:4000 | xargs kill -9
```

### ❌ Errore: "Port 3000 already in use"

**Soluzione**:
Cambia porta in frontend:
```bash
# Windows
set PORT=3001 && npm start

# Mac/Linux
PORT=3001 npm start
```

### ❌ Errore: "password authentication failed for user"

**Soluzione**:
```bash
# Verifica .env ha password corretta
cat backend/.env

# Se password diversa, ricrea utente:
sudo -u postgres psql -c "ALTER USER kanban_iso WITH PASSWORD 'kanban123';"
```

### ❌ Errore: "Prisma Client not generated"

**Soluzione**:
```bash
cd backend
npx prisma generate
```

### ❌ Errore: "relation does not exist"

**Soluzione**:
```bash
cd backend
# Ricrea database da zero
npx prisma migrate reset
npx prisma db seed
```

### ❌ Errore: "Cannot connect to database"

**Soluzione Windows**:
```powershell
# Verifica PostgreSQL sia avviato
Get-Service postgresql*

# Se non è Running:
Start-Service postgresql-x64-14
```

**Soluzione Mac**:
```bash
brew services list
brew services start postgresql@14
```

**Soluzione Linux**:
```bash
sudo systemctl status postgresql
sudo systemctl start postgresql
```

---

## 🔄 Workflow Sviluppo

### Al mattino (per iniziare a lavorare):

```bash
# Terminale 1 - Backend
cd backend
npm run dev

# Terminale 2 - Frontend
cd frontend
npm start
```

### Durante lo sviluppo:
- **Modifica codice backend** → Auto-reload (nodemon)
- **Modifica codice frontend** → Auto-reload (React hot reload)
- **Modifica database** → `npx prisma migrate dev`

### A fine giornata:
- `CTRL+C` in entrambi i terminali
- (opzionale) Commit modifiche: `git add . && git commit -m "Descrizione"`

---

## 📊 Verifica Tutto Funzioni

### Checklist:

- [ ] Backend parte senza errori (http://localhost:4000)
- [ ] Frontend si apre (http://localhost:3000)
- [ ] Riesco a fare login
- [ ] Vedo la dashboard
- [ ] Posso creare un ticket
- [ ] Prisma Studio funziona (http://localhost:5555)

### Test API Backend:

```bash
# Test endpoint (in un nuovo terminale)
curl http://localhost:4000/api/health
# Dovrebbe rispondere: {"status":"ok"}
```

---

## 🎯 Prossimi Passi

### Dopo che tutto funziona:

1. **Esplora l'applicazione**:
   - Dashboard
   - Kanban Board
   - Onboarding/Offboarding
   - SLA Metrics
   - Audit Logs

2. **Modifica codice**:
   - Frontend: `frontend/src/components/`
   - Backend: `backend/src/routes/`

3. **Aggiungi funzionalità**:
   - I file si auto-reloadano
   - Vedi cambiamenti in tempo reale

4. **Consulta documentazione**:
   - `FEATURES.md` - Tutte le funzionalità
   - `backend/prisma/schema.prisma` - Schema database

---

## 📁 Struttura File Importanti

```
Kanban/
├── backend/
│   ├── .env                    ← CONFIGURAZIONE (da creare)
│   ├── package.json            ← Dipendenze backend
│   ├── prisma/
│   │   ├── schema.prisma       ← Schema database
│   │   └── seed.ts             ← Dati iniziali
│   └── src/
│       ├── index.ts            ← Entry point
│       └── routes/             ← API endpoints
├── frontend/
│   ├── package.json            ← Dipendenze frontend
│   ├── src/
│   │   ├── App.tsx             ← Componente principale
│   │   └── components/         ← Componenti React
│   └── public/
└── uploads/                     ← File caricati
```

---

## 💡 Tips

### Velocizza sviluppo:

1. **Usa 2 monitor** (o split screen):
   - Monitor 1: Editor (VSCode)
   - Monitor 2: Browser + Terminali

2. **Estensioni VSCode utili**:
   - Prisma
   - ESLint
   - Prettier
   - Thunder Client (test API)

3. **Hot Reload**:
   - Backend: nodemon auto-riavvia
   - Frontend: React hot reload
   - **Non servono restart manuali!**

4. **Prisma Studio**:
   ```bash
   npx prisma studio
   ```
   Interfaccia grafica per vedere/modificare database

---

## 🎓 Comandi da Ricordare

```bash
# Backend
cd backend && npm run dev        # Avvia backend
npx prisma studio                # Interfaccia DB
npx prisma migrate reset         # Reset DB
npx prisma db seed               # Dati test

# Frontend
cd frontend && npm start         # Avvia frontend

# Database
psql -U postgres                 # Accedi PostgreSQL
```

---

## 🚀 Tutto Pronto!

Ora hai il sistema completo che gira sul tuo PC:

✅ **Backend**: http://localhost:4000
✅ **Frontend**: http://localhost:3000
✅ **Prisma Studio**: http://localhost:5555 (quando avviato)
✅ **Database**: PostgreSQL locale

**Buon sviluppo! 💪**

---

## 📞 Serve Aiuto?

Se vedi errori:

1. **Copia l'errore completo**
2. **Controlla sezione "Risoluzione Errori" sopra**
3. **Verifica**:
   - PostgreSQL è avviato?
   - `.env` è configurato?
   - Dipendenze installate? (`npm install`)
   - Migrazioni eseguite? (`npx prisma migrate dev`)

**La maggior parte degli errori si risolve con**:
```bash
cd backend
rm -rf node_modules
npm install
npx prisma generate
npx prisma migrate reset
npm run dev
```
