#===============================================================================
#  KANBAN ISO 9001/27001 - INSTALLATION SCRIPT FOR WINDOWS
#===============================================================================
#  This script automates the installation of the Kanban system
#  Supports: Windows 10/11, Windows Server 2019/2022
#  Run as Administrator for best results
#===============================================================================

param(
    [switch]$Docker,
    [switch]$Local,
    [switch]$SkipDB,
    [switch]$AutoStart,
    [switch]$Help,
    [string]$InstallDir = $PWD.Path
)

# Ensure we're using UTF-8
[Console]::OutputEncoding = [System.Text.Encoding]::UTF8
$PSDefaultParameterValues['Out-File:Encoding'] = 'utf8'

#-------------------------------------------------------------------------------
# Configuration
#-------------------------------------------------------------------------------

$Script:DockerAvailable = $false
$Script:DockerComposeAvailable = $false
$Script:PostgresAvailable = $false

#-------------------------------------------------------------------------------
# Helper Functions
#-------------------------------------------------------------------------------

function Write-Banner {
    Write-Host ""
    Write-Host "================================================================" -ForegroundColor Cyan
    Write-Host "                                                                " -ForegroundColor Cyan
    Write-Host "   _  __    _    _   _ ____    _    _   _                       " -ForegroundColor Cyan
    Write-Host "  | |/ /   / \  | \ | | __ )  / \  | \ | |                      " -ForegroundColor Cyan
    Write-Host "  | ' /   / _ \ |  \| |  _ \ / _ \ |  \| |                      " -ForegroundColor Cyan
    Write-Host "  | . \  / ___ \| |\  | |_) / ___ \| |\  |                      " -ForegroundColor Cyan
    Write-Host "  |_|\_\/_/   \_\_| \_|____/_/   \_\_| \_|                      " -ForegroundColor Cyan
    Write-Host "                                                                " -ForegroundColor Cyan
    Write-Host "        ISO 9001/27001 Compliant Kanban System                  " -ForegroundColor Cyan
    Write-Host "              Windows Installation Script                        " -ForegroundColor Cyan
    Write-Host "                                                                " -ForegroundColor Cyan
    Write-Host "================================================================" -ForegroundColor Cyan
    Write-Host ""
}

function Write-Info {
    param([string]$Message)
    Write-Host "[INFO] " -ForegroundColor Blue -NoNewline
    Write-Host $Message
}

function Write-Success {
    param([string]$Message)
    Write-Host "[OK] " -ForegroundColor Green -NoNewline
    Write-Host $Message
}

function Write-Warning {
    param([string]$Message)
    Write-Host "[WARN] " -ForegroundColor Yellow -NoNewline
    Write-Host $Message
}

function Write-Error {
    param([string]$Message)
    Write-Host "[ERROR] " -ForegroundColor Red -NoNewline
    Write-Host $Message
}

function Test-Command {
    param([string]$Command)
    try {
        if (Get-Command $Command -ErrorAction SilentlyContinue) {
            return $true
        }
    }
    catch {
        return $false
    }
    return $false
}

function Test-AdminPrivileges {
    $currentPrincipal = New-Object Security.Principal.WindowsPrincipal([Security.Principal.WindowsIdentity]::GetCurrent())
    return $currentPrincipal.IsInRole([Security.Principal.WindowsBuiltInRole]::Administrator)
}

#-------------------------------------------------------------------------------
# Prerequisites Check
#-------------------------------------------------------------------------------

