# Asıl (Üretim) PC'ye Kurulum — Sıfırdan

Bu rehber, sistemi **deneme PC'sinden asıl PC'ye taşımak** içindir. Asıl PC tek
gerçek sunucu olur. Her PC kendi yerel verisini tutar; bu yüzden asıl PC'de
**temiz başlamak** (seed ile demo menü) önerilir. Var olan veriyi taşımak istersen
en alttaki "Veri taşıma" bölümüne bak.

---

## 1. Gerekli programları kur (asıl PC'de, 1 kez)

| Program | Nereden | Not |
|--------|---------|-----|
| **Node.js 20+** (LTS) | https://nodejs.org | "Add to PATH" işaretli kursun |
| **Git** | https://git-scm.com | Kodu clone'lamak için |
| **Java JDK 17+** | https://adoptium.net (Temurin 21) | Firebase emulator için şart |
| **Firebase CLI** | Aşağıdaki komut | Node kurulduktan sonra |

Node + Git kurulduktan sonra bir terminal (PowerShell) aç ve Firebase CLI'yi kur:
```
npm install -g firebase-tools
```

Kontrol (hepsi sürüm yazmalı):
```
node -v
git --version
java -version
firebase --version
```

---

## 2. Kodu indir (clone)

İstediğin klasörde:
```
git clone https://github.com/0iamwanderer/Questo-Coffee.git
cd Questo-Coffee
npm install
```

> `npm install` bağımlılıkları kurar (birkaç dakika).

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

## 6. (Opsiyonel) Deneme verisini taşıma

Asıl PC temiz başlamalı (seed demo menüyü kurar). Ama deneme sırasında girdiğin
gerçek veriyi (özel menü, masalar) korumak istersen:

1. Deneme PC'sinde `Questo'yu Durdur.bat` ile sistemi düzgün kapat (veri
   `emulator-veri/` klasörüne yazılır).
2. **`emulator-veri/`** klasörünü asıl PC'deki proje klasörüne kopyala
   (bu klasör `.gitignore`'da, clone'a gelmez — elle kopyalanır; USB/ağ).
3. ⚠️ **Önemli:** Veri hangi `RESTORAN_ID` altında dışa aktarıldıysa asıl PC'deki
   `.env.local`'de de aynı olmalı. Deneme PC'sinin `.env.local`'indeki
   `NEXT_PUBLIC_RESTORAN_ID` değerini asıl PC'ye de aynen yaz; yoksa kopyalanan
   veri görünmez.

> Bu adımı atlarsan sorun olmaz — seed zaten demo menüyü kurar, sonra asıl PC'de
> kendi menünü düzenlersin.

---

## Özet sıra
1. Programlar (Node, Git, Java, firebase-tools)
2. `git clone` + `npm install`
3. `Questo'yu Başlat.bat`
4. Aynı Wi-Fi'den `http://<BILGISAYAR-ADI>:3000`
5. `otomatik-baslat-kur.ps1`
