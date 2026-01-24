#!/bin/bash

###############################################################################
# Script di Download Progetto Kanban ISO 9001/27001
# Scarica il progetto completo dal repository Git
###############################################################################

set -e  # Exit on error

# Colori per output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Configurazione
REPO_URL="https://github.com/Sandro-01/Kanban.git"
DEFAULT_DIR="$HOME/Kanban"
BRANCH="main"

echo -e "${BLUE}╔════════════════════════════════════════════════════════════╗${NC}"
echo -e "${BLUE}║  Script Download Progetto Kanban ISO 9001/27001          ║${NC}"
echo -e "${BLUE}╚════════════════════════════════════════════════════════════╝${NC}"
echo ""

# Funzione per verificare se un comando esiste
command_exists() {
    command -v "$1" >/dev/null 2>&1
}

# Verifica Git installato
echo -e "${YELLOW}[1/3]${NC} Verifica prerequisiti..."
if ! command_exists git; then
    echo -e "${RED}✗ Git non è installato!${NC}"
    echo ""
    echo "Installalo con uno dei seguenti comandi:"
    echo "  Ubuntu/Debian: sudo apt-get update && sudo apt-get install -y git"
    echo "  CentOS/RHEL:   sudo yum install -y git"
    echo "  macOS:         brew install git"
    exit 1
fi
echo -e "${GREEN}✓ Git installato:${NC} $(git --version)"

# Richiedi directory di installazione
echo ""
echo -e "${YELLOW}[2/3]${NC} Configurazione download..."
read -p "Directory di installazione [$DEFAULT_DIR]: " INSTALL_DIR
INSTALL_DIR="${INSTALL_DIR:-$DEFAULT_DIR}"

# Espandi tilde (~) se presente
INSTALL_DIR="${INSTALL_DIR/#\~/$HOME}"

# Verifica se la directory esiste già
if [ -d "$INSTALL_DIR" ]; then
    echo -e "${YELLOW}⚠ La directory $INSTALL_DIR esiste già.${NC}"
    read -p "Vuoi sovrascriverla? (y/N): " -n 1 -r
    echo
    if [[ ! $REPLY =~ ^[Yy]$ ]]; then
        echo -e "${RED}✗ Download annullato.${NC}"
        exit 1
    fi
    echo -e "${YELLOW}→ Rimuovo directory esistente...${NC}"
    rm -rf "$INSTALL_DIR"
fi

# Richiedi branch (opzionale)
echo ""
read -p "Branch da scaricare [$BRANCH]: " USER_BRANCH
BRANCH="${USER_BRANCH:-$BRANCH}"

# Download repository
echo ""
echo -e "${YELLOW}[3/3]${NC} Download repository..."
echo -e "${BLUE}→ Repository:${NC} $REPO_URL"
echo -e "${BLUE}→ Branch:${NC} $BRANCH"
echo -e "${BLUE}→ Destinazione:${NC} $INSTALL_DIR"
echo ""

git clone --branch "$BRANCH" "$REPO_URL" "$INSTALL_DIR"

# Verifica successo
if [ $? -eq 0 ]; then
    echo ""
    echo -e "${GREEN}╔════════════════════════════════════════════════════════════╗${NC}"
    echo -e "${GREEN}║  ✓ Download completato con successo!                      ║${NC}"
    echo -e "${GREEN}╚════════════════════════════════════════════════════════════╝${NC}"
    echo ""
    echo -e "${BLUE}Prossimi passi:${NC}"
    echo ""
    echo "  1. Entra nella directory:"
    echo -e "     ${YELLOW}cd $INSTALL_DIR${NC}"
    echo ""
    echo "  2. Esegui lo script di installazione:"
    echo -e "     ${YELLOW}chmod +x install-project.sh${NC}"
    echo -e "     ${YELLOW}./install-project.sh${NC}"
    echo ""
    echo "  OPPURE per deployment in produzione:"
    echo -e "     ${YELLOW}chmod +x deploy-production.sh${NC}"
    echo -e "     ${YELLOW}sudo ./deploy-production.sh${NC}"
    echo ""
else
    echo ""
    echo -e "${RED}✗ Errore durante il download!${NC}"
    exit 1
fi
