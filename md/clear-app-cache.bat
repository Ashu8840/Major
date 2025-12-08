@echo off
echo ============================================
echo  React Native App - Clear Cache Fix
echo ============================================
echo.
echo This will fix the InternalBytecode.js error
echo and clear all cached data.
echo.

cd "%~dp0app"

echo [1/5] Stopping Metro bundler...
taskkill /F /IM node.exe /T 2>nul
timeout /t 2 /nobreak > nul

echo [2/5] Clearing Expo cache...
rd /s /q .expo 2>nul
rd /s /q node_modules\.cache 2>nul

echo [3/5] Clearing Metro cache...
npx expo start --clear --no-dev --minify

echo [4/5] Clearing watchman (if installed)...
watchman watch-del-all 2>nul

echo [5/5] Clearing temp files...
rd /s /q %TEMP%\metro-* 2>nul
rd /s /q %TEMP%\haste-map-* 2>nul
rd /s /q %TEMP%\react-* 2>nul

echo.
echo ============================================
echo  Cache Cleared!
echo ============================================
echo.
echo To start fresh:
echo   1. Close this window
echo   2. Run: cd app
echo   3. Run: npx expo start --clear
echo.
pause
