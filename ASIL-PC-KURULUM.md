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

## 3. Tailscale kur (aynı hesap)

1. https://tailscale.com/download → Windows sürümünü kur.
2. **Deneme PC'sindeki AYNI hesapla** giriş yap.
3. Bu PC tailnet'te **kendi yeni IP'sini** alır (ör. `100.x.x.x`) — deneme PC'sinden
   farklıdır, bu normaldir.

---

## 4. İlk çalıştırma

`Questo'yu Başlat.bat` dosyasına çift tıkla. İlk çalıştırmada otomatik olarak:
- `.env.local` oluşturulur (yerel emulator ayarları),
- emulator başlar,
- demo menü/masalar yüklenir (seed),
- production build alınır (~30 sn) ve site açılır.

Tarayıcıda `http://localhost:3000` açılınca PC tarafı çalışıyor demektir.

---

## 5. Erişim adresini ayarla (asıl PC'nin IP'si)

Bu PC'nin Tailscale IP'sini öğren:
```
tailscale ip -4
```
veya başlattıktan sonra `logs\tailscale.log` dosyasına bak. Çıkan `100.x.x.x`
adresini `.env.local` içine yaz (Not Defteri ile aç):
```
NEXT_PUBLIC_APP_URL=http://100.x.x.x:3000
```
Kaydet. (Bir sonraki başlatmada ~30 sn'lik tek seferlik build olur — normaldir.)

Telefon/tabletten erişim adresi artık:
```
http://100.x.x.x:3000      (asıl PC'nin Tailscale IP'si, http — https DEĞİL)
```

---

## 6. Açılışta otomatik başlatmayı kur

`scripts\otomatik-baslat-kur.ps1` dosyasına **sağ tık → "PowerShell ile çalıştır"**,
UAC'de **"Evet"**. Artık asıl PC her açıldığında sistem kendiliğinden kalkar.

Detaylar: **`KURULUM-UZAKTAN-ERISIM.md`**.

---

## 7. (Opsiyonel) Deneme verisini taşıma

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
3. Tailscale (aynı hesap)
4. `Questo'yu Başlat.bat`
5. `.env.local` → `NEXT_PUBLIC_APP_URL` = asıl PC Tailscale IP'si
6. `otomatik-baslat-kur.ps1`
