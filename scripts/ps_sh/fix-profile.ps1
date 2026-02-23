
$profilePath = $PROFILE
if (-not (Test-Path $profilePath)) { exit }

$content = Get-Content $profilePath -Raw

# Remove all Kiko related blocks (everything from the first occurrence of certain keywords to the end of such blocks)
# This is tricky because the file is a mess. 
# Let's just remove anything that mentions "machine_a_evenements" or "Start-Kiko" or "Start-Bureau" etc.

$lines = Get-Content $profilePath
$cleanLines = @()
$skip = $false

foreach ($line in $lines) {
    if ($line -match "Start-Kiko" -or $line -match "Start-Bureau" -or $line -match "Start-Sevent" -or $line -match "Start-Look" -or $line -match "Start-Migrer" -or $line -match "Start-Sync" -or $line -match "Start-Star" -or $line -match "Start-Fix") {
        # This line is part of a function or alias we want to remove
        continue
    }
    if ($line -match "Set-Alias -Name (kiko|bureau|ideation|bureau2|chambre_noire|sevent|migrer|sync|star|look|fix|chambre)") {
        continue
    }
    if ($line -match "function Start-" -and ($line -match "Bureau" -or $line -match "Kiko" -or $line -match "Sevent" -or $line -match "Migrer" -or $line -match "Look" -or $line -match "Fix")) {
        continue
    }
    # Remove headers
    if ($line -match "# === KIKO CHRONO" -or $line -match "# Étape" -or $line -match "# Outil:" -or $line -match "# Alias court") {
        continue
    }
    
    $cleanLines += $line
}

# Add the clean block
$projectPath = "C:\Users\Pierre\kiko"
$newBlock = @"

# === KIKO CHRONO ALIASES (CLEANED) ===
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

function Start-Bureau {
    Push-Location "$projectPath"
    node machine_a_evenements/orchestrator.mjs `$args
    Pop-Location
}
Set-Alias -Name bureau -Value Start-Bureau
Set-Alias -Name ideation -Value Start-Bureau

function Start-Bureau2 {
    Push-Location "$projectPath"
    node machine_a_evenements/orchestrator2.mjs `$args
    Pop-Location
}
Set-Alias -Name bureau2 -Value Start-Bureau2

function Start-ChambreNoire {
    Push-Location "$projectPath"
    node machine_a_evenements/chambre_noire.mjs `$args
    Pop-Location
}
Set-Alias -Name chambre_noire -Value Start-ChambreNoire
Set-Alias -Name chambre -Value Start-ChambreNoire

function Start-Sevent {
    Push-Location "$projectPath"
    node machine_a_evenements/sevent3.mjs `$args
    Pop-Location
}
Set-Alias -Name sevent -Value Start-Sevent

function Start-Migrer {
    Push-Location "$projectPath"
    node migrate.mjs `$args
    Pop-Location
}
Set-Alias -Name migrer -Value Start-Migrer

function Start-Look {
    Push-Location "$projectPath"
    node machine_a_evenements/analyser.mjs `$args
    Pop-Location
}
Set-Alias -Name look -Value Start-Look

function Start-Fix {
    Push-Location "$projectPath"
    node machine_a_evenements/edit.mjs `$args
    Pop-Location
}
Set-Alias -Name fix -Value Start-Fix
# =======================================
"@

$finalContent = ($cleanLines -join "`n").Trim() + "`n" + $newBlock
Set-Content -Path $profilePath -Value $finalContent -Encoding UTF8
