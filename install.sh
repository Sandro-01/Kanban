#!/bin/bash

#===============================================================================
#  KANBAN ISO 9001/27001 - INSTALLATION SCRIPT FOR LINUX/MAC
#===============================================================================
#  This script automates the installation of the Kanban system
#  Supports: Ubuntu 20.04+, Debian 11+, macOS 12+
#===============================================================================

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
CYAN='\033[0;36m'
NC='\033[0m' # No Color

# Configuration
INSTALL_DIR="${INSTALL_DIR:-$(pwd)}"
USE_DOCKER="${USE_DOCKER:-auto}"
SKIP_DB="${SKIP_DB:-false}"
AUTO_START="${AUTO_START:-false}"

#-------------------------------------------------------------------------------
# Helper Functions
#-------------------------------------------------------------------------------

print_banner() {
    echo -e "${CYAN}"
    echo "╔════════════════════════════════════════════════════════════════╗"
    echo "║                                                                ║"
    echo "║   ██╗  ██╗ █████╗ ███╗   ██╗██████╗  █████╗ ███╗   ██╗        ║"
    echo "║   ██║ ██╔╝██╔══██╗████╗  ██║██╔══██╗██╔══██╗████╗  ██║        ║"
    echo "║   █████╔╝ ███████║██╔██╗ ██║██████╔╝███████║██╔██╗ ██║        ║"
    echo "║   ██╔═██╗ ██╔══██║██║╚██╗██║██╔══██╗██╔══██║██║╚██╗██║        ║"
    echo "║   ██║  ██╗██║  ██║██║ ╚████║██████╔╝██║  ██║██║ ╚████║        ║"
    echo "║   ╚═╝  ╚═╝╚═╝  ╚═╝╚═╝  ╚═══╝╚═════╝ ╚═╝  ╚═╝╚═╝  ╚═══╝        ║"
    echo "║                                                                ║"
    echo "║        ISO 9001/27001 Compliant Kanban System                  ║"
    echo "║                    Installation Script                          ║"
    echo "║                                                                ║"
    echo "╚════════════════════════════════════════════════════════════════╝"
    echo -e "${NC}"
}

log_info() {
    echo -e "${BLUE}[INFO]${NC} $1"
}

log_success() {
    echo -e "${GREEN}[OK]${NC} $1"
}

log_warning() {
    echo -e "${YELLOW}[WARN]${NC} $1"
}

log_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

check_command() {
    if command -v "$1" &> /dev/null; then
        return 0
    else
        return 1
    fi
}

get_os() {
    if [[ "$OSTYPE" == "linux-gnu"* ]]; then
        if [ -f /etc/os-release ]; then
            . /etc/os-release
            echo "$ID"
        else
            echo "linux"
        fi
    elif [[ "$OSTYPE" == "darwin"* ]]; then
        echo "macos"
    else
        echo "unknown"
    fi
}

#-------------------------------------------------------------------------------
# Prerequisites Check
#-------------------------------------------------------------------------------

