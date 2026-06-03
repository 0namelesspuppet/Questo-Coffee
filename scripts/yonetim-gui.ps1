# Questo Yonetim - yeniden boyutlanabilir WinForms paneli.

$ErrorActionPreference = 'SilentlyContinue'
Add-Type -AssemblyName System.Windows.Forms
Add-Type -AssemblyName System.Drawing

$kok = Split-Path -Parent $PSScriptRoot
function BatBul($d) {
  $f = Get-ChildItem -Path $kok -Filter $d -File | Select-Object -First 1
  if ($f) { $f.FullName } else { $null }
}
$baslatBat = BatBul '*Ba?lat.bat'
$durdurBat = BatBul '*Durdur.bat'

# Bir .bat dosyasini KONSOL PENCERESI GORUNMEDEN calistirir (WScript.Shell.Run
# windowStyle=0). Boylece Baslat/Durdur sirasinda ham terminal penceresi
# acilmaz; durum yalniz asagidaki durum cubugundan ($genel) okunur.
#   $arg   : .bat'e gecirilecek arguman ('gizli' -> baslat.bat hata olsa bile
#            pause yapmaz, gizli pencerede kilitlenmez)
#   $bekle : $true ise bat bitene kadar bloklar (Yeniden baslat icin gerekli)
function GizliCalistir($bat, $arg, $bekle) {
  if (-not $bat) { return }
  $komut = '"' + $bat + '"'
  if ($arg) { $komut = $komut + ' ' + $arg }
  $sh = New-Object -ComObject WScript.Shell
  $sh.CurrentDirectory = $kok
  [void]$sh.Run($komut, 0, [bool]$bekle)
}

$script:yerelIpCache      = $null
$script:ipGuncellemeSayac = 0

# Gecis (pending) durumu: Baslat/Durdur tiklaninca, hedefe ULASILANA kadar
# "BASLATILIYOR/DURDURULUYOR" yazisi korunur; port-yoklama yazisi onu ezmesin.
#   $null | 'baslat' (hedef: tum portlar acik) | 'durdur' (hedef: tum portlar kapali)
$script:beklenen    = $null
$script:bekleyenTik = 0

function YerelIP {
  try {
    $c = Get-NetIPConfiguration -ErrorAction Stop |
      Where-Object { $_.IPv4DefaultGateway -and $_.NetAdapter.Status -eq 'Up' } |
      Select-Object -First 1
    if ($c -and $c.IPv4Address) { return $c.IPv4Address.IPAddress }
  } catch {}
  try {
    foreach ($a in [System.Net.Dns]::GetHostAddresses([System.Net.Dns]::GetHostName())) {
      $s = $a.ToString()
      if ($a.AddressFamily -eq 'InterNetwork' -and $s -ne '127.0.0.1' -and $s -notlike '169.254.*') { return $s }
    }
  } catch {}
  return $null
}

# Renkler
$cYesil    = [System.Drawing.Color]::FromArgb(22, 163, 74)
$cKirmizi  = [System.Drawing.Color]::FromArgb(220,  38, 38)
$cTuruncu  = [System.Drawing.Color]::FromArgb(217, 119,  6)
$cArka     = [System.Drawing.Color]::FromArgb( 18,  18, 20)
$cHeader   = [System.Drawing.Color]::FromArgb( 22,  22, 26)
$cKart     = [System.Drawing.Color]::FromArgb( 39,  39, 42)
$cKenar    = [System.Drawing.Color]::FromArgb( 63,  63, 70)
$cYazi     = [System.Drawing.Color]::FromArgb(244, 244, 245)
$cMuted    = [System.Drawing.Color]::FromArgb(113, 113, 122)
$cMavi     = [System.Drawing.Color]::FromArgb( 59, 130, 246)
$cMaviArka = [System.Drawing.Color]::FromArgb( 23,  37, 84)

# ---------------------------------------------------------------------------
# Form
# ---------------------------------------------------------------------------
$form = New-Object System.Windows.Forms.Form
$form.Text            = "Questo Yonetim"
$form.Size            = New-Object System.Drawing.Size(520, 600)
$form.MinimumSize     = New-Object System.Drawing.Size(440, 520)
$form.StartPosition   = 'CenterScreen'
$form.FormBorderStyle = 'Sizable'
$form.MaximizeBox     = $true
$form.BackColor       = $cArka
$form.Font            = New-Object System.Drawing.Font("Segoe UI", 10)

