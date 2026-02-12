#!/bin/bash

##############################################################################
# Kanban Board - Script di Download e Installazione (Linux/Mac)
#
# Questo script scarica il progetto da GitHub e installa tutte le dipendenze
# necessarie per iniziare lo sviluppo o il deployment.
#
# Uso:
#   curl -fsSL https://raw.githubusercontent.com/Sandro-01/Kanban/main/download-install.sh | bash
#
#   oppure:
#
#   wget -qO- https://raw.githubusercontent.com/Sandro-01/Kanban/main/download-install.sh | bash
#
# Requisiti:
#   - Git
#   - Node.js 20 LTS
#   - npm
#   - PostgreSQL 14+ (opzionale, può essere installato dopo)
##############################################################################

set -e  # Exit on error

# Colori per output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Banner
echo -e "${BLUE}"
echo "=============================================="
echo "  Kanban Board - Download & Install"
echo "  ISO 9001/27001 Compliant System"
echo "=============================================="
echo -e "${NC}"

# Funzione per stampare messaggi
print_info() {
    echo -e "${BLUE}ℹ️  $1${NC}"
}

print_success() {
    echo -e "${GREEN}✅ $1${NC}"
}

print_warning() {
    echo -e "${YELLOW}⚠️  $1${NC}"
}

print_error() {
    echo -e "${RED}❌ $1${NC}"
}

# Funzione per verificare se un comando esiste
command_exists() {
    command -v "$1" >/dev/null 2>&1
}

# 1. Verifica Prerequisiti
print_info "Verificando prerequisiti..."
echo ""

MISSING_DEPS=0

# Verifica Git
if command_exists git; then
    GIT_VERSION=$(git --version | awk '{print $3}')
    print_success "Git installato (versione $GIT_VERSION)"
else
    print_error "Git non trovato. Installa Git prima di continuare."
    echo "   Ubuntu/Debian: sudo apt-get install git"
    echo "   macOS: brew install git"
    MISSING_DEPS=1
fi

# Verifica Node.js
if command_exists node; then
    NODE_VERSION=$(node --version)
    print_success "Node.js installato ($NODE_VERSION)"

    # Verifica versione Node.js (deve essere >= 18)
    NODE_MAJOR=$(echo $NODE_VERSION | sed 's/v\([0-9]*\).*/\1/')
    if [ "$NODE_MAJOR" -lt 18 ]; then
        print_warning "Node.js versione $NODE_VERSION trovata. Si consiglia Node.js 20 LTS."
    fi
else
    print_error "Node.js non trovato. Installa Node.js 20 LTS."
    echo "   Visita: https://nodejs.org/"
    echo "   Ubuntu/Debian: curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash - && sudo apt-get install -y nodejs"
    echo "   macOS: brew install node@20"
    MISSING_DEPS=1
fi

# Verifica npm
if command_exists npm; then
    NPM_VERSION=$(npm --version)
    print_success "npm installato (versione $NPM_VERSION)"
else
    print_error "npm non trovato. npm è incluso con Node.js."
    MISSING_DEPS=1
fi

# Verifica PostgreSQL (opzionale)
if command_exists psql; then
    PSQL_VERSION=$(psql --version | awk '{print $3}')
    print_success "PostgreSQL installato (versione $PSQL_VERSION)"
else
    print_warning "PostgreSQL non trovato. Sarà necessario per eseguire l'applicazione."
    echo "   Puoi installarlo dopo con:"
    echo "   Ubuntu/Debian: sudo apt-get install postgresql postgresql-contrib"
    echo "   macOS: brew install postgresql"
fi

echo ""

if [ $MISSING_DEPS -eq 1 ]; then
    print_error "Alcuni prerequisiti mancano. Installali e riprova."
    exit 1
fi

# 2. Richiedi directory di installazione
echo ""
print_info "Dove vuoi installare il progetto?"
read -p "Percorso [default: ./Kanban]: " INSTALL_DIR
INSTALL_DIR=${INSTALL_DIR:-./Kanban}

# Espandi il percorso
INSTALL_DIR=$(eval echo "$INSTALL_DIR")

# Verifica se la directory esiste già
if [ -d "$INSTALL_DIR" ]; then
    print_warning "La directory $INSTALL_DIR esiste già."
    read -p "Vuoi eliminarla e ricrearla? (s/n): " CONFIRM
    if [ "$CONFIRM" = "s" ] || [ "$CONFIRM" = "S" ]; then
        rm -rf "$INSTALL_DIR"
        print_success "Directory eliminata"
    else
        print_error "Installazione annullata"
        exit 1
    fi
fi

# 3. Clone Repository
echo ""
print_info "Clonando il repository da GitHub..."
git clone https://github.com/Sandro-01/Kanban.git "$INSTALL_DIR"
print_success "Repository clonato in $INSTALL_DIR"