check_prerequisites() {
    log_info "Checking system prerequisites..."

    local os=$(get_os)
    local missing_deps=()

    # Check Node.js
    if check_command node; then
        local node_version=$(node -v | cut -d'v' -f2 | cut -d'.' -f1)
        if [ "$node_version" -ge 18 ]; then
            log_success "Node.js $(node -v) installed"
        else
            log_warning "Node.js version $(node -v) is old. Version 18+ recommended."
        fi
    else
        missing_deps+=("nodejs")
        log_error "Node.js not found"
    fi

    # Check npm
    if check_command npm; then
        log_success "npm $(npm -v) installed"
    else
        missing_deps+=("npm")
        log_error "npm not found"
    fi

    # Check Git
    if check_command git; then
        log_success "Git $(git --version | cut -d' ' -f3) installed"
    else
        missing_deps+=("git")
        log_error "Git not found"
    fi

    # Check Docker (optional)
    if check_command docker; then
        log_success "Docker installed"
        DOCKER_AVAILABLE=true
    else
        log_warning "Docker not found (optional for development)"
        DOCKER_AVAILABLE=false
    fi

    # Check Docker Compose (optional)
    if check_command docker-compose || docker compose version &> /dev/null 2>&1; then
        log_success "Docker Compose installed"
        DOCKER_COMPOSE_AVAILABLE=true
    else
        log_warning "Docker Compose not found (optional for development)"
        DOCKER_COMPOSE_AVAILABLE=false
    fi

    # Check PostgreSQL (if not using Docker)
    if check_command psql; then
        log_success "PostgreSQL client installed"
        POSTGRES_AVAILABLE=true
    else
        log_warning "PostgreSQL client not found"
        POSTGRES_AVAILABLE=false
    fi

    # Install missing dependencies
    if [ ${#missing_deps[@]} -gt 0 ]; then
        log_warning "Missing dependencies: ${missing_deps[*]}"
        echo ""
        read -p "Would you like to install missing dependencies? (y/n): " install_deps

        if [[ "$install_deps" =~ ^[Yy]$ ]]; then
            install_dependencies "$os" "${missing_deps[@]}"
        else
            log_error "Cannot continue without required dependencies."
            exit 1
        fi
    fi

    echo ""
    log_success "All prerequisites satisfied!"
}

install_dependencies() {
    local os=$1
    shift
    local deps=("$@")

    log_info "Installing dependencies for $os..."

    case $os in
        ubuntu|debian)
            sudo apt-get update
            for dep in "${deps[@]}"; do
                case $dep in
                    nodejs)
                        curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
                        sudo apt-get install -y nodejs
                        ;;
                    git)
                        sudo apt-get install -y git
                        ;;
                esac
            done
            ;;
        fedora|rhel|centos)
            for dep in "${deps[@]}"; do
                case $dep in
                    nodejs)
                        sudo dnf module install -y nodejs:20
                        ;;
                    git)
                        sudo dnf install -y git
                        ;;
                esac
            done
            ;;
        macos)
            if ! check_command brew; then
                log_info "Installing Homebrew..."
                /bin/bash -c "$(curl -fsSL https://raw.githubusercontent.com/Homebrew/install/HEAD/install.sh)"
            fi
            for dep in "${deps[@]}"; do
                case $dep in
                    nodejs)
                        brew install node@20
                        ;;
                    git)
                        brew install git
                        ;;
                esac
            done
            ;;
        *)
            log_error "Unsupported OS: $os"
            log_info "Please install manually: ${deps[*]}"
            exit 1
            ;;
    esac
}

#-------------------------------------------------------------------------------
# Installation Functions
#-------------------------------------------------------------------------------

install_npm_dependencies() {
    log_info "Installing npm dependencies..."

    cd "$INSTALL_DIR"

    # Install root dependencies
    if [ -f "package.json" ]; then
        log_info "Installing root dependencies..."
        npm install
    fi

    # Install backend dependencies
    if [ -d "backend" ]; then
        log_info "Installing backend dependencies..."
        cd backend
        npm install
        cd ..
    fi

    # Install frontend dependencies
    if [ -d "frontend" ]; then
        log_info "Installing frontend dependencies..."
        cd frontend
        npm install
        cd ..
    fi

    log_success "All npm dependencies installed!"
}

setup_environment() {
    log_info "Setting up environment files..."

    # Backend .env
    if [ -d "backend" ] && [ ! -f "backend/.env" ]; then
        if [ -f "backend/.env.example" ]; then
            cp backend/.env.example backend/.env
            log_success "Created backend/.env from template"
        else
            cat > backend/.env << 'EOF'
# Database
DATABASE_URL="postgresql://kanban_user:kanban_password@localhost:5432/kanban_iso"

# Server
PORT=3001
NODE_ENV=development

# Authentication
JWT_SECRET=kanban-dev-secret-key-change-in-production-$(openssl rand -hex 16)

# Email Configuration (optional for development)
EMAIL_HOST=smtp.gmail.com
EMAIL_PORT=587
EMAIL_SECURE=false
EMAIL_USER=your-email@gmail.com
EMAIL_PASSWORD=your-app-password
EMAIL_FROM=noreply@kanban.local

# File Upload
MAX_FILE_SIZE=10485760
UPLOAD_DIR=../uploads

# SLA Defaults (in hours)
SLA_CRITICAL=4
SLA_HIGH=24
SLA_MEDIUM=72
SLA_LOW=168
EOF
            # Generate random JWT secret
            local jwt_secret=$(openssl rand -hex 32 2>/dev/null || head -c 32 /dev/urandom | base64)
            sed -i.bak "s/kanban-dev-secret-key-change-in-production-.*/${jwt_secret}/" backend/.env 2>/dev/null || true
            rm -f backend/.env.bak
            log_success "Created backend/.env with secure defaults"
        fi
    else
        log_info "backend/.env already exists, skipping..."
    fi

    # Create uploads directory
    mkdir -p uploads
    log_success "Created uploads directory"
}