function Test-Prerequisites {
    Write-Info "Checking system prerequisites..."
    Write-Host ""

    $missingDeps = @()

    # Check Node.js
    if (Test-Command "node") {
        $nodeVersion = (node -v).TrimStart('v').Split('.')[0]
        if ([int]$nodeVersion -ge 18) {
            Write-Success "Node.js $(node -v) installed"
        }
        else {
            Write-Warning "Node.js version $(node -v) is old. Version 18+ recommended."
        }
    }
    else {
        $missingDeps += "nodejs"
        Write-Error "Node.js not found"
    }

    # Check npm
    if (Test-Command "npm") {
        Write-Success "npm $(npm -v) installed"
    }
    else {
        $missingDeps += "npm"
        Write-Error "npm not found"
    }

    # Check Git
    if (Test-Command "git") {
        $gitVersion = (git --version) -replace 'git version ', ''
        Write-Success "Git $gitVersion installed"
    }
    else {
        $missingDeps += "git"
        Write-Error "Git not found"
    }

    # Check Docker (optional)
    if (Test-Command "docker") {
        Write-Success "Docker installed"
        $Script:DockerAvailable = $true
    }
    else {
        Write-Warning "Docker not found (optional for development)"
        $Script:DockerAvailable = $false
    }

    # Check Docker Compose (optional)
    try {
        docker compose version 2>$null | Out-Null
        if ($LASTEXITCODE -eq 0) {
            Write-Success "Docker Compose installed"
            $Script:DockerComposeAvailable = $true
        }
        else {
            throw "Docker Compose not available"
        }
    }
    catch {
        if (Test-Command "docker-compose") {
            Write-Success "Docker Compose (standalone) installed"
            $Script:DockerComposeAvailable = $true
        }
        else {
            Write-Warning "Docker Compose not found (optional for development)"
            $Script:DockerComposeAvailable = $false
        }
    }

    # Check PostgreSQL (optional)
    if (Test-Command "psql") {
        Write-Success "PostgreSQL client installed"
        $Script:PostgresAvailable = $true
    }
    else {
        Write-Warning "PostgreSQL client not found"
        $Script:PostgresAvailable = $false
    }

    # Handle missing dependencies
    if ($missingDeps.Count -gt 0) {
        Write-Host ""
        Write-Warning "Missing dependencies: $($missingDeps -join ', ')"
        Write-Host ""

        $installChoice = Read-Host "Would you like to install missing dependencies using winget/chocolatey? (y/n)"

        if ($installChoice -match '^[Yy]') {
            Install-Dependencies $missingDeps
        }
        else {
            Write-Error "Cannot continue without required dependencies."
            Write-Host ""
            Write-Info "Please install manually:"
            Write-Host "  - Node.js: https://nodejs.org/"
            Write-Host "  - Git: https://git-scm.com/"
            exit 1
        }
    }

    Write-Host ""
    Write-Success "All prerequisites satisfied!"
}

function Install-Dependencies {
    param([string[]]$Dependencies)

    Write-Info "Installing dependencies..."

    # Check for winget
    $useWinget = Test-Command "winget"

    # Check for chocolatey
    $useChoco = Test-Command "choco"

    if (-not $useWinget -and -not $useChoco) {
        Write-Warning "Neither winget nor chocolatey found. Installing chocolatey..."

        if (Test-AdminPrivileges) {
            Set-ExecutionPolicy Bypass -Scope Process -Force
            [System.Net.ServicePointManager]::SecurityProtocol = [System.Net.ServicePointManager]::SecurityProtocol -bor 3072
            Invoke-Expression ((New-Object System.Net.WebClient).DownloadString('https://community.chocolatey.org/install.ps1'))
            $useChoco = $true
        }
        else {
            Write-Error "Administrator privileges required to install chocolatey."
            Write-Info "Please run this script as Administrator or install dependencies manually."
            exit 1
        }
    }

    foreach ($dep in $Dependencies) {
        Write-Info "Installing $dep..."

        switch ($dep) {
            "nodejs" {
                if ($useWinget) {
                    winget install OpenJS.NodeJS.LTS --accept-source-agreements --accept-package-agreements
                }
                elseif ($useChoco) {
                    choco install nodejs-lts -y
                }
            }
            "git" {
                if ($useWinget) {
                    winget install Git.Git --accept-source-agreements --accept-package-agreements
                }
                elseif ($useChoco) {
                    choco install git -y
                }
            }
        }
    }

    # Refresh environment variables
    Write-Info "Refreshing environment variables..."
    $env:Path = [System.Environment]::GetEnvironmentVariable("Path", "Machine") + ";" + [System.Environment]::GetEnvironmentVariable("Path", "User")

    Write-Success "Dependencies installed. You may need to restart your terminal."
}

#-------------------------------------------------------------------------------
# Installation Functions
#-------------------------------------------------------------------------------

