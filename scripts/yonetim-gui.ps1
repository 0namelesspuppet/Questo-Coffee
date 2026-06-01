# Questo Yonetim - tiklanabilir pencere (WinForms).
# Baslat / Durdur / Yenile / Loglar butonlari + her servis icin renkli durum.
# Durum 2.5 sn'de bir otomatik yenilenir. Ek kurulum gerektirmez (Windows'ta
# yerlesik .NET WinForms kullanir). Gizli baslatici: scripts\yonetim-baslat.vbs

$ErrorActionPreference = 'SilentlyContinue'
Add-Type -AssemblyName System.Windows.Forms
Add-Type -AssemblyName System.Drawing

# Proje koku (scripts/ bir ust) ve baslat/durdur .bat dosyalari
$kok = Split-Path -Parent $PSScriptRoot
function BatBul($desen) {
  $f = Get-ChildItem -Path $kok -Filter $desen -File | Select-Object -First 1
  if ($f) { $f.FullName } else { $null }
}
$baslatBat = BatBul '*Ba?lat.bat'
$durdurBat = BatBul '*Durdur.bat'

# --- Renkler ---
$cYesil  = [System.Drawing.Color]::FromArgb(22, 163, 74)    # calisiyor
$cKirmizi = [System.Drawing.Color]::FromArgb(220, 38, 38)   # kapali
$cTuruncu = [System.Drawing.Color]::FromArgb(217, 119, 6)   # kismen
$cArka   = [System.Drawing.Color]::FromArgb(24, 24, 27)
$cKart   = [System.Drawing.Color]::FromArgb(39, 39, 42)
$cYazi   = [System.Drawing.Color]::FromArgb(244, 244, 245)

# --- Port kontrol (kisa zaman asimi ile, takilmasin) ---
function PortAcik($port) {
  $c = New-Object Net.Sockets.TcpClient
  try {
    $iar = $c.BeginConnect('127.0.0.1', [int]$port, $null, $null)
    if ($iar.AsyncWaitHandle.WaitOne(350) -and $c.Connected) { return $true }
    return $false
  } catch { return $false } finally { $c.Close() }
}

# --- Form ---
$form = New-Object System.Windows.Forms.Form
$form.Text = "Questo Yonetim"
$form.Size = New-Object System.Drawing.Size(400, 430)
$form.StartPosition = 'CenterScreen'
$form.FormBorderStyle = 'FixedDialog'
$form.MaximizeBox = $false
$form.BackColor = $cArka
$form.Font = New-Object System.Drawing.Font("Segoe UI", 10)

# Pencere ikonu - once logo.ico, yoksa logo.jpg'den uret (titlebar + gorev cubugu)
try {
  $icoYol = Join-Path $kok 'public\logo.ico'
  $jpgYol = Join-Path $kok 'public\logo.jpg'
  if (Test-Path $icoYol) {
    $form.Icon = New-Object System.Drawing.Icon($icoYol)
  } elseif (Test-Path $jpgYol) {
    $logoBmp = New-Object System.Drawing.Bitmap $jpgYol
    $form.Icon = [System.Drawing.Icon]::FromHandle($logoBmp.GetHicon())
  }
} catch {}

# Baslik
$baslik = New-Object System.Windows.Forms.Label
$baslik.Text = "QUESTO"
$baslik.ForeColor = $cYazi
$baslik.Font = New-Object System.Drawing.Font("Segoe UI", 18, [System.Drawing.FontStyle]::Bold)
$baslik.Location = New-Object System.Drawing.Point(20, 16)
$baslik.Size = New-Object System.Drawing.Size(360, 34)
$baslik.TextAlign = 'MiddleCenter'
$form.Controls.Add($baslik)

# Genel durum rozeti
$genel = New-Object System.Windows.Forms.Label
$genel.Text = "Kontrol ediliyor..."
$genel.ForeColor = [System.Drawing.Color]::White
$genel.BackColor = $cTuruncu
$genel.Font = New-Object System.Drawing.Font("Segoe UI", 12, [System.Drawing.FontStyle]::Bold)
$genel.Location = New-Object System.Drawing.Point(20, 56)
$genel.Size = New-Object System.Drawing.Size(360, 40)
$genel.TextAlign = 'MiddleCenter'
$form.Controls.Add($genel)

# Servis satirlari: ad + durum rozeti
$servisler = @(
  @{ ad = "Uygulama (Next.js)"; port = 3000 },
  @{ ad = "Firestore (veritabani)"; port = 8080 },
  @{ ad = "Auth (giris)"; port = 9099 }
)
$rozetler = @()
$y = 112
foreach ($s in $servisler) {
  $kart = New-Object System.Windows.Forms.Panel
  $kart.Location = New-Object System.Drawing.Point(20, $y)
  $kart.Size = New-Object System.Drawing.Size(360, 44)
  $kart.BackColor = $cKart
  $form.Controls.Add($kart)

  $ad = New-Object System.Windows.Forms.Label
  $ad.Text = $s.ad
  $ad.ForeColor = $cYazi
  $ad.Location = New-Object System.Drawing.Point(12, 12)
  $ad.Size = New-Object System.Drawing.Size(210, 22)
  $kart.Controls.Add($ad)

  $rozet = New-Object System.Windows.Forms.Label
  $rozet.Text = "..."
  $rozet.ForeColor = [System.Drawing.Color]::White
  $rozet.BackColor = $cTuruncu
  $rozet.Font = New-Object System.Drawing.Font("Segoe UI", 9, [System.Drawing.FontStyle]::Bold)
  $rozet.Location = New-Object System.Drawing.Point(232, 8)
  $rozet.Size = New-Object System.Drawing.Size(116, 28)
  $rozet.TextAlign = 'MiddleCenter'
  $kart.Controls.Add($rozet)

  $rozetler += @{ rozet = $rozet; port = $s.port }
  $y += 52
}

