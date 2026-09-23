$WshShell = New-Object -comObject WScript.Shell
$Shortcut = $WshShell.CreateShortcut("C:\Users\pierr\Desktop\Admin Web.lnk")
$Shortcut.TargetPath = "C:\Users\pierr\dev\kiko\admin_web\start_admin_web.bat"
$Shortcut.WorkingDirectory = "C:\Users\pierr\dev\kiko\admin_web"
$Shortcut.Description = "Lancer Admin Web"
$Shortcut.Save()
