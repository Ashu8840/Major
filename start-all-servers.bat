@echo off
echo ================================
echo Starting All Diaryverse Servers
echo ================================
echo.

REM Start Backend Server (Port 5000)
echo [1/3] Starting Backend Server on Port 5000...
start "Backend Server" cmd /k "cd /d "%~dp0backend" && node server.js"
timeout /t 3 /nobreak > nul

REM Start Admin Panel (Port 5173/5174)
echo [2/3] Starting Admin Panel...
start "Admin Panel" cmd /k "cd /d "%~dp0admin" && npm run dev"
timeout /t 3 /nobreak > nul

REM Start Bot Server (Port 5001)
echo [3/3] Starting Bot Server on Port 5001...
start "Bot Server" cmd /k "cd /d "%~dp0Bot" && .\venv\Scripts\python.exe app.py"

echo.
echo ================================
echo All Servers Starting!
echo ================================
echo.
echo Backend:      http://localhost:5000
echo Admin Panel:  http://localhost:5173
echo Bot Server:   http://localhost:5001
echo.
echo Check the opened terminal windows for server status.
echo Press any key to exit this window...
pause > nul
