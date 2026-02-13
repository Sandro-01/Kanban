#!/bin/bash

###############################################################################
# Script di Installazione Progetto Kanban ISO 9001/27001
# Installa tutte le dipendenze e configura il progetto per l'uso
###############################################################################

set -e  # Exit on error

# Colori per output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Versioni minime richieste
REQUIRED_NODE_VERSION="20"

echo -e "${BLUE}╔════════════════════════════════════════════════════════════╗${NC}"
echo -e "${BLUE}║  Script Installazione Progetto Kanban ISO 9001/27001     ║${NC}"
echo -e "${BLUE}╚════════════════════════════════════════════════════════════╝${NC}"
echo ""

# Funzione per verificare se un comando esiste
command_exists() {
    command -v "$1" >/dev/null 2>&1
}

# Funzione per verificare versione Node.js
check_node_version() {
    if ! command_exists node; then
        return 1
    fi

    NODE_VERSION=$(node -v | cut -d'v' -f2 | cut -d'.' -f1)
    if [ "$NODE_VERSION" -lt "$REQUIRED_NODE_VERSION" ]; then
        return 1
    fi
    return 0
}

# Verifica prerequisiti
echo -e "${YELLOW}[1/7]${NC} Verifica prerequisiti..."

# Verifica Node.js
if ! check_node_version; then
    echo -e "${RED}✗ Node.js $REQUIRED_NODE_VERSION LTS o superiore richiesto!${NC}"
    echo ""
    echo "Installalo con uno dei seguenti metodi:"
    echo ""
    echo "  1. Ubuntu/Debian:"
    echo "     curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -"
    echo "     sudo apt-get install -y nodejs"
    echo ""
    echo "  2. CentOS/RHEL:"
    echo "     curl -fsSL https://rpm.nodesource.com/setup_20.x | sudo bash -"
    echo "     sudo yum install -y nodejs"
    echo ""
    echo "  3. macOS:"
    echo "     brew install node@20"
    echo ""
    exit 1
fi
echo -e "${GREEN}✓ Node.js installato:${NC} $(node -v)"

# Verifica npm
if ! command_exists npm; then
    echo -e "${RED}✗ npm non è installato!${NC}"
    exit 1
fi
echo -e "${GREEN}✓ npm installato:${NC} $(npm -v)"

# Verifica PostgreSQL (opzionale per sviluppo)
if command_exists psql; then
    echo -e "${GREEN}✓ PostgreSQL installato:${NC} $(psql --version | head -n1)"
else
    echo -e "${YELLOW}⚠ PostgreSQL non trovato${NC} (opzionale per sviluppo locale)"
fi

# Installazione dipendenze root
echo ""
echo -e "${YELLOW}[2/7]${NC} Installazione dipendenze root..."
npm install
echo -e "${GREEN}✓ Dipendenze root installate${NC}"

# Installazione dipendenze backend
echo ""
echo -e "${YELLOW}[3/7]${NC} Installazione dipendenze backend..."
cd backend
npm install
echo -e "${GREEN}✓ Dipendenze backend installate${NC}"

# Configurazione .env backend
echo ""
echo -e "${YELLOW}[4/7]${NC} Configurazione ambiente backend..."
if [ ! -f .env ]; then
    cp .env.example .env
    echo -e "${GREEN}✓ File .env creato da .env.example${NC}"
    echo -e "${YELLOW}⚠ IMPORTANTE: Modifica backend/.env con le tue credenziali!${NC}"
else
    echo -e "${YELLOW}⚠ File .env già esistente, non sovrascritto${NC}"
fi

# Setup Prisma
echo ""
echo -e "${YELLOW}[5/7]${NC} Setup Prisma ORM..."
npx prisma generate
echo -e "${GREEN}✓ Prisma client generato${NC}"

# Nota per database
echo -e "${YELLOW}⚠ NOTA:${NC} Per creare il database esegui:"
echo "  npx prisma migrate dev"
echo "  npx prisma db seed"

cd ..

# Installazione dipendenze frontend
echo ""
echo -e "${YELLOW}[6/7]${NC} Installazione dipendenze frontend..."
cd frontend
npm install
echo -e "${GREEN}✓ Dipendenze frontend installate${NC}"

cd ..

# Creazione directory uploads
echo ""
echo -e "${YELLOW}[7/7]${NC} Configurazione directory..."
if [ ! -d "uploads" ]; then
    mkdir -p uploads
    echo -e "${GREEN}✓ Directory uploads creata${NC}"
else
    echo -e "${GREEN}✓ Directory uploads già esistente${NC}"
fi

# Riepilogo
echo ""
echo -e "${GREEN}╔════════════════════════════════════════════════════════════╗${NC}"
echo -e "${GREEN}║  ✓ Installazione completata con successo!                 ║${NC}"
echo -e "${GREEN}╚════════════════════════════════════════════════════════════╝${NC}"
echo ""
echo -e "${BLUE}Prossimi passi:${NC}"
echo ""
echo -e "${YELLOW}1. Configura il database PostgreSQL${NC}"
echo "   - Installa PostgreSQL se non presente"
echo "   - Crea database: createdb kanban_iso"
echo "   - Modifica DATABASE_URL in backend/.env"
echo ""
echo -e "${YELLOW}2. Configura le credenziali email in backend/.env${NC}"
echo "   - EMAIL_HOST, EMAIL_USER, EMAIL_PASSWORD"
echo "   - JWT_SECRET (cambia quello di default!)"
echo ""
echo -e "${YELLOW}3. Esegui migrazione database${NC}"
echo "   cd backend"
echo "   npx prisma migrate dev"
echo "   npx prisma db seed"
echo ""
echo -e "${YELLOW}4. Avvia il progetto in modalità sviluppo${NC}"
echo "   Dalla root del progetto:"
echo -e "   ${GREEN}npm run dev${NC}"
echo ""
echo "   OPPURE avvia backend e frontend separatamente:"
echo -e "   ${GREEN}npm run server${NC}  # Backend su http://localhost:5000"
echo -e "   ${GREEN}npm run client${NC}  # Frontend su http://localhost:3000"
echo ""
echo -e "${BLUE}Per deployment in produzione:${NC}"
echo -e "   ${GREEN}sudo ./deploy-production.sh${NC}  # Linux/Ubuntu"
echo -e "   ${GREEN}.\\deploy-windows.ps1${NC}        # Windows Server"
echo ""
echo -e "${BLUE}Credenziali demo (dopo seed):${NC}"
echo "   Admin:   admin@europoligrafico.it / admin123"
echo "   Manager: manager@europoligrafico.it / manager123"
echo "   User:    user@europoligrafico.it / user123"
echo ""
echo -e "${YELLOW}⚠ Cambia le password in produzione!${NC}"
echo ""
