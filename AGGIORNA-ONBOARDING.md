# 🔄 Aggiornamento Sistema - Onboarding Migliorato

## 📋 Modifiche Implementate

Il sistema di onboarding è stato migliorato per raccogliere **in anticipo** tutte le informazioni sulle dotazioni necessarie per i nuovi dipendenti.

### Cosa è stato aggiunto:

1. **Informazioni Dipendente**
   - Sede
   - Reparto
   - Ruolo/Mansione

2. **Dotazioni Hardware**
   - Computer (Portatile/Desktop/Non necessario)
   - Telefono aziendale (Fisso/Android/Non necessario)
   - Cuffie (checkbox)
   - Webcam (checkbox)
   - Schermo aggiuntivo (checkbox)

3. **Software e Accessi**
   - Microsoft 365 (checkbox)
   - Software specifici (testo libero: PackWay, HubSpot, ArtiosCAD, etc.)
   - Accessi sistemi (testo libero: VPN, cartelle, ERP, CRM, etc.)

4. **Note Aggiuntive**
   - Campo di testo libero per altre richieste

---

## 🚀 Come Aggiornare il Sistema

### Passo 1: Scarica le Modifiche

```powershell
cd C:\Users\sandro.sellaro\Documents\Kanban
git pull origin claude/add-download-install-scripts-oU8iV
```

### Passo 2: Aggiorna Database

**Opzione A - Automatic (se Prisma funziona):**
```powershell
cd backend
npx prisma migrate deploy
```

**Opzione B - Manuale (se Prisma dà errori):**

Apri PowerShell e esegui (sostituisci TUA_PASSWORD):

```powershell
& "C:\Program Files\PostgreSQL\16\bin\psql.exe" -U postgres -d kanban_iso
```

Poi copia e incolla questo codice SQL:

```sql
-- Aggiungi nuovi campi alla tabella Onboarding
ALTER TABLE "Onboarding" ADD COLUMN "additionalMonitor" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "Onboarding" ADD COLUMN "additionalNotes" TEXT;
ALTER TABLE "Onboarding" ADD COLUMN "computerType" TEXT;
ALTER TABLE "Onboarding" ADD COLUMN "department" TEXT;
ALTER TABLE "Onboarding" ADD COLUMN "needsHeadset" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "Onboarding" ADD COLUMN "needsMicrosoft365" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "Onboarding" ADD COLUMN "needsWebcam" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "Onboarding" ADD COLUMN "phoneType" TEXT;
ALTER TABLE "Onboarding" ADD COLUMN "role" TEXT;
ALTER TABLE "Onboarding" ADD COLUMN "sede" TEXT;
ALTER TABLE "Onboarding" ADD COLUMN "softwareNeeded" TEXT;
ALTER TABLE "Onboarding" ADD COLUMN "systemAccess" TEXT;

-- Crea indice per query ottimizzate
CREATE INDEX "Onboarding_department_idx" ON "Onboarding"("department");

-- Esci
\q
```

### Passo 3: Riavvia Backend

Se il backend è in esecuzione, fermalo con `Ctrl+C` e riavvialo:

```powershell
cd backend
npm run dev
```

### Passo 4: Riavvia Frontend

Se il frontend è in esecuzione, fermalo con `Ctrl+C` e riavvialo:

```powershell
cd frontend
npm start
```

---

## ✅ Verifica Funzionamento

1. Apri l'applicazione: http://localhost:3000
2. Login come admin: `admin@europoligrafico.it` / `admin123`
3. Vai su **"Onboarding"**
4. Click su **"Nuovo Onboarding"**
5. Dovresti vedere il **form migliorato** con tutte le nuove sezioni:
   - 📋 Informazioni di Base
   - 💻 Dotazioni Hardware
   - 🔐 Software e Accessi
   - 📝 Note Aggiuntive

---

## 📧 Nuovo Workflow

### Prima (problematico):
❌ HR creava onboarding con solo nome e manager
❌ IT scopriva le esigenze all'ultimo momento
❌ Dotazioni non pronte il primo giorno

### Adesso (migliorato):
✅ HR comunica a helpdesk@carton-group.com
✅ Responsabile compila il form con tutte le dotazioni
✅ IT riceve richiesta completa e prepara tutto in anticipo
✅ Dipendente ha tutto pronto il primo giorno

---

## 🎯 Esempio di Utilizzo

### Scenario: Nuovo Sviluppatore

**Informazioni di Base:**
- Dipendente: Francesca Sorrentino
- Manager: Marco Viola
- Sede: Milano
- Reparto: IT
- Ruolo: Full Stack Developer
- Data inizio: 01/02/2026

**Dotazioni Hardware:**
- Computer: Portatile
- Telefono: Non necessario
- ✓ Cuffie
- ✓ Webcam
- ✓ Schermo aggiuntivo

**Software e Accessi:**
- ✓ Microsoft 365
- Software: Visual Studio Code, Docker, Git, Node.js
- Accessi: VPN, Repository GitHub, Ambiente di test, Database sviluppo

**Note:**
- Serve anche mouse wireless e tastiera meccanica
- Configurare accesso SSH ai server

---

## 🆘 Problemi Comuni

### Errore: "column does not exist"
Il database non è stato aggiornato. Esegui la migrazione (Passo 2).

### Il form non mostra i nuovi campi
Svuota la cache del browser: `Ctrl+Shift+R` (Windows)

### Errore Prisma durante migrazione
Usa l'Opzione B (Manuale) del Passo 2 per eseguire la migrazione SQL direttamente.

---

## 📞 Supporto

Se incontri problemi:
1. Verifica di aver eseguito tutti i passi nell'ordine
2. Controlla i log del backend nella console
3. Verifica che il database sia aggiornato

---

**Tempo stimato per l'aggiornamento: 5-10 minuti**
