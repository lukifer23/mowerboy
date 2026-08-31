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
  shell.Popup "MowerBoy needs Node.js 20.19 or newer in the 20.x line, or Node.js 22.12 or newer. Ask the person who set up MowerBoy to install a supported version, then double-click this shortcut again.", 0, "MowerBoy needs setup", 48
  WScript.Quit 1
End If
command = "cmd.exe /d /c cd /d """ & root & """ && node scripts\gateway.mjs"
shell.Run command, 0, False
