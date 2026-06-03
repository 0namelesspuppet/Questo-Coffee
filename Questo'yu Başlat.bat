@echo off
chcp 65001 >nul
setlocal enableextensions enabledelayedexpansion
title Questo - Baslatiliyor...
color 06
cd /d "%~dp0"

rem Gizli mod: GUI/launcher bu .bat'i "gizli" argumaniyla cagirinca konsol
rem penceresi YOKTUR; hata halinde "pause" sonsuza kadar bekleyip kilitlenir.
rem Bu modda pause yerine kisa bir timeout ile cikariz (log dosyasina yazilir).
set "GIZLI=0"
if /i "%~1"=="gizli" set "GIZLI=1"

rem [0/5] Ilk kurulum: .env.local yoksa ya da bossa yerel emulator sablonundan uret.
rem GitHub'dan indirince .env.local gelmez (.gitignore'da). Bu adim olmadan seed
rem "RESTORAN_ID eksik" ile coker ve uygulama emulatore baglanamaz.
set "ENVSIZE=0"
if exist ".env.local" for %%A in (".env.local") do set "ENVSIZE=%%~zA"
if "!ENVSIZE!"=="0" (
    echo   Ilk kurulum: .env.local olusturuluyor ^(yerel emulator ayarlari^)...
    copy /y ".env.local.ornek" ".env.local" >nul
)

set "QUESTO_URL=http://localhost:3000"
set "LOG=logs"

echo.
echo   Questo baslatiliyor...
echo.

rem [0b/5] node_modules eksikse npm install calistir
if not exist "node_modules\.bin\next.cmd" (
    echo   [0/5] Bagimliliklar eksik, npm install calistiriliyor...
    npm install
    if errorlevel 1 (
        echo.
        echo   HATA: npm install basarisiz oldu.
        if "%GIZLI%"=="1" ( timeout /t 8 /nobreak >nul ) else ( pause )
        exit /b 1
    )
    echo   [0/5] Bagimliliklar yuklendi.
    echo.
)

rem [1/5] Portlari temizle
echo   [1/5] Portlar temizleniyor...
call npm run kill-ports

rem Onceki periodic yedek instance'ini durdur (wmic yerine Get-CimInstance)
powershell -NoProfile -Command "Get-CimInstance Win32_Process -Filter \"Name='powershell.exe'\" | Where-Object { $_.CommandLine -like '*yedek-periodic.ps1*' } | ForEach-Object { Stop-Process -Id $_.ProcessId -Force -ErrorAction SilentlyContinue }" >nul 2>&1

rem Logs klasoru + eski logu temizle
if not exist "%LOG%" mkdir "%LOG%"
for %%f in (emulator.log nextjs.log seed.log yedek.log) do (
    if exist "%LOG%\%%f" del /q "%LOG%\%%f"
)

rem [2/5] Emulator (gizli pencere, vbs launcher)
echo   [2/5] Emulator baslatiliyor (gizli, log: %LOG%\emulator.log)...
wscript "%~dp0scripts\gizli-calistir.vbs" "emulator.log" "npm run emulators"

rem [3/5] Next.js'i HEMEN baslat - boot icin emulatore ihtiyaci yok. Boylece
rem olasi ~30 sn build, emulator hazirligi ve seed ile PARALEL ilerler (sirayla
rem beklemek yerine). Production'da sayfalar onceden derli => ilk tiklamalar hizli.
echo   [3/5] Next.js baslatiliyor (production, paralel, log: %LOG%\nextjs.log)...
echo         (kod degismisse ilk acilista ~30 sn build olabilir - arka planda)
wscript "%~dp0scripts\gizli-calistir.vbs" "nextjs.log" "powershell -NoProfile -ExecutionPolicy Bypass -File scripts\uygulama-baslat.ps1"

rem Periodic yedek scripti (15 dk'da bir export + gunluk zip) - paralel, kritik degil
echo   [+]   Periodic yedek scripti baslatiliyor (log: %LOG%\yedek.log)...
wscript "%~dp0scripts\gizli-calistir.vbs" "yedek.log" "powershell -NoProfile -ExecutionPolicy Bypass -File scripts\yedek-periodic.ps1"

rem [4/5] Sadece Next.js'i bekle (3000) - emulator arka planda devam eder.
rem Boylece tarayici ~5 sn'de acilir (yeniden build yoksa). Emulator
rem genellikle 25-40 sn'de hazir olur; siz giris formunu doldurana kadar hazir olmus olur.
echo   [4/5] Uygulama hazir olana kadar bekleniyor...
powershell -NoProfile -Command "$d=0.0; while($d -lt 150){ try{ (New-Object Net.Sockets.TcpClient('127.0.0.1',3000)).Close(); exit 0 }catch{ Start-Sleep -Milliseconds 200; $d+=0.2 } }; exit 1"
if errorlevel 1 (
    echo.
    echo   HATA: Next.js 150 saniye icinde baslamadi.
    echo   Log: %LOG%\nextjs.log
    if "%GIZLI%"=="1" ( timeout /t 8 /nobreak >nul ) else ( pause )
    exit /b 1
)

rem [5/5] Demo veri yukle - ARKA PLANDA (emulator hazir degilse seed kendiginden
rem yeniden dener; idempotent: menu zaten doluysa atlaniyor).
echo   [5/5] Demo veri arka planda yukleniyor (gerekirse)...
wscript "%~dp0scripts\gizli-calistir.vbs" "seed.log" "npm run seed"

rem Tarayiciyi ac - Chrome onceligi, Edge fallback, son care: shell URL handler
set "TARAYICI=?"
set "CHROME_X64=%ProgramFiles%\Google\Chrome\Application\chrome.exe"
set "CHROME_X86=%ProgramFiles(x86)%\Google\Chrome\Application\chrome.exe"
set "EDGE_X86=%ProgramFiles(x86)%\Microsoft\Edge\Application\msedge.exe"
set "EDGE_X64=%ProgramFiles%\Microsoft\Edge\Application\msedge.exe"

if exist "%CHROME_X64%" (
    start "" "%CHROME_X64%" "%QUESTO_URL%"
    set "TARAYICI=Chrome"
) else if exist "%CHROME_X86%" (
    start "" "%CHROME_X86%" "%QUESTO_URL%"
    set "TARAYICI=Chrome"
) else if exist "%EDGE_X86%" (
    start "" "%EDGE_X86%" "%QUESTO_URL%"
    set "TARAYICI=Edge"
) else if exist "%EDGE_X64%" (
    start "" "%EDGE_X64%" "%QUESTO_URL%"
    set "TARAYICI=Edge"
) else (
    rundll32 url.dll,FileProtocolHandler %QUESTO_URL%
    set "TARAYICI=Default"
)

rem Son ekran
cls
title Questo - Calisiyor
color 0A
echo.
echo   Questo hazir!  ^>  %QUESTO_URL%
echo.
echo   Telefondan (ayni Wi-Fi): Questo Yonetim penceresinden IP adresini kopyalayin.
echo   NOT: Emulator arka planda ~30 sn'de hazir olur. Giris icin biraz bekleyin.
echo.
echo   Tarayici:   !TARAYICI!   (acilmadiysa URL'i manuel acin)
echo   Loglar:     %LOG%\emulator.log  /  %LOG%\nextjs.log  /  %LOG%\yedek.log
echo   Durdurmak:  Questo'yu Durdur.bat
echo.
echo   Bu pencere 2 saniye sonra otomatik kapanacak...
timeout /t 2 /nobreak >nul
endlocal
exit /b 0
