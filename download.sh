#!/bin/bash
#===============================================================================
#  KANBAN - DOWNLOAD & INSTALL SCRIPT (Linux/Mac)
#===============================================================================
#  Downloads the Kanban project and runs the installer
#  Usage: curl -fsSL https://your-repo/download.sh | bash
#===============================================================================

set -e

# Configuration - Update these for your repository
REPO_URL="${KANBAN_REPO_URL:-https://github.com/your-org/kanban.git}"
BRANCH="${KANBAN_BRANCH:-main}"
INSTALL_DIR="${KANBAN_INSTALL_DIR:-$HOME/kanban}"

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
CYAN='\033[0;36m'
NC='\033[0m'

echo ""
echo -e "${CYAN}╔════════════════════════════════════════╗${NC}"
echo -e "${CYAN}║     KANBAN Download & Install          ║${NC}"
echo -e "${CYAN}║     ISO 9001/27001 Compliant           ║${NC}"
echo -e "${CYAN}╚════════════════════════════════════════╝${NC}"
echo ""

# Check Git
if ! command -v git &> /dev/null; then
    echo -e "${RED}Error: Git is not installed${NC}"
    echo "Please install Git first:"
    echo "  Ubuntu/Debian: sudo apt install git"
    echo "  macOS: brew install git"
    exit 1
fi

# Check if directory exists
if [ -d "$INSTALL_DIR" ]; then
    echo -e "${YELLOW}Warning: Directory $INSTALL_DIR already exists${NC}"
    read -p "Do you want to remove it and re-download? (y/n): " confirm
    if [[ "$confirm" =~ ^[Yy]$ ]]; then
        rm -rf "$INSTALL_DIR"
    else
        echo "Using existing directory..."
        cd "$INSTALL_DIR"
        git pull origin "$BRANCH" 2>/dev/null || true
    fi
fi

# Clone repository
if [ ! -d "$INSTALL_DIR" ]; then
    echo -e "${CYAN}Downloading Kanban...${NC}"
    git clone --branch "$BRANCH" --depth 1 "$REPO_URL" "$INSTALL_DIR"
    echo -e "${GREEN}[OK]${NC} Downloaded to $INSTALL_DIR"
fi

# Change to install directory
cd "$INSTALL_DIR"

# Run installer
if [ -f "install.sh" ]; then
    echo ""
    echo -e "${CYAN}Running installer...${NC}"
    chmod +x install.sh
    ./install.sh "$@"
elif [ -f "quick-setup.sh" ]; then
    echo ""
    echo -e "${CYAN}Running quick setup...${NC}"
    chmod +x quick-setup.sh
    ./quick-setup.sh
else
    echo ""
    echo -e "${YELLOW}No installer found. Running manual setup...${NC}"

    # Manual setup
    npm install
    [ -d "backend" ] && (cd backend && npm install)
    [ -d "frontend" ] && (cd frontend && npm install)

    echo ""
    echo -e "${GREEN}Download complete!${NC}"
    echo "Run 'npm run dev' to start the development servers."
fi

echo ""
echo -e "${GREEN}Installation complete!${NC}"
echo -e "Location: ${CYAN}$INSTALL_DIR${NC}"
echo ""
