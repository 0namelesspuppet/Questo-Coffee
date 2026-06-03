# Questo Yonetim - WinForms yonetim paneli.
# Durum gostergesi + Baslat / Durdur / Yenile / Yeniden baslat + QR telefon baglantisi.

$ErrorActionPreference = 'SilentlyContinue'
Add-Type -AssemblyName System.Windows.Forms
Add-Type -AssemblyName System.Drawing

$kok = Split-Path -Parent $PSScriptRoot
function BatBul($desen) {
  $f = Get-ChildItem -Path $kok -Filter $desen -File | Select-Object -First 1
  if ($f) { $f.FullName } else { $null }
}
$baslatBat = BatBul '*Ba?lat.bat'
$durdurBat = BatBul '*Durdur.bat'

$script:yerelIpCache       = $null
$script:ipGuncellemeSayac  = 0

function YerelIP {
  try {
    $cfg = Get-NetIPConfiguration -ErrorAction Stop |
      Where-Object { $_.IPv4DefaultGateway -and $_.NetAdapter.Status -eq 'Up' } |
      Select-Object -First 1
    if ($cfg -and $cfg.IPv4Address) { return $cfg.IPv4Address.IPAddress }
  } catch {}
  try {
    foreach ($a in [System.Net.Dns]::GetHostAddresses([System.Net.Dns]::GetHostName())) {
      $s = $a.ToString()
      if ($a.AddressFamily -eq 'InterNetwork' -and $s -ne '127.0.0.1' -and $s -notlike '169.254.*') { return $s }
    }
  } catch {}
  return $null
}

# ---------------------------------------------------------------------------
# Renkler
# ---------------------------------------------------------------------------
$cYesil    = [System.Drawing.Color]::FromArgb(22,  163,  74)
$cKirmizi  = [System.Drawing.Color]::FromArgb(220,  38,  38)
$cTuruncu  = [System.Drawing.Color]::FromArgb(217, 119,   6)
$cArka     = [System.Drawing.Color]::FromArgb( 18,  18,  20)
$cKart     = [System.Drawing.Color]::FromArgb( 39,  39,  42)
$cKenar    = [System.Drawing.Color]::FromArgb( 63,  63,  70)
$cYazi     = [System.Drawing.Color]::FromArgb(244, 244, 245)
$cMuted    = [System.Drawing.Color]::FromArgb(113, 113, 122)
$cMavi     = [System.Drawing.Color]::FromArgb( 59, 130, 246)
$cMaviArka = [System.Drawing.Color]::FromArgb( 23,  37,  84)

# ---------------------------------------------------------------------------
# Form
# ---------------------------------------------------------------------------
$form = New-Object System.Windows.Forms.Form
$form.Text            = "Questo Yonetim"
$form.Size            = New-Object System.Drawing.Size(440, 530)
$form.StartPosition   = 'CenterScreen'
$form.FormBorderStyle = 'FixedDialog'
$form.MaximizeBox     = $false
$form.BackColor       = $cArka
$form.Font            = New-Object System.Drawing.Font("Segoe UI", 10)

try {
  $icoYol = Join-Path $kok 'public\logo.ico'
  $jpgYol = Join-Path $kok 'public\logo.jpg'
  if     (Test-Path $icoYol) { $form.Icon = New-Object System.Drawing.Icon($icoYol) }
  elseif (Test-Path $jpgYol) { $bmp = New-Object System.Drawing.Bitmap $jpgYol; $form.Icon = [System.Drawing.Icon]::FromHandle($bmp.GetHicon()) }
} catch {}

# ---------------------------------------------------------------------------
# Yardimci: ayirici cizgi
# ---------------------------------------------------------------------------
function Ayirici($y) {
  $p = New-Object System.Windows.Forms.Panel
  $p.Location  = New-Object System.Drawing.Point(20, $y)
  $p.Size      = New-Object System.Drawing.Size(400, 1)
  $p.BackColor = $cKenar
  $form.Controls.Add($p)
}

# ---------------------------------------------------------------------------
# Baslik bolumu
# ---------------------------------------------------------------------------
$lblBaslik = New-Object System.Windows.Forms.Label
$lblBaslik.Text      = "QUESTO"
$lblBaslik.ForeColor = $cYazi
$lblBaslik.Font      = New-Object System.Drawing.Font("Segoe UI", 20, [System.Drawing.FontStyle]::Bold)
$lblBaslik.Location  = New-Object System.Drawing.Point(20, 18)
$lblBaslik.Size      = New-Object System.Drawing.Size(400, 36)
$lblBaslik.TextAlign = 'MiddleCenter'
$form.Controls.Add($lblBaslik)

