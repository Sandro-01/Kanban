# 🖥️ Guida Installazione Kanban ISO 9001/27001 su PC Windows

## ✅ STEP 0: Verifica Prerequisiti

Apri **PowerShell** e controlla cosa hai già installato:

```powershell
# Verifica Node.js
node -v
# Deve essere v20.x.x o superiore

# Verifica npm
npm -v

# Verifica Git
git --version

# Verifica PostgreSQL
psql --version
```

### Se manca qualcosa, installa:

#### **Node.js 20 LTS** (se manca o versione < 20)
```powershell
# Opzione 1: Scarica da https://nodejs.org/ (LTS version)
# Opzione 2: Con winget
winget install OpenJS.NodeJS.LTS
```

#### **Git** (se manca)
```powershell
# Opzione 1: Scarica da https://git-scm.com/download/win
# Opzione 2: Con winget
winget install Git.Git
```

#### **PostgreSQL** (se manca)
```powershell
# Opzione 1: Scarica da https://www.postgresql.org/download/windows/
# Durante installazione ricorda la password di "postgres"!
# Opzione 2: Con winget
winget install PostgreSQL.PostgreSQL
```

---

## 📥 STEP 1: Scarica il Progetto

```powershell
# Vai nella cartella Documenti (o dove preferisci)
cd $env:USERPROFILE\Documents

# Scarica il progetto da GitHub
git clone https://github.com/Sandro-01/Kanban.git

# Entra nella cartella
cd Kanban
```

---

## 🔧 STEP 2: Installa Dipendenze

```powershell
# Dalla cartella Kanban, esegui:
npm install

# Installa dipendenze backend
cd backend
npm install
npx prisma generate
cd ..

# Installa dipendenze frontend
cd frontend
npm install
cd ..
```

---

## 🗄️ STEP 3: Configura Database PostgreSQL

### A. Crea Database

```powershell
# Apri SQL Shell (psql) dal menu Start
# OPPURE da PowerShell:
psql -U postgres

# Dentro psql, digita:
CREATE DATABASE kanban_iso;
\q
```

### B. Configura File .env

```powershell
# Vai in backend
cd backend

# Copia file esempio
copy .env.example .env

# Apri .env con Notepad
notepad .env
```

**Modifica il file .env così:**

```env
# Database
DATABASE_URL="postgresql://postgres:TUA_PASSWORD_POSTGRES@localhost:5432/kanban_iso"

# JWT Secret
JWT_SECRET="chiave-segreta-per-sviluppo-123456789"

# Ambiente
NODE_ENV="development"
PORT=5000

# Email (opzionale per sviluppo, puoi lasciare così)
EMAIL_HOST="smtp.gmail.com"
EMAIL_PORT=587
EMAIL_SECURE=false
EMAIL_USER="test@example.com"
EMAIL_PASSWORD="password"
EMAIL_FROM="noreply@kanban.local"

# Frontend URL
FRONTEND_URL="http://localhost:3000"

# Upload
UPLOAD_DIR="../uploads"
MAX_FILE_SIZE=10485760
```

**IMPORTANTE:** Sostituisci `TUA_PASSWORD_POSTGRES` con la password che hai impostato durante l'installazione di PostgreSQL!

Salva e chiudi Notepad.

---

## 🏗️ STEP 4: Crea Tabelle e Dati Demo

```powershell
# Assicurati di essere in backend
cd backend

# Crea le tabelle del database
npx prisma migrate dev --name init

# Popola con dati demo
npx prisma db seed

# Torna alla root
cd ..
```

---

## 🚀 STEP 5: Avvia l'Applicazione

### Opzione A: Avvio Combinato (Più Semplice)

```powershell
# Dalla root del progetto (C:\Users\...\Documents\Kanban)
npm run dev
```

Questo comando avvia sia backend che frontend insieme!

### Opzione B: Avvio Separato (Due Finestre)

**Finestra PowerShell 1 - Backend:**
```powershell
cd $env:USERPROFILE\Documents\Kanban
npm run server
```

