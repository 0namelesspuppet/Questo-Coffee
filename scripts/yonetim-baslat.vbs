' Questo Yonetim penceresini (GUI) konsol penceresi GORUNMEDEN acar.
' Masaustu kisayolu bunu (wscript ile) hedefler. PowerShell'i gizli (0)
' calistirir; yalniz WinForms penceresi gorunur.

Set fso = CreateObject("Scripting.FileSystemObject")
scriptDir = fso.GetParentFolderName(WScript.ScriptFullName)  ' ...\scripts
kok = fso.GetParentFolderName(scriptDir)                     ' proje koku
gui = kok & "\scripts\yonetim-gui.ps1"

Set sh = CreateObject("WScript.Shell")
sh.CurrentDirectory = kok
sh.Run "powershell.exe -NoProfile -ExecutionPolicy Bypass -WindowStyle Hidden -File """ & gui & """", 0, False
