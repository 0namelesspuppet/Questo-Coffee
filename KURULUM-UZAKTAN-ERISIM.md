# Questo — Otomatik Başlatma + Farklı Ağlardan Erişim

Bu rehber iki şeyi kurar:

1. **Otomatik başlatma** — Bilgisayar her açıldığında Questo kendiliğinden ayağa kalkar.
2. **Uzaktan erişim** — Telefon/tablet, **hangi ağda olursa olsun** (işyeri Wi-Fi'si, ev, mobil veri) PC'deki sisteme bağlanır.

> **Mantık:** PC "host" (sunucu) olarak kalır; tüm veri ve uygulama PC'de çalışır
> (yerel Firebase emulator). Telefonlar sadece ekrandır. PC açık olduğu sürece her
> yerden çalışır. **İnternet kesilse bile** (aynı Wi-Fi'de) sistem çalışmaya devam eder —
> bir POS için en önemli avantaj budur.

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

## Parça 2 — Farklı ağlardan erişim (Tailscale)

**Tailscale** = küçük, ücretsiz (kişisel kullanım), şifreli özel ağ. Telefon mobil
veriden bile PC'ye sabit bir adresle bağlanır; router ayarı / port açma gerekmez.

> **Neden HTTP, neden HTTPS değil?** Bu sistem yerel Firebase **emulator** kullanır;
> emulator yalnız **HTTP** konuşur. Sayfa HTTPS'ten gelirse istemci emulator'e
> bağlanamaz (tarayıcı "mixed content" engeli → `auth/network-request-failed`).
> Bu yüzden **düz HTTP** kullanıyoruz. Trafik zaten **Tailscale (WireGuard)**
> tarafından şifrelenir — yani "güvenli değil" etiketi sadece görseldir, bağlantı
> gerçekte şifrelidir.

### Adım 2.1 — Hesap aç (1 kez)
1. https://tailscale.com → **ücretsiz** hesap aç (Google/Microsoft ile giriş).

### Adım 2.2 — PC'ye Tailscale kur
1. https://tailscale.com/download → **Windows** sürümünü indir, kur.
2. **Aynı hesapla** giriş yap (sistem tepsisindeki simgeden).
3. (Önerilir) Yönetim panelinde **DNS** sekmesi → **MagicDNS**'i aç. Böylece PC'ye
   `wandererpc.<tailnet-adın>.ts.net` gibi okunabilir bir isim gelir.
   > **HTTPS Certificates'e GEREK YOK** — düz HTTP kullandığımız için kapalı kalabilir.

### Adım 2.3 — Telefonlara/tabletlere kur
1. Her cihaza **App Store / Play Store**'dan **Tailscale** kur.
2. **Aynı hesapla** giriş yap, bağlantıyı **aç (ON)**.

### Adım 2.4 — Erişim adresini öğren
Questo başladığında adres otomatik hesaplanır. Görmek için:
```
tailscale serve status
```
veya `logs\tailscale.log` dosyasına bak. Adres şuna benzer (HTTP, port 3000):
```
http://wandererpc.<tailnet-adın>.ts.net:3000
http://100.x.x.x:3000          (yedek - IP ile)
```

### Adım 2.5 — Telefonda "ana ekrana ekle"
1. Telefonda Tailscale **açıkken**, tarayıcıda yukarıdaki **`http://...:3000`** adresini aç.
   > Mutlaka **http** yaz, **https değil**.
2. Tarayıcı menüsü → **"Ana ekrana ekle"** (iOS: Paylaş → Ana Ekrana Ekle).
3. Artık telefonda **Questo ikonu** var; dokununca tam ekran (özellikle iOS'ta) açılır.

---

## Günlük kullanım

- PC'yi aç → sistem **kendiliğinden** başlar.
- Telefonda Tailscale açık → **ikona dokun** → her ağdan çalışır.
- Kapatmak için: **`Questo'yu Durdur.bat`**.

---

## Sık karşılaşılanlar

| Durum | Çözüm |
|------|-------|
| `auth/network-request-failed` | Adresi **https** ile açmışsındır. **http://...:3000** kullan. |
| Telefon bağlanmıyor | Telefonda Tailscale **açık (ON)** mı? Aynı hesapta mı? |
| Adres ismi açılmıyor | MagicDNS açık mı? Açık değilse `http://100.x.x.x:3000` (IP) ile dene. |
| PC kapalıyken çalışmıyor | Normaldir — PC sunucudur, **açık olmalı**. |
| Aynı Wi-Fi'de Tailscale'siz | `http://<PC-yerel-IP>:3000` (ör. `192.168.x.x`) ile de çalışır. |
| Otomatik başlatmayı kaldır | `scripts\otomatik-baslat-kur.ps1 -Kaldir` |

> **Not:** Tailscale, cihazların birbirini bulması için (ilk bağlantıda) internet ister.
> Aynı Wi-Fi içindeyken yerel IP ile internet olmadan da çalışır.
