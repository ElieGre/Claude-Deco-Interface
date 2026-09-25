' Launches Claude Interface with no console window.
' scripts\launch.mjs rebuilds only when the source changed since the last build, then starts Electron directly.
' Output goes to launch.log in this folder (check it if the app doesn't open).
Set sh = CreateObject("WScript.Shell")
sh.CurrentDirectory = CreateObject("Scripting.FileSystemObject").GetParentFolderName(WScript.ScriptFullName)
sh.Run "node scripts\launch.mjs", 0, False
