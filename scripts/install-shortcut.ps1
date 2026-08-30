$ErrorActionPreference = 'Stop'
$projectRoot = Split-Path -Parent $PSScriptRoot
$desktop = [Environment]::GetFolderPath('Desktop')
$shortcutPath = Join-Path $desktop 'MowerBoy.lnk'
$shell = New-Object -ComObject WScript.Shell
$shortcut = $shell.CreateShortcut($shortcutPath)
$shortcut.TargetPath = Join-Path $env:WINDIR 'System32\wscript.exe'
$shortcut.Arguments = '"' + (Join-Path $PSScriptRoot 'windows-launch.vbs') + '"'
$shortcut.WorkingDirectory = $projectRoot
$shortcut.Description = 'Start MowerBoy and show the iPad QR code'
$iconPath = Join-Path $projectRoot 'MowerBoy.ico'
if (Test-Path -LiteralPath $iconPath) {
    $shortcut.IconLocation = "$iconPath,0"
}
$shortcut.Save()
Write-Host "MowerBoy is ready on the Desktop." -ForegroundColor Green
Write-Host "Double-click the MowerBoy icon to start the game and show the iPad QR code."
