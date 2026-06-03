@echo off
chcp 65001 >nul
setlocal enableextensions enabledelayedexpansion
title Questo - Durduruluyor
color 04
cd /d "%~dp0"

echo.
echo   Questo durduruluyor...
echo.

REM [1/4] Periodic yedek scripti (sadece bu, baska powershell'lere dokunma)
echo   [1/4] Periodic yedek scripti kapatiliyor...
powershell -NoProfile -Command "Get-CimInstance Win32_Process -Filter \"Name='powershell.exe'\" | Where-Object { $_.CommandLine -like '*yedek-periodic.ps1*' } | ForEach-Object { Stop-Process -Id $_.ProcessId -Force -ErrorAction SilentlyContinue }" >nul 2>&1

REM [2/4] Adisyonlari diske yaz (emulator hala calisirken kapanis yedegi al).
echo   [2/4] Adisyonlar kaydediliyor (kapanis yedegi)...
powershell -NoProfile -ExecutionPolicy Bypass -File "%~dp0scripts\kapanis-yedek.ps1"

REM [3/4] Servisleri kapat - ONCE normal kullanici olarak dene (UAC istemeden).
REM Sistem normal kullanici ile baslatildiysa (GUI/cift tik) bu yeterlidir ve
REM yonetici onayi GEREKMEZ. Yalniz acilista otomatik (yonetici) baslatildiysa
REM asagidaki dogrulama bir kez yukseltme yapar.
echo   [3/4] Servisler kapatiliyor (Next.js + Emulator)...
taskkill /F /IM node.exe >nul 2>&1
taskkill /F /IM java.exe >nul 2>&1

REM [4/4] Dogrula - portlar gercekten serbest mi?
timeout /t 2 /nobreak >nul
set "KALAN="
for %%p in (3000 8080 9099) do (
    powershell -NoProfile -Command "try{(New-Object Net.Sockets.TcpClient('127.0.0.1',%%p)).Close();exit 0}catch{exit 1}" >nul 2>&1
    if not errorlevel 1 set "KALAN=1"
)

if defined KALAN (
    net session >nul 2>&1
    if errorlevel 1 (
        echo.
        echo   Bazi servisler yonetici yetkisiyle baslatilmis.
        echo   Bir kez yonetici olarak kapatiliyor - UAC iletisinde "Evet" deyin...
        timeout /t 1 /nobreak >nul
        REM ONEMLI: %%~s0 = KISA (8.3) yol. Tam yol "Questo'yu Durdur.bat"
        REM icindeki APOSTROF, PowerShell tek-tirnakli metnini bozup yukseltmeyi
        REM basarisiz birakiyordu (sistem durmuyordu). Kisa yol ASCII'dir, guvenli.
        powershell -NoProfile -Command "Start-Process -FilePath 'cmd.exe' -ArgumentList '/c','\"%~s0\"' -Verb RunAs -WindowStyle Hidden"
        endlocal
        exit /b 0
    ) else (
        REM Zaten yoneticiyiz ama bir sey kapanmadi - bir tur daha dene.
        taskkill /F /IM node.exe >nul 2>&1
        taskkill /F /IM java.exe >nul 2>&1
        timeout /t 1 /nobreak >nul
    )
)

echo.
echo   Questo durduruldu (tum portlar bos).
echo.
timeout /t 2 /nobreak >nul
endlocal
exit /b 0
