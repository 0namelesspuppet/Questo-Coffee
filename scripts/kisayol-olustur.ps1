# Questo icin Masaustune bir kisayol (.lnk) olusturur.
#
# Boylece proje klasorune girmeden, masaustundeki "Questo" kisayoluna cift
# tiklayarak sistemi baslatabilirsiniz. Kisayol, "Questo'yu Baslat.bat"
# dosyasini hedefler; bat zaten kendi klasorune gecip her seyi ayaga kaldirir.
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

# Proje koku (scripts/ bir ust) ve baslatma .bat dosyasi
$kok = Split-Path -Parent $PSScriptRoot
$bat = Join-Path $kok "Questo'yu Baslat.bat"
if (-not (Test-Path $bat)) {
    # Dosya adi Turkce 's' (Baslat'taki) icerebilir - gercek dosyayi bul.
    $bat = (Get-ChildItem -Path $kok -Filter '*Ba*lat.bat' -File | Select-Object -First 1).FullName
}
if (-not $bat -or -not (Test-Path $bat)) {
    Write-Error "Baslatma .bat dosyasi bulunamadi: $kok"
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
$sc.TargetPath = $bat
$sc.WorkingDirectory = $kok
$sc.WindowStyle = 1
$sc.Description = 'Questo sistemini baslat'
# Logo varsa kisayol ikonu yap (ico/exe/dll yoksa varsayilan bat ikonu kalir)
$ico = Join-Path $kok 'public\logo.ico'
if (Test-Path $ico) { $sc.IconLocation = $ico }
$sc.Save()

Write-Host ""
Write-Host "[+] Kisayol olusturuldu: $lnk"
Write-Host "    Hedef : $bat"
Write-Host ""
Write-Host "    Artik masaustundeki 'Questo' kisayoluna cift tiklayarak,"
Write-Host "    klasore girmeden sistemi baslatabilirsiniz."
Write-Host ""
Write-Host "    Kaldirmak icin: scripts\kisayol-olustur.ps1 -Kaldir"
Write-Host ""
Write-Host "Pencereyi kapatabilirsiniz."
Start-Sleep -Seconds 5