function Install-NpmDependencies {
    Write-Info "Installing npm dependencies..."

    Set-Location $InstallDir

    # Install root dependencies
    if (Test-Path "package.json") {
        Write-Info "Installing root dependencies..."
        npm install
    }

    # Install backend dependencies
    if (Test-Path "backend") {
        Write-Info "Installing backend dependencies..."
        Set-Location backend
        npm install
        Set-Location ..
    }

    # Install frontend dependencies
    if (Test-Path "frontend") {
        Write-Info "Installing frontend dependencies..."
        Set-Location frontend
        npm install
        Set-Location ..
    }

    Write-Success "All npm dependencies installed!"
}

function Set-EnvironmentFiles {
    Write-Info "Setting up environment files..."

    # Backend .env
    if ((Test-Path "backend") -and -not (Test-Path "backend\.env")) {
        if (Test-Path "backend\.env.example") {
            Copy-Item "backend\.env.example" "backend\.env"
            Write-Success "Created backend\.env from template"
        }
        else {
            # Generate random JWT secret
            $jwtSecret = -join ((48..57) + (65..90) + (97..122) | Get-Random -Count 64 | ForEach-Object { [char]$_ })

            $envContent = @"
# Database
DATABASE_URL="postgresql://kanban_user:kanban_password@localhost:5432/kanban_iso"

# Server
PORT=3001
NODE_ENV=development

# Authentication
JWT_SECRET=$jwtSecret

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
"@
            $envContent | Out-File -FilePath "backend\.env" -Encoding utf8
            Write-Success "Created backend\.env with secure defaults"
        }
    }
    else {
        Write-Info "backend\.env already exists, skipping..."
    }

    # Create uploads directory
    if (-not (Test-Path "uploads")) {
        New-Item -ItemType Directory -Path "uploads" -Force | Out-Null
    }
    Write-Success "Created uploads directory"
}

