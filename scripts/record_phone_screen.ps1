# Script pour enregistrer l'écran d'un device Android connecté
$ADB = "C:\Users\Pierre\AppData\Local\Android\Sdk\platform-tools\adb.exe"
$OUTPUT_DIR = "$PSScriptRoot\..\phone_recordings"

# Créer dossier de sortie
New-Item -ItemType Directory -Force -Path $OUTPUT_DIR | Out-Null

# Vérifier device connecté
Write-Host "Devices connectés:"
& $ADB devices
Write-Host ""

# Demander la durée d'enregistrement
$duration = Read-Host "Durée d'enregistrement en secondes (ex: 30 pour 30 secondes, max 180)"
if (-not $duration) { $duration = 30 }

# Demander si on veut enregistrer avec le son
$withAudio = Read-Host "Enregistrer avec le son? (o/n, défaut: n)"
$audioParam = ""
if ($withAudio -eq "o" -or $withAudio -eq "O") {
    $audioParam = "--audio-codec aac"
}

# Nom du fichier
$timestamp = Get-Date -Format "yyyyMMdd_HHmmss"
$filename = "recording_$timestamp.mp4"
$remotePath = "/sdcard/$filename"
$localPath = Join-Path $OUTPUT_DIR $filename

Write-Host "`nDébut de l'enregistrement ($duration secondes)..."
Write-Host "Appuyez sur Ctrl+C pour arrêter prématurément`n"

# Enregistrer sur le device
& $ADB shell screenrecord --time-limit=$duration $audioParam $remotePath

Write-Host "`nEnregistrement terminé. Transfert vers l'ordinateur..."

# Transférer vers l'ordinateur
& $ADB pull $remotePath $localPath

# Supprimer du device
& $ADB shell rm $remotePath

Write-Host "`nVidéo sauvegardée: $localPath"
Write-Host "Appuyez sur une touche pour ouvrir le dossier..."
$null = $Host.UI.RawUI.ReadKey("NoEcho,IncludeKeyDown")

# Ouvrir le dossier
explorer $OUTPUT_DIR
