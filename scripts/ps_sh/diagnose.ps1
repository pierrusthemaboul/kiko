# Script de diagnostic complet
$OutputEncoding = [System.Text.Encoding]::UTF8

Write-Host "========================================" -ForegroundColor Cyan
Write-Host "DIAGNOSTIC KIKO" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""

# 1. Emulateur
Write-Host "1. Emulateur Android:" -ForegroundColor Yellow
$emulator = adb devices | Select-String "device$"
if ($emulator) {
    Write-Host "   OK Emulateur actif" -ForegroundColor Green
} else {
    Write-Host "   ERREUR Aucun emulateur" -ForegroundColor Red
}

# 2. Processus Node
Write-Host ""
Write-Host "2. Processus Node.js:" -ForegroundColor Yellow
$nodeProcs = Get-Process node -ErrorAction SilentlyContinue
if ($nodeProcs) {
    Write-Host "   OK $($nodeProcs.Count) processus Node actifs" -ForegroundColor Green
    foreach ($proc in $nodeProcs) {
        $memMB = [math]::Round($proc.WorkingSet64 / 1MB, 0)
        Write-Host "     - PID $($proc.Id): ${memMB}MB" -ForegroundColor Gray
    }
} else {
    Write-Host "   ERREUR Aucun processus Node" -ForegroundColor Red
}

# 3. Tunnels ADB
Write-Host ""
Write-Host "3. Tunnels ADB:" -ForegroundColor Yellow
$tunnels = adb reverse --list 2>&1
if ($tunnels -match "8081" -and $tunnels -match "9090") {
    Write-Host "   OK Tunnels configures" -ForegroundColor Green
    Write-Host "     $tunnels" -ForegroundColor Gray
} else {
    Write-Host "   ERREUR Tunnels manquants" -ForegroundColor Red
}

# 4. Metro status
Write-Host ""
Write-Host "4. Metro Bundler:" -ForegroundColor Yellow
try {
    $response = Invoke-WebRequest -Uri "http://localhost:8081/status" -TimeoutSec 2 -ErrorAction Stop
    Write-Host "   OK Metro repond (HTTP $($response.StatusCode))" -ForegroundColor Green
} catch {
    Write-Host "   ERREUR Metro ne repond pas" -ForegroundColor Red
}

# 5. OBSERVER
Write-Host ""
Write-Host "5. OBSERVER (port 9091):" -ForegroundColor Yellow
try {
    $observerTest = Test-NetConnection -ComputerName localhost -Port 9091 -WarningAction SilentlyContinue -InformationLevel Quiet
    if ($observerTest) {
        Write-Host "   OK OBSERVER ecoute sur le port 9091" -ForegroundColor Green
    } else {
        Write-Host "   ERREUR OBSERVER n ecoute pas" -ForegroundColor Red
    }
} catch {
    Write-Host "   ERREUR Impossible de verifier OBSERVER" -ForegroundColor Red
}

# 6. Derniers logs
Write-Host ""
Write-Host "6. Derniers logs OBSERVER:" -ForegroundColor Yellow
$logFile = "entreprises virtuelles/REPORTERS_UNIT/AGENTS/OBSERVER/STORAGE/INPUT/current_session.json"
if (Test-Path $logFile) {
    $content = Get-Content $logFile -Raw | ConvertFrom-Json
    $lastLogs = $content | Select-Object -Last 3
    foreach ($log in $lastLogs) {
        $time = ([DateTime]$log.timestamp).ToString("HH:mm:ss")
        Write-Host "   [$time] $($log.source): $($log.message)" -ForegroundColor Gray
    }
} else {
    Write-Host "   ERREUR Fichier de logs introuvable" -ForegroundColor Red
}

# 7. App installee
Write-Host ""
Write-Host "7. Application installee:" -ForegroundColor Yellow
$appInstalled = adb shell pm list packages | Select-String "juno2.dev"
if ($appInstalled) {
    Write-Host "   OK com.pierretulle.juno2.dev installee" -ForegroundColor Green
} else {
    Write-Host "   ERREUR Application non installee" -ForegroundColor Red
}

Write-Host ""
Write-Host "========================================" -ForegroundColor Cyan
Write-Host "Diagnostic termine" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