function Set-DatabaseDocker {
    Write-Info "Setting up database with Docker..."

    Set-Location $InstallDir

    # Start only PostgreSQL from docker-compose
    if (Test-Path "docker-compose.yml") {
        docker compose up -d postgres

        Write-Info "Waiting for PostgreSQL to be ready..."
        Start-Sleep -Seconds 10

        # Wait for database to be healthy
        $retries = 30
        while ($retries -gt 0) {
            try {
                $result = docker compose exec -T postgres pg_isready -U kanban_user -d kanban_iso 2>$null
                if ($LASTEXITCODE -eq 0) {
                    Write-Success "PostgreSQL is ready!"
                    break
                }
            }
            catch { }

            $retries--
            Start-Sleep -Seconds 2
        }

        if ($retries -eq 0) {
            Write-Error "PostgreSQL failed to start"
            exit 1
        }
    }
    else {
        # Start PostgreSQL container manually
        docker run -d `
            --name kanban-postgres `
            -e POSTGRES_DB=kanban_iso `
            -e POSTGRES_USER=kanban_user `
            -e POSTGRES_PASSWORD=kanban_password `
            -p 5432:5432 `
            -v kanban_postgres_data:/var/lib/postgresql/data `
            postgres:14-alpine

        Write-Info "Waiting for PostgreSQL to be ready..."
        Start-Sleep -Seconds 15
    }

    Write-Success "Database container is running!"
}

function Set-DatabaseLocal {
    Write-Info "Setting up local PostgreSQL database..."

    Write-Host ""
    Write-Warning "Make sure PostgreSQL is running and you have superuser access."
    Write-Host ""

    $pgUser = Read-Host "PostgreSQL username (default: postgres)"
    if ([string]::IsNullOrEmpty($pgUser)) {
        $pgUser = "postgres"
    }

    $pgPassword = Read-Host "PostgreSQL password" -AsSecureString
    $BSTR = [System.Runtime.InteropServices.Marshal]::SecureStringToBSTR($pgPassword)
    $pgPasswordPlain = [System.Runtime.InteropServices.Marshal]::PtrToStringAuto($BSTR)

    # Create database and user using psql
    Write-Info "Creating database and user..."

    $env:PGPASSWORD = $pgPasswordPlain

    $sqlCommands = @"
-- Create user if not exists
DO `$`$
BEGIN
    IF NOT EXISTS (SELECT FROM pg_catalog.pg_roles WHERE rolname = 'kanban_user') THEN
        CREATE USER kanban_user WITH PASSWORD 'kanban_password';
    END IF;
END
`$`$;

-- Create database if not exists
SELECT 'CREATE DATABASE kanban_iso OWNER kanban_user'
WHERE NOT EXISTS (SELECT FROM pg_database WHERE datname = 'kanban_iso')\gexec

-- Grant privileges
GRANT ALL PRIVILEGES ON DATABASE kanban_iso TO kanban_user;
"@

    $sqlCommands | psql -U $pgUser -h localhost

    $env:PGPASSWORD = $null

    Write-Success "Database and user created!"
}

function Invoke-PrismaMigrations {
    Write-Info "Running Prisma migrations..."

    Set-Location "$InstallDir\backend"

    # Generate Prisma client
    Write-Info "Generating Prisma client..."
    npx prisma generate

    # Run migrations
    Write-Info "Running database migrations..."
    try {
        npx prisma migrate dev --name init 2>$null
    }
    catch {
        npx prisma migrate deploy
    }

    # Seed database
    Write-Info "Seeding database with initial data..."
    try {
        npx prisma db seed
    }
    catch {
        Write-Warning "Seeding skipped or already done"
    }

    Set-Location $InstallDir

    Write-Success "Database migrations completed!"
}

#-------------------------------------------------------------------------------
# Full Docker Installation
#-------------------------------------------------------------------------------

function Install-WithDocker {
    Write-Info "Installing with Docker Compose..."

    Set-Location $InstallDir

    # Build and start all services
    docker compose up -d --build

    Write-Info "Waiting for services to be ready..."
    Start-Sleep -Seconds 20

    # Run migrations inside container
    docker compose exec -T backend npx prisma migrate deploy
    try {
        docker compose exec -T backend npx prisma db seed
    }
    catch { }

    Write-Success "Docker installation completed!"

    Write-Host ""
    Write-Host "========================================" -ForegroundColor Green
    Write-Host "  Installation Complete!" -ForegroundColor Green
    Write-Host "========================================" -ForegroundColor Green
    Write-Host ""
    Write-Host "Frontend: " -NoNewline; Write-Host "http://localhost:3000" -ForegroundColor Cyan
    Write-Host "Backend:  " -NoNewline; Write-Host "http://localhost:3001" -ForegroundColor Cyan
    Write-Host ""
    Write-Host "Default credentials:"
    Write-Host "  Admin:   " -NoNewline
    Write-Host "admin@europoligrafico.it" -ForegroundColor Yellow -NoNewline
    Write-Host " / " -NoNewline
    Write-Host "admin123" -ForegroundColor Yellow
    Write-Host "  Manager: " -NoNewline
    Write-Host "manager@europoligrafico.it" -ForegroundColor Yellow -NoNewline
    Write-Host " / " -NoNewline
    Write-Host "manager123" -ForegroundColor Yellow
    Write-Host "  User:    " -NoNewline
    Write-Host "user@europoligrafico.it" -ForegroundColor Yellow -NoNewline
    Write-Host " / " -NoNewline
    Write-Host "user123" -ForegroundColor Yellow
    Write-Host ""
    Write-Host "Commands:"
    Write-Host "  docker compose logs -f     " -ForegroundColor Cyan -NoNewline
    Write-Host "- View logs"
    Write-Host "  docker compose stop        " -ForegroundColor Cyan -NoNewline
    Write-Host "- Stop services"
    Write-Host "  docker compose down        " -ForegroundColor Cyan -NoNewline
    Write-Host "- Remove containers"
    Write-Host ""
}

#-------------------------------------------------------------------------------
# Development Installation
#-------------------------------------------------------------------------------

function Install-ForDevelopment {
    Write-Info "Installing for local development..."

    # Install npm dependencies
    Install-NpmDependencies

    # Setup environment
    Set-EnvironmentFiles

    # Setup database
    if (-not $SkipDB) {
        Write-Host ""
        Write-Host "Database Setup Options:"
        Write-Host "  1) Use Docker for PostgreSQL (recommended)"
        Write-Host "  2) Use existing local PostgreSQL"
        Write-Host "  3) Skip database setup"
        Write-Host ""

        $dbChoice = Read-Host "Choose an option (1/2/3)"

        switch ($dbChoice) {
            "1" {
                if ($Script:DockerAvailable) {
                    Set-DatabaseDocker
                    Invoke-PrismaMigrations
                }
                else {
                    Write-Error "Docker is not available. Please install Docker or choose another option."
                    exit 1
                }
            }
            "2" {
                Set-DatabaseLocal
                Invoke-PrismaMigrations
            }
            "3" {
                Write-Warning "Skipping database setup. You'll need to configure it manually."
            }
            default {
                Write-Warning "Invalid choice. Skipping database setup."
            }
        }
    }

    Write-Success "Development installation completed!"

    Write-Host ""
    Write-Host "========================================" -ForegroundColor Green
    Write-Host "  Installation Complete!" -ForegroundColor Green
    Write-Host "========================================" -ForegroundColor Green
    Write-Host ""
    Write-Host "To start the development servers:"
    Write-Host "  npm run dev" -ForegroundColor Cyan
    Write-Host ""
    Write-Host "Or start separately:"
    Write-Host "  cd backend; npm run dev" -ForegroundColor Cyan
    Write-Host "  cd frontend; npm start" -ForegroundColor Cyan
    Write-Host ""
    Write-Host "Access points:"
    Write-Host "  Frontend: " -NoNewline; Write-Host "http://localhost:3000" -ForegroundColor Cyan
    Write-Host "  Backend:  " -NoNewline; Write-Host "http://localhost:3001" -ForegroundColor Cyan
    Write-Host ""
    Write-Host "Default credentials:"
    Write-Host "  Admin:   " -NoNewline
    Write-Host "admin@europoligrafico.it" -ForegroundColor Yellow -NoNewline
    Write-Host " / " -NoNewline
    Write-Host "admin123" -ForegroundColor Yellow
    Write-Host "  Manager: " -NoNewline
    Write-Host "manager@europoligrafico.it" -ForegroundColor Yellow -NoNewline
    Write-Host " / " -NoNewline
    Write-Host "manager123" -ForegroundColor Yellow
    Write-Host "  User:    " -NoNewline
    Write-Host "user@europoligrafico.it" -ForegroundColor Yellow -NoNewline
    Write-Host " / " -NoNewline
    Write-Host "user123" -ForegroundColor Yellow
    Write-Host ""

    if ($AutoStart) {
        Write-Info "Starting development servers..."
        npm run dev
    }
}

#-------------------------------------------------------------------------------
# Help Function
#-------------------------------------------------------------------------------

function Show-Help {
    Write-Host "Usage: .\install.ps1 [OPTIONS]"
    Write-Host ""
    Write-Host "Options:"
    Write-Host "  -Docker       Force Docker installation"
    Write-Host "  -Local        Force local development installation"
    Write-Host "  -SkipDB       Skip database setup"
    Write-Host "  -AutoStart    Automatically start servers after installation"
    Write-Host "  -InstallDir   Installation directory (default: current directory)"
    Write-Host "  -Help         Show this help message"
    Write-Host ""
    Write-Host "Examples:"
    Write-Host "  .\install.ps1                     # Interactive installation"
    Write-Host "  .\install.ps1 -Docker             # Full Docker installation"
    Write-Host "  .\install.ps1 -Local -AutoStart   # Local dev with auto-start"
    Write-Host ""
}

#-------------------------------------------------------------------------------
# Main Execution
#-------------------------------------------------------------------------------

function Main {
    if ($Help) {
        Show-Help
        exit 0
    }

    Write-Banner

    Write-Host ""
    Write-Info "Installation directory: $InstallDir"
    Write-Host ""

    # Check prerequisites
    Test-Prerequisites

    Write-Host ""

    # Determine installation method
    if ($Docker) {
        if ($Script:DockerAvailable -and $Script:DockerComposeAvailable) {
            Install-WithDocker
        }
        else {
            Write-Error "Docker or Docker Compose is not available."
            exit 1
        }
    }
    elseif ($Local) {
        Install-ForDevelopment
    }
    else {
        # Interactive choice
        Write-Host "Installation Options:"
        Write-Host "  1) Full Docker installation (recommended for quick setup)"
        Write-Host "  2) Local development installation"
        Write-Host ""

        $installChoice = Read-Host "Choose an option (1/2)"

        switch ($installChoice) {
            "1" {
                if ($Script:DockerAvailable -and $Script:DockerComposeAvailable) {
                    Install-WithDocker
                }
                else {
                    Write-Error "Docker is not available. Please install Docker first."
                    exit 1
                }
            }
            "2" {
                Install-ForDevelopment
            }
            default {
                Write-Error "Invalid choice"
                exit 1
            }
        }
    }
}

# Run main function
Main
