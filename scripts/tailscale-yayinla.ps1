# Questo'ya farkli aglardan erisim adresini (Tailscale) bildirir.
#
# MIMARI KARARI (neden HTTP, neden 'serve' YOK):
#   Bu sistem YEREL Firebase emulator kullanir (auth/firestore yalniz HTTP konusur).
#   Sayfa HTTPS'ten servis edilirse, istemci emulator'e HTTP ile baglanamaz
#   ("mixed content" -> auth/network-request-failed). Bu yuzden HTTPS 'tailscale
#   serve' KULLANMIYORUZ. Bunun yerine sayfa da emulator de DUZ HTTP, ayni host
#   (Tailscale IP/MagicDNS adi) uzerinden konusur -> mixed content yok, auth calisir.
#   Trafik zaten Tailscale (WireGuard) tarafindan sifrelenir; "guvensiz" etiketi
#   kozmetiktir. PC acik oldugu surece her agdan (mobil veri dahil) erisilir.
#
# Davranis:
#   - Tailscale kurulu DEGILSE     -> sessizce cik (lokal-only kullanim bozulmaz).
#   - Kurulu ama oturum kapaliysa   -> ne yapilmasi gerektigini yaz, cik.
#   - Kurulu ve hazirsa            -> eski HTTPS serve varsa temizle, HTTP adresini yaz.
#
# Bu script "Questo'yu Baslat.bat" tarafindan otomatik cagrilir; elle de calisir.
#
# ONEMLI: Bu dosya bilerek SADECE ASCII icerir (Windows PowerShell 5.1 BOM'suz
# UTF-8'deki Turkce/kutu-cizgi/uzun-tire karakterlerini yanlis okuyup ayristirmayi
# bozar). Bu yuzden burada Turkce karakter ve sus karakteri kullanilmaz.

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

# --- Eski HTTPS 'serve' yapilandirmasi varsa temizle ---
# (Onceki surumlerde HTTPS serve aciliyordu; bu adres auth'u bozdugu icin
#  artik kullanilmiyor. Stale kalmasin diye sifirla.)
& $ts serve reset 2>$null | Out-Null

# --- Erisim adres(ler)ini hesapla ve yaz (DUZ HTTP, port 3000) ---
$ip  = $durum.Self.TailscaleIPs | Select-Object -First 1
$dns = $durum.Self.DNSName
if ($dns) { $dns = $dns.TrimEnd('.') }

Write-Host ""
Write-Host "[tailscale] Uzaktan erisim ACIK. Telefon/tabletten (Tailscale acikken,"
Write-Host "            herhangi bir agdan) asagidaki adresi acin:"
Write-Host ""
if ($dns) { Write-Host "    http://${dns}:3000" }
if ($ip)  { Write-Host "    http://${ip}:3000   (yedek - IP ile)" }
Write-Host ""
Write-Host "    Not: 'https' DEGIL 'http' kullanin (emulator HTTP konusur; trafik"
Write-Host "    zaten Tailscale tarafindan sifrelenir)."
exit 0
