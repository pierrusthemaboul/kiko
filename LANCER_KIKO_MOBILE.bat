@echo off
TITLE TIMALAUS MOBILE DEV LAUNCHER
echo ==========================================
echo    LANCEMENT DE TIMALAUS MOBILE DEV
echo ==========================================

:: 1. Lancer l'emulateur
echo [1/3] Lancement de l'emulateur Android...
start /B "" "C:\Users\Pierre\AppData\Local\Android\Sdk\emulator\emulator.exe" -avd Medium_Phone_API_36.1 -netdelay none -netspeed full -memory 5120 -gpu host

echo Attente de l'initialisation (15s)...
timeout /t 15 /nobreak > nul

:: 2. ADB Reverse
echo [2/3] Configuration du pont ADB (port 8081)...
"C:\Users\Pierre\AppData\Local\Android\Sdk\platform-tools\adb.exe" reverse tcp:8081 tcp:8081

:: 3. Lancer Metro dans une nouvelle fenetre
echo [3/3] Lancement du serveur Metro...
cd mobile_app
start cmd /k "TITLE METRO_SERVER & set EXPO_PUBLIC_APP_VARIANT=development & npx expo start --dev-client"

echo.
echo ==========================================
echo    TOUT EST PREPRET ! 
echo    Appuie sur 'a' dans la fenetre Metro 
echo    quand l'emulateur est pret.
echo ==========================================
pause
