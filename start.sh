#!/bin/bash
# 🚀 Script Avvio SUPER SEMPLICE (Mac/Linux)

echo "🚀 Avvio Kanban..."

# Avvia backend
cd backend
npm run dev &

# Aspetta 5 secondi
sleep 5

# Avvia frontend
cd ../frontend
npm start
