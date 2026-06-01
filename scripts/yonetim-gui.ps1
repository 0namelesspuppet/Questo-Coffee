# Questo Yonetim - tiklanabilir pencere (WinForms).
# Genel durum belirteci + Baslat / Durdur / Durumu yenile / Yeniden baslat.
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

# --- Form ---
$form = New-Object System.Windows.Forms.Form
$form.Text = "Questo Yonetim"
$form.Size = New-Object System.Drawing.Size(400, 300)
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

# Genel durum belirteci
$genel = New-Object System.Windows.Forms.Label
$genel.Text = "Kontrol ediliyor..."
$genel.ForeColor = [System.Drawing.Color]::White
$genel.BackColor = $cTuruncu
$genel.Font = New-Object System.Drawing.Font("Segoe UI", 12, [System.Drawing.FontStyle]::Bold)
$genel.Location = New-Object System.Drawing.Point(20, 56)
$genel.Size = New-Object System.Drawing.Size(360, 44)
$genel.TextAlign = 'MiddleCenter'
$form.Controls.Add($genel)

# Durum icin izlenen portlar (UI'da satir gosterilmez, sadece genel durumu belirler)
$portlar = @(3000, 8080, 9099)

# --- Asenkron port kontrol (UI thread'ini KILITLEMEZ) ---
# BeginConnect ile baglantilar baslatilir ve bir SONRAKI tikte WaitOne
# YAPILMADAN IsCompleted/EndConnect ile okunur. Boylece her tik anliktir.
$script:baglantilar = @()

# Onceki tikte baslatilan baglantilarin sonucunu (bloke etmeden) oku.
function SonuclariOku {
  if ($script:baglantilar.Count -eq 0) { return }
  $acikSayisi = 0
  foreach ($b in $script:baglantilar) {
    $acik = $false
    try {
      if ($b.iar -and $b.iar.IsCompleted) {
        $b.client.EndConnect($b.iar)   # acik degilse exception firlatir
        $acik = $b.client.Connected
      }
    } catch { $acik = $false } finally { $b.client.Close() }
    if ($acik) { $acikSayisi++ }
  }
  if ($acikSayisi -eq $script:baglantilar.Count) {
    $genel.Text = "SISTEM CALISIYOR"; $genel.BackColor = $cYesil
  } elseif ($acikSayisi -eq 0) {
    $genel.Text = "SISTEM KAPALI"; $genel.BackColor = $cKirmizi
  } else {
    $genel.Text = "KISMEN CALISIYOR ($acikSayisi/$($script:baglantilar.Count))"
    $genel.BackColor = $cTuruncu
  }
}

# Yeni (asenkron) baglantilari baslat — UI thread'i beklemez.
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

# Bir tik: once onceki sonucu oku, sonra yeni kontrolu baslat.
function Tazele { SonuclariOku; KontrolBaslat }

# --- Buton uretici ---
function Buton($metin, $x, $w, $renk) {
  $b = New-Object System.Windows.Forms.Button
  $b.Text = $metin
  $b.Location = New-Object System.Drawing.Point($x, 116)
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

# Alt satir: Durumu yenile + Yeniden baslat
$btnYenile = New-Object System.Windows.Forms.Button
$btnYenile.Text = "Durumu yenile"
$btnYenile.Location = New-Object System.Drawing.Point(20, 180)
$btnYenile.Size = New-Object System.Drawing.Size(172, 38)
$btnYenile.FlatStyle = 'Flat'
$btnYenile.FlatAppearance.BorderSize = 1
$btnYenile.ForeColor = $cYazi
$btnYenile.BackColor = $cKart
$btnYenile.Cursor = [System.Windows.Forms.Cursors]::Hand
$btnYenile.Add_Click({ Tazele })
$form.Controls.Add($btnYenile)

$btnYeniden = New-Object System.Windows.Forms.Button
$btnYeniden.Text = "Yeniden baslat"
$btnYeniden.Location = New-Object System.Drawing.Point(208, 180)
$btnYeniden.Size = New-Object System.Drawing.Size(172, 38)
$btnYeniden.FlatStyle = 'Flat'
$btnYeniden.FlatAppearance.BorderSize = 1
$btnYeniden.ForeColor = $cYazi
$btnYeniden.BackColor = $cKart
$btnYeniden.Cursor = [System.Windows.Forms.Cursors]::Hand
$btnYeniden.Add_Click({
  if (-not $durdurBat -or -not $baslatBat) {
    [System.Windows.Forms.MessageBox]::Show("Baslatma/durdurma .bat dosyasi bulunamadi.", "Questo") | Out-Null
    return
  }
  $genel.Text = "YENIDEN BASLATILIYOR..."
  $genel.BackColor = $cTuruncu
  # Once durdur (bitmesini bekle), sonra yeniden baslat.
  Start-Process -FilePath $durdurBat -WorkingDirectory $kok -Wait
  Start-Process -FilePath $baslatBat -WorkingDirectory $kok
})
$form.Controls.Add($btnYeniden)

# Otomatik yenileme (canli durum)
$timer = New-Object System.Windows.Forms.Timer
$timer.Interval = 2500
$timer.Add_Tick({ Tazele })
$timer.Start()

$form.Add_Shown({ Tazele })
[void]$form.ShowDialog()
$timer.Stop()
