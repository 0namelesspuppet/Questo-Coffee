# Manuel tek-seferlik yedek — riskli operasyondan önce çağır
# Kullanım:
#   powershell -ExecutionPolicy Bypass -File scripts\yedek-al-elle.ps1
#
# yedekler\ klasörüne tarih-saat damgalı zip oluşturur, periodic script'in
# rotasyonundan etkilenmez (manuel yedek adında "elle-" prefix var).

$ErrorActionPreference = 'Stop'
$ProjectId = 'demo-questo'

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

$Kok = Split-Path -Parent (Split-Path -Parent $MyInvocation.MyCommand.Path)
$YedekKlasor = Join-Path $Kok 'yedekler'
if (-not (Test-Path $YedekKlasor)) {
    New-Item -ItemType Directory -Path $YedekKlasor -Force | Out-Null
}

$tempDir = Join-Path $Kok 'emulator-veri-elle-temp'
if (Test-Path $tempDir) { Remove-Item -Recurse -Force $tempDir }

Write-Host "Emulator export ediliyor..."
Push-Location $Kok
try {
    & firebase emulators:export $tempDir --project=$ProjectId --force
} finally {
    Pop-Location
}

if (-not (Test-GecerliExport $tempDir)) {
    Write-Host "HATA: Export basarisiz/eksik (emulator calisiyor mu? veri bos mu?)" -ForegroundColor Red
    if (Test-Path $tempDir) { Remove-Item -Recurse -Force $tempDir -ErrorAction SilentlyContinue }
    exit 1
}

$damga = Get-Date -Format 'yyyy-MM-dd_HH-mm-ss'
$zipYolu = Join-Path $YedekKlasor "elle-$damga.zip"
Compress-Archive -Path "$tempDir\*" -DestinationPath $zipYolu -Force
Remove-Item -Recurse -Force $tempDir

Write-Host "Yedek hazır: $zipYolu" -ForegroundColor Green
Write-Host "Boyut: $([math]::Round((Get-Item $zipYolu).Length / 1KB, 1)) KB"
