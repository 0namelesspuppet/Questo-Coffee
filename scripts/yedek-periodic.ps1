# ===================================================================
# Questo — Periodic Yedek Scripti
# ===================================================================
# Her N saniyede bir Firestore emulator'un içindeki veriyi diske yazar.
# --export-on-exit yalnız clean shutdown'da çalışır; elektrik kesintisi
# veya crash durumunda son export'tan sonraki tüm sipariş/ödeme kaybolur.
# Bu script çalışırken: kayıp en fazla son periyodun süresi kadar olur.
#
# Ek olarak günde bir kez zip'lenmiş kopya `yedekler/` klasörüne atılır.
# Son 30 günlük zip rotasyonu yapılır (eskileri otomatik silinir).
#
# Kullanım:
#   - "Questo'yu Başlat.bat" içinden gizli-calistir.vbs ile çağrılabilir
#   - Veya manuel: powershell -ExecutionPolicy Bypass -File scripts\yedek-periodic.ps1
#
# Loglar: logs\yedek.log (gizli-calistir.vbs üzerinden çağrılırsa)
# ===================================================================

$ErrorActionPreference = 'Continue'
$ProjectId = 'demo-questo'
$PeriyotSn = 3600 # 60 dakika
$ZipTutGun = 30   # son 30 günlük zip sakla

# Script kendisi scripts/ içinde — kök iki üst klasör (script -> scripts -> kök)
$ScriptKlasoru = Split-Path -Parent $MyInvocation.MyCommand.Path
$Kok = Split-Path -Parent $ScriptKlasoru
$VeriKlasor = Join-Path $Kok 'emulator-veri'
$YedekKlasor = Join-Path $Kok 'yedekler'

if (-not (Test-Path $YedekKlasor)) {
    New-Item -ItemType Directory -Path $YedekKlasor -Force | Out-Null
}

function Yaz-Log {
    param([string]$mesaj, [string]$seviye = 'INFO')
    $zaman = Get-Date -Format 'yyyy-MM-dd HH:mm:ss'
    Write-Output "[$zaman] [$seviye] $mesaj"
}

# Export GERCEKTEN veri iceriyor mu? (exit 0 olsa bile bos/yarim olabilir;
# bunu swap etmek iyi veriyi siler.) metadata + firestore_export sart.
function Test-GecerliExport {
    param([string]$dir)
    if (-not (Test-Path $dir)) { return $false }
    $meta = Join-Path $dir 'firebase-export-metadata.json'
    if (-not ((Test-Path $meta) -and ((Get-Item $meta).Length -gt 0))) { return $false }
    $fs = Join-Path $dir 'firestore_export'
    if (-not (Test-Path $fs)) { return $false }
    if (-not (Get-ChildItem -Path $fs -Force -ErrorAction SilentlyContinue)) { return $false }
    return $true
}

function Periyodik-Export {
    $temp = Join-Path $Kok 'emulator-veri-yeni'
    $eski = Join-Path $Kok 'emulator-veri-eski'

    # Önceki başarısız export'tan kalmış temp varsa temizle
    if (Test-Path $temp) {
        Remove-Item -Recurse -Force $temp -ErrorAction SilentlyContinue
    }

    # Export — emulator çalışmıyorsa hata verir, sessizce geç
    Push-Location $Kok
    try {
        & firebase emulators:export $temp --project=$ProjectId --force 2>&1 | Out-Null
        $exitCode = $LASTEXITCODE
    } finally {
        Pop-Location
    }

    if ($exitCode -ne 0) {
        Yaz-Log "Export başarısız (exit=$exitCode) — emulator durmuş olabilir" 'WARN'
        if (Test-Path $temp) { Remove-Item -Recurse -Force $temp -ErrorAction SilentlyContinue }
        return $false
    }

    if (-not (Test-GecerliExport $temp)) {
        Yaz-Log "Export eksik/bos (metadata veya firestore_export yok) - swap atlandi, mevcut veri korunuyor" 'WARN'
        if (Test-Path $temp) { Remove-Item -Recurse -Force $temp -ErrorAction SilentlyContinue }
        return $false
    }

    # Atomik swap: emulator-veri → emulator-veri-eski, temp → emulator-veri
    try {
        if (Test-Path $eski) { Remove-Item -Recurse -Force $eski }
        if (Test-Path $VeriKlasor) { Rename-Item $VeriKlasor 'emulator-veri-eski' }
        Rename-Item $temp 'emulator-veri'
        Yaz-Log "Export tamam"
        return $true
    } catch {
        Yaz-Log "Swap başarısız: $($_.Exception.Message)" 'ERROR'
        return $false
    }
}

function Gunluk-Zip {
    $bugun = Get-Date -Format 'yyyy-MM-dd'
    $zipYolu = Join-Path $YedekKlasor "emulator-veri-$bugun.zip"

    if (Test-Path $zipYolu) {
        # Bugünün zip'i zaten var, atla
        return
    }

    if (-not (Test-Path $VeriKlasor)) {
        Yaz-Log "emulator-veri yok, zip atlandı" 'WARN'
        return
    }

    try {
        Compress-Archive -Path "$VeriKlasor\*" -DestinationPath $zipYolu -Force

        # Zip gercekten aciliyor ve bos degil mi? Bozuksa rotasyona GIRME
        # (eski saglam zip'leri silme) - aksi halde tek bozuk zip tum gecmisi siler.
        $gecerliZip = $false
        try {
            Add-Type -AssemblyName System.IO.Compression.FileSystem -ErrorAction SilentlyContinue
            $arsiv = [System.IO.Compression.ZipFile]::OpenRead($zipYolu)
            $gecerliZip = $arsiv.Entries.Count -gt 0
            $arsiv.Dispose()
        } catch {
            # Tur yuklenemedi ya da zip bozuk -> en azindan dosya boyutuna bak
            $gecerliZip = (Test-Path $zipYolu) -and ((Get-Item $zipYolu).Length -gt 0)
        }
        if (-not $gecerliZip) {
            Yaz-Log "Zip bozuk/bos, rotasyon atlandi (eski yedekler korunuyor): $zipYolu" 'ERROR'
            return
        }
        Yaz-Log "Günlük zip oluştu: $zipYolu"

        # Rotasyon: son $ZipTutGun zip'i sakla, gerisini sil
        Get-ChildItem -Path $YedekKlasor -Filter '*.zip' |
            Sort-Object LastWriteTime -Descending |
            Select-Object -Skip $ZipTutGun |
            ForEach-Object {
                Remove-Item $_.FullName -Force
                Yaz-Log "Eski yedek silindi: $($_.Name)"
            }
    } catch {
        Yaz-Log "Zip başarısız: $($_.Exception.Message)" 'ERROR'
    }
}

Yaz-Log "Periodic yedek başladı (periyot=$PeriyotSn sn, zip rotation=$ZipTutGun gün)"
Yaz-Log "Kök: $Kok"
Yaz-Log "Veri: $VeriKlasor"
Yaz-Log "Yedek: $YedekKlasor"

# İlk çalıştırmada hemen değil — emulator'ın başlamasını bekle
Start-Sleep -Seconds 30

while ($true) {
    try {
        $basariliExport = Periyodik-Export
        if ($basariliExport) {
            Gunluk-Zip
        }
    } catch {
        Yaz-Log "Döngüde beklenmedik hata: $($_.Exception.Message)" 'ERROR'
    }
    Start-Sleep -Seconds $PeriyotSn
}