$lblAltyazi = New-Object System.Windows.Forms.Label
$lblAltyazi.Text      = "Restoran Yonetim Sistemi"
$lblAltyazi.ForeColor = $cMuted
$lblAltyazi.Font      = New-Object System.Drawing.Font("Segoe UI", 9)
$lblAltyazi.Location  = New-Object System.Drawing.Point(20, 56)
$lblAltyazi.Size      = New-Object System.Drawing.Size(400, 18)
$lblAltyazi.TextAlign = 'MiddleCenter'
$form.Controls.Add($lblAltyazi)

Ayirici 82

# ---------------------------------------------------------------------------
# Durum cubugu
# ---------------------------------------------------------------------------
$genel = New-Object System.Windows.Forms.Label
$genel.Text      = "Kontrol ediliyor..."
$genel.ForeColor = [System.Drawing.Color]::White
$genel.BackColor = $cTuruncu
$genel.Font      = New-Object System.Drawing.Font("Segoe UI", 12, [System.Drawing.FontStyle]::Bold)
$genel.Location  = New-Object System.Drawing.Point(20, 90)
$genel.Size      = New-Object System.Drawing.Size(400, 44)
$genel.TextAlign = 'MiddleCenter'
$form.Controls.Add($genel)

Ayirici 142

# ---------------------------------------------------------------------------
# Port kontrolu (asenkron, UI thread kilitlemez)
# ---------------------------------------------------------------------------
$portlar            = @(3000, 8080, 9099)
$script:baglantilar = @()

function SonuclariOku {
  if ($script:baglantilar.Count -eq 0) { return }
  $acik = 0
  foreach ($b in $script:baglantilar) {
    $ok = $false
    try {
      if ($b.iar -and $b.iar.IsCompleted) { $b.client.EndConnect($b.iar); $ok = $b.client.Connected }
    } catch { $ok = $false } finally { $b.client.Close() }
    if ($ok) { $acik++ }
  }
  if ($acik -eq $script:baglantilar.Count) {
    $genel.Text = "SISTEM CALISIYOR";  $genel.BackColor = $cYesil
    $btnBaslat.Enabled = $false; $btnDurdur.Enabled = $true
  } elseif ($acik -eq 0) {
    $genel.Text = "SISTEM KAPALI";    $genel.BackColor = $cKirmizi
    $btnBaslat.Enabled = $true;  $btnDurdur.Enabled = $false
  } else {
    $genel.Text = "KISMEN CALISIYOR ($acik/$($script:baglantilar.Count))"
    $genel.BackColor = $cTuruncu
    $btnBaslat.Enabled = $true; $btnDurdur.Enabled = $true
  }
}

function KontrolBaslat {
  $yeni = @()
  foreach ($p in $portlar) {
    $c = New-Object Net.Sockets.TcpClient
    $iar = $null
    try { $iar = $c.BeginConnect('127.0.0.1', [int]$p, $null, $null) } catch {}
    $yeni += @{ client = $c; iar = $iar }
  }
  $script:baglantilar = $yeni
}

function Tazele {
  SonuclariOku; KontrolBaslat
  $script:ipGuncellemeSayac++
  if ($script:ipGuncellemeSayac -ge 12) {
    $script:ipGuncellemeSayac = 0
    AdresGuncelle
  } else {
    $yeniIp = YerelIP
    if ($yeniIp -ne $script:yerelIpCache) { AdresGuncelle }
  }
}

# ---------------------------------------------------------------------------
# Buton uretici
# ---------------------------------------------------------------------------
function YapButon($metin, $x, $y, $w, $h, $arka, $font, $kenar) {
  $b = New-Object System.Windows.Forms.Button
  $b.Text       = $metin
  $b.Location   = New-Object System.Drawing.Point($x, $y)
  $b.Size       = New-Object System.Drawing.Size($w, $h)
  $b.FlatStyle  = 'Flat'
  $b.ForeColor  = $cYazi
  $b.BackColor  = $arka
  $b.Font       = $font
  $b.Cursor     = [System.Windows.Forms.Cursors]::Hand
  $b.FlatAppearance.BorderSize = if ($kenar) { 1 } else { 0 }
  if ($kenar) {
    $b.FlatAppearance.BorderColor       = $cKenar
    $b.FlatAppearance.MouseOverBackColor = [System.Drawing.Color]::FromArgb(63, 63, 70)
  }
  $form.Controls.Add($b)
  return $b
}

