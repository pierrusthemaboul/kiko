# Script de test Metro avec diagnostic
$OutputEncoding = [System.Text.Encoding]::UTF8

Write-Host "==================================" -ForegroundColor Cyan
Write-Host "TEST METRO - Diagnostic" -ForegroundColor Cyan
Write-Host "==================================" -ForegroundColor Cyan
Write-Host ""

# Verifier l'emulateur
Write-Host "1. Verification emulateur..." -ForegroundColor Yellow
$devices = adb devices | Select-String "device$"
if ($devices) {
    Write-Host "   OK Emulateur detecte" -ForegroundColor Green
} else {
    Write-Host "   ERREUR: Aucun emulateur" -ForegroundColor Red
    exit 1
}

# Configurer les tunnels
Write-Host ""
Write-Host "2. Configuration tunnels ADB..." -ForegroundColor Yellow
adb reverse tcp:8081 tcp:8081 | Out-Null
adb reverse tcp:9090 tcp:9090 | Out-Null
adb reverse tcp:9091 tcp:9091 | Out-Null
Write-Host "   OK Tunnels configures" -ForegroundColor Green

# Lancer Metro avec clear
Write-Host ""
Write-Host "3. Lancement Metro (avec nettoyage cache)..." -ForegroundColor Yellow
Write-Host "   Attention: Le premier bundling peut prendre 1-2 minutes" -ForegroundColor Gray
Write-Host ""

npx expo start --dev-client --clear
