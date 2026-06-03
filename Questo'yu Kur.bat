@echo off
chcp 65001 >nul
setlocal enableextensions enabledelayedexpansion
title Questo - Kurulum
color 0B
cd /d "%~dp0"

echo.
echo    ============================================
echo               Q U E S T O   K U R U L U M
echo    ============================================
echo.
echo    Bu pencere gerekli her seyi tek seferde kurar.
echo    Bittiginde sistemi "Questo Yonetim" ile yonetirsiniz.
echo.

rem ---------------------------------------------------------------------
rem [0/6] "Internet/USB" guvenlik isaretini temizle (Mark of the Web)
rem ---------------------------------------------------------------------
rem Bu klasor baska PC'ye USB/MEGA/indirme ile geldiyse Windows tum
rem dosyalari "disaridan geldi" diye isaretler. O zaman .bat dosyalarini
rem cift tiklayinca calistirmak yerine "Bu dosyayi nasil acmak
rem istiyorsunuz?" (Not Defteri vb.) diye sorar ve kurulum gerceklesmez.
rem Asagidaki satir bu isareti tum .bat/.ps1/.vbs/.cmd dosyalardan siler.
echo    [0/6] Dosya guvenlik isaretleri temizleniyor (USB/internet kopyasi)...
powershell -NoProfile -ExecutionPolicy Bypass -Command "Get-ChildItem -Recurse -Include *.bat,*.ps1,*.vbs,*.cmd -File | Unblock-File" >nul 2>&1
echo          Tamam.

rem ---------------------------------------------------------------------
rem [1/6] Node.js kontrol
rem ---------------------------------------------------------------------
echo    [1/6] Node.js kontrol ediliyor...
where node >nul 2>&1
if errorlevel 1 (
    echo.
    echo    HATA: Node.js bulunamadi.
    echo    Lutfen once kurun: https://nodejs.org  ^(LTS surumu^)
    echo    Kurarken "Add to PATH" isaretli kalsin, sonra bilgisayari
    echo    yeniden baslatip bu dosyayi tekrar calistirin.
    echo.
    start "" https://nodejs.org
    pause
    exit /b 1
)
for /f "delims=" %%v in ('node -v') do echo          Node.js bulundu: %%v

rem ---------------------------------------------------------------------
rem [2/6] Java kontrol (Firebase emulator icin sart)
rem ---------------------------------------------------------------------
echo    [2/6] Java kontrol ediliyor...
where java >nul 2>&1
if errorlevel 1 (
    echo.
    echo    HATA: Java bulunamadi. Firebase emulator Java olmadan calismaz.
    echo    Lutfen kurun: https://adoptium.net  ^(Temurin 21 LTS^)
    echo    Kurduktan sonra bu dosyayi tekrar calistirin.
    echo.
    start "" https://adoptium.net
    pause
    exit /b 1
)
echo          Java bulundu.

rem ---------------------------------------------------------------------
rem [3/6] Firebase CLI kontrol / gerekiyorsa kur
rem ---------------------------------------------------------------------
echo    [3/6] Firebase CLI kontrol ediliyor...
where firebase >nul 2>&1
if errorlevel 1 (
    echo          Firebase CLI yok - kuruluyor ^(npm install -g firebase-tools^)...
    echo          Bu islem birkac dakika surebilir, lutfen bekleyin.
    call npm install -g firebase-tools
    where firebase >nul 2>&1
    if errorlevel 1 (
        echo.
        echo    NOT: Firebase CLI kuruldu ama bu pencere eski PATH ile acildigi
        echo    icin hemen gorunmeyebilir. Kurulumun geri kalani devam edecek;
        echo    sorun cikarsa TUM pencereleri kapatip bu dosyayi tekrar acin.
        echo.
    ) else (
        echo          Firebase CLI kuruldu.
    )
) else (
    echo          Firebase CLI bulundu.
)

rem ---------------------------------------------------------------------
rem [4/6] .env.local olustur (yoksa)
rem ---------------------------------------------------------------------
echo    [4/6] Ayar dosyasi ^(.env.local^) hazirlaniyor...
set "ENVSIZE=0"
if exist ".env.local" for %%A in (".env.local") do set "ENVSIZE=%%~zA"
if "!ENVSIZE!"=="0" (
    if exist ".env.local.ornek" (
        copy /y ".env.local.ornek" ".env.local" >nul
        echo          .env.local olusturuldu ^(yerel emulator ayarlari^).
    ) else (
        echo          UYARI: .env.local.ornek bulunamadi - atlandi.
    )
) else (
    echo          .env.local zaten var - korundu.
)

rem ---------------------------------------------------------------------
rem [5/6] Bagimliliklari kur (npm install)
rem ---------------------------------------------------------------------
echo    [5/6] Uygulama bagimliliklari kuruluyor ^(npm install^)...
echo          Birkac dakika surebilir - lutfen bekleyin.
call npm install
if errorlevel 1 (
    echo.
    echo    HATA: npm install basarisiz oldu. Internet baglantisini kontrol
    echo    edip bu dosyayi tekrar calistirin.
    echo.
    pause
    exit /b 1
)
echo          Bagimliliklar kuruldu.

rem ---------------------------------------------------------------------
rem [6/6] Ilk derleme (build) - ilk acilis aninda hizli olsun
rem ---------------------------------------------------------------------
echo    [6/6] Uygulama ilk kez derleniyor ^(build^)...
echo          NOT: "An Application Control policy has blocked this file"
echo          benzeri bir uyari gorursen SORUN DEGIL - Windows Akilli Uygulama
echo          Denetimi yerel motoru engelliyor, sistem otomatik olarak WASM
echo          motoruna gecip derlemeyi tamamlar ^(sadece biraz daha yavas^).
call npm run build
if errorlevel 1 (
    echo          UYARI: Build basarisiz oldu. Sistem yine de calisir
    echo          ^(ilk acilista otomatik derlenir^), sadece ilk acilis yavas olur.
) else (
    echo          Derleme tamamlandi.
)

rem ---------------------------------------------------------------------
rem Masaustu kisayolu olustur (yonetici gerekmez)
rem ---------------------------------------------------------------------
echo    [+]   Masaustune "Questo Yonetim" kisayolu olusturuluyor...
powershell -NoProfile -ExecutionPolicy Bypass -File "scripts\kisayol-olustur.ps1" >nul 2>&1
if errorlevel 1 (
    echo          ^(Kisayol olusturulamadi - onemli degil, klasordeki
    echo           "Questo Yonetim.bat" ile de yonetebilirsiniz.^)
) else (
    echo          Masaustunde "Questo Yonetim" kisayolu hazir.
)

rem ---------------------------------------------------------------------
rem Bitti
rem ---------------------------------------------------------------------
color 0A
echo.
echo    ============================================
echo                 K U R U L U M   B I T T I
echo    ============================================
echo.
echo    Artik sistemi su sekilde yonetebilirsiniz:
echo.
echo      - Masaustundeki "Questo Yonetim" kisayoluna cift tiklayin, ya da
echo      - Klasordeki "Questo Yonetim.bat" ile Baslat/Durdur yapin.
echo.
echo    Istege bagli: PC her acildiginda otomatik baslamasi icin
echo    scripts\otomatik-baslat-kur.ps1 dosyasina sag tik -^>
echo    "PowerShell ile calistir" deyin.
echo.
pause
endlocal
exit /b 0