$fBold = New-Object System.Drawing.Font("Segoe UI", 11, [System.Drawing.FontStyle]::Bold)
$fNorm = New-Object System.Drawing.Font("Segoe UI", 9)

# ---------------------------------------------------------------------------
# Ana aksiyon butonlari
# ---------------------------------------------------------------------------
$btnBaslat  = YapButon "Baslat"          20 150 190 50 $cYesil   $fBold $false
$btnDurdur  = YapButon "Durdur"         230 150 190 50 $cKirmizi $fBold $false
$btnYenile  = YapButon "Durumu yenile"   20 208 190 36 $cKart    $fNorm $true
$btnYeniden = YapButon "Yeniden baslat" 230 208 190 36 $cKart    $fNorm $true

$btnBaslat.Add_Click({
  if (-not $baslatBat) { [System.Windows.Forms.MessageBox]::Show("Baslatma .bat bulunamadi.", "Questo") | Out-Null; return }
  Start-Process -FilePath $baslatBat -WorkingDirectory $kok
  $genel.Text = "BASLATILIYOR..."; $genel.BackColor = $cTuruncu
  $btnBaslat.Enabled = $false
})

$btnDurdur.Add_Click({
  if (-not $durdurBat) { [System.Windows.Forms.MessageBox]::Show("Durdurma .bat bulunamadi.", "Questo") | Out-Null; return }
  Start-Process -FilePath $durdurBat -WorkingDirectory $kok
  $genel.Text = "DURDURULUYOR..."; $genel.BackColor = $cTuruncu
  $btnDurdur.Enabled = $false
})

$btnYenile.Add_Click({ Tazele; AdresGuncelle; $btnKopya.Text = "IP'yi kopyala" })

$btnYeniden.Add_Click({
  if (-not $durdurBat -or -not $baslatBat) { [System.Windows.Forms.MessageBox]::Show("Baslatma/durdurma .bat bulunamadi.", "Questo") | Out-Null; return }
  $genel.Text = "YENIDEN BASLATILIYOR..."; $genel.BackColor = $cTuruncu
  Start-Process -FilePath $durdurBat -WorkingDirectory $kok -Wait
  Start-Process -FilePath $baslatBat -WorkingDirectory $kok
})

Ayirici 252

# ---------------------------------------------------------------------------
# Telefon baglantisi bolumu (sol: IP + buton | sag: QR)
# ---------------------------------------------------------------------------

# Sol: baslik
$bolumBar = New-Object System.Windows.Forms.Panel
$bolumBar.Location  = New-Object System.Drawing.Point(20, 264)
$bolumBar.Size      = New-Object System.Drawing.Size(3, 18)
$bolumBar.BackColor = $cYesil
$form.Controls.Add($bolumBar)

$lblBolum = New-Object System.Windows.Forms.Label
$lblBolum.Text      = "TELEFON BAGLANTISI"
$lblBolum.ForeColor = $cMuted
$lblBolum.Font      = New-Object System.Drawing.Font("Segoe UI", 8, [System.Drawing.FontStyle]::Bold)
$lblBolum.Location  = New-Object System.Drawing.Point(28, 264)
$lblBolum.Size      = New-Object System.Drawing.Size(186, 18)
$form.Controls.Add($lblBolum)

# Sol: IP adresi
$lblIP = New-Object System.Windows.Forms.Label
$lblIP.Text      = "Yukleniyor..."
$lblIP.ForeColor = $cYesil
$lblIP.Font      = New-Object System.Drawing.Font("Consolas", 12, [System.Drawing.FontStyle]::Bold)
$lblIP.Location  = New-Object System.Drawing.Point(20, 288)
$lblIP.Size      = New-Object System.Drawing.Size(196, 24)
$form.Controls.Add($lblIP)

# Sol: kopyala butonu
$btnKopya = YapButon "IP'yi kopyala" 20 318 196 36 $cMaviArka $fNorm $false
$btnKopya.FlatAppearance.BorderSize  = 1
$btnKopya.FlatAppearance.BorderColor = $cMavi
$btnKopya.FlatAppearance.MouseOverBackColor = [System.Drawing.Color]::FromArgb(30, 64, 175)
$btnKopya.ForeColor = [System.Drawing.Color]::FromArgb(147, 197, 253)
$btnKopya.Add_Click({
  $ip = YerelIP
  $u  = if ($ip) { "http://$($ip):3000" } else { $null }
  if (-not $u) { return }
  try { [System.Windows.Forms.Clipboard]::SetText($u) }
  catch { try { Set-Clipboard -Value $u } catch {} }
  $btnKopya.Text = "Kopyalandi!"
})