setup_database_docker() {
    log_info "Setting up database with Docker..."

    # Start only PostgreSQL from docker-compose
    if [ -f "docker-compose.yml" ]; then
        docker-compose up -d postgres

        log_info "Waiting for PostgreSQL to be ready..."
        sleep 5

        # Wait for database to be healthy
        local retries=30
        while [ $retries -gt 0 ]; do
            if docker-compose exec -T postgres pg_isready -U kanban_user -d kanban_iso &> /dev/null; then
                log_success "PostgreSQL is ready!"
                break
            fi
            retries=$((retries - 1))
            sleep 2
        done

        if [ $retries -eq 0 ]; then
            log_error "PostgreSQL failed to start"
            exit 1
        fi
    else
        # Start PostgreSQL container manually
        docker run -d \
            --name kanban-postgres \
            -e POSTGRES_DB=kanban_iso \
            -e POSTGRES_USER=kanban_user \
            -e POSTGRES_PASSWORD=kanban_password \
            -p 5432:5432 \
            -v kanban_postgres_data:/var/lib/postgresql/data \
            postgres:14-alpine

        log_info "Waiting for PostgreSQL to be ready..."
        sleep 10
    fi

    log_success "Database container is running!"
}

setup_database_local() {
    log_info "Setting up local PostgreSQL database..."

    echo ""
    log_warning "Make sure PostgreSQL is running and you have superuser access."
    echo ""

    read -p "PostgreSQL username (default: postgres): " pg_user
    pg_user=${pg_user:-postgres}

    # Create database and user
    log_info "Creating database and user..."

    sudo -u "$pg_user" psql << 'EOF' 2>/dev/null || psql -U "$pg_user" << 'EOF'
-- Create user if not exists
DO $$
BEGIN
    IF NOT EXISTS (SELECT FROM pg_catalog.pg_roles WHERE rolname = 'kanban_user') THEN
        CREATE USER kanban_user WITH PASSWORD 'kanban_password';
    END IF;
END
$$;

-- Create database if not exists
SELECT 'CREATE DATABASE kanban_iso OWNER kanban_user'
WHERE NOT EXISTS (SELECT FROM pg_database WHERE datname = 'kanban_iso')\gexec

-- Grant privileges
GRANT ALL PRIVILEGES ON DATABASE kanban_iso TO kanban_user;
EOF

    log_success "Database and user created!"
}

run_prisma_migrations() {
    log_info "Running Prisma migrations..."

    cd "$INSTALL_DIR/backend"

    # Generate Prisma client
    log_info "Generating Prisma client..."
    npx prisma generate

    # Run migrations
    log_info "Running database migrations..."
    npx prisma migrate dev --name init 2>/dev/null || npx prisma migrate deploy

    # Seed database
    log_info "Seeding database with initial data..."
    npx prisma db seed || log_warning "Seeding skipped or already done"

    cd "$INSTALL_DIR"

    log_success "Database migrations completed!"
}

#-------------------------------------------------------------------------------
# Full Docker Installation
#-------------------------------------------------------------------------------

install_with_docker() {
    log_info "Installing with Docker Compose..."

    cd "$INSTALL_DIR"

    # Build and start all services
    docker-compose up -d --build

    log_info "Waiting for services to be ready..."
    sleep 15

    # Run migrations inside container
    docker-compose exec -T backend npx prisma migrate deploy
    docker-compose exec -T backend npx prisma db seed || true

    log_success "Docker installation completed!"

    echo ""
    echo -e "${GREEN}========================================${NC}"
    echo -e "${GREEN}  Installation Complete!${NC}"
    echo -e "${GREEN}========================================${NC}"
    echo ""
    echo -e "Frontend: ${CYAN}http://localhost:3000${NC}"
    echo -e "Backend:  ${CYAN}http://localhost:3001${NC}"
    echo ""
    echo -e "Default credentials:"
    echo -e "  Admin:   ${YELLOW}admin@europoligrafico.it${NC} / ${YELLOW}admin123${NC}"
    echo -e "  Manager: ${YELLOW}manager@europoligrafico.it${NC} / ${YELLOW}manager123${NC}"
    echo -e "  User:    ${YELLOW}user@europoligrafico.it${NC} / ${YELLOW}user123${NC}"
    echo ""
    echo -e "Commands:"
    echo -e "  ${CYAN}docker-compose logs -f${NC}     - View logs"
    echo -e "  ${CYAN}docker-compose stop${NC}        - Stop services"
    echo -e "  ${CYAN}docker-compose down${NC}        - Remove containers"
    echo ""
}

#-------------------------------------------------------------------------------
# Development Installation
#-------------------------------------------------------------------------------