**Finestra PowerShell 2 - Frontend:**
```powershell
cd $env:USERPROFILE\Documents\Kanban
npm run client
```

---

## 🌐 STEP 6: Accedi all'Applicazione

Apri il browser e vai a:

**Frontend:** http://localhost:3000

### 🔐 Credenziali Demo

Dopo il seed, puoi accedere con:

| Ruolo | Email | Password |
|-------|-------|----------|
| **Admin** | admin@europoligrafico.it | admin123 |
| **Manager** | manager@europoligrafico.it | manager123 |
| **User** | user@europoligrafico.it | user123 |

---

## 🎯 Comandi Utili Quotidiani

```powershell
# Avviare applicazione
cd $env:USERPROFILE\Documents\Kanban
npm run dev

# Vedere database con interfaccia grafica
cd backend
npx prisma studio
# Apre http://localhost:5555

# Fermare applicazione
# Premi CTRL+C nel terminale

# Reset database completo (attenzione: cancella tutti i dati!)
cd backend
npx prisma migrate reset
# Rispopola con dati demo
npx prisma db seed
```

---

## 🗂️ Struttura Progetto

```
Kanban/
├── backend/              # Backend Node.js + Express + Prisma
│   ├── src/             # Codice sorgente
│   ├── prisma/          # Schema database e migrations
│   ├── .env            # Configurazione (NON committare!)
│   └── package.json
├── frontend/            # Frontend React + TypeScript
│   ├── src/            # Codice sorgente
│   ├── public/         # File statici
│   └── package.json
├── uploads/            # File caricati dagli utenti
└── package.json        # Script root
```

---

## 🆘 Risoluzione Problemi Comuni

### "Port 3000 already in use"
```powershell
# Trova processo
netstat -ano | findstr :3000

# Termina processo (sostituisci PID)
taskkill /PID <numero> /F
```

### "Port 5000 already in use"
```powershell
# Trova processo
netstat -ano | findstr :5000

# Termina processo
taskkill /PID <numero> /F
```

### "Cannot connect to database"
```powershell
# Verifica PostgreSQL sia avviato
Get-Service -Name postgresql*

# Se è fermo, avvialo
Start-Service postgresql-x64-16  # O versione installata

# Verifica password in backend\.env sia corretta
```

### "Prisma migrate failed"
```powershell
# Reset completo
cd backend
npx prisma migrate reset
npx prisma migrate dev
npx prisma db seed
```

### "npm install fails"
```powershell
# Pulisci cache
npm cache clean --force

# Riprova
npm install

# Se ancora errori, prova:
npm install --legacy-peer-deps
```

---

## 🔒 Note di Sicurezza per Sviluppo

- ✅ Le password demo sono solo per sviluppo/test
- ✅ Il file `.env` NON deve essere condiviso
- ✅ JWT_SECRET può essere semplice per sviluppo
- ✅ Email può essere fake per sviluppo
- ⚠️ NON esporre a internet senza configurazione produzione

---

## 📈 Prossimi Passi dopo l'Installazione

1. **Esplora il sistema:**
   - Crea nuove schede Kanban
   - Assegna task
   - Carica documenti
   - Testa workflow ISO 9001/27001

2. **Personalizza:**
   - Modifica logo e colori
   - Aggiungi utenti
   - Configura workflow aziendali

3. **Sviluppa:**
   - Modifica codice in `backend/src` e `frontend/src`
   - Hot reload automatico in modalità dev

4. **Quando sei pronto per produzione:**
   - Usa `deploy-windows.ps1` su server
   - Configura email reali
   - Cambia tutte le password
   - Abilita SSL/HTTPS

---

## 📞 Supporto

- **Documentazione completa:** Vedi file `docs/` nel progetto
- **Guide deployment:** `DEPLOYMENT-GUIDE.md`, `WINDOWS-DEPLOYMENT.md`
- **Issues GitHub:** https://github.com/Sandro-01/Kanban/issues

---

**✅ Installazione Completata!**

Buon lavoro con il tuo sistema Kanban ISO 9001/27001! 🚀
