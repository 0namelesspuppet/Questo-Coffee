# Questo — Otomatik Başlatma + Yerel Ağ Erişimi

Bu rehber iki şeyi kurar:

1. **Otomatik başlatma** — Bilgisayar her açıldığında Questo kendiliğinden ayağa kalkar.
2. **Yerel ağ erişimi** — Aynı Wi-Fi'ye bağlı telefon/tabletler PC'deki sisteme bağlanır.

> **Mantık:** PC "host" (sunucu) olarak kalır; tüm veri ve uygulama PC'de çalışır
> (yerel Firebase emulator). Telefonlar sadece ekrandır. PC açık olduğu ve cihazlar
> **aynı Wi-Fi'de** olduğu sürece sistem çalışır. **İnternet kesilse bile** sistem
> çalışmaya devam eder — bir POS için en önemli avantaj budur.

---

## Parça 1 — Otomatik başlatma (5 dakika, tek seferlik)

**Sen ne yapacaksın:**

1. Proje klasöründe `scripts\otomatik-baslat-kur.ps1` dosyasına **sağ tıkla → "PowerShell ile çalıştır"**.
   - (Alternatif: PowerShell aç, proje klasöründe:
     `powershell -ExecutionPolicy Bypass -File scripts\otomatik-baslat-kur.ps1`)
2. Çıkan **UAC** (yönetici izni) penceresinde **"Evet"** de.
3. "Kuruldu!" yazısını görünce tamamdır.

Artık bilgisayar her açıldığında (oturum açılınca) Questo otomatik başlar.

**Geri almak istersen:**
```
powershell -ExecutionPolicy Bypass -File scripts\otomatik-baslat-kur.ps1 -Kaldir
```

---

## Parça 2 — Yerel ağdan (aynı Wi-Fi) erişim

PC ve telefon/tabletler **aynı Wi-Fi'ye** bağlı olmalı. Router ayarı / port açma
gerekmez. `Questo'yu Başlat.bat` çalışınca pencerede erişim adresi yazar:

```
Bu PC'de    : http://localhost:3000
Ag uzerinden: http://<BILGISAYAR-ADI>:3000   (ayni Wi-Fi'deki telefon/tabletten)
```

### Adım 2.1 — Adresi öğren
- En kolayı: yukarıdaki **`http://<BILGISAYAR-ADI>:3000`** adresini kullan
  (bilgisayar adı `Başlat.bat` penceresinde görünür).
- İsim çözülmezse PC'nin **yerel IP'sini** kullan. PowerShell'de:
  ```
  ipconfig
  ```
  Çıkan `IPv4 Adresi` (ör. `192.168.1.25`) ile: `http://192.168.1.25:3000`

### Adım 2.2 — Telefonda "ana ekrana ekle"
1. Telefon **aynı Wi-Fi'deyken**, tarayıcıda yukarıdaki **`http://...:3000`** adresini aç.
2. Tarayıcı menüsü → **"Ana ekrana ekle"** (iOS: Paylaş → Ana Ekrana Ekle).
3. Artık telefonda **Questo ikonu** var; dokununca tam ekran (özellikle iOS'ta) açılır.

---

## Günlük kullanım

- PC'yi aç → sistem **kendiliğinden** başlar.
- Telefon aynı Wi-Fi'de → **ikona dokun**.
- Kapatmak için: **`Questo'yu Durdur.bat`**.

---

## Sık karşılaşılanlar

| Durum | Çözüm |
|------|-------|
| Telefon bağlanmıyor | Telefon ile PC **aynı Wi-Fi'de** mi? PC açık mı? |
| Bilgisayar adıyla açılmıyor | `ipconfig` ile yerel IP'yi öğren, `http://192.168.x.x:3000` ile dene. |
| Bağlanıyor ama açılmıyor | Windows Güvenlik Duvarı 3000 portunu engelliyor olabilir; ilk çalıştırmada çıkan "Erişime izin ver" uyarısında **Özel ağlar** için izin ver. |
| PC kapalıyken çalışmıyor | Normaldir — PC sunucudur, **açık olmalı**. |
| Otomatik başlatmayı kaldır | `scripts\otomatik-baslat-kur.ps1 -Kaldir` |
