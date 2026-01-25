#!/bin/bash
#===============================================================================
#  KANBAN - QUICK SETUP SCRIPT (Linux/Mac)
#===============================================================================
#  One-liner setup for development environment
#  Usage: curl -fsSL https://your-repo/quick-setup.sh | bash
#         or: ./quick-setup.sh
#===============================================================================

set -e

echo ""
echo "=================================="
echo "  KANBAN Quick Setup"
echo "=================================="
echo ""

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
CYAN='\033[0;36m'
NC='\033[0m'

# Check Node.js
if ! command -v node &> /dev/null; then
    echo -e "${RED}Error: Node.js is not installed${NC}"
    echo "Please install Node.js 18+ from https://nodejs.org/"
    exit 1
fi

echo -e "${GREEN}[OK]${NC} Node.js $(node -v)"
echo -e "${GREEN}[OK]${NC} npm $(npm -v)"

# Install dependencies
echo ""
echo -e "${CYAN}Installing dependencies...${NC}"

npm install 2>/dev/null || true

if [ -d "backend" ]; then
    cd backend && npm install && cd ..
fi

if [ -d "frontend" ]; then
    cd frontend && npm install && cd ..
fi

echo -e "${GREEN}[OK]${NC} Dependencies installed"

# Setup environment
if [ -d "backend" ] && [ ! -f "backend/.env" ]; then
    if [ -f "backend/.env.example" ]; then
        cp backend/.env.example backend/.env
        # Generate random JWT secret
        JWT_SECRET=$(openssl rand -hex 32 2>/dev/null || head -c 32 /dev/urandom | base64)
        if [[ "$OSTYPE" == "darwin"* ]]; then
            sed -i '' "s/your-super-secret-jwt-key-change-this-in-production/$JWT_SECRET/" backend/.env
        else
            sed -i "s/your-super-secret-jwt-key-change-this-in-production/$JWT_SECRET/" backend/.env
        fi
    fi
    echo -e "${GREEN}[OK]${NC} Environment configured"
fi

# Create uploads folder
mkdir -p uploads

# Check for Docker
if command -v docker &> /dev/null && command -v docker-compose &> /dev/null || docker compose version &> /dev/null 2>&1; then
    echo ""
    echo -e "${CYAN}Docker detected. Starting PostgreSQL...${NC}"

    if [ -f "docker-compose.yml" ]; then
        docker compose up -d postgres 2>/dev/null || docker-compose up -d postgres
        echo "Waiting for database..."
        sleep 10
    fi

    # Run Prisma migrations
    if [ -d "backend" ]; then
        cd backend
        npx prisma generate
        npx prisma migrate dev --name init 2>/dev/null || npx prisma migrate deploy || true
        npx prisma db seed 2>/dev/null || true
        cd ..
    fi

    echo -e "${GREEN}[OK]${NC} Database ready"
else
    echo ""
    echo -e "${YELLOW}[WARN]${NC} Docker not found. Database setup skipped."
    echo "       Please setup PostgreSQL manually or install Docker."
fi

echo ""
echo "=================================="
echo -e "${GREEN}  Setup Complete!${NC}"
echo "=================================="
echo ""
echo "Start development servers:"
echo -e "  ${CYAN}npm run dev${NC}"
echo ""
echo "Access:"
echo -e "  Frontend: ${CYAN}http://localhost:3000${NC}"
echo -e "  Backend:  ${CYAN}http://localhost:3001${NC}"
echo ""
echo "Login credentials:"
echo -e "  ${YELLOW}admin@europoligrafico.it${NC} / ${YELLOW}admin123${NC}"
echo ""
