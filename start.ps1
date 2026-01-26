# ==============================================================================
# Script di Avvio Kanban ISO - Backend + Frontend (PowerShell)
# ==============================================================================

Write-Host ""
Write-Host "====================================================================" -ForegroundColor Cyan
Write-Host "  Avvio Sistema Kanban ISO 9001/27001" -ForegroundColor Cyan
Write-Host "====================================================================" -ForegroundColor Cyan
Write-Host ""

# Ottieni il percorso della directory corrente
$KanbanDir = $PSScriptRoot

Write-Host "[1/3] Avvio Backend in nuova finestra..." -ForegroundColor Yellow
Start-Process powershell -ArgumentList "-NoExit", "-Command", "cd '$KanbanDir\backend'; npm run dev" -WindowStyle Normal

Write-Host "[2/3] Attendo 3 secondi per permettere al backend di avviarsi..." -ForegroundColor Yellow
Start-Sleep -Seconds 3

Write-Host "[3/3] Avvio Frontend in nuova finestra..." -ForegroundColor Yellow
Start-Process powershell -ArgumentList "-NoExit", "-Command", "cd '$KanbanDir\frontend'; npm start" -WindowStyle Normal

Write-Host ""
Write-Host "====================================================================" -ForegroundColor Green
Write-Host "  Sistema Avviato!" -ForegroundColor Green
Write-Host "====================================================================" -ForegroundColor Green
Write-Host ""
Write-Host "Backend:  http://localhost:3001 (finestra: Backend)" -ForegroundColor White
Write-Host "Frontend: http://localhost:3000 (finestra: Frontend)" -ForegroundColor White
Write-Host ""
Write-Host "Il browser si aprirà automaticamente tra pochi secondi." -ForegroundColor Cyan
Write-Host ""
Write-Host "Per fermare il sistema:" -ForegroundColor Yellow
Write-Host "  - Premi Ctrl+C in entrambe le finestre PowerShell" -ForegroundColor White
Write-Host "  - Oppure chiudi le finestre PowerShell" -ForegroundColor White
Write-Host ""

pause
