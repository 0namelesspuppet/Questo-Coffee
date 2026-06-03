' Questo'yu KONSOL PENCERESI GORUNMEDEN baslatir.
'
' "Questo'yu Baslat.bat" dosyasini gizli (vbHide) pencerede, "gizli" argumaniyla
' calistirir. Boylece ne acilista (Gorev Zamanlayici) ne de elle calistirinca
' ham terminal penceresi gorunur. Sistemin durumu (Baslatiliyor / Calisiyor)
' "Questo Yonetim" penceresinden izlenir.
'
' Kullanim:  wscript baslat-gizli.vbs   (ya da uzerine cift tikla)

Option Explicit

Dim sh, fso, kok, bat, f, komut

Set sh  = CreateObject("WScript.Shell")
Set fso = CreateObject("Scripting.FileSystemObject")

' Bu VBS scripts/ icinde -> proje koku bir ust klasor
kok = fso.GetParentFolderName(fso.GetParentFolderName(WScript.ScriptFullName))
sh.CurrentDirectory = kok

' Baslat .bat'ini bul. Dosya adi Turkce 's' icerebilir ("Baslat") ama "lat.bat"
' soneki ASCII'dir ve yalniz baslatma .bat'inda gecer; guvenli eslesme.
bat = ""
For Each f In fso.GetFolder(kok).Files
  If InStr(LCase(f.Name), "lat.bat") > 0 Then
    bat = f.Path
    Exit For
  End If
Next

If bat = "" Then
  MsgBox "Baslatma .bat bulunamadi: " & kok, 16, "Questo"
  WScript.Quit 1
End If

' vbHide (0) pencerede, beklemeden calistir. "gizli" argumani -> bat hata
' halinde bile "pause" yapmaz, gorunmez pencerede kilitlenmez.
komut = """" & bat & """ gizli"
sh.Run komut, 0, False
