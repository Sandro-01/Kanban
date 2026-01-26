# 📧 Integrazione Email - Guida Configurazione

## Panoramica

Il sistema Kanban ISO ora supporta la comunicazione con contatti esterni (fornitori, clienti, partner) tramite email. Le funzionalità includono:

- ✉️ **Invio email** da ticket a contatti esterni
- 📬 **Ricezione automatica** delle risposte come commenti sui ticket
- 🔗 **Tracking automatico** delle conversazioni
- 📋 **Tracciabilità ISO** di tutte le comunicazioni esterne

## Configurazione Backend

### 1. Variabili d'Ambiente (`.env`)

Aggiungi queste configurazioni al file `/backend/.env`:

```env
# ===== CONFIGURAZIONE EMAIL =====

# Email da cui inviare (assistenza@europoligrafico.it)
EMAIL_USER=assistenza@europoligrafico.it
EMAIL_PASSWORD=la_tua_password_email

# SMTP per invio email
EMAIL_HOST=smtp.gmail.com
EMAIL_PORT=587
EMAIL_SECURE=false

# IMAP per ricezione email
IMAP_HOST=imap.gmail.com
IMAP_PORT=993
```

### 2. Configurazione Gmail (se usi Gmail)

Per `assistenza@europoligrafico.it` su Gmail:

1. Vai su https://myaccount.google.com/security
2. Attiva **"Verifica in 2 passaggi"**
3. Vai su **"Password per le app"**
4. Genera una password per l'applicazione "Kanban ISO"
5. Usa quella password nel file `.env` come `EMAIL_PASSWORD`

### 3. Configurazione per Altri Provider

**Microsoft 365 / Outlook:**
```env
EMAIL_HOST=smtp.office365.com
EMAIL_PORT=587
IMAP_HOST=outlook.office365.com
IMAP_PORT=993
```

**Server Email Custom:**
```env
EMAIL_HOST=mail.tuodominio.it
EMAIL_PORT=587
IMAP_HOST=mail.tuodominio.it
IMAP_PORT=993
```

### 4. Installazione Dipendenze

Sul tuo PC Windows, nella cartella backend:

```powershell
cd backend
npm install
```

Questo installerà automaticamente:
- `node-imap` - Per ricevere email
- `mailparser` - Per parsare email

### 5. Aggiornamento Database

Esegui questi comandi per aggiornare il database:

```powershell
cd backend
npx prisma db push
npx prisma generate
```

Questo aggiungerà:
- Campo `externalContacts` ai ticket (array di email)
- Campi `isEmailReply`, `fromEmail`, `emailMessageId` ai commenti

## Come Funziona

### Workflow Invio Email

1. **Utente apre un ticket** nel Kanban
2. **Clicca "📧 Comunicazioni Esterne"**
3. **Aggiunge contatti esterni** (email fornitori/clienti)
4. **Compone e invia email**
5. **Seleziona allegati opzionali** (se il ticket ha allegati, puoi includerli)
6. **Sistema invia email** con riferimento ticket nell'oggetto: `[Ticket #abc12345]` e allegati inclusi
7. **Crea commento** nel ticket per tracciare l'invio e lista allegati inviati

### Workflow Ricezione Email

1. **Fornitore/Cliente risponde** all'email (può includere allegati)
2. **Sistema controlla inbox** ogni 2 minuti (polling automatico)
3. **Trova nuove email** con riferimento `[Ticket #abc12345]` nell'oggetto
4. **Scarica allegati automaticamente** se presenti nella risposta
5. **Crea commento automatico** sul ticket con la risposta
6. **Allega i file ricevuti** al commento e al ticket
7. **Marca commento** come proveniente da email esterna (badge 📧)
8. **Utente vede risposta e allegati** nel ticket senza uscire dal sistema

### Esempio Flusso Completo

