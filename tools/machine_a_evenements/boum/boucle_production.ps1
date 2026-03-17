$ErrorActionPreference = "Stop"

Write-Host "==========================================================" -ForegroundColor Green
Write-Host "🚀 DÉMARRAGE DE LA PRODUCTION MASSIVE (TIMALAUS)" -ForegroundColor Green
Write-Host "==========================================================" -ForegroundColor Green

while ($true) {
    $date = Get-Date -Format "HH:mm:ss"
    Write-Host "[$date] --- Nouveau lot de 20 événements ---" -ForegroundColor Cyan
    
    # 1. Génération des Scénarios
    node tools/machine_a_evenements/boum/scenariste.mjs
    
    # 2. Génération des Images et Upload Remote
    node tools/machine_a_evenements/boum/peintre.mjs
    
    # Vérification si il reste du travail (Optionnel, on peut juste looper)
    Write-Host "Lot terminé. Pause de sécurité de 30 secondes..." -ForegroundColor DarkGray
    Start-Sleep -Seconds 30
}
