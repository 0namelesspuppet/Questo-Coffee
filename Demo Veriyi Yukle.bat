@echo off
chcp 65001 >nul
title Questo - Demo Veri
color 0E

echo.
echo  ╔════════════════════════════════════════════╗
echo  ║       Demo veri yukleniyor...              ║
echo  ╚════════════════════════════════════════════╝
echo.
echo  Bu komut menuyu (kategoriler + urunler) ve 15 masayi
echo  yeniden olusturur (mevcut demo veriyi silip yeniden yukler).
echo.
echo  Emulator acik olmali! Once 'Questo'yu Baslat.bat' calisir olmali.
echo.

cd /d "%~dp0"
if not exist ".env.local" copy /y ".env.local.ornek" ".env.local" >nul
set "SEED_FORCE=1"
call npm run seed

echo.
echo  Tamamlandi. Bu pencereyi kapatabilirsiniz.
pause
