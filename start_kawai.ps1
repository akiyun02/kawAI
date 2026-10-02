Write-Host "=========================================" -ForegroundColor Cyan
Write-Host "   KawAI: EMPOWERED BY AI                " -ForegroundColor Green
Write-Host "   RAITE 2026 AI in Education Hackathon  " -ForegroundColor Yellow
Write-Host "=========================================" -ForegroundColor Cyan

# Start Backend Server
Write-Host "[1/2] Starting FastAPI Backend on http://127.0.0.1:8000 ..." -ForegroundColor Cyan
Start-Process powershell -ArgumentList "-NoExit", "-Command", "cd '$PSScriptRoot\backend'; uvicorn main:app --host 127.0.0.1 --port 8000 --reload"

# Start Frontend Dev Server
Write-Host "[2/2] Starting Vite Frontend on http://127.0.0.1:5173 ..." -ForegroundColor Cyan
Start-Process powershell -ArgumentList "-NoExit", "-Command", "cd '$PSScriptRoot\frontend'; npm run dev"

Start-Sleep -Seconds 3
Start-Process "http://127.0.0.1:5173"

Write-Host "KawAI is now running live!" -ForegroundColor Green
Write-Host "Frontend: http://127.0.0.1:5173" -ForegroundColor White
Write-Host "Backend API: http://127.0.0.1:8000/docs" -ForegroundColor White
