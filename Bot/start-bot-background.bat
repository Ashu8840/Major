@echo off
echo ====================================================
echo   Diaryverse AI Chatbot - Background Server Start
echo ====================================================
echo.

REM Check if virtual environment exists
if not exist venv (
    echo ERROR: Virtual environment not found!
    echo Please run setup.bat first
    pause
    exit /b 1
)

echo Starting chatbot server in background...
echo.
echo The server will run on: http://localhost:5001
echo.

REM Start server in background using PowerShell
powershell -Command "Start-Job -ScriptBlock { Set-Location '%~dp0'; .\venv\Scripts\python.exe app.py } | Out-Null; Start-Sleep -Seconds 12; Write-Host 'Server started successfully!' -ForegroundColor Green; Write-Host ''; Write-Host 'Test it with:' -ForegroundColor Cyan; Write-Host 'Invoke-RestMethod http://127.0.0.1:5001/health' -ForegroundColor Yellow; Write-Host ''; Write-Host 'To stop the server:' -ForegroundColor Cyan; Write-Host 'Get-Job | Stop-Job; Get-Job | Remove-Job' -ForegroundColor Yellow"

pause
