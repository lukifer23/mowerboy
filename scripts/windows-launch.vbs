Option Explicit
Dim shell, fso, root, command, check
Set shell = CreateObject("WScript.Shell")
Set fso = CreateObject("Scripting.FileSystemObject")
root = fso.GetParentFolderName(fso.GetParentFolderName(WScript.ScriptFullName))
Set check = shell.Exec("cmd.exe /d /c where node >nul 2>&1")
Do While check.Status = 0
  WScript.Sleep 50
Loop
If check.ExitCode <> 0 Then
  shell.Popup "MowerBoy needs Node.js 20 or newer once on this computer. Ask the person who set up MowerBoy to install Node.js, then double-click this shortcut again.", 0, "MowerBoy needs setup", 48
  WScript.Quit 1
End If
command = "cmd.exe /d /c cd /d """ & root & """ && node scripts\gateway.mjs"
shell.Run command, 0, False
