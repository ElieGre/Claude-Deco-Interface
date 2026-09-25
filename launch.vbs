' Builds and launches Claude Interface with no console window.
' Output goes to launch.log in this folder (check it if the app doesn't open).
Set sh = CreateObject("WScript.Shell")
sh.CurrentDirectory = CreateObject("Scripting.FileSystemObject").GetParentFolderName(WScript.ScriptFullName)
sh.Run "cmd /c npm run start > launch.log 2>&1", 0, False
