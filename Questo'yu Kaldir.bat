@echo off
chcp 65001 >nul
setlocal
title Questo - Kaldirma
color 04
cd /d "%~dp0"

echo.
echo   Bu islem kurulum dosyalarini siler (kaynak kod korunur).
echo   Silinen: node_modules, .next, .env.local, logo.ico, logs, masaustu kisayolu
echo.
set /p ONAY=   Devam etmek istiyor musunuz? (E/H):
if /i not "%ONAY%"=="E" (
    echo   Iptal edildi.
    timeout /t 2 /nobreak >nul
    exit /b 0
)

echo.
echo   [1/6] node_modules siliniyor...
if exist "node_modules" rmdir /s /q "node_modules"

echo   [2/6] functions\node_modules siliniyor...
if exist "functions\node_modules" rmdir /s /q "functions\node_modules"

echo   [3/6] .next siliniyor...
if exist ".next" rmdir /s /q ".next"

echo   [4/6] .env.local siliniyor...
if exist ".env.local" del /q ".env.local"

echo   [5/6] public\logo.ico siliniyor...
if exist "public\logo.ico" del /q "public\logo.ico"

echo   [6/6] logs ve masaustu kisayolu siliniyor...
if exist "logs" rmdir /s /q "logs"
powershell -NoProfile -Command "Remove-Item \"$env:USERPROFILE\Desktop\Questo Yonetim.lnk\" -Force -ErrorAction SilentlyContinue"

color 0A
echo.
echo   Kaldirma tamamlandi.
echo   Yeniden kurmak icin: Questo'yu Kur.bat
echo.
pause
endlocal
exit /b 0