try {
  $ico = Join-Path $kok 'public\logo.ico'
  $jpg = Join-Path $kok 'public\logo.jpg'
  if (Test-Path $ico) { $form.Icon = New-Object System.Drawing.Icon($ico) }
  elseif (Test-Path $jpg) {
    $b = New-Object System.Drawing.Bitmap $jpg
    $form.Icon = [System.Drawing.Icon]::FromHandle($b.GetHicon())
  }
} catch {}

# ---------------------------------------------------------------------------
# Kok TableLayoutPanel — tum pencereyi kaplar
# ---------------------------------------------------------------------------
$root = New-Object System.Windows.Forms.TableLayoutPanel
$root.Dock            = 'Fill'
$root.ColumnCount     = 1
$root.RowCount        = 7
$root.BackColor       = $cArka
$root.CellBorderStyle = 'None'
$root.Margin          = New-Object System.Windows.Forms.Padding(0)
$root.Padding         = New-Object System.Windows.Forms.Padding(0)
[void]$root.RowStyles.Add((New-Object System.Windows.Forms.RowStyle([System.Windows.Forms.SizeType]::Absolute,  90)))  # 0 header
[void]$root.RowStyles.Add((New-Object System.Windows.Forms.RowStyle([System.Windows.Forms.SizeType]::Absolute,   1)))  # 1 sep
[void]$root.RowStyles.Add((New-Object System.Windows.Forms.RowStyle([System.Windows.Forms.SizeType]::Absolute,  50)))  # 2 status
[void]$root.RowStyles.Add((New-Object System.Windows.Forms.RowStyle([System.Windows.Forms.SizeType]::Absolute,   1)))  # 3 sep
[void]$root.RowStyles.Add((New-Object System.Windows.Forms.RowStyle([System.Windows.Forms.SizeType]::Absolute, 112)))  # 4 butonlar
[void]$root.RowStyles.Add((New-Object System.Windows.Forms.RowStyle([System.Windows.Forms.SizeType]::Absolute,   1)))  # 5 sep
[void]$root.RowStyles.Add((New-Object System.Windows.Forms.RowStyle([System.Windows.Forms.SizeType]::Percent, 100)))   # 6 telefon
[void]$root.ColumnStyles.Add((New-Object System.Windows.Forms.ColumnStyle([System.Windows.Forms.SizeType]::Percent, 100)))
$form.Controls.Add($root)

# ---------------------------------------------------------------------------
# Row 0: Header
# ---------------------------------------------------------------------------
$pnlHdr = New-Object System.Windows.Forms.Panel
$pnlHdr.Dock      = 'Fill'
$pnlHdr.BackColor = $cHeader
$pnlHdr.Margin    = New-Object System.Windows.Forms.Padding(0)
$root.Controls.Add($pnlHdr, 0, 0)

$lblTitle = New-Object System.Windows.Forms.Label
$lblTitle.Text      = "QUESTO"
$lblTitle.ForeColor = $cYazi
$lblTitle.Font      = New-Object System.Drawing.Font("Segoe UI", 22, [System.Drawing.FontStyle]::Bold)
$lblTitle.Dock      = 'Top'
$lblTitle.Height    = 58
$lblTitle.TextAlign = 'MiddleCenter'
$lblTitle.Margin    = New-Object System.Windows.Forms.Padding(0)
$pnlHdr.Controls.Add($lblTitle)

$lblSub = New-Object System.Windows.Forms.Label
$lblSub.Text      = "Restoran Yonetim Sistemi"
$lblSub.ForeColor = $cMuted
$lblSub.Font      = New-Object System.Drawing.Font("Segoe UI", 9)
$lblSub.Dock      = 'Top'
$lblSub.Height    = 24
$lblSub.TextAlign = 'MiddleCenter'
$lblSub.Margin    = New-Object System.Windows.Forms.Padding(0)
$pnlHdr.Controls.Add($lblSub)

# ---------------------------------------------------------------------------
# Row 1, 3, 5: Separator cizgileri
# ---------------------------------------------------------------------------
foreach ($r in @(1, 3, 5)) {
  $s = New-Object System.Windows.Forms.Panel
  $s.Dock      = 'Fill'
  $s.BackColor = $cKenar
  $s.Margin    = New-Object System.Windows.Forms.Padding(0)
  $root.Controls.Add($s, 0, $r)
}

