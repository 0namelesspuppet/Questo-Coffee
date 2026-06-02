# Questo'yu Başka Bilgisayara Kurma — Sıfırdan Rehber

Bu rehber, Questo'yu **hiç bilgisayar/yazılım bilgisi olmayan** birinin bile
adım adım takip edebilmesi için yazıldı. Acele etme, sırayla git, her adımda ne
yaptığını anlatıyorum.

> **Sistem nasıl çalışıyor? (1 cümle)**
> Bir bilgisayar "sunucu" (host) olur, tüm program ve veri onun içinde çalışır.
> Telefonlar/tabletler **aynı Wi-Fi'den** sadece ekran olarak bağlanır. PC açık
> olduğu sürece **internet kesilse bile** sistem çalışır.

> **Önemli:** Bu proje GitHub'da değil. Kodu **USB bellek, MEGA veya ağ ile
> klasör kopyalayarak** taşıyoruz. Klasörü olduğu gibi kopyaladığın için mevcut
> verin (`emulator-veri/`) ve ayarların (`.env.local`) da seninle gelir.

---

## Adım 1 — Gerekli 3 programı kur (yeni PC'de, tek seferlik)

İlk açılışta bilgisayarda olması gereken **3 program** var. Sırayla kur:

| # | Program | Nereden indir | Dikkat |
|---|---------|---------------|--------|
| 1 | **Node.js** (LTS sürüm) | <https://nodejs.org> | "LTS" yazan yeşil butona tıkla. Kurarken **"Add to PATH"** işaretli kalsın (varsayılan öyle). |
| 2 | **Java** (JDK 17 veya üstü) | <https://adoptium.net> | "Temurin 21 (LTS)" indir, kur. Firebase emülatörü Java olmadan çalışmaz. |
| 3 | **Firebase CLI** | Aşağıdaki komutla | Node kurulduktan **sonra** kurulur. |

**Firebase CLI nasıl kurulur:**

1. Başlat menüsüne `PowerShell` yaz, çık (kara/mavi pencere).
2. Şu komutu yapıştır, Enter:
   ```
   npm install -g firebase-tools
   ```
3. Bir-iki dakika sürer, bitince hata yoksa tamam.

**Hepsi kuruldu mu? Kontrol et** (PowerShell'de tek tek yaz, her biri bir
sürüm numarası yazmalı):
```
node -v
java -version
firebase --version
```
Üçü de numara yazıyorsa Adım 1 bitti. Biri "tanınmıyor" derse o programı tekrar
kur ve **bilgisayarı yeniden başlat**.

---

## Adım 2 — Kodu eski PC'den yeni PC'ye taşı

### Eski (mevcut) PC'de:

1. Sistemi **düzgün kapat**: `Questo'yu Durdur.bat` dosyasına çift tıkla.
   (Bu, verinin `emulator-veri/` klasörüne kaydedilmesini garanti eder.)
2. Proje klasörünün içinden şu **iki klasörü SİL** (gereksiz yer kaplar ve başka
   PC'de sorun çıkarabilir — yeni PC'de tekrar kurulacaklar):
   - `node_modules`
   - `.next`
3. Klasörün **geri kalanını olduğu gibi** USB belleğe / MEGA'ya kopyala.
   İçinde şunlar **mutlaka olsun**:
   - `emulator-veri/` → senin gerçek menü/masa/sipariş verin
   - `.env.local` → ayarların (yoksa sorun değil, ilk açılışta otomatik üretilir)

### Yeni PC'de:

4. Klasörü istediğin yere yapıştır (ör. Masaüstü).
5. Klasörün **içine gir**, boş bir yere `Shift + Sağ tık` → "Terminalde aç" veya
   "PowerShell penceresini burada aç".
6. Şu komutu yaz, Enter:
   ```
   npm install
   ```
   Bu, silinen `node_modules`'u yeniden kurar. **Birkaç dakika sürer**, bitmesini
   bekle.

---

## Adım 3 — İlk çalıştırma

Proje klasöründeki **`Questo'yu Başlat.bat`** dosyasına çift tıkla.

İlk açılışta her şeyi kendisi yapar:
- ayar dosyasını (`.env.local`) oluşturur,
- Firebase emülatörünü başlatır,
- demo menü/masaları yükler (veri taşıdıysan zaten kendi verin gelir),
- siteyi derler (~30 saniye sürebilir) ve tarayıcıda açar.

