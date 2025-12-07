@echo off
echo ======================================
echo Diaryverse AI Chatbot Setup
echo ======================================
echo.

REM Check if Python is installed
python --version >nul 2>&1
if errorlevel 1 (
    echo ERROR: Python is not installed or not in PATH
    echo Please install Python 3.8 or higher from https://python.org
    pause
    exit /b 1
)

echo Step 1: Creating virtual environment...
python -m venv venv
if errorlevel 1 (
    echo ERROR: Failed to create virtual environment
    pause
    exit /b 1
)

echo Step 2: Activating virtual environment...
call venv\Scripts\activate.bat

echo Step 3: Upgrading pip...
python -m pip install --upgrade pip

echo Step 4: Installing dependencies...
echo This may take several minutes...
REM Install PyTorch first to avoid platform-specific version resolution issues
echo Installing PyTorch (explicit version)...
pip install torch==2.2.2 || (
    echo WARNING: Failed to install torch==2.2.2 directly, continuing to requirements.txt (pip may handle compatible version)
)

pip install -r requirements.txt
if errorlevel 1 (
    echo ERROR: Failed to install dependencies
    pause
    exit /b 1
)

echo.
echo Step 5: Creating .env file...
if not exist .env (
    copy .env.example .env
    echo Created .env file from .env.example
) else (
    echo .env file already exists
)

echo.
echo ======================================
echo Setup Complete!
echo ======================================
echo.
echo To start the chatbot server:
echo   1. Run: start-bot.bat
echo   OR
echo   2. Activate venv: venv\Scripts\activate
echo      Then run: python app.py
echo.
echo The server will run on: http://localhost:5001
echo.
pause
