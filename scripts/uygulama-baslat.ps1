# Questo uygulamasini PRODUCTION modunda baslatir.
#
# Neden: "next dev" her sayfayi ILK tiklandiginda derler (on-demand compile),
# bu yuzden gunun ilk tiklamalari saniyelerce yavas olur. "next build" + "next
# start" ise tum sayfalari onceden derler => ilk tiklamalar da aninda acilir.
#
# Akilli davranis:
#   - Kaynak dosyalar son build'den yeni DEGILSE  -> build atlanir, aninda start.
#   - Kaynak degismisse (kod guncellendi)         -> bir kez build, sonra start.
#   - Build herhangi bir sebeple basarisiz olursa -> dukkan acilabilsin diye
#                                                     "next dev" ile devam (yavas
#                                                     ama calisir) -- guvenlik agi.

$ErrorActionPreference = 'Stop'
Set-Location -Path (Join-Path $PSScriptRoot '..')

$buildId = '.next\BUILD_ID'
$rebuild = $true

if (Test-Path $buildId) {
    $buildZamani = (Get-Item $buildId).LastWriteTime

    # Sadece bizim kaynaklarimizi tara (.next / node_modules haric).
    $kaynaklar = @()
    $kaynaklar += Get-ChildItem -Recurse -File -Path src, public -ErrorAction SilentlyContinue
    $kokDosyalar = 'next.config.ts', 'package.json', 'package-lock.json',
                   'tailwind.config.ts', 'postcss.config.mjs', '.env.local'
    $kaynaklar += Get-Item -Path $kokDosyalar -ErrorAction SilentlyContinue

    $enYeni = ($kaynaklar | Measure-Object -Property LastWriteTime -Maximum).Maximum
    if ($enYeni -le $buildZamani) {
        $rebuild = $false
    }
}

if ($rebuild) {
    Write-Host "[build] Kaynak degismis ya da ilk calistirma -> production build yapiliyor (~30 sn)..."
    # .next altinda SADECE bayat output artefaktlarini sil, 'cache'i KORU.
    # webpack/SWC persistent cache + incremental TS sayesinde ardisik build'ler
    # cok daha hizli olur. Output (BUILD_ID, server/, static/) yine silindigi icin
    # dev<->prod vendor-chunk karisimi olusmaz; webpack cache'i mode'a gore (
    # *-development / *-production) ayri tuttugu icin cache'i korumak guvenli.
    if (Test-Path .next) {
        Get-ChildItem -Force .next -Exclude cache |
            Remove-Item -Recurse -Force -ErrorAction SilentlyContinue
    }
    npm run build
    if ($LASTEXITCODE -ne 0) {
        Write-Host "[build] BASARISIZ! Dukkan acilabilsin diye dev moduna dusuluyor (ilk tiklamalar yavas olabilir)."
        npm run dev
        exit $LASTEXITCODE
    }
    Write-Host "[build] Tamamlandi."
} else {
    Write-Host "[build] Build guncel -> derleme atlandi, dogrudan baslatiliyor."
}

Write-Host "[start] next start (production) baslatiliyor..."
npm run start
