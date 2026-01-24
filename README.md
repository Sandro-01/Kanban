# Kanban Board - ISO 9001/27001 Compliant

Sistema di gestione Kanban con funzionalità di compliance ISO 9001/27001, onboarding/offboarding, tracking SLA e integrazione email.

## Funzionalità

### 1. ISO 9001/27001 Compliance
- Audit logging completo di tutte le operazioni
- Tracciabilità delle modifiche
- Gestione versioni dei documenti
- Report di conformità

### 2. Onboarding e Offboarding
- Processo guidato per nuovi utenti/dipendenti
- Checklist personalizzabili
- Tracking automatico dello stato
- Notifiche e promemoria
- Processo di offboarding con revoca accessi

### 3. SLA Tracking
- Definizione SLA per categoria di ticket
- Monitoraggio in tempo reale
- Alert automatici per violazioni SLA
- Report e metriche

### 4. Integrazione Email
- Creazione ticket via email: assistenza@europoligrafico.it
- Risposte automatiche
- Threading delle conversazioni

### 5. File e Immutabilità
- Allegare file ai ticket
- **Immutabilità**: file e commenti NON possono essere eliminati dopo l'invio
- Versioning automatico
- Audit trail completo

## Requisiti

- Node.js 18+
- PostgreSQL 14+
- npm o yarn

## Installazione

```bash
# Installa tutte le dipendenze
npm run install-all

# Configura il database
cd backend
cp .env.example .env
# Modifica .env con le tue credenziali
npx prisma migrate dev
npx prisma db seed

# Avvia l'applicazione
cd ..
npm run dev
```

## Struttura Progetto

```
├── backend/          # Server Node.js + Express + TypeScript
│   ├── src/
│   │   ├── controllers/
│   │   ├── models/
│   │   ├── routes/
│   │   ├── services/
│   │   └── middleware/
│   └── prisma/       # Schema database
├── frontend/         # React + TypeScript
│   └── src/
│       ├── components/
│       ├── pages/
│       └── services/
└── uploads/          # File allegati (immutabili)
```

## Configurazione Email

Configura le credenziali email in `backend/.env`:

```
EMAIL_HOST=smtp.gmail.com
EMAIL_PORT=587
EMAIL_USER=assistenza@europoligrafico.it
EMAIL_PASSWORD=your_password
```

## Sicurezza e Compliance

- Tutti i dati sensibili sono criptati
- Audit log immutabile per ISO compliance
- Backup automatici
- Gestione permessi granulare
- File e commenti NON eliminabili dopo creazione

## Licenza

MIT