Tarayıcıda **`http://localhost:3000`** açıldıysa → **PC tarafı çalışıyor** 🎉

> İlk açılışta Windows "Güvenlik Duvarı" uyarısı çıkarsa **"Erişime izin ver"**
> de (Özel ağlar işaretli olsun). Bu, telefonların bağlanması için gerekli.

---

## Adım 4 — Telefon/tabletten bağlan (aynı Wi-Fi)

PC ve telefonlar **aynı Wi-Fi ağına** bağlı olmalı. Router ayarı gerekmez.

1. `Başlat.bat` penceresinde / "Yönetim" ekranında erişim adresi yazar:
   ```
   Bu PC'de    : http://localhost:3000
   Ağ üzerinden: http://<BILGISAYAR-ADI>:3000
   ```
2. Telefonun tarayıcısında **`http://<BILGISAYAR-ADI>:3000`** adresini aç.
3. Açılmazsa PC'nin **yerel IP'sini** kullan. PowerShell'de:
   ```
   ipconfig
   ```
   Çıkan **`IPv4 Adresi`** (ör. `192.168.1.25`) ile dene:
   `http://192.168.1.25:3000`
4. Telefonda tarayıcı menüsü → **"Ana ekrana ekle"**. Artık telefonda **Questo
   ikonu** olur, dokununca tam ekran açılır.

---

## Adım 5 — (Önerilir) Otomatik başlatma + masaüstü kısayolu

Bunları kurarsan PC her açıldığında sistem kendiliğinden başlar ve masaüstünden
tek tıkla yönetirsin.

**Otomatik başlatma** (PC açılınca sistem kendi kalkar):
- `scripts\otomatik-baslat-kur.ps1` dosyasına **sağ tık → "PowerShell ile
  çalıştır"** → çıkan izin (UAC) penceresinde **"Evet"**.
- Geri almak: `powershell -ExecutionPolicy Bypass -File scripts\otomatik-baslat-kur.ps1 -Kaldir`

**Masaüstü kısayolu** (yönetici izni gerekmez):
- `scripts\kisayol-olustur.ps1` dosyasına **sağ tık → "PowerShell ile çalıştır"**.
- Masaüstünde **Questo** ikonu oluşur; çift tıklayınca Başlat/Durdur menüsü açılır.

---

## Günlük kullanım

- **Açmak:** PC'yi aç (otomatik başlatma kurduysan kendi kalkar) ya da
  `Questo'yu Başlat.bat`.
- **Telefondan:** aynı Wi-Fi'deyken ikona dokun.
- **Kapatmak:** `Questo'yu Durdur.bat`.

---

## Sık karşılaşılan sorunlar

| Durum | Çözüm |
|------|------|
| `node -v` / `firebase --version` "tanınmıyor" diyor | Programı tekrar kur, sonra **bilgisayarı yeniden başlat**. |
| "Emülatör başlamadı" hatası | Java kurulu mu? `java -version` dene. `logs\emulator.log` dosyasına bak. |
| Telefon bağlanmıyor | Telefon ile PC **aynı Wi-Fi'de** mi? PC açık mı? Güvenlik duvarında 3000 portuna izin verdin mi? |
| Bilgisayar adıyla açılmıyor | `ipconfig` ile yerel IP'yi öğren, `http://192.168.x.x:3000` ile dene. |
| Veri görünmüyor | Eski ve yeni PC'de `.env.local` içindeki `NEXT_PUBLIC_RESTORAN_ID` **aynı** olmalı (varsayılan: `questo`). |
| PC kapalıyken çalışmıyor | Normaldir — PC sunucudur, **açık olmalı**. |

---

## Özet (çok kısa)

1. Yeni PC'ye **Node.js + Java + Firebase CLI** kur.
2. Eski PC'de `Durdur` → `node_modules` ve `.next`'i sil → klasörü USB/MEGA'ya kopyala.
3. Yeni PC'de klasörü yapıştır → klasör içinde `npm install`.
4. `Questo'yu Başlat.bat`'a çift tıkla → `http://localhost:3000`.
5. Telefondan aynı Wi-Fi'de `http://<BILGISAYAR-ADI>:3000`.
6. İstersen `otomatik-baslat-kur.ps1` + `kisayol-olustur.ps1`.
