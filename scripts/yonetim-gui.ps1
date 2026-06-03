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

# --- Erisim adresleri (telefon baglantisi) ---
# IP adresi birincil (onerilen) adres; bilgisayar adi yedek olarak gosterilir.
# Her timer tikinde her ikisi de guncellenir: bilgisayar adi degistirilse bile
# dogru deger anlinda yansir.
$script:pcAd = $env:COMPUTERNAME
$script:yerelIpCache = $null
$script:ipGuncellemeSayac = 0
function AdresSabit { "http://$($script:pcAd):3000" }
function YerelIP {
  # 1) Varsayilan ag gecidi olan (gercek Wi-Fi/Ethernet) adaptorun IPv4'u
  try {
    $cfg = Get-NetIPConfiguration -ErrorAction Stop |
      Where-Object { $_.IPv4DefaultGateway -and $_.NetAdapter.Status -eq 'Up' } |
      Select-Object -First 1
    if ($cfg -and $cfg.IPv4Address) { return $cfg.IPv4Address.IPAddress }
  } catch {}
  # 2) .NET fallback (NetTCPIP modulu yoksa) - loopback/APIPA harici ilk IPv4
  try {
    foreach ($a in [System.Net.Dns]::GetHostAddresses([System.Net.Dns]::GetHostName())) {
      $s = $a.ToString()
      if ($a.AddressFamily -eq 'InterNetwork' -and $s -ne '127.0.0.1' -and $s -notlike '169.254.*') { return $s }
    }
  } catch {}
  return $null
}

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
$form.Size = New-Object System.Drawing.Size(400, 500)
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
    # Calisiyorken Baslat KILITLI (tekrar baslatip calisani bozmasin), Durdur acik.
    $btnBaslat.Enabled = $false; $btnDurdur.Enabled = $true
  } elseif ($acikSayisi -eq 0) {
    $genel.Text = "SISTEM KAPALI"; $genel.BackColor = $cKirmizi
    $btnBaslat.Enabled = $true; $btnDurdur.Enabled = $false
  } else {
    $genel.Text = "KISMEN CALISIYOR ($acikSayisi/$($script:baglantilar.Count))"
    $genel.BackColor = $cTuruncu
    $btnBaslat.Enabled = $true; $btnDurdur.Enabled = $true
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
# Her tikde bilgisayar adini guncelle; IP'yi ise 12 tikde bir guncelle (~30 sn).
function Tazele {
  SonuclariOku; KontrolBaslat
  $script:pcAd = $env:COMPUTERNAME
  $script:ipGuncellemeSayac++
  if ($script:ipGuncellemeSayac -ge 12) { $script:ipGuncellemeSayac = 0; AdresGuncelle }
  else { $lblAdresPcAd.Text = "Bilgisayar adi: $(AdresSabit)" }
}

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
  # Cift tiklamayi onle - durum yenilenince kontrol tekrar buton durumunu ayarlar.
  $btnBaslat.Enabled = $false
})