install_for_development() {
    log_info "Installing for local development..."

    # Install npm dependencies
    install_npm_dependencies

    # Setup environment
    setup_environment

    # Setup database
    if [ "$SKIP_DB" != "true" ]; then
        echo ""
        echo "Database Setup Options:"
        echo "  1) Use Docker for PostgreSQL (recommended)"
        echo "  2) Use existing local PostgreSQL"
        echo "  3) Skip database setup"
        echo ""
        read -p "Choose an option (1/2/3): " db_choice

        case $db_choice in
            1)
                if [ "$DOCKER_AVAILABLE" = true ]; then
                    setup_database_docker
                    run_prisma_migrations
                else
                    log_error "Docker is not available. Please install Docker or choose another option."
                    exit 1
                fi
                ;;
            2)
                setup_database_local
                run_prisma_migrations
                ;;
            3)
                log_warning "Skipping database setup. You'll need to configure it manually."
                ;;
            *)
                log_warning "Invalid choice. Skipping database setup."
                ;;
        esac
    fi

    log_success "Development installation completed!"

    echo ""
    echo -e "${GREEN}========================================${NC}"
    echo -e "${GREEN}  Installation Complete!${NC}"
    echo -e "${GREEN}========================================${NC}"
    echo ""
    echo -e "To start the development servers:"
    echo -e "  ${CYAN}npm run dev${NC}"
    echo ""
    echo -e "Or start separately:"
    echo -e "  ${CYAN}cd backend && npm run dev${NC}"
    echo -e "  ${CYAN}cd frontend && npm start${NC}"
    echo ""
    echo -e "Access points:"
    echo -e "  Frontend: ${CYAN}http://localhost:3000${NC}"
    echo -e "  Backend:  ${CYAN}http://localhost:3001${NC}"
    echo ""
    echo -e "Default credentials:"
    echo -e "  Admin:   ${YELLOW}admin@europoligrafico.it${NC} / ${YELLOW}admin123${NC}"
    echo -e "  Manager: ${YELLOW}manager@europoligrafico.it${NC} / ${YELLOW}manager123${NC}"
    echo -e "  User:    ${YELLOW}user@europoligrafico.it${NC} / ${YELLOW}user123${NC}"
    echo ""

    if [ "$AUTO_START" = "true" ]; then
        log_info "Starting development servers..."
        npm run dev
    fi
}

#-------------------------------------------------------------------------------
# Main Execution
#-------------------------------------------------------------------------------

show_help() {
    echo "Usage: ./install.sh [OPTIONS]"
    echo ""
    echo "Options:"
    echo "  --docker       Force Docker installation"
    echo "  --local        Force local development installation"
    echo "  --skip-db      Skip database setup"
    echo "  --auto-start   Automatically start servers after installation"
    echo "  --help         Show this help message"
    echo ""
    echo "Environment variables:"
    echo "  INSTALL_DIR    Installation directory (default: current directory)"
    echo "  USE_DOCKER     auto|yes|no (default: auto)"
    echo "  SKIP_DB        true|false (default: false)"
    echo "  AUTO_START     true|false (default: false)"
    echo ""
}

main() {
    # Parse arguments
    while [[ $# -gt 0 ]]; do
        case $1 in
            --docker)
                USE_DOCKER="yes"
                shift
                ;;
            --local)
                USE_DOCKER="no"
                shift
                ;;
            --skip-db)
                SKIP_DB="true"
                shift
                ;;
            --auto-start)
                AUTO_START="true"
                shift
                ;;
            --help|-h)
                show_help
                exit 0
                ;;
            *)
                log_error "Unknown option: $1"
                show_help
                exit 1
                ;;
        esac
    done

    print_banner

    echo ""
    log_info "Installation directory: $INSTALL_DIR"
    echo ""

    # Check prerequisites
    check_prerequisites

    echo ""

    # Determine installation method
    if [ "$USE_DOCKER" = "yes" ]; then
        if [ "$DOCKER_AVAILABLE" = true ] && [ "$DOCKER_COMPOSE_AVAILABLE" = true ]; then
            install_with_docker
        else
            log_error "Docker or Docker Compose is not available."
            exit 1
        fi
    elif [ "$USE_DOCKER" = "no" ]; then
        install_for_development
    else
        # Auto-detect
        echo "Installation Options:"
        echo "  1) Full Docker installation (recommended for quick setup)"
        echo "  2) Local development installation"
        echo ""
        read -p "Choose an option (1/2): " install_choice

        case $install_choice in
            1)
                if [ "$DOCKER_AVAILABLE" = true ] && [ "$DOCKER_COMPOSE_AVAILABLE" = true ]; then
                    install_with_docker
                else
                    log_error "Docker is not available. Please install Docker first."
                    exit 1
                fi
                ;;
            2)
                install_for_development
                ;;
            *)
                log_error "Invalid choice"
                exit 1
                ;;
        esac
    fi
}

# Run main function
main "$@"