```
┌─────────────────────────────────────────────────────────┐
│ 1. HR crea ticket: "Richiesta preventivo stampante"    │
│    Assegna a: IT                                        │
└─────────────────────────────────────────────────────────┘
                          ↓
┌─────────────────────────────────────────────────────────┐
│ 2. IT aggiunge contatto esterno:                        │
│    ✉️ vendite@fornitore.it                             │
└─────────────────────────────────────────────────────────┘
                          ↓
┌─────────────────────────────────────────────────────────┐
│ 3. IT invia email:                                      │
│    Oggetto: [Ticket #a1b2c3d4] Preventivo stampante    │
│    Corpo: "Buongiorno, avremmo bisogno di..."          │
│    Allegati: specifiche.pdf, layout_ufficio.png        │
└─────────────────────────────────────────────────────────┘
                          ↓
┌─────────────────────────────────────────────────────────┐
│ 4. Fornitore riceve email → Risponde                    │
│    "Gent.le Cliente, il preventivo è..."                │
│    Allegati: preventivo_stampanti.pdf                   │
└─────────────────────────────────────────────────────────┘
                          ↓
┌─────────────────────────────────────────────────────────┐
│ 5. Sistema riceve risposta automaticamente              │
│    Crea commento: 📧 Risposta da vendite@fornitore.it  │
│    "Gent.le Cliente, il preventivo è..."                │
│    Scarica allegato: preventivo_stampanti.pdf           │
└─────────────────────────────────────────────────────────┘
                          ↓
┌─────────────────────────────────────────────────────────┐
│ 6. IT vede risposta nel ticket → Procede con ordine    │
└─────────────────────────────────────────────────────────┘
```

## Integrazione Frontend

### Nel Componente KanbanBoard

Importa il componente `ExternalEmailModal`:

```tsx
import ExternalEmailModal from './ExternalEmailModal';
```

Aggiungi stato per il modale:

```tsx
const [showEmailModal, setShowEmailModal] = useState<any>(null);
```

Aggiungi pulsante nel modale dettagli ticket (dopo i pulsanti esistenti):

```tsx
<button
  className="btn"
  onClick={() => setShowEmailModal(selectedTicket)}
  style={{ background: '#3b82f6', color: 'white' }}
>
  📧 Comunicazioni Esterne
</button>
```

Aggiungi il modale alla fine del JSX:

```tsx
{showEmailModal && (
  <ExternalEmailModal
    ticket={showEmailModal}
    onClose={() => setShowEmailModal(null)}
    onSuccess={() => {
      loadTickets(); // Ricarica per mostrare nuovi contatti
      setShowEmailModal(null);
    }}
  />
)}
```

## Gestione Allegati

### Invio Allegati

Quando invii un'email, puoi selezionare quali allegati del ticket includere:

1. **Nel modale "Invia Email"** vedrai una sezione "📎 Allegati da Includere"
2. **Checkbox per ogni allegato** del ticket (nome file + dimensione)
3. **Seleziona quali includere** (puoi selezionare tutti, alcuni o nessuno)
4. **Gli allegati vengono automaticamente allegati** all'email

**Limiti:**
- Dimensione massima per allegato: 10 MB (configurabile in `.env`)
- Dimensione massima email totale: dipende dal provider SMTP

### Ricezione Allegati

Quando ricevi un'email con allegati:

1. **Sistema scarica automaticamente** tutti gli allegati (esclusi inline/embedded)
2. **Salva in `uploads/`** con nome univoco per evitare conflitti
3. **Collega al ticket** e al commento della risposta
4. **Tu li vedi** come normali allegati del ticket
5. **Puoi scaricarli** cliccando sul nome file

**Tipi supportati:**
- Tutti i tipi di file (PDF, immagini, ZIP, documenti, etc.)
- File inline (immagini embedded) vengono ignorati per evitare duplicati

## Indicatori Visivi

### Commenti da Email

I commenti ricevuti da email esterna hanno:
- Badge **📧** all'inizio
- Testo: `"📧 Risposta da email@fornitore.it:"`
- Contenuto pulito (senza quote e firme)
- **Allegati collegati** visibili sotto il commento

