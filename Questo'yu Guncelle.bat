@echo off
chcp 65001 >nul
setlocal enableextensions enabledelayedexpansion
title Questo - Guncelleniyor
color 06
cd /d "%~dp0"

echo.
echo   Questo guncelleniyor...
echo.

rem [1/4] Uygulama calisiyorsa uyar (port 3000). Calisirken build riskli.
powershell -NoProfile -Command "try{(New-Object Net.Sockets.TcpClient('127.0.0.1',3000)).Close();exit 0}catch{exit 1}" >nul 2>&1
if not errorlevel 1 (
    echo   UYARI: Questo su an calisiyor gibi gorunuyor.
    echo   Once "Questo'yu Durdur.bat" ile durdurmaniz onerilir.
    echo   Devam etmek icin bir tusa basin, vazgecmek icin pencereyi kapatin...
    pause >nul
)

rem [2/4] Uzak git deposu varsa son surumu cek; yoksa elle kopyalanmis varsayilir.
where git >nul 2>&1
if errorlevel 1 (
    echo   [1/3] Git yok - elle kopyalanan dosyalarla devam ediliyor.
    goto :KUR
)
git rev-parse --is-inside-work-tree >nul 2>&1
if errorlevel 1 (
    echo   [1/3] Git deposu degil - elle kopyalanan dosyalarla devam ediliyor.
    goto :KUR
)
set "HASREMOTE="
for /f "delims=" %%r in ('git remote 2^>nul') do set "HASREMOTE=1"
if defined HASREMOTE (
    echo   [1/3] Uzak depodan son surum cekiliyor ^(git pull^)...
    git pull --ff-only
    if errorlevel 1 (
        echo   UYARI: git pull basarisiz/atlandi - mevcut dosyalarla devam ediliyor.
        echo          ^(yerel degisiklik ya da catisma olabilir; .env yerel ayarlar korunur^)
    )
) else (
    echo   [1/3] Uzak depo yok - elle kopyalanan dosyalarla devam ediliyor.
)

:KUR
rem [3/4] Bagimliliklar (lock degismis olabilir - npm install idempotenttir).
echo   [2/3] Bagimliliklar guncelleniyor ^(npm install^)...
call npm install
if errorlevel 1 (
    echo.
    echo   HATA: npm install basarisiz oldu. Internet baglantisi var mi?
    pause
    exit /b 1
)

rem [4/4] Production build. Basarisizsa onceki build hala calisir durumda.
echo   [3/3] Production build aliniyor ^(npm run build^)...
call npm run build
if errorlevel 1 (
    echo.
    echo   HATA: Build basarisiz oldu. Kodda bir sorun olabilir.
    echo   Onceki surum hala calisir durumda - 'Questo'yu Baslat.bat' eski haliyle acilir.
    pause
    exit /b 1
)

cls
title Questo - Guncellendi
color 0A
echo.
echo   Questo guncellendi!
echo.
echo   Simdi "Questo'yu Baslat.bat" ile baslatabilirsiniz.
echo.
echo   Bu pencere kapatilabilir.
pause >nul
endlocal
exit /b 0
