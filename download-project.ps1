###############################################################################
# Script di Download Progetto Kanban ISO 9001/27001
# Scarica il progetto completo dal repository Git (Windows)
###############################################################################

# Imposta policy di esecuzione
Set-ExecutionPolicy -ExecutionPolicy RemoteSigned -Scope Process -Force

# Configura encoding console per supportare caratteri Unicode
[Console]::OutputEncoding = [System.Text.Encoding]::UTF8
$PSDefaultParameterValues['Out-File:Encoding'] = 'utf8'
$null = chcp 65001

# Configurazione
$RepoUrl = "https://github.com/Sandro-01/Kanban.git"
$DefaultDir = "C:\Kanban"
$Branch = "main"

# Colori per output
function Write-ColorOutput {
    param(
        [string]$Message,
        [string]$Color = "White"
    )
    Write-Host $Message -ForegroundColor $Color
}

Write-Host ""
Write-ColorOutput "╔════════════════════════════════════════════════════════════╗" "Cyan"
Write-ColorOutput "║  Script Download Progetto Kanban ISO 9001/27001          ║" "Cyan"
Write-ColorOutput "╚════════════════════════════════════════════════════════════╝" "Cyan"
Write-Host ""

# Funzione per verificare se un comando esiste
function Test-CommandExists {
    param($Command)
    $null = Get-Command $Command -ErrorAction SilentlyContinue
    return $?
}

# Verifica Git installato
Write-ColorOutput "[1/3] Verifica prerequisiti..." "Yellow"

if (-not (Test-CommandExists "git")) {
    Write-ColorOutput "✗ Git non è installato!" "Red"
    Write-Host ""
    Write-Host "Scarica e installa Git da: https://git-scm.com/download/win"
    Write-Host ""
    Write-Host "OPPURE installa con Chocolatey:"
    Write-Host "  choco install git -y"
    Write-Host ""
    exit 1
}

$GitVersion = git --version
Write-ColorOutput "✓ Git installato: $GitVersion" "Green"

# Richiedi directory di installazione
Write-Host ""
Write-ColorOutput "[2/3] Configurazione download..." "Yellow"

$InstallDir = Read-Host "Directory di installazione [$DefaultDir]"
if ([string]::IsNullOrWhiteSpace($InstallDir)) {
    $InstallDir = $DefaultDir
}

# Verifica se la directory esiste già
if (Test-Path $InstallDir) {
    Write-ColorOutput "⚠ La directory $InstallDir esiste già." "Yellow"
    $Overwrite = Read-Host "Vuoi sovrascriverla? (y/N)"

    if ($Overwrite -ne "y" -and $Overwrite -ne "Y") {
        Write-ColorOutput "✗ Download annullato." "Red"
        exit 1
    }

    Write-ColorOutput "→ Rimuovo directory esistente..." "Yellow"
    Remove-Item -Path $InstallDir -Recurse -Force
}

# Richiedi branch (opzionale)
Write-Host ""
$UserBranch = Read-Host "Branch da scaricare [$Branch]"
if (-not [string]::IsNullOrWhiteSpace($UserBranch)) {
    $Branch = $UserBranch
}

# Download repository
Write-Host ""
Write-ColorOutput "[3/3] Download repository..." "Yellow"
Write-ColorOutput "→ Repository: $RepoUrl" "Cyan"
Write-ColorOutput "→ Branch: $Branch" "Cyan"
Write-ColorOutput "→ Destinazione: $InstallDir" "Cyan"
Write-Host ""

try {
    git clone --branch $Branch $RepoUrl $InstallDir

    if ($LASTEXITCODE -eq 0) {
        Write-Host ""
        Write-ColorOutput "╔════════════════════════════════════════════════════════════╗" "Green"
        Write-ColorOutput "║  ✓ Download completato con successo!                      ║" "Green"
        Write-ColorOutput "╚════════════════════════════════════════════════════════════╝" "Green"
        Write-Host ""
        Write-ColorOutput "Prossimi passi:" "Cyan"
        Write-Host ""
        Write-Host "  1. Entra nella directory:"
        Write-ColorOutput "     cd $InstallDir" "Yellow"
        Write-Host ""
        Write-Host "  2. Esegui lo script di installazione:"
        Write-ColorOutput "     .\install-project.ps1" "Yellow"
        Write-Host ""
        Write-Host "  OPPURE per deployment in produzione:"
        Write-ColorOutput "     .\deploy-windows.ps1" "Yellow"
        Write-Host ""
    }
    else {
        throw "Errore durante il clone del repository"
    }
}
catch {
    Write-Host ""
    Write-ColorOutput "✗ Errore durante il download!" "Red"
    Write-ColorOutput "Dettagli: $_" "Red"
    exit 1
}
