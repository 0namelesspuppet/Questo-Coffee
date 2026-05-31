# Questo — Restoran Sipariş ve Adisyon Sistemi

Tek restoran için, garson ve kasiyerin masalardan sipariş alıp adisyon ve
ödemeleri canlı yönettiği yerel ağ (LAN-only) personel POS sistemi.
İnternet bağlantısı gerektirmez — Firebase emulator
restoranın PC'sinde çalışır, telefon/tabletler aynı WiFi üzerinden bağlanır.

## İndirdikten Sonra (Windows — Önemli)

Projeyi internetten (ZIP olarak) indirdiyseniz Windows, dosyalara **"Mark of
the Web"** (internetten geldi işareti) ekler. Bu yüzden `Questo'yu Başlat.bat`
ve `scripts\*.vbs` dosyaları **"güvenli olmayabilir"** diye engellenebilir
(SmartScreen / Akıllı Uygulama Denetimi).

Çözüm — şunlardan **birini** yapın:

- **Kolay yol:** `scripts\engeli-kaldir.bat` dosyasına çift tıklayın. (İlk
  çalıştırmada Windows uyarı verirse **"Yine de çalıştır"** deyin.) Bu script
  proje kökündeki tüm dosyalardan internet işaretini kaldırır.
- **Elle:** İndirilen ZIP'e sağ tık → **Özellikler** → altta **"Engellemeyi
  Kaldır"** kutusunu işaretleyip ZIP'i öyle açın.
- **PowerShell ile:** Proje klasöründe şu tek satırı çalıştırın:
  ```powershell
  Get-ChildItem . -Recurse -File | Unblock-File
  ```

> Not: Bu işaret dosya içeriği değil, Windows'a özgü gizli meta veridir; git
> bunu takip etmez. Yani temizlemek git'te bir değişiklik üretmez.

## Teknoloji

- **Frontend:** Next.js 15 (App Router) · TypeScript (strict) · Tailwind +
  shadcn/ui
- **Backend:** Firebase Firestore + Auth + App Check; güvenilir mutasyonlar
  Admin SDK ile Next.js route handler'lar üzerinden
- **Para:** Tüm tutarlar **kuruş (integer)** olarak saklanır
- **Sipariş güvenliği:** Müşteri yalnızca `{urunId, adet}` gönderir; toplam
  sunucuda menüden okunarak hesaplanır, snapshot olarak yazılır

## Klasör Yapısı (üst seviye)

```
src/
  app/              # Next.js App Router (kasa, admin, api)
  components/       # UI parçaları (kasa, admin, ui)
  lib/
    firebase/       # client.ts, admin.ts, converters.ts
    auth/           # session, guard, anon
    siparis/        # transactional sipariş servisi
    utils/          # para, zod-semalar, hata
  types/            # domain modelleri
```

## Kurulum

```bash
npm install
cp .env.example .env.local   # değerleri doldur
npm run dev
```

## Emulator Akışı (Geliştirme) — Tek Komut

`.env.local` zaten emulator için hazırlanmıştır (`NEXT_PUBLIC_USE_EMULATOR=1`).
Tek komutla emulator + Next.js birlikte başlar:

```powershell
npm run dev:all
```

Bu komut:
- `emulators` → Firestore + Auth + Storage emulator'ları
- `dev` → Next.js dev sunucusu
- Logları tek terminalde renkli prefix'lerle gösterir (`emu` sarı, `next` cyan)
- Ctrl+C ile ikisini birlikte durdurur

### İlk seferinde demo veri

Yeni terminal aç ve bir kere çalıştır:

```powershell
npm run seed
```

Örnek menü (kategoriler + ürünler) ve masalar oluşur.

**Veri kalıcıdır** — emulator `--export-on-exit` ile çıkışta `./emulator-veri/`
klasörüne yazar, sonraki açılışta `--import` ile geri yükler. Yani seed'i
yalnız bir kez yapman yeterli.

Emulator UI: <http://localhost:4000>

