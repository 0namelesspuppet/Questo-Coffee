# Asıl (Üretim) PC'ye Kurulum — Sıfırdan

Bu rehber, sistemi **deneme PC'sinden asıl PC'ye taşımak** içindir. Asıl PC tek
gerçek sunucu olur. Her PC kendi yerel verisini tutar.

> **Not:** Proje GitHub'da değil — kod **USB / MEGA / ağ ile klasör kopyalanarak**
> taşınır (aşağıda Adım 2). Klasörü olduğu gibi taşıdığın için mevcut verin
> (`emulator-veri/`) ve ayarların (`.env.local`) de seninle gelir; ayrıca seed
> demo menüyü ilk açılışta kendisi kurar.

---

## 1. Gerekli programları kur (asıl PC'de, 1 kez)

| Program | Nereden | Not |
|--------|---------|-----|
| **Node.js 20+** (LTS) | https://nodejs.org | "Add to PATH" işaretli kursun |
| **Java JDK 17+** | https://adoptium.net (Temurin 21) | Firebase emulator için şart |
| **Firebase CLI** | Aşağıdaki komut | Node kurulduktan sonra |
| **Git** (opsiyonel) | https://git-scm.com | Artık şart değil; yalnız yerel sürüm geçmişi tutmak istersen |

Node kurulduktan sonra bir terminal (PowerShell) aç ve Firebase CLI'yi kur:
```
npm install -g firebase-tools
```

Kontrol (hepsi sürüm yazmalı):
```
node -v
java -version
firebase --version
```

---

## 2. Kodu taşı (USB / MEGA / ağ)

Proje GitHub'da olmadığı için kodu **klasör kopyalayarak** taşırsın.

**Eski (deneme) PC'de:**
1. `Durdur` ile sistemi düzgün kapat (veri `emulator-veri/`'ye yazılsın).
2. Proje klasöründen şu ikisini **SİL** (gereksiz yer + başka PC'de bozulabilir;
   hedefte `npm install` yeniden kurar):
   - `node_modules`
   - `.next`
3. Klasörün **geri kalanını olduğu gibi** USB'ye / MEGA'ya kopyala. İçinde şunlar
   **mutlaka bulunsun**: `emulator-veri/` (verin), `.env.local` (ayarların),
   istersen `yedekler/`.

**Asıl PC'de:**
4. Klasörü istediğin yere yapıştır, içinde bir terminal (PowerShell) aç:
```
npm install
```

> `npm install` bağımlılıkları (`node_modules`) yeniden kurar (birkaç dakika).
> Kodu taşırken `emulator-veri/`'yi de getirdiysen verin hazır gelir; `.env.local`
> içindeki `NEXT_PUBLIC_RESTORAN_ID` iki PC'de de aynı olmalı.

---

## 3. İlk çalıştırma

`Questo'yu Başlat.bat` dosyasına çift tıkla. İlk çalıştırmada otomatik olarak:
- `.env.local` oluşturulur (yerel emulator ayarları),
- emulator başlar,
- demo menü/masalar yüklenir (seed),
- production build alınır (~30 sn) ve site açılır.

Tarayıcıda `http://localhost:3000` açılınca PC tarafı çalışıyor demektir.

---

## 4. Yerel ağdan (aynı Wi-Fi) erişim

PC ve telefon/tabletler **aynı Wi-Fi'ye** bağlı olmalı. `Başlat.bat` penceresinde
erişim adresi yazar:
```
http://<BILGISAYAR-ADI>:3000      (ayni Wi-Fi'deki telefon/tabletten)
```
İsim çözülmezse PC'nin yerel IP'sini kullan (`ipconfig` → IPv4 Adresi), ör.
`http://192.168.1.25:3000`.

Detaylar: **`KURULUM-OTOMATIK-BASLATMA.md`**.

---

## 5. Açılışta otomatik başlatmayı kur

`scripts\otomatik-baslat-kur.ps1` dosyasına **sağ tık → "PowerShell ile çalıştır"**,
UAC'de **"Evet"**. Artık asıl PC her açıldığında sistem kendiliğinden kalkar.

---

## 6. Veri taşıma hakkında

Adım 2'de klasörü olduğu gibi kopyaladıysan **veri zaten geldi** —
`emulator-veri/` klasörü senin gerçek menü/masa/adisyon verini tutar ve kopyaya
dahildir. Ek bir şey yapmana gerek yok.

Sıfırdan temiz başlamak istersen (yalnız demo menü): yeni PC'ye `emulator-veri/`
klasörünü **getirme** — seed ilk açılışta demo menüyü kurar.

⚠️ Her iki durumda da `.env.local` içindeki `NEXT_PUBLIC_RESTORAN_ID` iki PC'de
**aynı** olmalı; yoksa kopyalanan veri görünmez.

---

## Özet sıra
1. Programlar (Node, Java, firebase-tools) — *Git artık şart değil*
2. Eski PC: `Durdur` → `node_modules` ve `.next`'i sil → klasörü USB/MEGA'ya kopyala
3. Asıl PC: klasörü yapıştır → `npm install`
4. `Questo'yu Başlat.bat` (ya da masaüstü kısayolu)
5. Aynı Wi-Fi'den `http://<BILGISAYAR-ADI>:3000`
6. `otomatik-baslat-kur.ps1` (açılışta otomatik) + `kisayol-olustur.ps1` (kısayol)