# --- Durumu tazele ---
function Tazele {
  $acikSayisi = 0
  foreach ($r in $rozetler) {
    if (PortAcik $r.port) {
      $r.rozet.Text = "CALISIYOR"
      $r.rozet.BackColor = $cYesil
      $acikSayisi++
    } else {
      $r.rozet.Text = "KAPALI"
      $r.rozet.BackColor = $cKirmizi
    }
  }
  if ($acikSayisi -eq $rozetler.Count) {
    $genel.Text = "SISTEM CALISIYOR"
    $genel.BackColor = $cYesil
  } elseif ($acikSayisi -eq 0) {
    $genel.Text = "SISTEM KAPALI"
    $genel.BackColor = $cKirmizi
  } else {
    $genel.Text = "KISMEN CALISIYOR ($acikSayisi/$($rozetler.Count))"
    $genel.BackColor = $cTuruncu
  }
}

# --- Buton uretici ---
function Buton($metin, $x, $w, $renk) {
  $b = New-Object System.Windows.Forms.Button
  $b.Text = $metin
  $b.Location = New-Object System.Drawing.Point($x, 282)
  $b.Size = New-Object System.Drawing.Size($w, 52)
  $b.FlatStyle = 'Flat'
  $b.FlatAppearance.BorderSize = 0
  $b.ForeColor = [System.Drawing.Color]::White
  $b.BackColor = $renk
  $b.Font = New-Object System.Drawing.Font("Segoe UI", 11, [System.Drawing.FontStyle]::Bold)
  $b.Cursor = [System.Windows.Forms.Cursors]::Hand
  $form.Controls.Add($b)
  return $b
}

$btnBaslat = Buton "Baslat" 20 172 $cYesil
$btnDurdur = Buton "Durdur" 208 172 $cKirmizi

$btnBaslat.Add_Click({
  if (-not $baslatBat) {
    [System.Windows.Forms.MessageBox]::Show("Baslatma .bat dosyasi bulunamadi.", "Questo") | Out-Null
    return
  }
  Start-Process -FilePath $baslatBat -WorkingDirectory $kok
  $genel.Text = "BASLATILIYOR..."
  $genel.BackColor = $cTuruncu
})

$btnDurdur.Add_Click({
  if (-not $durdurBat) {
    [System.Windows.Forms.MessageBox]::Show("Durdurma .bat dosyasi bulunamadi.", "Questo") | Out-Null
    return
  }
  Start-Process -FilePath $durdurBat -WorkingDirectory $kok
  $genel.Text = "DURDURULUYOR..."
  $genel.BackColor = $cTuruncu
})

# Alt satir: Yenile + Loglar
$btnYenile = New-Object System.Windows.Forms.Button
$btnYenile.Text = "Durumu yenile"
$btnYenile.Location = New-Object System.Drawing.Point(20, 346)
$btnYenile.Size = New-Object System.Drawing.Size(172, 38)
$btnYenile.FlatStyle = 'Flat'
$btnYenile.FlatAppearance.BorderSize = 1
$btnYenile.ForeColor = $cYazi
$btnYenile.BackColor = $cKart
$btnYenile.Cursor = [System.Windows.Forms.Cursors]::Hand
$btnYenile.Add_Click({ Tazele })
$form.Controls.Add($btnYenile)

$btnLog = New-Object System.Windows.Forms.Button
$btnLog.Text = "Loglar"
$btnLog.Location = New-Object System.Drawing.Point(208, 346)
$btnLog.Size = New-Object System.Drawing.Size(172, 38)
$btnLog.FlatStyle = 'Flat'
$btnLog.FlatAppearance.BorderSize = 1
$btnLog.ForeColor = $cYazi
$btnLog.BackColor = $cKart
$btnLog.Cursor = [System.Windows.Forms.Cursors]::Hand
$btnLog.Add_Click({
  $logDir = Join-Path $kok 'logs'
  if (Test-Path $logDir) { Start-Process explorer $logDir }
  else { [System.Windows.Forms.MessageBox]::Show("Henuz log klasoru yok.", "Questo") | Out-Null }
})
$form.Controls.Add($btnLog)

# Otomatik yenileme (canli durum)
$timer = New-Object System.Windows.Forms.Timer
$timer.Interval = 2500
$timer.Add_Tick({ Tazele })
$timer.Start()

$form.Add_Shown({ Tazele })
[void]$form.ShowDialog()
$timer.Stop()
