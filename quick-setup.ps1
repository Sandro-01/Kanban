#===============================================================================
#  KANBAN - QUICK SETUP SCRIPT (Windows)
#===============================================================================
#  One-liner setup for development environment
#  Usage: irm https://your-repo/quick-setup.ps1 | iex
#         or: .\quick-setup.ps1
#===============================================================================

$ErrorActionPreference = "Stop"
[Console]::OutputEncoding = [System.Text.Encoding]::UTF8

Write-Host ""
Write-Host "==================================" -ForegroundColor Cyan
Write-Host "  KANBAN Quick Setup" -ForegroundColor Cyan
Write-Host "==================================" -ForegroundColor Cyan
Write-Host ""

# Check Node.js
if (-not (Get-Command "node" -ErrorAction SilentlyContinue)) {
    Write-Host "[ERROR] " -ForegroundColor Red -NoNewline
    Write-Host "Node.js is not installed"
    Write-Host "Please install Node.js 18+ from https://nodejs.org/"
    exit 1
}

Write-Host "[OK] " -ForegroundColor Green -NoNewline
Write-Host "Node.js $(node -v)"
Write-Host "[OK] " -ForegroundColor Green -NoNewline
Write-Host "npm $(npm -v)"

# Install dependencies
Write-Host ""
Write-Host "Installing dependencies..." -ForegroundColor Cyan

npm install 2>$null

if (Test-Path "backend") {
    Set-Location backend
    npm install
    Set-Location ..
}

if (Test-Path "frontend") {
    Set-Location frontend
    npm install
    Set-Location ..
}

Write-Host "[OK] " -ForegroundColor Green -NoNewline
Write-Host "Dependencies installed"

# Setup environment
if ((Test-Path "backend") -and -not (Test-Path "backend\.env")) {
    if (Test-Path "backend\.env.example") {
        Copy-Item "backend\.env.example" "backend\.env"

        # Generate random JWT secret
        $jwtSecret = -join ((48..57) + (65..90) + (97..122) | Get-Random -Count 64 | ForEach-Object { [char]$_ })
        $content = Get-Content "backend\.env" -Raw
        $content = $content -replace "your-super-secret-jwt-key-change-this-in-production", $jwtSecret
        $content | Set-Content "backend\.env"
    }
    Write-Host "[OK] " -ForegroundColor Green -NoNewline
    Write-Host "Environment configured"
}

# Create uploads folder
if (-not (Test-Path "uploads")) {
    New-Item -ItemType Directory -Path "uploads" -Force | Out-Null
}

# Check for Docker
$dockerAvailable = Get-Command "docker" -ErrorAction SilentlyContinue
$dockerComposeAvailable = $false

if ($dockerAvailable) {
    try {
        docker compose version 2>$null | Out-Null
        if ($LASTEXITCODE -eq 0) {
            $dockerComposeAvailable = $true
        }
    }
    catch { }
}

if ($dockerAvailable -and $dockerComposeAvailable) {
    Write-Host ""
    Write-Host "Docker detected. Starting PostgreSQL..." -ForegroundColor Cyan

    if (Test-Path "docker-compose.yml") {
        docker compose up -d postgres 2>$null
        Write-Host "Waiting for database..."
        Start-Sleep -Seconds 10
    }

    # Run Prisma migrations
    if (Test-Path "backend") {
        Set-Location backend
        npx prisma generate
        try {
            npx prisma migrate dev --name init 2>$null
        }
        catch {
            npx prisma migrate deploy 2>$null
        }
        try {
            npx prisma db seed 2>$null
        }
        catch { }
        Set-Location ..
    }

    Write-Host "[OK] " -ForegroundColor Green -NoNewline
    Write-Host "Database ready"
}
else {
    Write-Host ""
    Write-Host "[WARN] " -ForegroundColor Yellow -NoNewline
    Write-Host "Docker not found. Database setup skipped."
    Write-Host "       Please setup PostgreSQL manually or install Docker."
}

Write-Host ""
Write-Host "==================================" -ForegroundColor Green
Write-Host "  Setup Complete!" -ForegroundColor Green
Write-Host "==================================" -ForegroundColor Green
Write-Host ""
Write-Host "Start development servers:"
Write-Host "  npm run dev" -ForegroundColor Cyan
Write-Host ""
Write-Host "Access:"
Write-Host "  Frontend: " -NoNewline
Write-Host "http://localhost:3000" -ForegroundColor Cyan
Write-Host "  Backend:  " -NoNewline
Write-Host "http://localhost:3001" -ForegroundColor Cyan
Write-Host ""
Write-Host "Login credentials:"
Write-Host "  admin@europoligrafico.it" -ForegroundColor Yellow -NoNewline
Write-Host " / " -NoNewline
Write-Host "admin123" -ForegroundColor Yellow
Write-Host ""
