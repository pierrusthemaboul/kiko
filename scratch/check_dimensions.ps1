Add-Type -AssemblyName System.Drawing
Get-ChildItem -Path "c:\Users\Pierre\kiko\screenshots\*.jpg" | ForEach-Object {
    try {
        $img = [System.Drawing.Image]::FromFile($_.FullName)
        Write-Output "$($_.Name): $($img.Width)x$($img.Height)"
        $img.Dispose()
    } catch {
        Write-Error "Failed to process $($_.Name)"
    }
}
