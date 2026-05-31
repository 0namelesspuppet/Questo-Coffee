# Questo'yu Tailscale uzerinden HTTPS olarak yayinlar (farkli aglardan erisim).
#
# Mantik: PC host kalir; Tailscale ozel sanal agi sayesinde telefon/tablet
# HANGI AGDA olursa olsun (mobil veri dahil) PC'ye sabit bir isimle baglanir.
# 'tailscale serve' yerel 3000 portunu, tailnet'e ait GERCEK/guvenilir bir
# HTTPS sertifikasiyla disari verir; boylece iOS'ta tam PWA da calisir.
#
# Davranis:
#   - Tailscale kurulu DEGILSE  -> sessizce cik (lokal-only kullanim bozulmaz).
#   - Kurulu ama oturum kapaliysa -> ne yapilmasi gerektigini yaz, cik.
#   - Kurulu ve hazirsa          -> 3000'i yayinla, kullanilacak URL'i yaz.
#
# Bu script "Questo'yu Baslat.bat" tarafindan Next.js ayaga kalktiktan sonra
# otomatik cagrilir; elle de calistirabilirsiniz.
#
# ONEMLI: Bu dosya bilerek SADECE ASCII icerir (Windows PowerShell 5.1, BOM'suz
# UTF-8'deki Turkce/kutu-cizgi/uzun-tire karakterlerini yanlis okuyup ayristirma
# hatasi verir). Bu yuzden burada Turkce karakter ve sus karakteri kullanilmaz.

$ErrorActionPreference = 'SilentlyContinue'

# --- Tailscale'i bul ---
$ts = Join-Path $env:ProgramFiles 'Tailscale\tailscale.exe'
if (-not (Test-Path $ts)) {
    $cmd = Get-Command tailscale.exe -ErrorAction SilentlyContinue
    if ($cmd) { $ts = $cmd.Source }
}
if (-not (Test-Path $ts)) {
    Write-Host "[tailscale] Kurulu degil - uzaktan erisim atlandi (yerel ag erisimi normal calisir)."
    exit 0
}

# --- Oturum / baglanti durumu ---
$durumJson = & $ts status --json 2>$null
if (-not $durumJson) {
    Write-Host "[tailscale] Calismiyor ya da oturum kapali. 'tailscale up' ile giris yapin."
    exit 0
}
$durum = $durumJson | ConvertFrom-Json
if ($durum.BackendState -ne 'Running') {
    Write-Host "[tailscale] Baglanti hazir degil (durum: $($durum.BackendState)). 'tailscale up' calistirin."
    exit 0
}

# --- 3000 portunu HTTPS olarak yayinla (arka planda, kalici) ---
& $ts serve --bg 3000 2>$null | Out-Null

# --- Kullanilacak URL'i hesapla ve yaz ---
$dns = $durum.Self.DNSName
if ($dns) {
    $dns = $dns.TrimEnd('.')
    $url = "https://$dns"
    Write-Host ""
    Write-Host "[tailscale] Uzaktan erisim ACIK:"
    Write-Host "    $url"
    Write-Host ""
    Write-Host "    Telefon/tabletten (Tailscale acikken, herhangi bir agdan) bu adresi acin."
    Write-Host "    QR/PWA icin .env.local -> NEXT_PUBLIC_APP_URL=$url yapabilirsiniz."
} else {
    Write-Host "[tailscale] Yayinlandi. Adres icin: tailscale serve status"
}
exit 0
