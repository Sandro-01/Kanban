#===============================================================================
#  KANBAN - DOWNLOAD & INSTALL SCRIPT (Windows)
#===============================================================================
#  Downloads the Kanban project and runs the installer
#  Usage: irm https://your-repo/download.ps1 | iex
#         or: .\download.ps1
#===============================================================================

param(
    [string]$RepoUrl = "https://github.com/your-org/kanban.git",
    [string]$Branch = "main",
    [string]$InstallDir = "$env:USERPROFILE\kanban"
)

$ErrorActionPreference = "Stop"
[Console]::OutputEncoding = [System.Text.Encoding]::UTF8

Write-Host ""
Write-Host "========================================" -ForegroundColor Cyan
Write-Host "     KANBAN Download & Install" -ForegroundColor Cyan
Write-Host "     ISO 9001/27001 Compliant" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""

# Check Git
if (-not (Get-Command "git" -ErrorAction SilentlyContinue)) {
    Write-Host "[ERROR] " -ForegroundColor Red -NoNewline
    Write-Host "Git is not installed"
    Write-Host "Please install Git from https://git-scm.com/"
    exit 1
}

# Check if directory exists
if (Test-Path $InstallDir) {
    Write-Host "[WARN] " -ForegroundColor Yellow -NoNewline
    Write-Host "Directory $InstallDir already exists"

    $confirm = Read-Host "Do you want to remove it and re-download? (y/n)"
    if ($confirm -match '^[Yy]') {
        Remove-Item -Recurse -Force $InstallDir
    }
    else {
        Write-Host "Using existing directory..."
        Set-Location $InstallDir
        git pull origin $Branch 2>$null
    }
}

# Clone repository
if (-not (Test-Path $InstallDir)) {
    Write-Host "Downloading Kanban..." -ForegroundColor Cyan
    git clone --branch $Branch --depth 1 $RepoUrl $InstallDir
    Write-Host "[OK] " -ForegroundColor Green -NoNewline
    Write-Host "Downloaded to $InstallDir"
}

# Change to install directory
Set-Location $InstallDir

# Run installer
if (Test-Path "install.ps1") {
    Write-Host ""
    Write-Host "Running installer..." -ForegroundColor Cyan
    & ".\install.ps1" @args
}
elseif (Test-Path "quick-setup.ps1") {
    Write-Host ""
    Write-Host "Running quick setup..." -ForegroundColor Cyan
    & ".\quick-setup.ps1"
}
else {
    Write-Host ""
    Write-Host "[WARN] " -ForegroundColor Yellow -NoNewline
    Write-Host "No installer found. Running manual setup..."

    # Manual setup
    npm install
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

    Write-Host ""
    Write-Host "[OK] " -ForegroundColor Green -NoNewline
    Write-Host "Download complete!"
    Write-Host "Run 'npm run dev' to start the development servers."
}

Write-Host ""
Write-Host "Installation complete!" -ForegroundColor Green
Write-Host "Location: " -NoNewline
Write-Host $InstallDir -ForegroundColor Cyan
Write-Host ""
