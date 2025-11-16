@echo off
echo ========================================
echo Expo App Build Helper
echo ========================================
echo.

cd /d "%~dp0"

echo Current directory: %CD%
echo.

:menu
echo What would you like to do?
echo.
echo 1. Install EAS CLI
echo 2. Login to Expo
echo 3. Configure Project
echo 4. Build Android APK (Preview)
echo 5. Build Android APK (Production)
echo 6. Build iOS (Production)
echo 7. View Builds Online
echo 8. Start Development Server
echo 9. Exit
echo.

set /p choice="Enter your choice (1-9): "

if "%choice%"=="1" goto install_eas
if "%choice%"=="2" goto login
if "%choice%"=="3" goto configure
if "%choice%"=="4" goto build_android_preview
if "%choice%"=="5" goto build_android_production
if "%choice%"=="6" goto build_ios
if "%choice%"=="7" goto view_builds
if "%choice%"=="8" goto dev_server
if "%choice%"=="9" goto end

echo Invalid choice. Please try again.
echo.
goto menu

:install_eas
echo.
echo Installing EAS CLI...
npm install -g eas-cli
echo.
echo EAS CLI installed successfully!
pause
goto menu

:login
echo.
echo Logging in to Expo...
eas login
echo.
echo Login complete!
pause
goto menu

:configure
echo.
echo Configuring project...
eas build:configure
echo.
echo Configuration complete!
pause
goto menu

:build_android_preview
echo.
echo Building Android APK (Preview)...
echo This will take 5-15 minutes.
echo.
eas build -p android --profile preview
echo.
echo Build complete! Check the link above to download your APK.
pause
goto menu

:build_android_production
echo.
echo Building Android APK (Production)...
echo This will take 5-15 minutes.
echo.
eas build -p android --profile production
echo.
echo Build complete! Check the link above to download your APK.
pause
goto menu

:build_ios
echo.
echo Building iOS (Production)...
echo Note: This requires an Apple Developer account.
echo.
eas build -p ios --profile production
echo.
echo Build complete! Check the link above to download your IPA.
pause
goto menu

:view_builds
echo.
echo Opening Expo Dashboard in browser...
start https://expo.dev/
echo.
echo Navigate to your project to view builds.
pause
goto menu

:dev_server
echo.
echo Starting development server...
echo Scan QR code with Expo Go app to test on your phone.
echo.
npx expo start
pause
goto menu

:end
echo.
echo Goodbye!
exit
