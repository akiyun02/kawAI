@echo off
echo =========================================
echo    KawAI: EMPOWERED BY AI
echo    RAITE 2026 AI in Education Hackathon  
echo =========================================
echo [1/2] Starting FastAPI Backend...
start cmd /k "cd backend && uvicorn main:app --host 127.0.0.1 --port 8000 --reload"

echo [2/2] Starting Vite Frontend...
start cmd /k "cd frontend && npm run dev"

timeout /t 3 >nul
start http://127.0.0.1:5173
echo KawAI is running live!
