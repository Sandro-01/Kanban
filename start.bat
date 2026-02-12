@echo off
REM 🚀 Script Avvio SUPER SEMPLICE (Windows)

echo ╔════════════════════════════════════╗
echo ║   🚀 Avvio Kanban...              ║
echo ╚════════════════════════════════════╝
echo.

REM Avvia backend in una nuova finestra
start "Kanban Backend" cmd /k "cd backend && npm run dev"

REM Aspetta 8 secondi
timeout /t 8 /nobreak >nul

REM Avvia frontend in una nuova finestra
start "Kanban Frontend" cmd /k "cd frontend && npm start"

echo.
echo ✅ Sistema avviato!
echo.
echo 🌐 Frontend: http://localhost:3000
echo 🔌 Backend:  http://localhost:4000
echo.
echo 📧 Login: admin@europoligrafico.it / admin123
echo.
pause
