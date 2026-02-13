#!/bin/bash

# 🚀 Script Avvio Kanban - Sviluppo Locale (Mac/Linux)

echo "╔════════════════════════════════════════════════════╗"
echo "║   🎯 KANBAN ISO - Avvio Ambiente Sviluppo        ║"
echo "╚════════════════════════════════════════════════════╝"
echo ""

# Colori
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m' # No Color

# Verifica Node.js
if ! command -v node &> /dev/null; then
    echo -e "${RED}❌ Node.js non trovato!${NC}"
    echo "Installa Node.js da: https://nodejs.org"
    exit 1
fi

echo -e "${GREEN}✅ Node.js: $(node --version)${NC}"

# Verifica PostgreSQL
if ! command -v psql &> /dev/null; then
    echo -e "${RED}❌ PostgreSQL non trovato!${NC}"
    echo "Installa PostgreSQL 14+"
    exit 1
fi

echo -e "${GREEN}✅ PostgreSQL: $(psql --version | head -1)${NC}"
echo ""

# Verifica se .env esiste
if [ ! -f "backend/.env" ]; then
    echo -e "${YELLOW}⚠️  File .env non trovato, lo creo...${NC}"
    cat > backend/.env <<EOF
DATABASE_URL="postgresql://kanban_iso:kanban123@localhost:5432/kanban_iso?schema=public"
JWT_SECRET="development-secret-key"
EMAIL_HOST="smtp.gmail.com"
EMAIL_PORT="587"
EMAIL_SECURE="false"
EMAIL_USER="assistenza@europoligrafico.it"
EMAIL_PASSWORD=""
EMAIL_FROM="assistenza@europoligrafico.it"
NODE_ENV="development"
PORT="4000"
APP_URL="http://localhost:3000"
MAX_FILE_SIZE="10485760"
EOF
    echo -e "${GREEN}✅ File .env creato${NC}"
fi

# Installa dipendenze se necessario
echo ""
echo -e "${YELLOW}📦 Controllo dipendenze...${NC}"

if [ ! -d "backend/node_modules" ]; then
    echo "Installazione dipendenze backend..."
    cd backend && npm install && cd ..
fi

if [ ! -d "frontend/node_modules" ]; then
    echo "Installazione dipendenze frontend..."
    cd frontend && npm install && cd ..
fi

# Setup database se necessario
echo ""
echo -e "${YELLOW}🗄️  Controllo database...${NC}"

# Controlla se il database esiste
if ! psql -U postgres -lqt | cut -d \| -f 1 | grep -qw kanban_iso; then
    echo "Creazione database..."
    sudo -u postgres psql <<EOF
CREATE DATABASE kanban_iso;
CREATE USER kanban_iso WITH PASSWORD 'kanban123';
GRANT ALL PRIVILEGES ON DATABASE kanban_iso TO kanban_iso;
ALTER DATABASE kanban_iso OWNER TO kanban_iso;
EOF

    echo "Esecuzione migrazioni..."
    cd backend
    npx prisma generate
    npx prisma migrate deploy
    npx prisma db seed
    cd ..
    echo -e "${GREEN}✅ Database configurato${NC}"
else
    echo -e "${GREEN}✅ Database già esistente${NC}"
fi

# Funzione per terminare i processi
cleanup() {
    echo ""
    echo -e "${YELLOW}🛑 Arresto servizi...${NC}"
    kill $BACKEND_PID 2>/dev/null
    kill $FRONTEND_PID 2>/dev/null
    exit 0
}

trap cleanup SIGINT SIGTERM

# Avvia Backend
echo ""
echo -e "${GREEN}🚀 Avvio Backend (http://localhost:4000)...${NC}"
cd backend
npm run dev &
BACKEND_PID=$!
cd ..

# Aspetta che backend sia pronto
echo "Attendo avvio backend..."
sleep 5

# Avvia Frontend
echo ""
echo -e "${GREEN}🎨 Avvio Frontend (http://localhost:3000)...${NC}"
cd frontend
npm start &
FRONTEND_PID=$!
cd ..

echo ""
echo "╔════════════════════════════════════════════════════╗"
echo "║              ✅ SISTEMA AVVIATO!                  ║"
echo "╚════════════════════════════════════════════════════╝"
echo ""
echo -e "${GREEN}🌐 Frontend:${NC} http://localhost:3000"
echo -e "${GREEN}🔌 Backend:${NC}  http://localhost:4000"
echo ""
echo -e "${YELLOW}📧 Login:${NC}"
echo "   Email:    admin@europoligrafico.it"
echo "   Password: admin123"
echo ""
echo -e "${RED}⚠️  Premi CTRL+C per fermare tutto${NC}"
echo ""

# Mantieni lo script in esecuzione
wait