$btnDurdur.Add_Click({
  if (-not $durdurBat) {
    [System.Windows.Forms.MessageBox]::Show("Durdurma .bat dosyasi bulunamadi.", "Questo") | Out-Null
    return
  }
  Start-Process -FilePath $durdurBat -WorkingDirectory $kok
  $genel.Text = "DURDURULUYOR..."
  $genel.BackColor = $cTuruncu
  $btnDurdur.Enabled = $false
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
$btnYenile.Add_Click({ Tazele; AdresGuncelle; $btnKopya.Text = "IP'yi kopyala" })
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

# --- Telefon erisim adresi paneli ---
$lblAdresBaslik = New-Object System.Windows.Forms.Label
$lblAdresBaslik.Text = "Telefondan baglan (ayni Wi-Fi):"
$lblAdresBaslik.ForeColor = $cYazi
$lblAdresBaslik.Location = New-Object System.Drawing.Point(20, 230)
$lblAdresBaslik.Size = New-Object System.Drawing.Size(190, 20)
$form.Controls.Add($lblAdresBaslik)

# IP adresi - BIRINCIL (buyuk, yesil) — bilgisayar adi degisse de calisir
$lblAdresSabit = New-Object System.Windows.Forms.Label
$lblAdresSabit.Text = "Yukleniyor..."
$lblAdresSabit.ForeColor = $cYesil
$lblAdresSabit.Font = New-Object System.Drawing.Font("Consolas", 12, [System.Drawing.FontStyle]::Bold)
$lblAdresSabit.Location = New-Object System.Drawing.Point(20, 253)
$lblAdresSabit.Size = New-Object System.Drawing.Size(190, 24)
$form.Controls.Add($lblAdresSabit)

# Bilgisayar adi - yedek (kucuk, gri) — her tikde guncellenir
$lblAdresPcAd = New-Object System.Windows.Forms.Label
$lblAdresPcAd.Text = "Bilgisayar adi: $(AdresSabit)"
$lblAdresPcAd.ForeColor = [System.Drawing.Color]::FromArgb(161, 161, 170)
$lblAdresPcAd.Font = New-Object System.Drawing.Font("Consolas", 9)
$lblAdresPcAd.Location = New-Object System.Drawing.Point(20, 281)
$lblAdresPcAd.Size = New-Object System.Drawing.Size(190, 18)
$form.Controls.Add($lblAdresPcAd)

$btnKopya = New-Object System.Windows.Forms.Button
$btnKopya.Text = "IP'yi kopyala"
$btnKopya.Location = New-Object System.Drawing.Point(20, 304)
$btnKopya.Size = New-Object System.Drawing.Size(190, 36)
$btnKopya.FlatStyle = 'Flat'
$btnKopya.FlatAppearance.BorderSize = 1
$btnKopya.ForeColor = $cYazi
$btnKopya.BackColor = $cKart
$btnKopya.Cursor = [System.Windows.Forms.Cursors]::Hand
$btnKopya.Add_Click({
  $ip = YerelIP
  $u = if ($ip) { "http://$($ip):3000" } else { AdresSabit }
  try { [System.Windows.Forms.Clipboard]::SetText($u) }
  catch { try { Set-Clipboard -Value $u } catch {} }
  $btnKopya.Text = "Kopyalandi!"
})
$form.Controls.Add($btnKopya)

$lblIpucu = New-Object System.Windows.Forms.Label
$lblIpucu.Text = "IP degisirse 'Durumu yenile' ile guncelle."
$lblIpucu.ForeColor = [System.Drawing.Color]::FromArgb(161, 161, 170)
$lblIpucu.Font = New-Object System.Drawing.Font("Segoe UI", 8)
$lblIpucu.Location = New-Object System.Drawing.Point(20, 346)
$lblIpucu.Size = New-Object System.Drawing.Size(190, 32)
$form.Controls.Add($lblIpucu)

# QR kod (sag taraf) — telefonda tarayiciya girmeden tara
$lblQrBaslik = New-Object System.Windows.Forms.Label
$lblQrBaslik.Text = "QR kodu tara:"
$lblQrBaslik.ForeColor = [System.Drawing.Color]::FromArgb(161, 161, 170)
$lblQrBaslik.Font = New-Object System.Drawing.Font("Segoe UI", 8)
$lblQrBaslik.Location = New-Object System.Drawing.Point(220, 230)
$lblQrBaslik.Size = New-Object System.Drawing.Size(160, 18)
$form.Controls.Add($lblQrBaslik)

$picQR = New-Object System.Windows.Forms.PictureBox
$picQR.Location = New-Object System.Drawing.Point(220, 250)
$picQR.Size = New-Object System.Drawing.Size(160, 160)
$picQR.SizeMode = [System.Windows.Forms.PictureBoxSizeMode]::Zoom
$picQR.BackColor = [System.Drawing.Color]::White
$form.Controls.Add($picQR)

# IP ve bilgisayar adini guncelle — acilista ve her ~30 sn'de bir cagrilir.
function AdresGuncelle {
  $ip = YerelIP
  $script:yerelIpCache = $ip
  if ($ip) { $lblAdresSabit.Text = "http://$($ip):3000" }
  else { $lblAdresSabit.Text = "(IP bulunamadi - Wi-Fi bagli mi?)" }
  $lblAdresPcAd.Text = "Bilgisayar adi: $(AdresSabit)"
  # QR kod olustur
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

# Otomatik yenileme (canli durum)
$timer = New-Object System.Windows.Forms.Timer
$timer.Interval = 2500
$timer.Add_Tick({ Tazele })
$timer.Start()

$form.Add_Shown({ Tazele; AdresGuncelle })
[void]$form.ShowDialog()
$timer.Stop()