> Ayrı ayrı çalıştırmak istersen: `npm run emulators` ve `npm run dev`

## Üretim'e seed (opsiyonel)

```bash
node --env-file=.env.local scripts/seed.mjs
# veya:
npm run seed
```

`.env.local`'da `SEED_SAHIP_EMAIL` ayarlıysa, o e-posta ile yaratılmış Auth
kullanıcısına otomatik `kasiyer + sahip` claim'i atanır.

## İlk Kasiyer/Sahip Atama (bir kerelik)

1. Firebase Console > Authentication üzerinden e-posta/şifre ile bir kullanıcı oluştur.
2. `.env.local` içinde `ADMIN_SETUP_TOKEN` rastgele bir string olarak ayarla.
3. Dev sunucusu açıkken:
   ```bash
   curl -X POST http://localhost:3000/api/admin/rol \
     -H 'content-type: application/json' \
     -d '{"setupToken":"<token>","email":"sahip@kafem.com","sahip":true}'
   ```
4. Kullanıcı `/kasa/giris` üzerinden oturum açabilir.
5. Güvenlik için `ADMIN_SETUP_TOKEN`'ı sonradan `.env.local`'dan kaldır.

## Test

```bash
npm test            # watch mode
npm test -- --run   # tek seferlik
```

`tests/` altında birim testler: para format, zod şemaları,
sayaç tarih hesabı, AppError, zod şemaları (SiparisIstegi vb.).

## CI

`.github/workflows/ci.yml`:
- Next.js: `npm ci` → typecheck → test → build (placeholder env'lerle)
- Functions: `npm ci` → build

Push veya PR'da otomatik tetiklenir.

## Güvenlik — Üretim Notu

**Idempotency TTL'i etkinleştir** (Firestore Console > Indexes > TTL):
- Koleksiyon: `idempotency`
- Field: `expireAt`

Bu, idempotency dokümanlarının 24 saat sonra otomatik silinmesini sağlar.
Etkinleştirilmezse koleksiyon zamanla büyür.

**Rate limit:** Her müşteri Anon UID için 60 saniyede 10 sipariş. Aşılırsa
HTTP 429 döner. Limiti `lib/siparis/servis.ts` içinden değiştirebilirsin.

**Audit log:** Tüm admin yazımları `restoranlar/{R}/kullaniciAksiyonlari`
altına yazılır. Yalnız sahip okuyabilir (Firestore rules).

## Cloud Functions (SLA Bildirim)

`functions/` altında 2 fonksiyon:
- **slaKontrol** — her 5 dk'da bir çalışır. `yeni` durumda 10+ dk veya
  `hazirlaniyor` durumda 15+ dk kalmış siparişlere `slaUyari: true` yazar.
  Kasa Kanban'da kırmızı "Geç" rozeti olarak görünür.
- **slaUyariniTemizle** — sipariş ileri durumlara geçtiğinde `slaUyari` alanını
  siler.

Deploy (Firebase Blaze planı gereklidir):

```bash
cd functions && npm install && npm run build && cd ..
firebase functions:params:set RESTORAN_ID
firebase deploy --only functions
```

Emulator'da:

```bash
cd functions && npm run build && cd ..
firebase emulators:start --only firestore,functions,auth
```

## Faz Planı

- [x] Faz 0 — Konfig iskeleti
- [x] Faz 1 — Tipler & temel altyapı
- [x] Faz 2 — Güvenlik & rol (firestore.rules, session, middleware, kasa girişi)
- [x] Faz 3 — Sipariş akışı (kasiyer menü + sipariş transaction)
- [x] Faz 4 — Kasa (Kanban, adisyon paneli, durum güncelleme)
- [x] Faz 5 — Admin (menü/masa CRUD)
- [x] Faz 6 — Operasyonel + Cloud Functions (SLA bildirim)
- [x] Faz 7 — Güvenlik sertleştirme (rate limit + idempotency + audit log)
- [x] Faz 8 — Ürün görseli + günlük rapor + KVKK
- [x] Faz 9 — CI + Vitest birim testleri (28 test)
