# Script d'installation des alias Kiko pour PowerShell
# Usage: .\install-alias.ps1

$OutputEncoding = [System.Text.Encoding]::UTF8

Write-Host "========================================" -ForegroundColor Cyan
Write-Host "Installation des alias Kiko (Steps 1, 2, 3)" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""

# Chemin du profil PowerShell
$profilePath = $PROFILE

# Créer le fichier de profil s'il n'existe pas
if (-not (Test-Path $profilePath)) {
    Write-Host "Creation du profil PowerShell..." -ForegroundColor Yellow
    New-Item -Path $profilePath -Type File -Force | Out-Null
    Write-Host "   OK Profil cree: $profilePath" -ForegroundColor Green
} else {
    Write-Host "Profil PowerShell existant: $profilePath" -ForegroundColor Gray
}

# Alias à ajouter
$projectPath = $PWD.Path
$aliasCommand = @"

# === KIKO CHRONO ALIASES ===
function Start-Kiko {
    param([string]`$path = "$projectPath")
    if (Test-Path `$path) {
        Push-Location `$path
        Write-Host "Demarrage de Kiko depuis: `$path" -ForegroundColor Cyan
        & ".\startup_complete.ps1"
        Pop-Location
    } else {
        Write-Host "ERREUR: Le chemin n'existe pas: `$path" -ForegroundColor Red
    }
}
Set-Alias -Name kiko -Value Start-Kiko

# Étape 1: Recherche d'événements (Le Bureau)
function Start-Bureau {
    Push-Location "$projectPath"
    node machine_a_evenements/orchestrator.mjs `$args
    Pop-Location
}
Set-Alias -Name bureau -Value Start-Bureau
Set-Alias -Name ideation -Value Start-Bureau

# Étape 1b: Recherche d'événements QUALITÉ (Bureau 2 - Stratégique)
function Start-Bureau2 {
    Push-Location "$projectPath"
    node machine_a_evenements/orchestrator2.mjs `$args
    Pop-Location
}
Set-Alias -Name bureau2 -Value Start-Bureau2

# Étape 2: Illustration (Chambre Noire - Agent Mode)
function Start-ChambreNoire {
    Push-Location "$projectPath"
    node machine_a_evenements/chambre_noire.mjs `$args
    Pop-Location
}
Set-Alias -Name chambre_noire -Value Start-ChambreNoire

# Étape 2 (Legacy): Illustration (Sevent - Monolith Mode)
function Start-Sevent {
    Push-Location "$projectPath"
    node machine_a_evenements/sevent3.mjs `$args
    Pop-Location
}
Set-Alias -Name sevent -Value Start-Sevent

# Étape 3: Transfert (Migration)
function Start-Migrer {
    Push-Location "$projectPath"
    node migrate.mjs `$args
    Pop-Location
}
Set-Alias -Name migrer -Value Start-Migrer

# Outil: Synchronisation Production -> Local
function Start-Sync {
    Push-Location "$projectPath"
    node sync_prod_to_local.mjs `$args
    Pop-Location
}
Set-Alias -Name sync -Value Start-Sync
# =======================================
"@

# Vérifier si l'alias existe déjà
$profileContent = Get-Content $profilePath -Raw -ErrorAction SilentlyContinue

if ($profileContent -match "Start-Kiko" -or $profileContent -match "Start-Bureau") {
    Write-Host ""
    Write-Host "Les alias Kiko existent deja dans le profil." -ForegroundColor Yellow
    # On nettoie l'ancien bloc pour mettre à jour
    $profileContent = $profileContent -replace "(?ms)# === KIKO CHRONO ALIAS.*?Set-Alias -Name (kiko|migrer) -Value Start-(Kiko|Migrer).*?(# =+)?", ""
    Set-Content -Path $profilePath -Value $profileContent.Trim()
    Add-Content -Path $profilePath -Value "`n$aliasCommand"
    Write-Host "   OK Alias Kiko mis a jour (kiko, bureau, sevent, migrer)!" -ForegroundColor Green
} else {
    # Ajouter l'alias
    Add-Content -Path $profilePath -Value "`n$aliasCommand"
    Write-Host "   OK Alias Kiko ajoutes au profil!" -ForegroundColor Green
}

Write-Host ""
Write-Host "========================================" -ForegroundColor Green
Write-Host "Installation terminee!" -ForegroundColor Green
Write-Host "========================================" -ForegroundColor Green
Write-Host ""
Write-Host "Pour utiliser les alias :" -ForegroundColor Cyan
Write-Host "  1. Fermez et rouvrez PowerShell" -ForegroundColor White
Write-Host "  2. Commandes : bureau, bureau2, chambre_noire, sevent, migrer, kiko" -ForegroundColor White
Write-Host ""
Write-Host "Ou rechargez le profil maintenant :" -ForegroundColor Gray
Write-Host "  . `$PROFILE" -ForegroundColor Gray
Write-Host ""
