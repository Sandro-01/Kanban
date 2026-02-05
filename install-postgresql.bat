@echo off
REM ==============================================================================
REM Script di Installazione PostgreSQL per Windows
REM ==============================================================================
REM Questo script esegue l'installazione PowerShell con i privilegi corretti
REM ==============================================================================

echo.
echo ====================================================================
echo   Installazione PostgreSQL 15 per Kanban ISO
echo ====================================================================
echo.
echo Questo script aprira' PowerShell come amministratore per installare
echo PostgreSQL 15 sul tuo computer.
echo.
echo IMPORTANTE: Ti verra' chiesto di scegliere una password.
echo             Ricordala, ti servira' per configurare l'applicazione!
echo.
pause

REM Esegui PowerShell come amministratore
powershell -Command "Start-Process powershell -Verb RunAs -ArgumentList '-NoProfile -ExecutionPolicy Bypass -File \"%~dp0install-postgresql.ps1\"'"

echo.
echo Lo script PowerShell e' stato avviato in una nuova finestra.
echo Segui le istruzioni nella finestra di PowerShell.
echo.
pause
