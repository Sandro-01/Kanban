@echo off
REM ==============================================================================
REM Script di Avvio Kanban ISO - Backend + Frontend
REM ==============================================================================

echo.
echo ====================================================================
echo   Avvio Sistema Kanban ISO 9001/27001
echo ====================================================================
echo.

REM Ottieni il percorso della directory corrente
set KANBAN_DIR=%~dp0

echo [1/3] Avvio Backend in nuova finestra...
start "Kanban Backend" cmd /k "cd /d %KANBAN_DIR%backend && npm run dev"

echo [2/3] Attendo 3 secondi per permettere al backend di avviarsi...
timeout /t 3 /nobreak >nul

echo [3/3] Avvio Frontend in nuova finestra...
start "Kanban Frontend" cmd /k "cd /d %KANBAN_DIR%frontend && npm start"

echo.
echo ====================================================================
echo   Sistema Avviato!
echo ====================================================================
echo.
echo Backend:  http://localhost:5000 (finestra: Kanban Backend)
echo Frontend: http://localhost:3000 (finestra: Kanban Frontend)
echo.
echo Il browser si aprira' automaticamente tra pochi secondi.
echo.
echo Per fermare il sistema:
echo   - Premi Ctrl+C in entrambe le finestre
echo   - Oppure chiudi le finestre del prompt
echo.
pause