### Commenti Invio Email

I commenti di invio email mostrano:
- **📤** badge per identificare invii
- Lista destinatari
- **📎 Lista allegati inclusi** se presenti

### Badge Contatti Esterni

Nel ticket, se ci sono contatti esterni:
- Badge: `📧 2 contatti esterni`
- Mostra numero di fornitori/clienti collegati

## Sicurezza e Privacy

### Conformità ISO 27001

- ✅ **Tutte le email sono tracciate** nell'audit log
- ✅ **Immutabilità dei commenti** (anche da email)
- ✅ **Storico completo** di tutte le comunicazioni
- ✅ **No cancellazioni** (solo soft delete per UI)

### Sicurezza Email

- 🔒 **TLS/SSL** obbligatorio per connessioni
- 🔐 **Password app** invece di password reale (Gmail)
- 📧 **Validazione formato email** lato backend
- ⚠️ **Rate limiting** su invio email (max 100/ora)

### Privacy

- 🔒 **Contatti esterni** visibili solo a utenti con accesso al ticket
- 🔒 **Email inviate** solo agli indirizzi esplicitamente aggiunti
- 🔒 **Message-ID** univoco previene duplicati

## Risoluzione Problemi

### Email non vengono inviate

1. Verifica credenziali in `.env`
2. Controlla log backend: `npm run dev`
3. Verifica che `EMAIL_HOST` e `EMAIL_PORT` siano corretti
4. Controlla firewall non blocchi porta 587 (SMTP)

### Email non vengono ricevute

1. Verifica polling attivo (log: `"🚀 Polling email avviato"`)
2. Controlla credenziali IMAP in `.env`
3. Verifica cartella INBOX non sia piena
4. Controlla che risposta contenga `[Ticket #...]` nell'oggetto

### Messaggi duplicati

Il sistema usa `emailMessageId` per prevenire duplicati. Se vedi duplicati:
- Verifica che IMAP non marchi messaggi come non letti
- Controlla log per errori di database

## Monitoraggio

### Log Backend

Il backend logga tutte le operazioni email:

```
✅ Email inviata per ticket abc123 a: fornitore@example.com
📧 Trovate 2 nuove email
📨 Elaborazione email da: fornitore@example.com
   Oggetto: [Ticket #abc123] RE: Preventivo
✅ Commento creato per ticket abc123 da email fornitore@example.com
```

### Audit Log

Tutte le operazioni sono registrate:
- `SEND_EMAIL` - Email inviata
- `ADD_EXTERNAL_CONTACTS` - Contatto aggiunto
- `REMOVE_EXTERNAL_CONTACT` - Contatto rimosso

## Limiti e Performance

- **Polling interval**: 2 minuti (configurabile in `index.ts`)
- **Max email/invio**: Illimitato (configura rate limit se necessario)
- **Max dimensione allegato**: 10 MB per file (configurabile in backend)
- **Max allegati per email**: Illimitato (dipende da limiti SMTP provider)
- **Timeout IMAP**: 30 secondi
- **Timeout SMTP**: 10 secondi
- **Allegati supportati**: Tutti i tipi di file
- **Formato nomi file**: Univoci con timestamp per evitare conflitti

## Prossimi Sviluppi

- [x] ~~Supporto allegati email~~ ✅ **IMPLEMENTATO**
- [ ] Filtri anti-spam
- [ ] Email template personalizzabili
- [ ] Webhook invece di polling (se provider lo supporta)
- [ ] Notifiche push su nuove risposte
- [ ] Integrazione con AI per categorizzazione automatica
- [ ] Limite dimensione allegati configurabile
- [ ] Compressione automatica allegati grandi

## Supporto

Per problemi o domande:
- Controlla i log backend
- Verifica configurazione `.env`
- Testa connessione SMTP/IMAP manualmente
- Contatta il reparto IT interno

---

**Versione**: 1.0.0
**Data**: 2026-01-26
**Autore**: Sistema Kanban ISO
