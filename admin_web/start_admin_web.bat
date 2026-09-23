@echo off
cd /d "C:\Users\pierr\dev\kiko\admin_web"
echo Lancement du serveur backend (HTTPS)...
start "Admin Web Server" cmd /k "npm run server"
timeout /t 3 /nobreak >nul
echo Lancement du frontend...
start "Admin Web Frontend" cmd /k "npm run dev"
echo Admin Web est en cours de lancement...
echo Le backend sera disponible sur https://localhost:3001
echo Le frontend sera disponible sur http://localhost:5173
