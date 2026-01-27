# Script de demarrage rapide pour Kiko Chrono
# Usage: .\gokiko.ps1

$OutputEncoding = [System.Text.Encoding]::UTF8

Write-Host "====================================" -ForegroundColor Cyan
Write-Host "KIKO STARTUP - Initialisation complete" -ForegroundColor Cyan
Write-Host "====================================" -ForegroundColor Cyan

# Fonction pour attendre l'emulateur
function Wait-Emulator {
    Write-Host "`nAttente de l'emulateur..." -ForegroundColor Yellow
    $maxAttempts = 30
    $attempt = 0

    while ($attempt -lt $maxAttempts) {
        $devices = adb devices 2>$null | Select-String "device$"
        if ($devices) {
            Write-Host "OK Emulateur detecte!" -ForegroundColor Green
            return $true
        }
        $attempt++
        Start-Sleep -Seconds 1
    }

    Write-Host "ERREUR: Emulateur non trouve apres 30 secondes" -ForegroundColor Red
    return $false
}

# Fonction pour configurer les tunnels ADB
function Setup-ADBTunnels {
    Write-Host "`nConfiguration des tunnels ADB..." -ForegroundColor Cyan

    $tunnels = @(8081, 9091, 9090)
    $allSuccess = $true

    foreach ($port in $tunnels) {
        $result = adb reverse "tcp:$port" "tcp:$port" 2>&1
        if ($LASTEXITCODE -eq 0) {
            Write-Host "   OK Port $port configure" -ForegroundColor Green
        } else {
            Write-Host "   ERREUR Port $port : $result" -ForegroundColor Red
            $allSuccess = $false
        }
    }

    Write-Host "`nVerification des tunnels..." -ForegroundColor Cyan
    $reverseList = adb reverse --list 2>&1
    Write-Host $reverseList

    return $allSuccess
}

# Execution principale
if (-not (Wait-Emulator)) {
    Write-Host "Lancez l emulateur manuellement et relancez ce script." -ForegroundColor Yellow
    Read-Host "Appuyez sur Entree pour continuer..."
}

if (-not (Setup-ADBTunnels)) {
    Write-Host "Certains tunnels ont echoue. Verifiez l emulateur et relancez." -ForegroundColor Yellow
}

Write-Host "`nLancement du serveur Metro..." -ForegroundColor Green
Write-Host "Astuce: Appuyez sur r pour recharger l app" -ForegroundColor Gray
Write-Host "Astuce: Appuyez sur a pour forcer Android" -ForegroundColor Gray

# Lance Metro
npx expo start --dev-client

# Une fois qu on quitte Metro
Write-Host "`nMetro arrete." -ForegroundColor Yellow
