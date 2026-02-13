# 🚀 Guida Rapida Installazione Kanban ISO

Scegli il metodo di installazione che preferisci:

---

## 📦 Metodo 1: Installazione Automatica (CONSIGLIATO)

### Windows

1. **Doppio click su** `install-postgresql.bat`
2. Click su "Sì" quando richiesto (privilegi amministratore)
3. Inserisci una password quando richiesto (es: `postgres123`)
4. Attendi che l'installazione completi (5-10 minuti)
5. **Vai alla sezione "Configurazione Applicazione" in basso**

---

## 🔧 Metodo 2: Installazione Manuale

### 1. Installa PostgreSQL

**Windows:**
1. Scarica da: https://www.postgresql.org/download/windows/
2. Esegui l'installer
3. Scegli una password (ricordala!)
4. Lascia porta `5432`
5. Seleziona tutti i componenti

### 2. Crea Database

**Opzione A - pgAdmin (GUI):**
1. Apri pgAdmin 4
2. Connettiti al server locale
3. Click destro su "Databases" → "Create" → "Database"
4. Nome: `kanban_iso`
5. Click "Save"

**Opzione B - Command Line:**
```powershell
psql -U postgres
CREATE DATABASE kanban_iso;
\q
```

---

## ⚙️ Configurazione Applicazione

Dopo aver installato PostgreSQL (con qualsiasi metodo):

### 1. Aggiorna Codice

```powershell
git pull origin main
```

### 2. Configura Database

Apri `backend\.env` e modifica questa riga:

```env
DATABASE_URL="postgresql://postgres:TUA_PASSWORD@localhost:5432/kanban_iso"
```

Sostituisci `TUA_PASSWORD` con la password scelta durante l'installazione!

### 3. Installa Dipendenze

```powershell
cd backend
npm install
```

### 4. Genera Prisma e Migrazioni

```powershell
npx prisma generate
npx prisma migrate deploy
```

### 5. Popola Database

```powershell
npm run seed
```

Vedrai:
```
🌱 Seeding database...
✅ Users created
✅ Board and columns created
🎉 Seed completed!
```

### 6. Avvia Backend

```powershell
npm run dev
```

Vedrai:
```
🚀 Server in ascolto su porta 5000
📊 SLA Monitor avviato
```

**⚠️ Lascia questa finestra aperta!**

### 7. Avvia Frontend

**In una NUOVA finestra PowerShell:**

```powershell
cd frontend
npm start
```

Il browser si aprirà su `http://localhost:3000`

---

## 🔐 Login

Usa queste credenziali:

- **Email:** `admin@europoligrafico.it`
- **Password:** `admin123`

---

## 🐛 Problemi Comuni

### ❌ "psql: command not found"

PostgreSQL non è nel PATH.

**Soluzione:**
1. Cerca "Variabili d'ambiente" in Windows
2. Modifica "Path" nelle variabili di sistema
3. Aggiungi: `C:\Program Files\PostgreSQL\15\bin`
4. Riavvia PowerShell

### ❌ "P1000: Authentication failed"

Password sbagliata nel file `.env`.

**Soluzione:**
Apri `backend\.env` e verifica che la password sia corretta:
```env
DATABASE_URL="postgresql://postgres:PASSWORD_CORRETTA@localhost:5432/kanban_iso"
```

### ❌ "database kanban_iso does not exist"

Il database non è stato creato.

**Soluzione:**
```powershell
psql -U postgres -c "CREATE DATABASE kanban_iso;"
```

### ❌ "Port 5000 already in use"

Un altro processo usa la porta.

**Soluzione:**
Cambia porta in `backend\.env`:
```env
PORT=5001
```

### ❌ "npm: command not found"

Node.js non è installato.

**Soluzione:**
Scarica e installa Node.js da: https://nodejs.org/

---

## 📚 Documentazione Completa

Per istruzioni dettagliate, consulta:
- **WINDOWS_SETUP.md** - Guida completa per Windows
- **README.md** - Documentazione progetto

---

## 📞 Supporto

Se incontri problemi:

1. Controlla la sezione "Problemi Comuni" sopra
2. Leggi `WINDOWS_SETUP.md` per dettagli
3. Verifica i log nella console di backend/frontend

---

## ✅ Checklist Veloce

- [ ] PostgreSQL installato
- [ ] Database `kanban_iso` creato
- [ ] File `backend\.env` configurato con password
- [ ] Dipendenze installate (`npm install`)
- [ ] Migrazioni eseguite (`npx prisma migrate deploy`)
- [ ] Seed eseguito (`npm run seed`)
- [ ] Backend avviato (porta 5000)
- [ ] Frontend avviato (porta 3000)
- [ ] Login funzionante

---

**Tempo di installazione totale: ~15-20 minuti**
