# Questo — Otomatik Başlatma + Farklı Ağlardan Erişim

Bu rehber iki şeyi kurar:

1. **Otomatik başlatma** — Bilgisayar her açıldığında Questo kendiliğinden ayağa kalkar.
2. **Uzaktan erişim** — Telefon/tablet, **hangi ağda olursa olsun** (işyeri Wi-Fi'si, ev, mobil veri) PC'deki sisteme bağlanır.

> **Mantık:** PC "host" (sunucu) olarak kalır; tüm veri ve uygulama PC'de çalışır.
> Telefonlar sadece ekrandır. PC açık olduğu sürece her yerden çalışır.

---

## Parça 1 — Otomatik başlatma (5 dakika, tek seferlik)

**Sen ne yapacaksın:**

1. Proje klasöründe `scripts\otomatik-baslat-kur.ps1` dosyasına **sağ tıkla → "PowerShell ile çalıştır"**.
   - (Alternatif: PowerShell'i aç, proje klasöründe şunu yaz:
     `powershell -ExecutionPolicy Bypass -File scripts\otomatik-baslat-kur.ps1`)
2. Çıkan **UAC** (yönetici izni) penceresinde **"Evet"** de.
3. "Kuruldu!" yazısını görünce tamamdır.

Artık bilgisayar her açıldığında (oturum açılınca) Questo otomatik başlar; kısa bir
pencere açılıp sistemi kurar, tarayıcıyı açar ve 5 sn sonra kapanır.

**Geri almak istersen:**
```
powershell -ExecutionPolicy Bypass -File scripts\otomatik-baslat-kur.ps1 -Kaldir
```

---

## Parça 2 — Farklı ağlardan erişim (Tailscale)

Bunun için **Tailscale** kullanıyoruz: küçük, ücretsiz (kişisel kullanım), şifreli özel
ağ. Telefon mobil veriden bile PC'ye sabit bir adresle bağlanır; router ayarı / port
açma gerekmez. Ayrıca **iOS'ta tam PWA** ("ana ekrana ekle") için gereken güvenilir
HTTPS adresini de sağlar.

### Adım 2.1 — Hesap aç (1 kez, senin yapacağın)
1. https://tailscale.com adresine git → **ücretsiz** hesap aç (Google/Microsoft ile giriş olur).

### Adım 2.2 — PC'ye Tailscale kur (senin yapacağın)
1. https://tailscale.com/download → **Windows** sürümünü indir, kur.
2. Tailscale'e **aynı hesapla** giriş yap (sistem tepsisindeki simgeden).
3. Tailscale yönetim panelinde (admin console) iki şeyi bir kez aç:
   - **MagicDNS**'i etkinleştir.
   - **HTTPS Certificates** (HTTPS sertifikaları) özelliğini etkinleştir.
   > Bunlar, PC'ye `https://...ts.net` gibi gerçek bir adres ve sertifika verir.

### Adım 2.3 — Telefonlara/tabletlere kur (senin yapacağın)
1. Her cihaza **App Store / Play Store**'dan **Tailscale** uygulamasını kur.
2. **Aynı hesapla** giriş yap, bağlantıyı aç (toggle ON).

### Adım 2.4 — Yayını başlat (otomatik, ama bir kez kontrol et)
- PC tarafı yayını (`tailscale serve`) **otomatik** yapılır: Questo her başladığında
  `scripts\tailscale-yayinla.ps1` çalışır ve 3000 portunu HTTPS olarak yayınlar.
- Adresi görmek için Questo'yu bir kez başlat, sonra şunu çalıştır:
  ```
  tailscale serve status
  ```
  veya `logs\tailscale.log` dosyasına bak. Adres şuna benzer:
  ```
  https://questo-pc.<senin-tailnet>.ts.net
  ```

### Adım 2.5 — Telefonda "ana ekrana ekle"
1. Telefonda Tailscale **açıkken**, tarayıcıda yukarıdaki `https://...ts.net` adresini aç.
2. Tarayıcı menüsü → **"Ana ekrana ekle"** (iOS: Paylaş → Ana Ekrana Ekle).
3. Artık telefonda **Questo ikonu** var; dokununca tam ekran, uygulama gibi açılır.

---

## Günlük kullanım (kurulum bitince)

- PC'yi aç → sistem **kendiliğinden** başlar.
- Telefonda Tailscale açık → **ikona dokun** → her ağdan, tam ekran çalışır.
- Kapatmak için: **`Questo'yu Durdur.bat`**.

---

## Sık karşılaşılanlar

| Durum | Çözüm |
|------|-------|
| Telefon bağlanmıyor | Telefonda Tailscale **açık (ON)** mı? Aynı hesapta mı? |
| `https://...ts.net` güvenli değil diyor | Admin panelde **HTTPS Certificates** açık mı? İlk sertifika birkaç dakika sürebilir. |
| PC kapalıyken çalışmıyor | Normaldir — PC sunucudur, **açık olmalı**. |
| Sadece yerel ağda yetiyor | Tailscale şart değil; aynı Wi-Fi'de `http://<PC-IP>:3000` ile de çalışır. |
| Otomatik başlatmayı kaldır | `scripts\otomatik-baslat-kur.ps1 -Kaldir` |

> **İnternet notu:** Tailscale, cihazların birbirini bulması için internet ister.
> İşyeri internetinin güvenilir olması önemlidir; tamamen offline senaryoda yerel ağ
> (aynı Wi-Fi) modeli daha sağlamdır.
