# 🚀 Come Avviare il Kanban sul Tuo PC

## 3 Modi Super Facili

---

## 🥇 METODO 1: Script Automatico (CONSIGLIATO)

### Windows:
```powershell
# Doppio click su:
start.bat

# Oppure in PowerShell:
.\start.bat
```

### Mac/Linux:
```bash
# In terminale:
./start.sh
```

**Cosa fa**:
- Avvia backend (porta 4000)
- Avvia frontend (porta 3000)
- Apre 2 finestre separate
- Tutto pronto in 10 secondi!

---

## 🥈 METODO 2: Script Completo (con setup automatico)

### Windows PowerShell:
```powershell
# PowerShell come Amministratore
.\start-dev.ps1
```

### Mac/Linux:
```bash
./start-dev.sh
```

**Cosa fa**:
- Controlla se hai Node.js e PostgreSQL
- Crea database se non esiste
- Installa dipendenze se mancano
- Configura tutto automaticamente
- Avvia backend e frontend

**Usa questo se è la PRIMA volta** che avvii il sistema

---

## 🥉 METODO 3: Comandi NPM (dalla root)

```bash
# Installa tutto (solo prima volta)
npm run install-all

# Setup database (solo prima volta)
npm run db:setup

# Avvia sviluppo
npm run dev
```

**Comandi utili**:
```bash
npm run dev              # Avvia tutto
npm run server           # Solo backend
npm run client           # Solo frontend
npm run db:studio        # Apri Prisma Studio (DB viewer)
npm run db:reset         # Reset database
npm run build            # Build produzione
```

---

## 📋 Prima Volta? Fai Questo

### STEP 1: Verifica Requisiti

```bash
node --version    # Deve essere v18+ o v20+
npm --version     # Deve essere v9+
psql --version    # Deve essere 14+
```

**Non hai qualcosa?** Vedi: [AVVIO-LOCALE.md](AVVIO-LOCALE.md)

### STEP 2: Installa Dipendenze

```bash
npm run install-all
```

Tempo: 3-5 minuti

### STEP 3: Setup Database

#### Windows (PowerShell come Amministratore):
```powershell
# Crea database
& "C:\Program Files\PostgreSQL\14\bin\psql.exe" -U postgres -c "CREATE DATABASE kanban_dev;"
& "C:\Program Files\PostgreSQL\14\bin\psql.exe" -U postgres -c "CREATE USER kanban_dev WITH PASSWORD 'kanban123';"
& "C:\Program Files\PostgreSQL\14\bin\psql.exe" -U postgres -c "GRANT ALL PRIVILEGES ON DATABASE kanban_dev TO kanban_dev;"
```

#### Mac/Linux:
```bash
sudo -u postgres psql <<EOF
CREATE DATABASE kanban_dev;
CREATE USER kanban_dev WITH PASSWORD 'kanban123';
GRANT ALL PRIVILEGES ON DATABASE kanban_dev TO kanban_dev;
ALTER DATABASE kanban_dev OWNER TO kanban_dev;
EOF
```

### STEP 4: Migra Database

```bash
npm run db:setup
```

### STEP 5: Avvia!

```bash
# Windows
.\start.bat

# Mac/Linux
./start.sh

# Oppure
npm run dev
```

---

## 🎯 Accesso

Una volta avviato:

**Frontend**: http://localhost:3000

**Login**:
- Email: `admin@europoligrafico.it`
- Password: `admin123`

**Altri utenti**:
- Manager: `manager@europoligrafico.it` / `manager123`
- User: `user@europoligrafico.it` / `user123`
- Auditor: `auditor@europoligrafico.it` / `auditor123`

---

## 🆘 Errori Comuni

### ❌ "Port 4000 already in use"

**Windows**:
```powershell
netstat -ano | findstr :4000
taskkill /PID numero_pid /F
```

**Mac/Linux**:
```bash
lsof -ti:4000 | xargs kill -9
```

### ❌ "Port 3000 already in use"

**Windows**:
```powershell
netstat -ano | findstr :3000
taskkill /PID numero_pid /F
```

**Mac/Linux**:
```bash
lsof -ti:3000 | xargs kill -9
```

### ❌ "Cannot connect to database"

**Windows**:
```powershell
# Verifica PostgreSQL sia avviato
Get-Service postgresql*
# Se no:
Start-Service postgresql-x64-14
```

**Mac**:
```bash
brew services start postgresql@14
```

**Linux**:
```bash
sudo systemctl start postgresql
```

### ❌ "Module not found"

```bash
# Reinstalla dipendenze
rm -rf backend/node_modules frontend/node_modules
npm run install-all
```

### ❌ "Prisma Client not generated"

```bash
cd backend
npx prisma generate
cd ..
```

---

## 🔧 Comandi Database Utili

```bash
# Apri Prisma Studio (interfaccia grafica DB)
npm run db:studio
# Vai su http://localhost:5555

# Reset database completo
npm run db:reset

# Solo dati di test
npm run db:seed

# Accedi a PostgreSQL
psql -U kanban_dev -d kanban_dev
# Password: kanban123
```

---

## 💡 Tips

### Due Terminali
- **Terminale 1**: Backend (`npm run server`)
- **Terminale 2**: Frontend (`npm run client`)

### Oppure Un Terminale
- `npm run dev` (avvia entrambi con concurrently)

### Sviluppo Rapido
- **Modifica codice** → Auto-reload automatico
- Backend: nodemon riavvia automaticamente
- Frontend: React hot reload

---

## 📚 Guide Complete

- **[AVVIO-LOCALE.md](AVVIO-LOCALE.md)** - Guida completa sviluppo locale
- **[INSTALLATION.md](INSTALLATION.md)** - Setup dettagliato
- **[README.md](README.md)** - Panoramica progetto
- **[FEATURES.md](FEATURES.md)** - Tutte le funzionalità

---

## ✅ Checklist Veloce

Prima volta:
- [ ] Node.js installato
- [ ] PostgreSQL installato
- [ ] `npm run install-all` eseguito
- [ ] Database creato
- [ ] `npm run db:setup` eseguito
- [ ] Script avviato (`./start.sh` o `start.bat`)
- [ ] Login effettuato

Ogni volta:
- [ ] PostgreSQL avviato
- [ ] Script avviato
- [ ] Backend su http://localhost:4000
- [ ] Frontend su http://localhost:3000
- [ ] Login ok

---

## 🎉 Tutto Pronto!

Scegli il metodo che preferisci e inizia a lavorare!

**Metodo consigliato**: `start.bat` (Windows) o `./start.sh` (Mac/Linux)

**Buon lavoro! 💪**
