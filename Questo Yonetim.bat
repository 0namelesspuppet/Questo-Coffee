@echo off
chcp 65001 >nul
setlocal enableextensions enabledelayedexpansion
cd /d "%~dp0"
title Questo Yonetim

rem Gercek .bat dosya adlarini joker ile cozumle. Dosya adindaki Turkce 's'
rem (Baslat) kod sayfasina gore degisebildigi icin adi elle yazmak yerine
rem "Ba?lat" deseniyle bul; ? tek karakteri (s) eslestirir. Sonra kisa (8.3,
rem ASCII) yol biciminde sakla (~sf) - chcp 65001 altinda call icin guvenli.
set "BASLAT="
set "DURDUR="
for %%f in ("*Ba?lat.bat") do set "BASLAT=%%~sff"
for %%f in ("*Durdur.bat") do set "DURDUR=%%~sff"

:menu
cls
color 0B
echo.
echo    ============================================
echo               Q U E S T O   Y O N E T I M
echo    ============================================
echo.
echo       [1]   Baslat    - sistemi ayaga kaldir
echo       [2]   Durdur    - sistemi kapat
echo       [3]   Durum     - calisiyor mu? (port kontrol)
echo       [4]   Loglar    - log klasorunu ac
echo       [0]   Cikis
echo.
echo    --------------------------------------------
choice /c 12340 /n /m "    Seciminizi tuslayin (1/2/3/4/0): "
set "S=%errorlevel%"
if "%S%"=="1" goto baslat
if "%S%"=="2" goto durdur
if "%S%"=="3" goto durum
if "%S%"=="4" goto loglar
if "%S%"=="5" goto cikis
goto menu

:baslat
if not defined BASLAT (
    echo.
    echo    HATA: Baslatma .bat dosyasi bulunamadi.
    pause
    goto menu
)
cls
call "%BASLAT%"
goto menu

:durdur
if not defined DURDUR (
    echo.
    echo    HATA: Durdurma .bat dosyasi bulunamadi.
    pause
    goto menu
)
cls
call "%DURDUR%"
goto menu

:durum
cls
color 0E
echo.
echo    Durum kontrol ediliyor...
echo.
call :portKontrol 3000 "Next.js (uygulama)"
call :portKontrol 8080 "Firestore emulator"
call :portKontrol 9099 "Auth emulator"
echo.
echo    (DOLU = o servis calisiyor, BOS = kapali)
echo.
pause
goto menu

:portKontrol
rem %1 = port, %2 = aciklama
powershell -NoProfile -Command "try{(New-Object Net.Sockets.TcpClient('127.0.0.1',%1)).Close();exit 0}catch{exit 1}" >nul 2>&1
if errorlevel 1 (
    echo    Port %~1 : BOS    - %~2
) else (
    echo    Port %~1 : DOLU   - %~2
)
exit /b 0

:loglar
if exist "%~dp0logs" (
    start "" explorer "%~dp0logs"
) else (
    echo.
    echo    Henuz log klasoru yok (sistem hic baslatilmamis olabilir).
    pause
)
goto menu

:cikis
endlocal
exit /b 0
