# Script PowerShell pour créer une tâche planifiée de backup quotidien
# À exécuter en tant qu'administrateur

$Action = New-ScheduledTaskAction -Execute "node.exe" -Argument "backup_daily.mjs" -WorkingDirectory "C:\Users\Pierre\kiko"
$Trigger = New-ScheduledTaskTrigger -Daily -At 3am
$Settings = New-ScheduledTaskSettingsSet -StartWhenAvailable -WakeToRun
$Principal = New-ScheduledTaskPrincipal -UserId "NT AUTHORITY\SYSTEM" -LogonType ServiceAccount

Register-ScheduledTask -TaskName "Kiko Daily Backup" -Action $Action -Trigger $Trigger -Settings $Settings -Principal $Principal -Force

Write-Host "✅ Tâche planifiée créée : Backup quotidien à 3h du matin"
Write-Host "📁 Backups sauvegardés dans : C:\Users\Pierre\kiko\backups\"
Write-Host "🔍 Vérifiez avec : Get-ScheduledTask -TaskName 'Kiko Daily Backup'"
