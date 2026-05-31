# Questo'yu Windows acilisinda (oturum acildiginda) otomatik baslatir.
#
# Ne yapar: "Questo'yu Baslat.bat" dosyasini Gorev Zamanlayiciya (Task
# Scheduler) "oturum acildiginda" tetikleyicisiyle, en yuksek yetkiyle kaydeder.
# Boylece bilgisayar her acildiginda sistem kendiliginden ayaga kalkar.
#
# Kullanim:
#   Kurmak icin : sag tik > "PowerShell ile calistir"  (ya da)
#                 powershell -ExecutionPolicy Bypass -File scripts\otomatik-baslat-kur.ps1
#   Kaldirmak   : powershell -ExecutionPolicy Bypass -File scripts\otomatik-baslat-kur.ps1 -Kaldir
#
# Not: Yonetici yetkisi gerekir; script gerekirse kendini otomatik yukseltir (UAC).
#
# ONEMLI: Bu dosya bilerek SADECE ASCII karakter icerir. Windows PowerShell 5.1
# (sag tik > "PowerShell ile calistir" bunu kullanir) BOM'suz UTF-8'i yanlis kod
# sayfasiyla okur; Turkce harf / kutu-cizgi / uzun tire gibi karakterler ayristirma
# hatasina yol acar. Bu yuzden burada Turkce karakter ve sus karakteri kullanilmaz.

param([switch]$Kaldir)

$ErrorActionPreference = 'Stop'
$gorevAdi = 'Questo Otomatik Baslat'

# --- Yonetici degilse kendini yukselt (UAC) ---
$kimlik = [Security.Principal.WindowsIdentity]::GetCurrent()
$yetki  = New-Object Security.Principal.WindowsPrincipal($kimlik)
if (-not $yetki.IsInRole([Security.Principal.WindowsBuiltinRole]::Administrator)) {
    Write-Host "Yonetici yetkisi gerekiyor - UAC iletisinde 'Evet' deyin..."
    $argList = @('-NoProfile','-ExecutionPolicy','Bypass','-File',"`"$PSCommandPath`"")
    if ($Kaldir) { $argList += '-Kaldir' }
    Start-Process -FilePath 'powershell.exe' -ArgumentList $argList -Verb RunAs
    exit
}

# --- Kaldirma ---
if ($Kaldir) {
    $mevcut = Get-ScheduledTask -TaskName $gorevAdi -ErrorAction SilentlyContinue
    if ($mevcut) {
        Unregister-ScheduledTask -TaskName $gorevAdi -Confirm:$false
        Write-Host "[+] '$gorevAdi' gorevi kaldirildi. Sistem artik acilista otomatik baslamaz."
    } else {
        Write-Host "[i] '$gorevAdi' zaten kayitli degil."
    }
    Write-Host "`nPencereyi kapatabilirsiniz."
    Start-Sleep -Seconds 4
    exit
}

# --- Kurulum ---
$kok = Split-Path -Parent $PSScriptRoot          # proje koku (scripts/ bir ust)
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

$action = New-ScheduledTaskAction -Execute $env:ComSpec -Argument "/c `"$bat`"" -WorkingDirectory $kok
$trigger = New-ScheduledTaskTrigger -AtLogOn -User "$env:USERDOMAIN\$env:USERNAME"
$principal = New-ScheduledTaskPrincipal -UserId "$env:USERDOMAIN\$env:USERNAME" -LogonType Interactive -RunLevel Highest
$settings = New-ScheduledTaskSettingsSet -AllowStartIfOnBatteries -DontStopIfGoingOnBatteries -StartWhenAvailable -ExecutionTimeLimit ([TimeSpan]::Zero)

Register-ScheduledTask -TaskName $gorevAdi -Action $action -Trigger $trigger -Principal $principal -Settings $settings -Force | Out-Null

Write-Host ""
Write-Host "[+] Kuruldu! Bilgisayar her acildiginda (oturum acilinca) Questo otomatik baslayacak."
Write-Host "    Gorev adi : $gorevAdi"
Write-Host "    Komut     : $bat"
Write-Host ""
Write-Host "    Kaldirmak icin: scripts\otomatik-baslat-kur.ps1 -Kaldir"
Write-Host ""
Write-Host "Pencereyi kapatabilirsiniz."
Start-Sleep -Seconds 6
