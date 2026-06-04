# ===================================================================
# Questo — Kapanış Yedeği
# ===================================================================
# Emulator DURDURULMADAN ÖNCE çağrılır. Çalışan emulator'un içindeki
# canlı veriyi (adisyonlar, siparişler, ödemeler) `emulator-veri`
# klasörüne yazar; böylece yeniden başlatınca --import ile geri yüklenir.
#
# Neden gerekli: "Questo'yu Durdur.bat" emulator'u (java.exe) force-kill
# eder. Firebase'in --export-on-exit özelliği yalnızca temiz (graceful)
# kapanışta çalıştığından, force-kill'de son periyodik yedekten (15 dk)
# sonraki tüm adisyonlar kaybolurdu. Bu script o boşluğu kapatır.
#
# Atomik swap kullanır: export başarısız olursa mevcut emulator-veri
# korunur (yarım/bozuk export'la üzerine yazılmaz).
# ===================================================================

$ErrorActionPreference = 'Continue'
$ProjectId = 'demo-questo'

$Kok = Split-Path -Parent (Split-Path -Parent $MyInvocation.MyCommand.Path)
$VeriKlasor = Join-Path $Kok 'emulator-veri'
$temp = Join-Path $Kok 'emulator-veri-yeni'
$eski = Join-Path $Kok 'emulator-veri-eski'

# Export GERCEKTEN veri iceriyor mu? (exit-code 0 olsa bile bos/yarim export
# olabilir; bunu swap etmek iyi veriyi siler.) metadata + firestore_export sart.
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

# Önceki yarım kalmış temp'i temizle
if (Test-Path $temp) {
    Remove-Item -Recurse -Force $temp -ErrorAction SilentlyContinue
}

Write-Host "Kapanis yedegi aliniyor (adisyonlar diske yaziliyor)..."
Push-Location $Kok
try {
    & firebase emulators:export $temp --project=$ProjectId --force 2>&1 | Out-Null
    $exitCode = $LASTEXITCODE
} finally {
    Pop-Location
}

if ($exitCode -ne 0 -or -not (Test-GecerliExport $temp)) {
    Write-Host "  ! Export basarisiz/eksik (emulator durmus ya da bos export) - mevcut emulator-veri korunuyor."
    if (Test-Path $temp) { Remove-Item -Recurse -Force $temp -ErrorAction SilentlyContinue }
    exit 1
}

# Atomik swap: emulator-veri -> emulator-veri-eski, temp -> emulator-veri
try {
    if (Test-Path $eski) { Remove-Item -Recurse -Force $eski }
    if (Test-Path $VeriKlasor) { Rename-Item $VeriKlasor 'emulator-veri-eski' }
    Rename-Item $temp 'emulator-veri'
    Write-Host "  + Kapanis yedegi alindi -> emulator-veri (adisyonlar korundu)."
    exit 0
} catch {
    Write-Host "  ! Swap basarisiz: $($_.Exception.Message)"
    exit 1
}
