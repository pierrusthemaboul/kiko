# Script de demarrage SIMPLE - Tout en une fenetre
$OutputEncoding = [System.Text.Encoding]::UTF8

Write-Host "====================================" -ForegroundColor Cyan
Write-Host "KIKO - Demarrage complet" -ForegroundColor Cyan
Write-Host "====================================" -ForegroundColor Cyan
Write-Host ""

# 1. Verifier emulateur
Write-Host "1. Verification emulateur..." -ForegroundColor Yellow
$devices = adb devices | Select-String "device$"
if (-not $devices) {
    Write-Host "   ERREUR: Aucun emulateur detecte" -ForegroundColor Red
    Write-Host "   Lancez l'emulateur avec: emulator -avd Medium_Phone_API_36.1 &" -ForegroundColor Yellow
    Read-Host "Appuyez sur Entree pour quitter..."
    exit 1
}
Write-Host "   OK Emulateur actif" -ForegroundColor Green

# 2. Configurer tunnels ADB
Write-Host ""
Write-Host "2. Configuration tunnels ADB..." -ForegroundColor Yellow
adb reverse tcp:8081 tcp:8081 | Out-Null
adb reverse tcp:9090 tcp:9090 | Out-Null
adb reverse tcp:9091 tcp:9091 | Out-Null
Write-Host "   OK Tunnels configures" -ForegroundColor Green

# 3. Lancer OBSERVER en arriere-plan
Write-Host ""
Write-Host "3. Lancement OBSERVER..." -ForegroundColor Yellow
$observerJob = Start-Job -ScriptBlock {
    Set-Location $using:PWD
    node "entreprises virtuelles/orchestrateur.js" --observer
}
Start-Sleep -Seconds 2
Write-Host "   OK OBSERVER demarre (Job ID: $($observerJob.Id))" -ForegroundColor Green

# 4. Message final
Write-Host ""
Write-Host "====================================" -ForegroundColor Green
Write-Host "Pret! Lancement de Metro..." -ForegroundColor Green
Write-Host "====================================" -ForegroundColor Green
Write-Host ""
Write-Host "Commandes Metro utiles:" -ForegroundColor Gray
Write-Host "   a = Lancer sur Android" -ForegroundColor Gray
Write-Host "   r = Recharger l'app" -ForegroundColor Gray
Write-Host "   Ctrl+C = Arreter" -ForegroundColor Gray
Write-Host ""

# 5. Lancer Metro (en premier plan pour voir les logs)
npx expo start --dev-client --clear --android

# 6. Nettoyer OBSERVER quand Metro s'arrete
Write-Host ""
Write-Host "Arret de OBSERVER..." -ForegroundColor Yellow
Stop-Job $observerJob
Remove-Job $observerJob
Write-Host "Termine." -ForegroundColor Green
