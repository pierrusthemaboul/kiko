# Script de demarrage COMPLET pour Kiko Chrono
# Lance automatiquement Metro (gokiko) ET OBSERVER dans deux fenetres separees
# Usage: .\startup_complete.ps1
#
# Ce script:
# 1. Nettoie les anciens processus Node.js
# 2. Verifie/Lance l'emulateur Android
# 3. Configure les tunnels ADB
# 4. Lance Metro et OBSERVER dans deux fenetres separees

$OutputEncoding = [System.Text.Encoding]::UTF8

Write-Host ""
Write-Host "========================================" -ForegroundColor Cyan
Write-Host "  KIKO CHRONO - Demarrage Automatise" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""
Write-Host "Date: $(Get-Date -Format 'yyyy-MM-dd HH:mm:ss')" -ForegroundColor Gray
Write-Host ""

# Fonction pour nettoyer les processus Node.js
function Kill-NodeProcesses {
    Write-Host "Nettoyage des processus Node.js..." -ForegroundColor Yellow
    $nodeProcesses = Get-Process node -ErrorAction SilentlyContinue
    if ($nodeProcesses) {
        Write-Host "   Arret de $($nodeProcesses.Count) processus Node.js..." -ForegroundColor Gray
        Stop-Process -Name node -Force -ErrorAction SilentlyContinue
        Start-Sleep -Seconds 2
        Write-Host "   OK Processus Node.js arretes" -ForegroundColor Green
    } else {
        Write-Host "   OK Aucun processus Node.js detecte" -ForegroundColor Green
    }
}

# Fonction pour verifier si l'emulateur est lance
function Wait-Emulator {
    Write-Host "Verification de l'emulateur Android..." -ForegroundColor Yellow
    $devices = adb devices 2>$null | Select-String "device$"

    if ($devices) {
        Write-Host "   OK Emulateur deja lance!" -ForegroundColor Green
        return $true
    }

    Write-Host "   Lancement de l'emulateur Medium_Phone_API_36.1..." -ForegroundColor Yellow
    # On lance l'emulateur dans sa propre fenetre pour ne pas polluer le terminal actuel
    # On redirige les logs vers un fichier pour debug si besoin
    Start-Process -FilePath "emulator" -ArgumentList "-avd", "Medium_Phone_API_36.1" -WindowStyle Minimized

    Write-Host "   Attente du demarrage de l'emulateur (30 secondes)..." -ForegroundColor Yellow
    $maxAttempts = 30
    $attempt = 0

    while ($attempt -lt $maxAttempts) {
        $devices = adb devices 2>$null | Select-String "device$"
        if ($devices) {
            Write-Host "   OK Emulateur demarre (ADB Pret)!" -ForegroundColor Green
            return $true
        }
        Start-Sleep -Seconds 1
        $attempt++
    }

    Write-Host "   ERREUR: Emulateur non detecte apres 30 secondes" -ForegroundColor Red
    return $false
}

# Fonction pour configurer les tunnels ADB
function Setup-ADBTunnels {
    Write-Host "Configuration des tunnels ADB..." -ForegroundColor Yellow
    $tunnels = @(8081, 9091, 9090)

    foreach ($port in $tunnels) {
        $result = adb reverse "tcp:$port" "tcp:$port" 2>&1
        if ($LASTEXITCODE -eq 0) {
            Write-Host "   OK Port $port configure" -ForegroundColor Green
        } else {
            Write-Host "   ERREUR Port ${port}: $result" -ForegroundColor Red
        }
    }
}

# Etape 0: Nettoyer les anciens processus
Kill-NodeProcesses

# Etape 0.5: Lancer l'emulateur et configurer les tunnels
Write-Host ""
if (-not (Wait-Emulator)) {
    Write-Host "ERREUR: Impossible de lancer l'emulateur. Verifiez Android SDK." -ForegroundColor Red
    Read-Host "Appuyez sur Entree pour quitter..."
    exit 1
}

Write-Host ""
Setup-ADBTunnels

# Etape 1: Lancer gokiko (Metro) dans une nouvelle fenetre PowerShell
Write-Host ""
Write-Host "1. Lancement du serveur Metro (gokiko)..." -ForegroundColor Green
# On ajoute --android pour lancer l'app automatiquement sur l'emulateur
Start-Process PowerShell -ArgumentList "-NoExit", "-Command", "cd '$PWD'; npx expo start --dev-client --android"
Write-Host "   OK Fenetre Metro ouverte (App lancée sur Android)" -ForegroundColor Green

# Attendre que Metro soit pret (environ 10-15 secondes)
Write-Host ""
Write-Host "Attente du demarrage de Metro..." -ForegroundColor Yellow
Start-Sleep -Seconds 8

# Etape 2: Lancer goobs (OBSERVER) dans une nouvelle fenetre PowerShell
Write-Host ""
Write-Host "2. Lancement de l'agent OBSERVER..." -ForegroundColor Green
Start-Process PowerShell -ArgumentList "-NoExit", "-Command", "cd '$PWD'; node 'entreprises virtuelles/orchestrateur.js' --observer"
Write-Host "   OK Fenetre OBSERVER ouverte" -ForegroundColor Green

# Etape 3: Informer l'utilisateur
Write-Host ""
Write-Host "====================================" -ForegroundColor Green
Write-Host "OK DEMARRAGE COMPLET TERMINE!" -ForegroundColor Green
Write-Host "====================================" -ForegroundColor Green
Write-Host ""
Write-Host "Deux fenetres ont ete ouvertes:" -ForegroundColor Cyan
Write-Host "  1. Metro Bundler (serveur Expo)" -ForegroundColor White
Write-Host "  2. OBSERVER (agent de surveillance)" -ForegroundColor White
Write-Host ""
Write-Host "Reactotron Desktop est maintenant pret et connecte!" -ForegroundColor Green
Write-Host ""
Write-Host "Raccourcis utiles dans la fenetre Metro:" -ForegroundColor Gray
Write-Host "   r = Recharger l'app" -ForegroundColor Gray
Write-Host "   a = Forcer Android" -ForegroundColor Gray
Write-Host "   j = Ouvrir debugger" -ForegroundColor Gray
Write-Host ""
Write-Host "Logs en temps reel dans:" -ForegroundColor Gray
Write-Host "   entreprises virtuelles/REPORTERS_UNIT/AGENTS/OBSERVER/STORAGE/INPUT/current_session.json" -ForegroundColor Gray
Write-Host ""
Write-Host "Vous pouvez fermer cette fenetre maintenant." -ForegroundColor Cyan
