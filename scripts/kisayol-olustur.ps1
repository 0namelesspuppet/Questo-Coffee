# Questo icin Masaustune bir kisayol (.lnk) olusturur.
#
# Boylece proje klasorune girmeden, masaustundeki "Questo" kisayoluna cift
# tiklayarak yonetim menusunu (Baslat / Durdur / Durum) acabilirsiniz. Kisayol
# "Questo Yonetim.bat" dosyasini hedefler; o da klasore gecip baslat/durdur
# .bat'larini cagirir. (Yonetim menusu yoksa dogrudan baslatma .bat'ina duser.)
#
# Kullanim:
#   Olusturmak icin : sag tik > "PowerShell ile calistir"  (ya da)
#                     powershell -ExecutionPolicy Bypass -File scripts\kisayol-olustur.ps1
#   Kaldirmak       : powershell -ExecutionPolicy Bypass -File scripts\kisayol-olustur.ps1 -Kaldir
#
# Not: Yonetici yetkisi GEREKMEZ - kisayol kullanicinin kendi masaustune yazilir.
#
# ONEMLI: Bu dosya bilerek SADECE ASCII karakter icerir. Windows PowerShell 5.1
# (sag tik > "PowerShell ile calistir" bunu kullanir) BOM'suz UTF-8'i yanlis kod
# sayfasiyla okur; Turkce harf gibi karakterler ayristirma hatasina yol acar.

param([switch]$Kaldir)

$ErrorActionPreference = 'Stop'

# Proje koku (scripts/ bir ust)
$kok = Split-Path -Parent $PSScriptRoot

# Kisayol hedefi - oncelik sirasi:
#   1) Tiklanabilir GUI penceresi (wscript ile gizli baslatici .vbs uzerinden)
#   2) CMD yonetim menusu (Questo Yonetim.bat)
#   3) Dogrudan baslatma .bat'i
$guiVbs = Join-Path $kok 'scripts\yonetim-baslat.vbs'
$menuBat = Join-Path $kok 'Questo Yonetim.bat'
$hedef = $null
$arg = ''
if (Test-Path $guiVbs) {
    $hedef = Join-Path $env:SystemRoot 'System32\wscript.exe'
    $arg = '"' + $guiVbs + '"'
    $aciklama = 'Questo GUI penceresi (tiklanabilir Baslat/Durdur/Durum)'
} elseif (Test-Path $menuBat) {
    $hedef = $menuBat
    $aciklama = 'Questo yonetim menusu'
} else {
    # Dosya adi Turkce 's' (Baslat'taki) icerebilir - gercek dosyayi bul.
    $hedef = (Get-ChildItem -Path $kok -Filter '*Ba*lat.bat' -File | Select-Object -First 1).FullName
    $aciklama = 'Questo sistemini baslat'
}
if (-not $hedef -or -not (Test-Path $hedef)) {
    Write-Error "Kisayol hedefi bulunamadi: $kok"
    Start-Sleep -Seconds 6
    exit 1
}

# Masaustu yolu (OneDrive yonlendirmesine de saygi duyar)
$masaustu = [Environment]::GetFolderPath('Desktop')
$lnk = Join-Path $masaustu 'Questo.lnk'

# --- Kaldirma ---
if ($Kaldir) {
    if (Test-Path $lnk) {
        Remove-Item $lnk -Force
        Write-Host "[+] Masaustundeki 'Questo' kisayolu kaldirildi."
    } else {
        Write-Host "[i] Masaustunde 'Questo' kisayolu zaten yok."
    }
    Start-Sleep -Seconds 4
    exit
}

# --- Olusturma ---
$ws = New-Object -ComObject WScript.Shell
$sc = $ws.CreateShortcut($lnk)
$sc.TargetPath = $hedef
if ($arg) { $sc.Arguments = $arg }
$sc.WorkingDirectory = $kok
$sc.WindowStyle = 1
$sc.Description = $aciklama
# Logo varsa kisayol ikonu yap (ico/exe/dll yoksa varsayilan ikon kalir)
$ico = Join-Path $kok 'public\logo.ico'
if (Test-Path $ico) { $sc.IconLocation = $ico }
$sc.Save()

Write-Host ""
Write-Host "[+] Kisayol olusturuldu: $lnk"
Write-Host "    Hedef : $hedef $arg"
Write-Host ""
Write-Host "    Artik masaustundeki 'Questo' kisayoluna cift tiklayarak,"
Write-Host "    klasore girmeden tiklanabilir yonetim penceresini acabilirsiniz."
Write-Host ""
Write-Host "    Kaldirmak icin: scripts\kisayol-olustur.ps1 -Kaldir"
Write-Host ""
Write-Host "Pencereyi kapatabilirsiniz."
Start-Sleep -Seconds 5
