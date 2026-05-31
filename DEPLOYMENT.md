# Production Deployment

Bu dokümanı **bir kerelik** kurulum için kullan. Bittikten sonra sistem
sürekli çalışır; kafe sahibi/kasiyer/müşteri **hiçbir terminal açmaz** —
sadece tarayıcı URL'sini açar.

Hedef ortam: **Firebase App Hosting** (Spark/Blaze hibrit, küçük kafe için
aylık $0–5 maliyet).

---

## Adım 1 — Firebase Projesi Aç (10 dk)

> Bu adım **kafe sahibinin Google hesabıyla** yapılmalı (proje sahipliği o
> hesapta olur, fatura riski sahibi taşır). Sahip yanında değilse onunla
> ekran paylaş.

1. <https://console.firebase.google.com> → Google ile giriş (sahip hesabı)
2. **Proje ekle** → ad: `kafe-adi` (örn. `mavi-kafe`)
3. Google Analytics: **kapat** (gerek yok)
4. Oluştuğunda **Project ID**'yi not et (örn. `mavi-kafe-x4nm`)

---

## Adım 2 — Servisleri Aktifleştir (5 dk)

Sol menüden:

### Authentication
1. **Get started** → Sign-in method → **E-posta/Şifre** etkinleştir
2. Users → **Add user** → e-posta: `sahip@kafeadi.com`, şifre belirle
   (sahibin admin hesabı; bunu sahip kullanacak)