# ---------------------------------------------------------------------------
# Row 2: Durum cubugu
# ---------------------------------------------------------------------------
$genel = New-Object System.Windows.Forms.Label
$genel.Text      = "Kontrol ediliyor..."
$genel.ForeColor = [System.Drawing.Color]::White
$genel.BackColor = $cTuruncu
$genel.Font      = New-Object System.Drawing.Font("Segoe UI", 12, [System.Drawing.FontStyle]::Bold)
$genel.Dock      = 'Fill'
$genel.TextAlign = 'MiddleCenter'
$genel.Margin    = New-Object System.Windows.Forms.Padding(0)
$root.Controls.Add($genel, 0, 2)

# ---------------------------------------------------------------------------
# Row 4: 2x2 buton tablosu
# ---------------------------------------------------------------------------
$tblBtn = New-Object System.Windows.Forms.TableLayoutPanel
$tblBtn.Dock            = 'Fill'
$tblBtn.ColumnCount     = 2
$tblBtn.RowCount        = 2
$tblBtn.BackColor       = $cArka
$tblBtn.CellBorderStyle = 'None'
$tblBtn.Padding         = New-Object System.Windows.Forms.Padding(8, 6, 8, 6)
$tblBtn.Margin          = New-Object System.Windows.Forms.Padding(0)
[void]$tblBtn.ColumnStyles.Add((New-Object System.Windows.Forms.ColumnStyle([System.Windows.Forms.SizeType]::Percent, 50)))
[void]$tblBtn.ColumnStyles.Add((New-Object System.Windows.Forms.ColumnStyle([System.Windows.Forms.SizeType]::Percent, 50)))
[void]$tblBtn.RowStyles.Add((New-Object System.Windows.Forms.RowStyle([System.Windows.Forms.SizeType]::Percent, 55)))
[void]$tblBtn.RowStyles.Add((New-Object System.Windows.Forms.RowStyle([System.Windows.Forms.SizeType]::Percent, 45)))
$root.Controls.Add($tblBtn, 0, 4)

