# Firebase emulator'unu baslatir.
#
# Neden bu sarmalayici: dogrudan "--import=./emulator-veri" kullanmak, klasor
# yoksa (GitHub'dan taze indirme — emulator-veri/ .gitignore'da) ya da export
# metadata'si bozuk/bossa firebase CLI'yi hata verip kapatir. O zaman emulator
# hic acilmaz ve "Questo'yu Baslat.bat" [4/5]'te "emulator baslamadi" der.
#
# Davranis:
#   - emulator-veri/ gecerli bir export iceriyorsa  -> onu yukle (--import).
#   - yoksa / bossa                                 -> sifirdan basla.
# Her iki durumda da cikista emulator-veri'ye export edilir (veri kalici olur).

$ErrorActionPreference = 'Stop'
Set-Location -Path (Join-Path $PSScriptRoot '..')

$veriDir = 'emulator-veri'
$meta = Join-Path $veriDir 'firebase-export-metadata.json'
$gecerliExport = (Test-Path $meta) -and ((Get-Item $meta).Length -gt 0)

$ortak = @('emulators:start', '--only', 'auth,firestore,storage')

if ($gecerliExport) {
    Write-Host "[emulator] Mevcut emulator-veri yukleniyor..."
    firebase @ortak --import=./emulator-veri --export-on-exit
} else {
    Write-Host "[emulator] Emulator-veri yok/bos -> sifirdan baslatiliyor (cikista export edilecek)."
    firebase @ortak --export-on-exit=./emulator-veri
}
