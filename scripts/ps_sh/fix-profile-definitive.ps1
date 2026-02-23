
$profilePath = $PROFILE
$originalLines = @()
$foundMess = $false

foreach ($line in Get-Content $profilePath) {
    if ($line -match "Ãtape 1" -or $line -match "# Étape 1" -or $line -match "Push-Location" -or $line -match "machine_a_evenements/" -or $line -match "Start-Kiko") {
        # This is where the mess starts
        break
    }
    $originalLines += $line
}

$projectPath = "C:\Users\Pierre\kiko"
$newBlock = @"

# === KIKO CHRONO ALIASES (DEFINITIVE) ===
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
Set-Alias -Name kiko -Value Start-Kiko -Force

function Start-Bureau {
    Push-Location "$projectPath"
    node machine_a_evenements/orchestrator.mjs `$args
    Pop-Location
}
Set-Alias -Name bureau -Value Start-Bureau -Force
Set-Alias -Name ideation -Value Start-Bureau -Force

function Start-Bureau2 {
    Push-Location "$projectPath"
    node machine_a_evenements/orchestrator2.mjs `$args
    Pop-Location
}
Set-Alias -Name bureau2 -Value Start-Bureau2 -Force

function Start-ChambreNoire {
    Push-Location "$projectPath"
    node machine_a_evenements/chambre_noire.mjs `$args
    Pop-Location
}
Set-Alias -Name chambre_noire -Value Start-ChambreNoire -Force
Set-Alias -Name chambre -Value Start-ChambreNoire -Force

function Start-Sevent {
    Push-Location "$projectPath"
    node machine_a_evenements/sevent3.mjs `$args
    Pop-Location
}
Set-Alias -Name sevent -Value Start-Sevent -Force

function Start-Migrer {
    Push-Location "$projectPath"
    node migrate.mjs `$args
    Pop-Location
}
Set-Alias -Name migrer -Value Start-Migrer -Force

function Start-Look {
    Push-Location "$projectPath"
    node machine_a_evenements/analyser.mjs `$args
    Pop-Location
}
Set-Alias -Name look -Value Start-Look -Force

function Start-Fix {
    Push-Location "$projectPath"
    node machine_a_evenements/edit.mjs `$args
    Pop-Location
}
Set-Alias -Name fix -Value Start-Fix -Force

# Outil: Synchronisation Production -> Local
function Start-Sync {
    Push-Location "$projectPath"
    node sync_prod_to_local.mjs `$args
    Pop-Location
}
Set-Alias -Name sync -Value Start-Sync -Force

# Outil: Conseil (Agent Mode)
function Start-Conseil {
    Push-Location "$projectPath"
    node machine_a_evenements/conseil.mjs `$args
    Pop-Location
}
Set-Alias -Name conseil -Value Start-Conseil -Force
# =======================================
"@

$finalContent = ($originalLines -join "`r`n").Trim() + "`r`n" + $newBlock
Set-Content -Path $profilePath -Value $finalContent -Encoding UTF8