function MkBtn($text, $bg, $bold, $bord) {
  $b = New-Object System.Windows.Forms.Button
  $b.Text       = $text
  $b.Dock       = 'Fill'
  $b.FlatStyle  = 'Flat'
  $b.ForeColor  = $cYazi
  $b.BackColor  = $bg
  $b.Font       = if ($bold) { New-Object System.Drawing.Font("Segoe UI", 10, [System.Drawing.FontStyle]::Bold) } `
                  else       { New-Object System.Drawing.Font("Segoe UI", 9) }
  $b.Cursor     = [System.Windows.Forms.Cursors]::Hand
  $b.Margin     = New-Object System.Windows.Forms.Padding(3)
  $b.FlatAppearance.BorderSize = if ($bord) { 1 } else { 0 }
  if ($bord) { $b.FlatAppearance.BorderColor = $cKenar }
  return $b
}

$btnBaslat  = MkBtn "Baslat"         $cYesil   $true  $false
$btnDurdur  = MkBtn "Durdur"         $cKirmizi $true  $false
$btnYenile  = MkBtn "Durumu yenile"  $cKart    $false $true
$btnYeniden = MkBtn "Yeniden baslat" $cKart    $false $true

$btnBaslat.FlatAppearance.MouseOverBackColor  = [System.Drawing.Color]::FromArgb(21, 128, 61)
$btnDurdur.FlatAppearance.MouseOverBackColor  = [System.Drawing.Color]::FromArgb(185, 28, 28)
$btnYenile.FlatAppearance.MouseOverBackColor  = [System.Drawing.Color]::FromArgb(63, 63, 70)
$btnYeniden.FlatAppearance.MouseOverBackColor = [System.Drawing.Color]::FromArgb(63, 63, 70)

$tblBtn.Controls.Add($btnBaslat,  0, 0)
$tblBtn.Controls.Add($btnDurdur,  1, 0)
$tblBtn.Controls.Add($btnYenile,  0, 1)
$tblBtn.Controls.Add($btnYeniden, 1, 1)

# ---------------------------------------------------------------------------
# Port kontrolu (asenkron)
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
    } catch {} finally { $b.client.Close() }
    if ($ok) { $acik++ }
  }
  $toplam = $script:baglantilar.Count

  # Bir gecis bekleniyorsa (Baslat/Durdur): hedefe ULASANA kadar gecis yazisini
  # KORU. ~4 dk (96 tik x 2.5 sn) icinde ulasilmazsa - islem takilmis olabilir -
  # vazgec ve gercek durumu goster.
  if ($script:beklenen) {
    $script:bekleyenTik++
    $hedefVar = ($script:beklenen -eq 'baslat' -and $acik -eq $toplam) -or ($script:beklenen -eq 'durdur' -and $acik -eq 0)
    if (-not $hedefVar -and $script:bekleyenTik -lt 96) { return }
    $script:beklenen    = $null
    $script:bekleyenTik = 0
  }

  if ($acik -eq $toplam) {
    $genel.Text = "SISTEM CALISIYOR"; $genel.BackColor = $cYesil
    $btnBaslat.Enabled = $false; $btnDurdur.Enabled = $true
  } elseif ($acik -eq 0) {
    $genel.Text = "SISTEM KAPALI";    $genel.BackColor = $cKirmizi
    $btnBaslat.Enabled = $true;  $btnDurdur.Enabled = $false
  } else {
    $genel.Text = "KISMEN CALISIYOR ($acik/$toplam)"
    $genel.BackColor = $cTuruncu
    $btnBaslat.Enabled = $true; $btnDurdur.Enabled = $true
  }
}

function KontrolBaslat {
  $yeni = @()
  foreach ($p in $portlar) {
    $c   = New-Object System.Net.Sockets.TcpClient
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
    $script:ipGuncellemeSayac = 0; AdresGuncelle
  } else {
    if ((YerelIP) -ne $script:yerelIpCache) { AdresGuncelle }
  }
}

# Buton click'leri
$btnBaslat.Add_Click({
  if (-not $baslatBat) { [System.Windows.Forms.MessageBox]::Show("Baslatma .bat bulunamadi.", "Questo") | Out-Null; return }
  GizliCalistir $baslatBat 'gizli' $false
  $script:beklenen = 'baslat'; $script:bekleyenTik = 0
  $genel.Text = "BASLATILIYOR..."; $genel.BackColor = $cTuruncu
  $btnBaslat.Enabled = $false; $btnDurdur.Enabled = $false
})
$btnDurdur.Add_Click({
  if (-not $durdurBat) { [System.Windows.Forms.MessageBox]::Show("Durdurma .bat bulunamadi.", "Questo") | Out-Null; return }
  GizliCalistir $durdurBat $null $false
  $script:beklenen = 'durdur'; $script:bekleyenTik = 0
  $genel.Text = "DURDURULUYOR..."; $genel.BackColor = $cTuruncu
  $btnBaslat.Enabled = $false; $btnDurdur.Enabled = $false
})
# "Durumu yenile" sonrasi butonu kisa sure "Yenilendi" yapip eski haline dondur
# (gorsel geri bildirim). Tek atislik timer.
$yenileTimer = New-Object System.Windows.Forms.Timer
$yenileTimer.Interval = 1300
$yenileTimer.Add_Tick({
  $yenileTimer.Stop()
  $btnYenile.Text      = "Durumu yenile"
  $btnYenile.BackColor = $cKart
})

# Durumu yenile: bekleme durumunu temizle (gercek port durumu hemen okunsun),
# IP + QR'yi tazele ve butonda "Yeniliyor..." -> "Yenilendi" geri bildirimi goster.
$btnYenile.Add_Click({
  $script:beklenen = $null; $script:bekleyenTik = 0
  $btnYenile.Text = "Yeniliyor..."; $btnYenile.Enabled = $false; $btnYenile.Refresh()
  Tazele
  AdresGuncelle
  $btnKopya.Text = "IP'yi kopyala"
  $btnYenile.Enabled = $true
  $btnYenile.Text = "Yenilendi"; $btnYenile.BackColor = $cYesil
  $yenileTimer.Stop(); $yenileTimer.Start()
})
$btnYeniden.Add_Click({
  if (-not $durdurBat -or -not $baslatBat) { [System.Windows.Forms.MessageBox]::Show("Bat bulunamadi.", "Questo") | Out-Null; return }
  $script:beklenen = 'baslat'; $script:bekleyenTik = 0
  $genel.Text = "YENIDEN BASLATILIYOR..."; $genel.BackColor = $cTuruncu
  $btnBaslat.Enabled = $false; $btnDurdur.Enabled = $false
  $genel.Refresh()
  GizliCalistir $durdurBat $null $true
  GizliCalistir $baslatBat 'gizli' $false
})

# ---------------------------------------------------------------------------
# Row 6: SplitContainer — sol: IP  |  sag: QR
# ---------------------------------------------------------------------------
$split = New-Object System.Windows.Forms.SplitContainer
$split.Dock             = 'Fill'
$split.Orientation      = 'Vertical'
$split.SplitterWidth    = 1
$split.BackColor        = $cKenar
$split.Panel1.BackColor = $cArka
$split.Panel2.BackColor = $cArka
$split.Panel1MinSize    = 170
$split.Panel2MinSize    = 130
$split.IsSplitterFixed  = $false
$split.Margin           = New-Object System.Windows.Forms.Padding(0)
$root.Controls.Add($split, 0, 6)

# --- Sol panel: IP bilgisi ---
$tblL = New-Object System.Windows.Forms.TableLayoutPanel
$tblL.Dock            = 'Fill'
$tblL.ColumnCount     = 1
$tblL.RowCount        = 4
$tblL.BackColor       = $cArka
$tblL.CellBorderStyle = 'None'
$tblL.Padding         = New-Object System.Windows.Forms.Padding(16, 14, 12, 14)
$tblL.Margin          = New-Object System.Windows.Forms.Padding(0)
[void]$tblL.ColumnStyles.Add((New-Object System.Windows.Forms.ColumnStyle([System.Windows.Forms.SizeType]::Percent, 100)))
[void]$tblL.RowStyles.Add((New-Object System.Windows.Forms.RowStyle([System.Windows.Forms.SizeType]::Absolute, 24)))
[void]$tblL.RowStyles.Add((New-Object System.Windows.Forms.RowStyle([System.Windows.Forms.SizeType]::Absolute, 38)))
[void]$tblL.RowStyles.Add((New-Object System.Windows.Forms.RowStyle([System.Windows.Forms.SizeType]::Absolute, 44)))
[void]$tblL.RowStyles.Add((New-Object System.Windows.Forms.RowStyle([System.Windows.Forms.SizeType]::Percent, 100)))
$split.Panel1.Controls.Add($tblL)

$lblBolum = New-Object System.Windows.Forms.Label
$lblBolum.Text      = "TELEFON BAGLANTISI"
$lblBolum.ForeColor = $cMuted
$lblBolum.Font      = New-Object System.Drawing.Font("Segoe UI", 8, [System.Drawing.FontStyle]::Bold)
$lblBolum.Dock      = 'Fill'
$lblBolum.TextAlign = 'MiddleLeft'
$lblBolum.Margin    = New-Object System.Windows.Forms.Padding(0)
$tblL.Controls.Add($lblBolum, 0, 0)

$lblIP = New-Object System.Windows.Forms.Label
$lblIP.Text      = "Yukleniyor..."
$lblIP.ForeColor = $cYesil
$lblIP.Font      = New-Object System.Drawing.Font("Consolas", 11, [System.Drawing.FontStyle]::Bold)
$lblIP.Dock      = 'Fill'
$lblIP.TextAlign = 'MiddleLeft'
$lblIP.Margin    = New-Object System.Windows.Forms.Padding(0)
$tblL.Controls.Add($lblIP, 0, 1)

$btnKopya = New-Object System.Windows.Forms.Button
$btnKopya.Text      = "IP'yi kopyala"
$btnKopya.Dock      = 'Fill'
$btnKopya.FlatStyle = 'Flat'
$btnKopya.ForeColor = [System.Drawing.Color]::FromArgb(147, 197, 253)
$btnKopya.BackColor = $cMaviArka
$btnKopya.Font      = New-Object System.Drawing.Font("Segoe UI", 9)
$btnKopya.Cursor    = [System.Windows.Forms.Cursors]::Hand
$btnKopya.Margin    = New-Object System.Windows.Forms.Padding(0, 2, 0, 2)
$btnKopya.FlatAppearance.BorderSize  = 1
$btnKopya.FlatAppearance.BorderColor = $cMavi
$btnKopya.FlatAppearance.MouseOverBackColor = [System.Drawing.Color]::FromArgb(30, 58, 138)
$btnKopya.Add_Click({
  $ip = YerelIP
  if (-not $ip) { return }
  $u = "http://$($ip):3000"
  try { [System.Windows.Forms.Clipboard]::SetText($u) }
  catch { try { Set-Clipboard -Value $u } catch {} }
  $btnKopya.Text = "Kopyalandi!"
})
$tblL.Controls.Add($btnKopya, 0, 2)

$lblHint = New-Object System.Windows.Forms.Label
$lblHint.Text      = "IP degisirse Durumu yenile ile guncelle."
$lblHint.ForeColor = $cMuted
$lblHint.Font      = New-Object System.Drawing.Font("Segoe UI", 8)
$lblHint.Dock      = 'Fill'
$lblHint.TextAlign = 'TopLeft'
$lblHint.Margin    = New-Object System.Windows.Forms.Padding(0, 8, 0, 0)
$tblL.Controls.Add($lblHint, 0, 3)

# --- Sag panel: QR kod ---
$tblR = New-Object System.Windows.Forms.TableLayoutPanel
$tblR.Dock            = 'Fill'
$tblR.ColumnCount     = 1
$tblR.RowCount        = 3
$tblR.BackColor       = $cArka
$tblR.CellBorderStyle = 'None'
$tblR.Padding         = New-Object System.Windows.Forms.Padding(10, 14, 14, 10)
$tblR.Margin          = New-Object System.Windows.Forms.Padding(0)
[void]$tblR.ColumnStyles.Add((New-Object System.Windows.Forms.ColumnStyle([System.Windows.Forms.SizeType]::Percent, 100)))
[void]$tblR.RowStyles.Add((New-Object System.Windows.Forms.RowStyle([System.Windows.Forms.SizeType]::Absolute, 22)))
[void]$tblR.RowStyles.Add((New-Object System.Windows.Forms.RowStyle([System.Windows.Forms.SizeType]::Percent, 100)))
[void]$tblR.RowStyles.Add((New-Object System.Windows.Forms.RowStyle([System.Windows.Forms.SizeType]::Absolute, 22)))
$split.Panel2.Controls.Add($tblR)

$lblQrHdr = New-Object System.Windows.Forms.Label
$lblQrHdr.Text      = "QR KODU TARA"
$lblQrHdr.ForeColor = $cMuted
$lblQrHdr.Font      = New-Object System.Drawing.Font("Segoe UI", 8, [System.Drawing.FontStyle]::Bold)
$lblQrHdr.Dock      = 'Fill'
$lblQrHdr.TextAlign = 'MiddleCenter'
$lblQrHdr.Margin    = New-Object System.Windows.Forms.Padding(0)
$tblR.Controls.Add($lblQrHdr, 0, 0)

$picQR = New-Object System.Windows.Forms.PictureBox
$picQR.Dock      = 'Fill'
$picQR.SizeMode  = [System.Windows.Forms.PictureBoxSizeMode]::Zoom
$picQR.BackColor = [System.Drawing.Color]::White
$picQR.Margin    = New-Object System.Windows.Forms.Padding(2)
$tblR.Controls.Add($picQR, 0, 1)

$lblQrBot = New-Object System.Windows.Forms.Label
$lblQrBot.Text      = "Tara, ana ekrana ekle"
$lblQrBot.ForeColor = $cMuted
$lblQrBot.Font      = New-Object System.Drawing.Font("Segoe UI", 8)
$lblQrBot.Dock      = 'Fill'
$lblQrBot.TextAlign = 'MiddleCenter'
$lblQrBot.Margin    = New-Object System.Windows.Forms.Padding(0)
$tblR.Controls.Add($lblQrBot, 0, 2)

# ---------------------------------------------------------------------------
# Adres + QR guncelleme
# ---------------------------------------------------------------------------
function AdresGuncelle {
  $ip = YerelIP
  $script:yerelIpCache = $ip
  $lblIP.Text = if ($ip) { "http://$($ip):3000" } else { "(Wi-Fi bagli degil)" }
  if ($ip) {
    try {
      $qrScript = Join-Path $PSScriptRoot 'qr-uret.mjs'
      $qrPng    = Join-Path $env:TEMP 'questo-qr.png'
      $p = Start-Process 'node' `
             -ArgumentList "`"$qrScript`" `"http://$($ip):3000`" `"$qrPng`"" `
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
# Timer + baslat
# ---------------------------------------------------------------------------
$timer = New-Object System.Windows.Forms.Timer
$timer.Interval = 2500
$timer.Add_Tick({ Tazele })
$timer.Start()

$form.Add_Shown({
  $split.SplitterDistance = [int]($split.Width * 0.53)
  Tazele
  AdresGuncelle
})

[void]$form.ShowDialog()
$timer.Stop()