# Sol: ipucu
$lblIpucu = New-Object System.Windows.Forms.Label
$lblIpucu.Text      = "IP degisirse Durumu yenile ile guncelle."
$lblIpucu.ForeColor = $cMuted
$lblIpucu.Font      = New-Object System.Drawing.Font("Segoe UI", 8)
$lblIpucu.Location  = New-Object System.Drawing.Point(20, 362)
$lblIpucu.Size      = New-Object System.Drawing.Size(196, 32)
$form.Controls.Add($lblIpucu)

# Sag: QR baslik
$qrBar = New-Object System.Windows.Forms.Panel
$qrBar.Location  = New-Object System.Drawing.Point(228, 264)
$qrBar.Size      = New-Object System.Drawing.Size(3, 18)
$qrBar.BackColor = $cMavi
$form.Controls.Add($qrBar)

$lblQrBaslik = New-Object System.Windows.Forms.Label
$lblQrBaslik.Text      = "QR KODU TARA"
$lblQrBaslik.ForeColor = $cMuted
$lblQrBaslik.Font      = New-Object System.Drawing.Font("Segoe UI", 8, [System.Drawing.FontStyle]::Bold)
$lblQrBaslik.Location  = New-Object System.Drawing.Point(236, 264)
$lblQrBaslik.Size      = New-Object System.Drawing.Size(184, 18)
$form.Controls.Add($lblQrBaslik)

# Sag: QR resim cercevesi
$qrCerceve = New-Object System.Windows.Forms.Panel
$qrCerceve.Location  = New-Object System.Drawing.Point(228, 288)
$qrCerceve.Size      = New-Object System.Drawing.Size(192, 192)
$qrCerceve.BackColor = [System.Drawing.Color]::FromArgb(63, 63, 70)
$form.Controls.Add($qrCerceve)

$picQR = New-Object System.Windows.Forms.PictureBox
$picQR.Location  = New-Object System.Drawing.Point(2, 2)
$picQR.Size      = New-Object System.Drawing.Size(188, 188)
$picQR.SizeMode  = [System.Windows.Forms.PictureBoxSizeMode]::Zoom
$picQR.BackColor = [System.Drawing.Color]::White
$qrCerceve.Controls.Add($picQR)

# Sag: QR ipucu
$lblQrIpucu = New-Object System.Windows.Forms.Label
$lblQrIpucu.Text      = "Tara, ana ekrana ekle"
$lblQrIpucu.ForeColor = $cMuted
$lblQrIpucu.Font      = New-Object System.Drawing.Font("Segoe UI", 8)
$lblQrIpucu.Location  = New-Object System.Drawing.Point(228, 484)
$lblQrIpucu.Size      = New-Object System.Drawing.Size(192, 16)
$lblQrIpucu.TextAlign = 'MiddleCenter'
$form.Controls.Add($lblQrIpucu)

# ---------------------------------------------------------------------------
# Adres ve QR guncelleme
# ---------------------------------------------------------------------------
function AdresGuncelle {
  $ip = YerelIP
  $script:yerelIpCache = $ip
  if ($ip) { $lblIP.Text = "http://$($ip):3000" }
  else     { $lblIP.Text = "(Wi-Fi bagli degil)" }
  if ($ip) {
    try {
      $qrScript = Join-Path $PSScriptRoot 'qr-uret.mjs'
      $qrPng    = Join-Path $env:TEMP 'questo-qr.png'
      $p = Start-Process 'node' -ArgumentList "`"$qrScript`" `"http://$($ip):3000`" `"$qrPng`"" `
                         -WorkingDirectory $kok -Wait -PassThru -WindowStyle Hidden
      if ($p.ExitCode -eq 0 -and (Test-Path $qrPng)) {
        $bytes = [System.IO.File]::ReadAllBytes($qrPng)
        $ms    = New-Object System.IO.MemoryStream($bytes, 0, $bytes.Length)
        $old   = $picQR.Image
        $picQR.Image = [System.Drawing.Bitmap]::FromStream($ms)
        if ($old) { $old.Dispose() }
      }
    } catch {}
  }
}

# ---------------------------------------------------------------------------
# Timer ve baslatma
# ---------------------------------------------------------------------------
$timer = New-Object System.Windows.Forms.Timer
$timer.Interval = 2500
$timer.Add_Tick({ Tazele })
$timer.Start()

$form.Add_Shown({ Tazele; AdresGuncelle })
[void]$form.ShowDialog()
$timer.Stop()
