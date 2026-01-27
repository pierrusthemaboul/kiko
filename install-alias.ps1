# Script d'installation de l'alias 'kiko' pour PowerShell
# Usage: .\install-alias.ps1

$OutputEncoding = [System.Text.Encoding]::UTF8

Write-Host "========================================" -ForegroundColor Cyan
Write-Host "Installation de l'alias 'kiko'" -ForegroundColor Cyan
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

# === KIKO CHRONO ALIAS ===
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
"@

# Vérifier si l'alias existe déjà
$profileContent = Get-Content $profilePath -Raw -ErrorAction SilentlyContinue

if ($profileContent -match "Start-Kiko") {
    Write-Host ""
    Write-Host "L'alias 'kiko' existe deja dans le profil." -ForegroundColor Yellow
    Write-Host "Voulez-vous le remplacer? (O/N): " -NoNewline -ForegroundColor Yellow
    $response = Read-Host

    if ($response -eq "O" -or $response -eq "o") {
        # Supprimer l'ancien alias
        $profileContent = $profileContent -replace "(?ms)# === KIKO CHRONO ALIAS ===.*?Set-Alias -Name kiko -Value Start-Kiko", ""
        Set-Content -Path $profilePath -Value $profileContent
        Add-Content -Path $profilePath -Value $aliasCommand
        Write-Host "   OK Alias mis a jour!" -ForegroundColor Green
    } else {
        Write-Host "   Annule. Alias existant conserve." -ForegroundColor Gray
        exit 0
    }
} else {
    # Ajouter l'alias
    Add-Content -Path $profilePath -Value $aliasCommand
    Write-Host "   OK Alias 'kiko' ajoute au profil!" -ForegroundColor Green
}

Write-Host ""
Write-Host "========================================" -ForegroundColor Green
Write-Host "Installation terminee!" -ForegroundColor Green
Write-Host "========================================" -ForegroundColor Green
Write-Host ""
Write-Host "Pour utiliser l'alias 'kiko':" -ForegroundColor Cyan
Write-Host "  1. Fermez et rouvrez PowerShell" -ForegroundColor White
Write-Host "  2. Tapez: kiko" -ForegroundColor White
Write-Host ""
Write-Host "Ou rechargez le profil maintenant:" -ForegroundColor Gray
Write-Host "  . `$PROFILE" -ForegroundColor Gray
Write-Host ""
