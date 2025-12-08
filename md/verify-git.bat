@echo off
echo ============================================
echo   Git Pre-Push Verification
echo ============================================
echo.

REM Check if in Git repository
git rev-parse --git-dir >nul 2>&1
if errorlevel 1 (
    echo [ERROR] Not a Git repository!
    pause
    exit /b 1
)

echo [1/6] Checking if Bot/ directory is excluded...
git ls-files | findstr /C:"Bot/" >nul 2>&1
if errorlevel 1 (
    echo [PASS] Bot/ directory is excluded from Git
) else (
    echo [WARN] Bot/ directory has tracked files! Run: git rm -r --cached Bot/
)
echo.

echo [2/6] Checking if .env files are excluded...
git ls-files | findstr /R "\.env$" | findstr /V "example" >nul 2>&1
if errorlevel 1 (
    echo [PASS] .env files are excluded from Git
) else (
    echo [WARN] Found .env files in Git! Run: git rm --cached */.env
    git ls-files | findstr /R "\.env$" | findstr /V "example"
)
echo.

echo [3/6] Checking .gitignore exists and includes Bot/...
findstr /C:"Bot/" .gitignore >nul 2>&1
if errorlevel 1 (
    echo [FAIL] .gitignore doesn't exclude Bot/ directory!
) else (
    echo [PASS] .gitignore properly configured
)
echo.

echo [4/6] Checking repository size...
for /f "delims=" %%a in ('git count-objects -v ^| findstr "size-pack"') do set REPO_SIZE=%%a
echo %REPO_SIZE%
echo.

echo [5/6] Checking for large files...
git ls-files | findstr /R "\.bin$ \.pkl$ \.h5$ \.pth$ \.pt$" >nul 2>&1
if errorlevel 1 (
    echo [PASS] No large ML model files found
) else (
    echo [WARN] Found large files:
    git ls-files | findstr /R "\.bin$ \.pkl$ \.h5$ \.pth$ \.pt$"
)
echo.

echo [6/6] Verifying Render URL configuration...
findstr /C:"major-86rr.onrender.com" app\.env >nul 2>&1
if errorlevel 1 (
    echo [WARN] app/.env might not be configured for Render
) else (
    echo [PASS] app/.env configured for Render backend
)
echo.

echo ============================================
echo   Summary
echo ============================================
echo.
echo Files staged for commit:
git diff --cached --name-only
echo.
echo Files modified (not staged):
git status --short | findstr /R "^ M"
echo.
echo Untracked files:
git status --short | findstr /R "^\?\?"
echo.
echo ============================================
echo   Ready to Push?
echo ============================================
echo.
echo If all checks passed, you can run:
echo   git add .
echo   git commit -m "Configure Render deployment"
echo   git push origin main
echo.
pause
