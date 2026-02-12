# 🚀 Avvio Rapido - 3 Passi

## ⚡ IMPORTANTE - PRIMA VOLTA

Se è la **PRIMA VOLTA** che avvii il sistema, segui questi 3 passi:

### PASSO 1: Chiudi Stack Builder
Se vedi una finestra "Stack Builder" aperta:
- Clicca su **"Cancel"** o chiudi la finestra
- Non è necessaria per il nostro sistema

### PASSO 2: Setup Database (SOLO PRIMA VOLTA)

Apri **PowerShell** nella cartella del progetto e esegui:

```powershell
.\setup-database.bat
```

**Cosa fa questo script**:
- ✅ Crea il database `kanban_dev`
- ✅ Crea l'utente database `kanban_dev`
- ✅ Genera il client Prisma
- ✅ Crea tutte le tabelle
- ✅ Inserisce utenti e dati di test

**Ti chiederà la password di PostgreSQL** (quella che hai impostato durante l'installazione)

### PASSO 3: Avvia l'Applicazione

Doppio click su:
```
start.bat
```

Oppure in PowerShell:
```powershell
.\start.bat
```

---

## 🎯 Accesso Sistema

Dopo 10-15 secondi il browser si aprirà automaticamente su:

**http://localhost:3000**

### Login Utenti

**Admin** (Accesso completo):
- Email: `admin@europoligrafico.it`
- Password: `admin123`

**Manager** (Gestione team):
- Email: `manager@europoligrafico.it`
- Password: `manager123`

**User** (Utente base):
- Email: `user@europoligrafico.it`
- Password: `user123`

**Auditor** (Solo lettura):
- Email: `auditor@europoligrafico.it`
- Password: `auditor123`

---

## 🆘 Problemi Comuni

### ❌ "Port 4000 already in use"

**Soluzione**:
```powershell
# Trova il processo
netstat -ano | findstr :4000

# Termina il processo (sostituisci PID con il numero trovato)
taskkill /PID [PID] /F
```

### ❌ "Port 3000 already in use"

**Soluzione**:
```powershell
# Trova il processo
netstat -ano | findstr :3000

# Termina il processo
taskkill /PID [PID] /F
```

### ❌ "Cannot connect to database"

**Verifica PostgreSQL**:
```powershell
# Controlla se PostgreSQL è avviato
Get-Service postgresql*

# Se non è avviato, avvialo
Start-Service postgresql-x64-16
```

### ❌ "Module not found" o errori npm

**Reinstalla dipendenze**:
```powershell
# Dalla cartella root
npm run install-all
```

### ❌ "Prisma Client not generated"

**Genera il client**:
```powershell
cd backend
npx prisma generate
cd ..
```

### ❌ Pagina bianca o errori 401

**Causa**: Database non configurato o backend non avviato

**Soluzione**:
1. Chiudi tutto (Ctrl+C nelle finestre backend/frontend)
2. Esegui di nuovo `.\setup-database.bat`
3. Esegui di nuovo `.\start.bat`

---

## 💡 Comandi Utili

### Fermare l'Applicazione
- Nelle finestre CMD: premi `Ctrl+C`
- O chiudi direttamente le finestre

### Vedere il Database
```powershell
npm run db:studio
```
Apre un'interfaccia grafica su http://localhost:5555

### Reset Completo Database
```powershell
cd backend
npx prisma migrate reset
cd ..
```
⚠️ **ATTENZIONE**: Cancella tutti i dati!

### Solo Backend
```powershell
cd backend
npm run dev
```

### Solo Frontend
```powershell
cd frontend
npm start
```

---

## 📚 Guide Dettagliate

- **[COME-AVVIARE.md](COME-AVVIARE.md)** - Guida completa con 3 metodi diversi
- **[AVVIO-LOCALE.md](AVVIO-LOCALE.md)** - Setup sviluppo locale dettagliato
- **[INSTALLATION.md](INSTALLATION.md)** - Installazione completa
- **[README.md](README.md)** - Panoramica del progetto

---

## ✅ Checklist Prima Volta

- [ ] PostgreSQL installato e avviato
- [ ] Node.js installato (v18+)
- [ ] Eseguito `.\setup-database.bat` (chiede password postgres)
- [ ] Eseguito `.\start.bat`
- [ ] Aperto http://localhost:3000
- [ ] Login effettuato con admin@europoligrafico.it / admin123

---

## 🎉 Tutto OK?

Se vedi la pagina di login a http://localhost:3000, sei pronto!

**Login**: admin@europoligrafico.it / admin123

Buon lavoro! 💪
