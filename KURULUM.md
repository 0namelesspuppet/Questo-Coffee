# Questo — Kurulum ve Kullanım Rehberi

Questo, tek bir kafe/restoran için **adisyon + sipariş** sistemidir. Tamamen
**yerel** çalışır: kurulu olduğu bilgisayarda durur, telefonlar aynı Wi-Fi'dan
bağlanır. **İnternet gerektirmez** — internet kesilse de çalışır (modem/Wi-Fi açık
olduğu sürece).

---

## 1. Ön koşullar

Kurulacağı bilgisayarda şunlar olmalı:

- **Windows 10 / 11**
- **Node.js LTS** — sürüm **20.6 veya üzeri** (uygulama `--env-file` özelliğini
  kullanır; daha eski sürümlerde açılmaz). <https://nodejs.org>
- **Java JDK 21** (Temurin/Adoptium) — yalnızca yerel veritabanı (Firebase
  emülatörü) için gerekir. <https://adoptium.net>
- **~2 GB boş disk**
- Telefonların bağlanması için bilgisayar ile telefonlar **aynı Wi-Fi ağında**
  olmalı.

> **Önemli — Smart App Control (SAC):** Windows 11'de "Smart App Control" açıksa
> `.bat` dosyalarını ve imzasız programları engelleyebilir. Kurulum başlamazsa
> SAC'ı kapatın (*Ayarlar → Gizlilik ve güvenlik → Windows Güvenliği → Uygulama
> ve tarayıcı denetimi → Smart App Control → Kapalı*) ve bilgisayarı yeniden
> başlatın. Başka bir bilgisayardan kopyalanan `.bat` dosyaları "engellendi"
> uyarısı verirse: dosyaya sağ tık → **Özellikler → Engellemeyi Kaldır (Unblock)**.

---

## 2. Kurulum (tek sefer)

1. Proje klasörünü bilgisayara kopyalayın (USB / paylaşım).
2. **`Questo'yu Kur.bat`** dosyasına çift tıklayın. Bu adım gerekli paketleri
   indirir ve masaüstüne **"Questo Yönetim"** kısayolu ekler. (İlk kurulum
   internet ister; sonradan çalışmak için gerekmez.)
3. Kurulum bitince masaüstündeki **Questo Yönetim** kısayolunu kullanabilirsiniz.

---

## 3. Günlük kullanım

| İşlem | Nasıl |
|---|---|
| **Başlatma** | `Questo'yu Başlat.bat` (ya da Questo Yönetim → Başlat) |
| **Durdurma** | `Questo'yu Durdur.bat` (ya da Questo Yönetim → Durdur) |
| **Genel yönetim** | Masaüstü **Questo Yönetim** kısayolu (durum + Başlat/Durdur/Yenile) |

Başlattıktan sonra tarayıcı otomatik açılır (`http://localhost:3000`).
**Emülatör ~25-40 saniyede hazır olur** — ilk giriş için birkaç saniye bekleyin.

### Telefonlardan bağlanma
1. Telefon, bilgisayarla **aynı Wi-Fi'da** olmalı.
2. **Questo Yönetim** penceresindeki **IP adresini** ya da **QR kodunu** kullanın
   (telefonun tarayıcısına `http://192.168.x.x:3000` yazın veya QR'ı okutun).
3. `localhost` telefonlarda **çalışmaz** — mutlaka bilgisayarın ağ IP'sini kullanın.

### Roller (giriş ekranı)
- **Garson** → Masalar: masaya gidip menüden ürün ekler. Yönetim/ödeme yetkisi
  yoktur.
- **Kasiyer** → Adisyonlar: açık adisyonları görür, ödeme alır, kapatır;
  `/admin` yönetim paneline erişebilir.

> Varsayılan hesaplar (yerel): sahip `sahip@questo.local`, garson
> `garson@questo.local` — şifre: `questo123`. Roller giriş kartlarından
> otomatik seçilir.

---

## 4. Yedekleme

Veri, kurulu olduğu bilgisayarda tutulur ve **otomatik yedeklenir**:

- Çalışırken **saatte bir** ve **kapanışta** otomatik yedek alınır.
- Günlük sıkıştırılmış kopyalar **`yedekler/`** klasöründe tutulur (son 30 gün).
- Riskli bir işlemden önce elle yedek: `scripts\yedek-al-elle.ps1`.

> Başka bilgisayara taşırken `emulator-veri/` (canlı veri) ve `yedekler/`
> klasörlerini de kopyalayın.

---

## 5. Güncelleme

Yeni sürüm geldiğinde:

1. Önce **`Questo'yu Durdur.bat`** ile durdurun.
2. **`Questo'yu Guncelle.bat`** çalıştırın (yeni dosyaları alır, paketleri ve
   derlemeyi günceller).
3. Tekrar **`Questo'yu Başlat.bat`** ile başlatın.

---

## 6. Sorun giderme

| Belirti | Çözüm |
|---|---|
| `.bat` Notepad ile açılıyor / "engellendi" | SAC'ı kapatın; dosya Özellikler → Engellemeyi Kaldır |
| Telefon bağlanmıyor | Aynı Wi-Fi'da mısınız? `localhost` değil, **ağ IP'si** kullanın |
| "Giriş yapılamıyor" (açılışın ilk saniyeleri) | Emülatör ~30 sn'de hazır olur; birkaç saniye bekleyip tekrar deneyin |
| Sistem ağır / açılış yavaş | Bilgisayar zayıfsa normaldir; emülatör (Java) açılışta CPU kullanır, sonra hafifler |
| Veri kayboldu sanıyorsanız | `yedekler/` klasöründeki son zip'ten geri yükleyin |

---

## 7. Kaldırma

`Questo'yu Kaldir.bat` — uygulamayı ve kısayolları temizler. (Verinizi saklamak
istiyorsanız önce `emulator-veri/` ve `yedekler/` klasörlerini bir yere kopyalayın.)
