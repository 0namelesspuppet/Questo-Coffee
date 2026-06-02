# Questo icin Masaustune bir kisayol (.lnk) olusturur.
#
# Boylece proje klasorune girmeden, masaustundeki "Questo" kisayoluna cift
# tiklayarak tiklanabilir GUI yonetim penceresini (Baslat / Durdur / Durum /
# Yeniden baslat) acabilirsiniz. Kisayol gizli baslatici scripts\yonetim-baslat.vbs
# uzerinden scripts\yonetim-gui.ps1 penceresini acar. (GUI yoksa dogrudan
# baslatma .bat'ina duser.)
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

# --- Logo .ico uret (yoksa) - kisayol ve pencere ikonu icin ---
# Repoda logo.jpg var; ondan 256x256 PNG-tabanli bir .ico uretip public\logo.ico
# olarak kaydederiz. Boylece ikon binary'sini repoda tutmaya gerek kalmaz.
$icoYol = Join-Path $kok 'public\logo.ico'
$jpgYol = Join-Path $kok 'public\logo.jpg'
if ((-not (Test-Path $icoYol)) -and (Test-Path $jpgYol)) {
    try {
        Add-Type -AssemblyName System.Drawing
        $img = [System.Drawing.Image]::FromFile($jpgYol)
        $kenar = [Math]::Min($img.Width, $img.Height)
        $bmp = New-Object System.Drawing.Bitmap 256, 256
        $g = [System.Drawing.Graphics]::FromImage($bmp)
        $g.InterpolationMode = [System.Drawing.Drawing2D.InterpolationMode]::HighQualityBicubic
        $kaynak = New-Object System.Drawing.Rectangle ([int](($img.Width - $kenar) / 2)), ([int](($img.Height - $kenar) / 2)), $kenar, $kenar
        $hedefR = New-Object System.Drawing.Rectangle 0, 0, 256, 256
        $g.DrawImage($img, $hedefR, $kaynak, [System.Drawing.GraphicsUnit]::Pixel)
        $g.Dispose()
        $ms = New-Object System.IO.MemoryStream
        $bmp.Save($ms, [System.Drawing.Imaging.ImageFormat]::Png)
        $png = $ms.ToArray()
        $fs = [System.IO.File]::Create($icoYol)
        $bw = New-Object System.IO.BinaryWriter $fs
        # ICONDIR: reserved=0, type=1 (icon), count=1
        $bw.Write([UInt16]0); $bw.Write([UInt16]1); $bw.Write([UInt16]1)
        # ICONDIRENTRY: 256x256 -> genislik/yukseklik 0 ile kodlanir
        $bw.Write([Byte]0); $bw.Write([Byte]0); $bw.Write([Byte]0); $bw.Write([Byte]0)
        $bw.Write([UInt16]1); $bw.Write([UInt16]32)
        $bw.Write([UInt32]$png.Length); $bw.Write([UInt32]22)
        $bw.Write($png); $bw.Flush(); $fs.Close()
        $img.Dispose(); $bmp.Dispose(); $ms.Dispose()
        Write-Host "[+] Logo ikonu olusturuldu: $icoYol"
    } catch {
        Write-Host "[i] Logo ikonu uretilemedi (varsayilan ikon kullanilacak)."
    }
}

# Kisayol hedefi - oncelik sirasi:
#   1) Tiklanabilir GUI penceresi (wscript ile gizli baslatici .vbs uzerinden)
#   2) GUI yoksa: dogrudan baslatma .bat'i
$guiVbs = Join-Path $kok 'scripts\yonetim-baslat.vbs'
$hedef = $null
$arg = ''
if (Test-Path $guiVbs) {
    $hedef = Join-Path $env:SystemRoot 'System32\wscript.exe'
    $arg = '"' + $guiVbs + '"'
    $aciklama = 'Questo GUI penceresi (tiklanabilir Baslat/Durdur/Durum)'
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
# -Menu kisayolu ayri isimle ('Questo Yonetim') olusur; GUI kisayoluyla cakismaz.
$masaustu = [Environment]::GetFolderPath('Desktop')
$kisayolAd = 'Questo Yonetim.lnk'
$lnk = Join-Path $masaustu $kisayolAd

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
