@echo off
echo ========================================
echo  Diaryverse - Render Backend Mode
echo ========================================
echo.
echo Backend URL: https://major-86rr.onrender.com
echo.

REM Start Admin Panel with Render backend
echo [1/2] Starting Admin Panel (Render Mode)...
start "Admin Panel - Render" cmd /k "cd /d "%~dp0admin" && echo Using Render Backend: https://major-86rr.onrender.com && npm run dev"
timeout /t 3 /nobreak > nul

REM Start Bot Server with Render backend
echo [2/2] Starting Bot Server (Render Mode)...
start "Bot Server - Render" cmd /k "cd /d "%~dp0Bot" && echo Connecting to Render Backend: https://major-86rr.onrender.com && .\venv\Scripts\python.exe app.py"

echo.
echo ========================================
echo  Servers Starting!
echo ========================================
echo.
echo Mode:         CLOUD (Render Backend)
echo Admin Panel:  http://localhost:5173
echo Bot Server:   http://localhost:5001
echo Backend API:  https://major-86rr.onrender.com
echo.
echo NOTE: First request to Render may be slow (cold start)
echo       Wait 30-60 seconds for backend to wake up.
echo.
echo Check the opened terminal windows for server status.
echo Press any key to exit this window...
pause > nul