# Entra nella directory
cd "$INSTALL_DIR"

# 4. Installazione Dipendenze Backend
echo ""
print_info "Installando dipendenze backend..."
cd backend
npm install
print_success "Dipendenze backend installate"

# Crea file .env se non esiste
if [ ! -f ".env" ]; then
    print_info "Creando file .env per backend..."
    cat > .env << 'EOF'
# Database
DATABASE_URL="postgresql://postgres:postgres@localhost:5432/kanban_dev?schema=public"

# JWT
JWT_SECRET="your-super-secret-jwt-key-change-this-in-production"

# Email Configuration (Opzionale per sviluppo)
EMAIL_HOST="smtp.gmail.com"
EMAIL_PORT="587"
EMAIL_USER="your-email@gmail.com"
EMAIL_PASSWORD="your-app-password"
EMAIL_FROM="noreply@kanban.local"

# Server
PORT=5000
NODE_ENV="development"
EOF
    print_success "File backend/.env creato"
    print_warning "IMPORTANTE: Modifica backend/.env con le tue credenziali!"
else
    print_info "File backend/.env già esistente"
fi

cd ..

# 5. Installazione Dipendenze Frontend
echo ""
print_info "Installando dipendenze frontend..."
cd frontend
npm install
print_success "Dipendenze frontend installate"

# Crea file .env se non esiste
if [ ! -f ".env" ]; then
    print_info "Creando file .env per frontend..."
    cat > .env << 'EOF'
REACT_APP_API_URL=http://localhost:5000/api
EOF
    print_success "File frontend/.env creato"
fi

cd ..

# 6. Installazione Dipendenze Root (concurrently)
echo ""
print_info "Installando dipendenze root..."
npm install
print_success "Dipendenze root installate"

# 7. Setup Database (se PostgreSQL è installato)
echo ""
if command_exists psql; then
    print_info "Vuoi configurare il database ora? (richiede PostgreSQL in esecuzione)"
    read -p "Configurare database? (s/n): " SETUP_DB

    if [ "$SETUP_DB" = "s" ] || [ "$SETUP_DB" = "S" ]; then
        cd backend

        print_info "Generando client Prisma..."
        npx prisma generate
        print_success "Client Prisma generato"

        print_info "Eseguendo migrazioni database..."
        npx prisma migrate dev --name init
        print_success "Migrazioni completate"

        print_info "Popolando database con dati iniziali..."
        npx prisma db seed
        print_success "Database popolato"

        cd ..
    else
        print_warning "Setup database saltato. Eseguilo manualmente in seguito:"
        echo "   cd backend"
        echo "   npx prisma generate"
        echo "   npx prisma migrate dev"
        echo "   npx prisma db seed"
    fi
else
    print_warning "PostgreSQL non disponibile. Setup database saltato."
fi

# 8. Riepilogo Finale
echo ""
echo -e "${GREEN}"
echo "=============================================="
echo "  ✅ Installazione Completata!"
echo "=============================================="
echo -e "${NC}"
echo ""
print_success "Il progetto Kanban è stato scaricato e installato in: $INSTALL_DIR"
echo ""

print_info "Prossimi Passi:"
echo ""
echo "1️⃣  Configura le credenziali:"
echo "   - Modifica backend/.env (database, email, JWT)"
echo ""
echo "2️⃣  Se non hai configurato il database:"
echo "   cd $INSTALL_DIR/backend"
echo "   npx prisma generate"
echo "   npx prisma migrate dev"
echo "   npx prisma db seed"
echo ""
echo "3️⃣  Avvia l'applicazione in modalità sviluppo:"
echo "   cd $INSTALL_DIR"
echo "   npm run dev"
echo ""
echo "4️⃣  Accedi all'applicazione:"
echo "   🌐 Frontend: http://localhost:3000"
echo "   🔧 Backend:  http://localhost:5000"
echo ""
echo "5️⃣  Credenziali di test:"
echo "   Admin:   admin@europoligrafico.it / admin123"
echo "   Manager: manager@europoligrafico.it / manager123"
echo "   User:    user@europoligrafico.it / user123"
echo ""
print_warning "⚠️  Cambia le password prima del deployment in produzione!"
echo ""
print_info "Per il deployment in produzione, consulta:"
echo "   - 🪟 Windows: DEPLOYMENT-WINDOWS.md o deploy-windows.ps1"
echo "   - 🐧 Linux:   DEPLOYMENT.md o deploy-production.sh"
echo ""
print_info "Per maggiori informazioni:"
echo "   📖 README.md - Panoramica completa"
echo "   📚 INSTALLATION.md - Setup sviluppo dettagliato"
echo "   ✨ FEATURES.md - Funzionalità e conformità ISO"
echo ""
echo -e "${BLUE}Made with ❤️  for Europoligrafico${NC}"
echo ""