### Firestore Database
1. **Create database** → "Production mode" seç
2. Bölge: **europe-west1** (Belçika — Türkiye'ye en yakın AB-uyumlu)
3. Oluştur

### Storage
1. **Get started** → varsayılan kabul → Done
2. Bölge **europe-west1**

---

## Adım 3 — Blaze (pay-as-you-go) Planına Geç (5 dk)

App Hosting + Cloud Functions için Blaze gerekli. **Endişe yok:** Spark
limitleri içinde kalırsan $0 ücret kesilir.

1. Sol alttaki dişli (Project settings) → **Usage and billing**
2. **Modify plan** → Blaze seç
3. Kredi kartı bilgisi gir
4. **Bütçe alarmı** kur:
   - Budget alerts → New budget
   - Tutar: $10 (yaklaşık 300 TL)
   - Threshold: %50 + %90 + %100
   - E-posta: sahibin e-postası
5. Eğer 1$ üzeri kullanım olursa anında uyarı gelir.

> Küçük kafe (günde 200 sipariş varsayımı) için **gerçek maliyet ayda
> $0–3** civarı çıkar.

---

## Adım 4 — Web App Config (3 dk)

1. Project settings → **Genel** sekmesi
2. "Uygulamalarınız" altında **`</>` Web** ikonuna tıkla
3. App nickname: `questo-web`
4. "Also set up Firebase Hosting": **işaretleme** (App Hosting ayrı kuracağız)
5. **Register app**
6. Çıkan `firebaseConfig` objesini kopyala — şuna benzer:
   ```js
   const firebaseConfig = {
     apiKey: "AIzaSy...",
     authDomain: "mavi-kafe-x4nm.firebaseapp.com",
     projectId: "mavi-kafe-x4nm",
     storageBucket: "mavi-kafe-x4nm.firebasestorage.app",
     messagingSenderId: "1234567890",
     appId: "1:1234567890:web:abc..."
   };
   ```
7. Bu config bana ver — `.env.local` ve App Hosting secrets'a yazacağız.

---

## Adım 5 — Service Account JSON (2 dk)

Admin SDK'nın sunucu tarafında Auth/Firestore'a yazabilmesi için.

1. Project settings → **Service accounts** sekmesi
2. **Generate new private key** → Generate
3. JSON dosyası iner — bu dosyayı **güvenli** sakla, başkasıyla paylaşma
4. Geliştirme makinesinde `C:\xampp\htdocs\Questo\service-account.json`
   olarak kaydet (gitignore'da, repo'ya gitmez)

---

## Adım 6 — Repo'yu GitHub'a Yükle (5 dk)

App Hosting GitHub'dan otomatik deploy yapar.

```powershell
cd C:\xampp\htdocs\Questo
git remote add origin https://github.com/<kullanici>/questo.git
git push -u origin main
```

GitHub'da repo daha önce yoksa <https://github.com/new>'dan boş repo aç,
sonra `git remote add` çalıştır.

---

## Adım 7 — Firebase CLI Login + Proje Seçimi (3 dk)

Geliştirme makinesinde (PowerShell):

```powershell
cd C:\xampp\htdocs\Questo
firebase login           # tarayıcı açılır, sahibin Google hesabıyla giriş
firebase use --add       # az önce açtığın projeyi seç, alias: 'production'
```

---

## Adım 8 — Firestore Rules + Indexes + Storage Deploy (2 dk)

```powershell
firebase deploy --only firestore:rules,firestore:indexes,storage
```

Bu komut:
- `firestore.rules` — güvenlik kurallarını yükler
- `firestore.indexes.json` — composite indexleri kurar
- `storage.rules` — Storage yetkilerini yükler

---

## Adım 9 — Cloud Functions Deploy (5 dk)

SLA bildirim fonksiyonları için.

```powershell
# Önce parametre belirle
firebase functions:secrets:set RESTORAN_ID
# Sorulduğunda: kafe-adi (Adım 1'deki Project ID değil, kendi belirlediğin tenant)

cd functions
npm install
npm run build
cd ..

firebase deploy --only functions
```

İlk deploy 5-10 dk alır (Cloud Functions kurulumu).

---

## Adım 10 — App Hosting Backend Bağla (10 dk)

1. Firebase Console → **Build** > **App Hosting** > **Get started**
2. **Create backend** →
   - Region: **europe-west1**
   - Name: `questo-app`
3. **Connect to GitHub** → adım 6'da yüklediğin repo'yu seç
4. Branch: `main`
5. Root directory: `/` (varsayılan)
6. Otomatik build başlar (~5 dk)

---

## Adım 11 — Secrets Yapılandırması (5 dk)

App Hosting'in `apphosting.yaml` dosyasında listelenen secret'ları
Firebase Console'dan veya CLI'dan ekle:

```powershell
firebase apphosting:secrets:set NEXT_PUBLIC_FIREBASE_API_KEY
# Sorulduğunda: Adım 4'teki apiKey

firebase apphosting:secrets:set NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN
# Sorulduğunda: Adım 4'teki authDomain

# ...sırayla:
firebase apphosting:secrets:set NEXT_PUBLIC_FIREBASE_PROJECT_ID
firebase apphosting:secrets:set NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET
firebase apphosting:secrets:set NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID
firebase apphosting:secrets:set NEXT_PUBLIC_FIREBASE_APP_ID
firebase apphosting:secrets:set NEXT_PUBLIC_RESTORAN_ID
# Bu son ikisi kendi belirlediğin değer:
firebase apphosting:secrets:set ADMIN_SETUP_TOKEN

# Service account — adım 5'teki JSON dosyasının içeriği (tüm dosya):
firebase apphosting:secrets:set FIREBASE_SERVICE_ACCOUNT
# Sorulduğunda: dosya içeriğini yapıştır (tek satır olmasına gerek yok)
```

Her secret eklendiğinde otomatik yeniden deploy olur (~3 dk).

---

## Adım 12 — İlk Kasiyer Claim'ini Ata (1 dk)

Adım 2'de yarattığın `sahip@kafeadi.com` kullanıcısına claim ata:

```powershell
$tok = "<adım 11'deki ADMIN_SETUP_TOKEN>"
$url = "https://<app-hosting-url>/api/admin/rol"

curl -X POST $url `
  -H "content-type: application/json" `
  -d "{`"setupToken`":`"$tok`",`"email`":`"sahip@kafeadi.com`",`"sahip`":true}"
```

`<app-hosting-url>` adım 10'da çıkan URL — şuna benzer:
`https://questo-app--mavi-kafe-x4nm.web.app`

Cevap `{"ok":true,"uid":"...","sahip":true}` gelirse claim atandı.

---

## Adım 13 — Domain Bağla (opsiyonel, 30 dk DNS yayılma)

Custom domain için (örn. `kasa.kafeadi.com`):

1. App Hosting > Backend > **Add custom domain**
2. Domain'i yaz → DNS doğrulama satırlarını al (TXT + A/CNAME)
3. Sahibin domain sağlayıcısında (Namecheap, GoDaddy, vs.) bu kayıtları ekle
4. 5–30 dk içinde SSL otomatik kurulur (Let's Encrypt)

---

## Adım 14 — Demo Veri Yükle (3 dk)

İlk kez canlıya alınca menü/masa boş. Production seed:

```powershell
$env:FIREBASE_SERVICE_ACCOUNT_PATH = ".\service-account.json"
$env:NEXT_PUBLIC_RESTORAN_ID = "<adım 11'deki RESTORAN_ID>"
$env:NEXT_PUBLIC_FIREBASE_PROJECT_ID = "<adım 1 Project ID>"

npm run seed
```

Örnek masa + ürün + kategori yüklenir.

Sonra **kafe sahibi**:
- `https://<custom-domain>/admin/menu` → kendi menüsünü ekler
- `https://<custom-domain>/admin/masalar` → kendi masalarını yaratır

---

## ✅ Bitti

Garson masadan sipariş alır → kasa ekranında anlık görünür → kasiyer
ödemeyi alıp adisyonu kapatır. Hiçbir kurulum yok.

## Güvenlik son kontrolleri

- [ ] `.env.local` ve `service-account.json` git'e gitmedi (gitignore kontrol)
- [ ] Blaze bütçe alarmı kuruldu
- [ ] `ADMIN_SETUP_TOKEN`'ı kullandıktan sonra Firebase Secrets'tan
      sil (tekrar gerekirse yenisini koyarsın)
- [ ] App Check etkinleştir (Production'da bot koruması) — Firebase
      Console > App Check > reCAPTCHA v3 site key al, secrets'a ekle

## Aylık ne ücretlendirilir?

Sahibin kart hesabından düşülen tipik kalemler (küçük kafe varsayımı):
- App Hosting Cloud Run: $0–2 (trafik düşükse)
- Firestore okuma/yazma: $0 (Spark içinde)
- Storage: $0 (5GB altı)
- Auth: $0 (50K aktif kullanıcı altı)
- Cloud Functions: $0 (2M çağrı/ay altı)
- **Toplam ortalama: $0–3/ay** (90 TL)
