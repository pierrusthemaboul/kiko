# Script pour capturer des écrans depuis device Android connecté
$ADB = "C:\Users\Pierre\AppData\Local\Android\Sdk\platform-tools\adb.exe"
$OUTPUT_DIR = "$PSScriptRoot\..\screenshots"

# Créer dossier de sortie
New-Item -ItemType Directory -Force -Path $OUTPUT_DIR | Out-Null

# Vérifier device connecté
& $ADB devices
Write-Host "`nAppuyez sur une touche pour capturer l'écran actuel (Ctrl+C pour quitter)..."
Write-Host "Les captures seront sauvegardées dans: $OUTPUT_DIR`n"

$count = 1
while ($true) {
    $timestamp = Get-Date -Format "yyyyMMdd_HHmmss"
    $filename = "screenshot_$timestamp.png"
    $filepath = Join-Path $OUTPUT_DIR $filename
    
    & $ADB shell screencap -p /sdcard/$filename
    & $ADB pull /sdcard/$filename $filepath
    & $ADB shell rm /sdcard/$filename
    
    Write-Host "Capture $count sauvegardée: $filename"
    $count++
    
    Read-Host "Appuyez sur Entrée pour la capture suivante"
}
