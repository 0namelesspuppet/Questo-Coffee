# Questo — Optimizasyon Backlog

> 30-ajanli analiz avindan cikan, koda karsi dogrulanmis 142 bulgu. Etki/Efor/Risk ile onceliklendirildi.
> `[x]` = uygulandi (Codex + Tier1 + Grup A).

**Durum:** 10 uygulandi, 132 bekliyor (toplam 142).

## Uygulananlar

- [x] .next her build oncesi tamamen siliniyor -> her rebuild soguk/yavas
- [x] Idempotency anahtarı her tıkta yeniden üretiliyor — çift sipariş koruması etkisiz
- [x] Viewport zoom kapali (maximumScale:1, kullanici yakinlastiramaz)
- [x] esitOdemeTutariHesapla() tamamen test edilmemis - ceil/kalan/sinir kosullari korunmasiz
- [x] GarsonMenu: tum urun kartlari her sepet dokunusunda yeniden render oluyor (sicak mobil yol)
- [x] Emülatör hazır değilken (ECONNREFUSED) sipariş/ödeme/kapatma route'larında 503+retry yok — veri yazımı sessizce 500'le kayboluyor
- [x] Yedek doğrulaması yok — bozuk/eksik export sessizce 'başarılı' kabul ediliyor
- [x] GUNCELLEME mekanizmasi tanimsiz; kod degisince kafe PC'sinde nasil guncellenecek belirsiz
- [x] Idempotency anahtari her gonder denemesinde yeniden uretiliyor: Wi-Fi kopukken retry DUPLIKE siparis riski
- [x] UI kisiPayi gosterimi ile route esitOdemeTutariHesapla tahsilati arasinda son-dilim tutarsizligi - hicbir tarafta test yok

## Bekleyenler (oncelik: etki -> dusuk efor -> dusuk risk)

### Yuksek etki (10)

- [ ] **Setup endpoint /api/admin/rol uretimde de acik ve emulator kosuluna bagli degil - token sizarsa kim olursa sahip olabilir**  
  `security` | efor:S risk:low | src/app/api/admin/rol/route.ts:22 ; src/app/api/admin/rol/route.ts:36 ; src/app/api/admin/rol/route.ts:43  
  Bu route'u sadece emulator/kurulum modunda calisacak sekilde kisitla (emulatorOrtami() degilse 403). Token dogrulamasini sabit-zamanli karsilastirma (crypto.timingSafeEqual) ile yap. Atama basarili olduktan sonra kullanimi tek seferlik kilan bir isaret yaz (Firestore'da 'kurulumTamamlandi' bayragi) ve sonraki cagrilari reddet. Uretim/kurulum disi ortamda endpoint'i tamamen kapat.

- [ ] **Uygulama icin insan-okur KURULUM/README belgesi yok**  
  `ux` | efor:S risk:low | (KURULUM.md eksik - kok) ; design-reference\README.md:1 ; Questo'yu Kur.bat:30-62  
  Repo kokune KURULUM.md (saf ASCII degil, .md oldugu icin UTF-8 serbest) ekle. Icerik: (1) On-kosullar: Node.js LTS (>=20.6, --env-file destegi sart), Temurin/Adoptium JDK 21, ~2 GB bos disk, Windows 10/11. (2) Sirali kurulum: SAC'i kapat (tek-yonlu uyarisiyla) -> 'Questo'yu Kur.bat' cift tikla -> tamamlaninca 'Questo Yonetim' kisayolu. (3) Sorun-giderme tablosu: '.bat Notepad ile aciliyor'->SAC/MO

- [ ] **Oto-giris LAN'daki herkese SAHIP (owner) yetkisi veriyor - rol ayrimi yok**  
  `security` | efor:M risk:low | src/app/rol-kartlari.tsx:24 ; src/app/api/auth/oto-giris/route.ts:19 ; scripts/seed.mjs:332 ; src/lib/auth/guard.ts:63  
  Garson rolu icin ayri, sahip:false claim'li bir hesap (or. garson@questo.local) tanimla; rol kartina gore oto-giris hangi hesapla yapilacagini secsin (oto-giris route'a rol parametresi). Alternatif/ek olarak sahip yetkisi gerektiren admin paneline ve yikici API'lere geciste basit bir PIN dogrulamasi ekle (4 haneli sahip PIN'i, sunucuda env'de tutulan hash ile). Boylece ayni Wi-Fi'daki herkes rapor

- [ ] **idempotency koleksiyonu emulatorde sonsuz buyur (TTL calismaz)**  
  `resource` | efor:M risk:low | src/lib/siparis/servis.ts:308 ; src/components/kasa/garson-menu.tsx:304 ; firestore.rules:30  
  (a) Yedek/bakim scriptine periyodik temizlik ekle: emulator calisirken Admin SDK ile `idempotency` icindeki `expireAt < now` dokumanlarini batch-delete et (gunde bir kez yeter). (b) Daha iyisi: idempotency anahtarini istemcide sepet icerigi+masa hash'inden uretip kisa pencerede sabit tut; boylece cift-tik korumasi gercekten calisir ve dokuman sayisi patlamaz. (c) Yerel tek-kafe senaryosunda idempo

- [ ] **Musteri adisyon/hesap fisi cikti yolu hic yok**  
  `ux` | efor:M risk:low | src/app/api/adisyon/[id]/kapat/route.ts:77 ; src/app/kasa/(panel)/adisyonlar/[adisyonId]/page.tsx:308 ; src/app/kasa/(panel)/adisyonlar/[adisyonId]/kapat-btn.tsx:42 ; src/app/globals.css:411  
  Adisyon detay sayfasina yalniz kalan=0 iken gorunen bir 'Hesap Fisi' butonu ekle. Mevcut window.print() desenini (yazdir-btn.tsx) yeniden kullan: adisyon icin gizli bir .fis-belge bolgesi render et (masa adi, restoran ad/sehir, siparis kalemleri k.adet x k.ad + araToplamKurus, odeme yontemi, genel toplam, tarih-saat) ve @media print ile yalniz bu bolgeyi bas. Bulut yok; tamamen yerel window.print 

- [ ] **Kasiyer panel sayfalari canli guncellenmiyor; her etkilesimde tam SSR yeniden cekim (router.refresh)**  
  `perf-runtime` | efor:M risk:medium | src/app/kasa/(panel)/adisyonlar/page.tsx:49 ; src/app/kasa/(panel)/adisyonlar/page.tsx:8 ; src/components/kasa/odeme-talepleri.tsx:64  
  Kasiyerin operasyonel ekranlarini (masalar + adisyonlar listesi) menu/masalar gibi onSnapshot ile canli dinlemeye cevir (kurallar zaten kasiyer okumaya izinli, firestore.rules:58-72). Bu hem otomatik canli guncelleme verir hem de gereksiz tam-SSR N+1 cekimlerini kaldirir. Mumkun degilse en azindan adisyonlar/page.tsx'teki per-adisyon siparis cekimini, adisyon dokumanindaki ozet (toplamKurus/sipari

- [ ] **Mutfak bileti (kitchen ticket) otomatik basilmiyor**  
  `ux` | efor:L risk:low | src/components/kasa/garson-menu.tsx:296 ; src/app/api/kasiyer/siparis/route.ts:18 ; src/lib/siparis/servis.ts:279 ; src/app/api/siparis/[id]/durum/route.ts:15  
  Iki yerel secenek: (1) Dusuk efor: siparis onayi sonrasi garson-menu onay penceresine 'Mutfak bileti yazdir' butonu ekle; gizli .mutfak-bilet bolgesi (masa adi, gunlukNo, kalemler + secimler + notlar; FIYAT YOK) render edip @media print ile bas. (2) Daha saglam: kasiyer paneline mutfak ekrani (/kasa/mutfak) ekle, durum=yeni/hazirlaniyor siparisleri kart olarak gostersin, durum/route.ts gecisleriyl

- [ ] **Kasa/Adisyon ekranlari gercek zamanli degil; tum guncellemeler manuel router.refresh ile, tam sayfa SSR yeniden okuma yapiyor**  
  `perf-runtime` | efor:L risk:medium | src/app/kasa/(panel)/masalar/page.tsx:37 ; src/app/kasa/(panel)/adisyonlar/page.tsx:36 ; src/app/kasa/(panel)/adisyonlar/[adisyonId]/page.tsx:55  
  En cok degisen iki ekrani (masalar listesi ve acik adisyon detayi) client-componentlere cevirip hedefli onSnapshot ekle: masalar icin `adisyonlar where(durum==acik)` ve `masalar where(aktifMi==true)` dinleyicileri; adisyon detayi icin tek adisyon dokumani + onun `siparisler`/`odemeTalepleri` alt-koleksiyonlari. Boylece kasiyer/garson ekrani otomatik guncellenir VE her etkilesimde tam SSR yeniden-r

- [ ] **Kapali adisyonlar/siparisler hicbir zaman arsivlenmez/silinmez -> emulator verisi ve rapor sorgusu surekli buyur**  
  `perf-runtime` | efor:L risk:medium | src/app/api/adisyon/[id]/kapat/route.ts:68 ; src/app/admin/rapor/page.tsx:69 ; src/app/admin/rapor/page.tsx:75  
  Bakim adimi ekle (haftalik/aylik, kafe kapaliyken): N gunden (or. 90) eski KAPALI adisyonlari + alt-koleksiyonlarini (siparisler, odemeTalepleri) bir 'arsiv' export'una alip emulatordan batch-delete et. Boylece sicak veri kucuk kalir, rapor 7-gun sorgusu sabit zamanli olur, export/RAM sinirli kalir. Arsiv silmeden once zip'lenip yedekler/ altina atilabilir.

- [ ] **Hicbir route handler / para route'u icin integration/smoke testi yok - emulator-tabanli vitest projesi fizibil**  
  `reliability` | efor:L risk:medium | src/app/api/adisyon/[id]/kasiyer-talep/route.ts:42-87 ; src/app/api/adisyon/[id]/kapat/route.ts:35-80 ; src/app/api/adisyon/[id]/odeme-talebi/[talepId]/onayla/route.ts:30-43 ; vitest.config.ts:1-14 ; src/lib/firebase/admin.ts:45-54  
  Emulator-tabanli ayri bir vitest projesi/dosya grubu kur (orn. tests/integration/*.itest.ts, ayri include + setupFiles ile FIRESTORE_EMULATOR_HOST='127.0.0.1:8080' ve FIREBASE_AUTH_EMULATOR_HOST set). Maliyet: testler emulator calisiyorken kosmali (CI/local'de 'npm run emulators' on-kosulu) - bu yuzden ana 'vitest' (saf birim) suit'inden AYIR (orn. test:int script). Auth guard apiKasiyer'i atlamak

### Orta etki (50)

- [ ] **Seed her acilista tam Node + firebase-admin prosesi spawn ediyor (idempotent atlasada)**  
  `perf-startup` | efor:S risk:low | Questo'yu Başlat.bat:93-96 ; scripts/seed.mjs:233-249  
  Seed'i kosula bagla: emulator-veri/ icinde gecerli export VARSA (firebase-export-metadata.json) seed'i hic spawn etme - veri zaten geri yuklenecek. Sadece emulator-veri yok/bos oldugunda (ilk kurulum) seed'i calistir. Bu kontrol baslat.bat icinde tek bir 'if exist' ile yapilabilir; tam Node prosesi spawn'i tamamen onlenir.

- [ ] **Emülatör UI (port 4000) tek-kafe POS'ta gereksiz; ekstra Node process + RAM/CPU yiyor**  
  `resource` | efor:S risk:low | firebase.json:18 ; scripts\emulator-baslat.ps1:22 ; package.json:14  
  firebase.json:18'de 'ui': { 'enabled': false } yapin. emulators:start (emulator-baslat.ps1:22) --only auth,firestore kullansa da UI ayri bir port-4000 Node sunucusu olarak baslar; kapatilinca o process hic baslamaz, RAM/CPU ve acilis suresi dusler. Kapatildiktan SONRA package.json:14 kill-ports listesinden 4000'i sadelestirin (Hub 4400 emulators:start ile yine acilabilir, once dogrulayin). Gelisti

- [ ] **Emülatör UI '0.0.0.0'a bagli — admin arayuzu tum LAN'a aciliyor (guvenlik)**  
  `security` | efor:S risk:low | firebase.json:18 ; src\lib\firebase\client.ts:70  
  UI'yi tamamen kapatmiyorsaniz (ust bulgu, tercih edilen), en azindan firebase.json:18'de UI host'unu '127.0.0.1' yapin; boylece UI yalnizca PC'den erisilebilir, auth(9099)/firestore(8080) 0.0.0.0'da kalip telefonlara hizmet vermeye devam eder. Tercih: ui.enabled=false.

- [ ] **menu-yonetimi.tsx onSnapshot auth hazir olmadan kuruluyor; permission hatasi/yeniden kurulum riski**  
  `reliability` | efor:S risk:low | src/app/admin/menu/menu-yonetimi.tsx:69  
  menu-yonetimi.tsx'te de diger bilesenlerdeki gibi `onAuthStateChanged` ile `authHazir` state'i kurup useEffect bagimlilik dizisine ekle ve `if (!authHazir) return;` ile gate'le. Bu, gereksiz listener yeniden-kurulumunu ve ilk render permission-denied hatasini onler.

- [ ] **KasiyerBolme: turetilmis degerler her render'da yeniden hesaplaniyor + tumKalemler.find() ile O(n^2)**  
  `perf-runtime` | efor:S risk:low | src/components/kasa/kasiyer-bolme.tsx:61 ; src/components/kasa/kasiyer-bolme.tsx:81 ; src/components/kasa/kasiyer-bolme.tsx:147  
  tumKalemler'i useMemo([siparisler]) ile hesapla ve bir Map<key, item> (useMemo) olustur; seciliToplam ve urunOde icinde find yerine map.get(key) kullan (O(1)). seciliAdetToplam/seciliToplam'i useMemo([seciliAdet, kalemMap]) ile, aktifSiparisler'i useMemo([siparisler]) ile hesapla.

- [ ] **Kullanilmayan 3 bagimlilik: react-hook-form, @hookform/resolvers, class-variance-authority**  
  `build` | efor:S risk:low | package.json:19 ; package.json:20 ; package.json:28 ; next.config.ts:27 ; next.config.ts:28  
  Uc paketi de package.json dependencies'ten kaldir: npm uninstall react-hook-form @hookform/resolvers class-variance-authority. Ayni anda next.config.ts:27-28 satirlarindaki '@hookform/resolvers' ve 'react-hook-form' optimizePackageImports girislerini sil.

- [ ] **firebase/app-check client bundle'a giriyor ama emulator modunda hic calismaz**  
  `perf-startup` | efor:S risk:low | src/lib/firebase/client.ts:22 ; src/lib/firebase/client.ts:48 ; src/lib/firebase/client.ts:52  
  App-check'i kosullu/lazy yap: top-level importu kaldir, baslat() icinde yalnizca !emulatorAcik && siteKey dogru iken `const { initializeAppCheck, ReCaptchaV3Provider } = await import('firebase/app-check')` ile dinamik import et. Veya yerel-kalici karar verildiyse (LAN'da recaptcha anlamsiz) app-check kodunu tamamen kaldir. Boylece modul client bundle'dan tamamen cikar.

- [ ] **firebase-admin icin serverExternalPackages tanimlanmamis (build yavasliyor)**  
  `build` | efor:S risk:low | next.config.ts:18 ; next.config.ts:33  
  next.config.ts'ye top-level `serverExternalPackages: ['firebase-admin']` ekle. Bu firebase-admin + gecisli grpc bagimliliklarini node_modules'tan require eder; mevcut webpack.externals blogu (satir 33-42) buyuk olcude gereksizlesir (grpc zaten firebase-admin altinda). Build hizlanir, hata yuzeyi azalir. Not: middleware.ts firebase-admin import ediyorsa Edge runtime ile catismayi dogrula (su an nod

- [ ] **rapor-sifirla batch'leri atomik değil — kısmi başarısızlıkta yarım sıfırlanmış rapor**  
  `reliability` | efor:S risk:low | src/app/api/admin/rapor-sifirla/route.ts:69 ; src/app/api/admin/rapor-sifirla/route.ts:80  
  Her batch.commit'i try/catch'e al; başarısızlıkta o ana kadarki sayacı ve hatayı döndür ('X/Y işlendi, tekrar deneyin'). raporDisi idempotent olduğundan tekrar çalıştırmanın güvenli olduğunu UI'da belirt. İsteğe bağlı: batch hatası baglantiReddiHatasi ise 503 dön.

- [ ] **Manuel yedek script'i Compress-Archive başarısızlığında temp temizlenmiyor / kısmi zip kalabilir**  
  `reliability` | efor:S risk:low | scripts/yedek-al-elle.ps1:35 ; scripts/yedek-al-elle.ps1:36  
  Compress-Archive'i try/catch'e al, başarısızlıkta yarım zip'i sil; temp temizliğini finally'ye taşı. Zip sonrası OpenRead ile geçerliliğini doğrula, geçersizse sil ve net HATA döndür. 'Yedek hazır' mesajını yalnız doğrulama geçince yaz.

- [ ] **Gercek bulut Firebase yapilandirmasi (.env.bulut.local) ve service-account.json proje kokunde duruyor**  
  `security` | efor:S risk:low | .env.bulut.local:14 ; service-account.json ; src/lib/firebase/admin.ts:45  
  service-account.json yalnizca bulut deploy gerektiginde makinede bulunsun; yerel emulator POS'unda HIC gerekmedigi icin (admin.ts:45-54 emulatorde service account istemiyor) kafe PC'sine kopyalanmasin. Aktarim/yedek listelerinden ve yedekler/ klasorunden haric tut. .env.bulut.local'i de sadece deploy makinesinde birak. Dosya izinlerini daralt (yalniz calistiran kullanici okuyabilsin).

- [ ] **next start -H 0.0.0.0 tum ag arayuzlerine acik; guvenlik HTTP basliklari tanimli degil**  
  `security` | efor:S risk:low | package.json:9 ; next.config.ts:8 ; src/middleware.ts:10  
  (1) Mumkunse bind'i kafe Wi-Fi alt agina ozel IP'ye sinirla ya da Windows Guvenlik Duvari ile 3000 portunu yalniz LAN alt agina ac. (2) next.config.ts'e headers() ekleyerek tum yanitlara X-Frame-Options: DENY (veya CSP frame-ancestors 'none'), X-Content-Type-Options: nosniff, Referrer-Policy: same-origin, Permissions-Policy ekle. Dusuk efor, clickjacking ve gomme yuzeyini kapatir.

- [ ] **Form inputlari yalniz placeholder kullaniyor; label/aria-label yok (kategori, masa, arama)**  
  `ux` | efor:S risk:low | src/app/admin/menu/menu-yonetimi.tsx:300-325 ; src/app/admin/masalar/masa-yonetimi.tsx:148-154 ; src/app/admin/masalar/masa-yonetimi.tsx:187-192 ; src/components/kasa/garson-menu.tsx:452-458  
  Etiketsiz her input'a ya gorunur <label htmlFor> ekle ya da en azindan aria-label ver (arama icin aria-label='Urun ara' yeterli). Placeholder'i etiketin yerine degil yardimci ipucu olarak birak. Modal urun formundaki dogru desen (sarmalayan label) bu alanlara da uygulanabilir.

- [ ] **Genel focus-visible / klavye odak gostergesi yok + tap-highlight kapali**  
  `ux` | efor:S risk:low | src/app/globals.css:83-86 ; src/components/kasa/kasiyer-bolme.tsx:196-209 ; src/app/kasa/(panel)/kasa-shell.tsx:102-134  
  globals.css @layer base icine global bir kural ekle: butona/linke/input'a :focus-visible'da gorunur ring (outline 2px solid hsl(var(--ring)) + outline-offset) uygula. Tek noktadan tum etkilesimli ogeleri kapsar. tap-highlight'i tamamen seffaf birakmak yerine hafif bir aktif-durum geri bildirimi birak.

- [ ] **OdemeTalebiIstegi zod semasi (para istegi) test edilmemis - tabanKurus=0 ve kisiSayisi sinirlari**  
  `correctness` | efor:S risk:low | src/lib/utils/zod-semalar.ts:112-133 ; tests/zod-semalar.test.ts:1-105 ; src/app/api/adisyon/[id]/kasiyer-talep/route.ts:55-87  
  tests/zod-semalar.test.ts'e OdemeTalebiIstegi vakalari ekle: (1) {yontem:'tam'} gecerli; (2) {yontem:'esit', kisiSayisi:1} REDDEDILMELI (min 2) - UI'nin 1'e izin verdigi tutarsizligi belgeler; (3) {yontem:'esit', kisiSayisi:2, tabanKurus:0} su an GECIYOR - bunun istenmeyen 0-tutar talebe yol actigini gosteren test + server-tarafi 0-tutar guard'i onerisi (route'a toplamKurus<=0 ise AppError); (4) {

- [ ] **Baglanti rozeti navigator.onLine'a guveniyor: telefon Wi-Fi'da ama PC erisilemezse YANLIS 'Bagli' gosterir**  
  `reliability` | efor:S risk:low | src/components/kasa/baglanti-rozeti.tsx:12 ; src/app/kasa/(panel)/kasa-shell.tsx:137  
  Gercek erisilebilirlik yoklamasi ekle: hafif bir GET /api/health (yeni; sadece 200 + {ok:true} donen, auth gerektirmeyen kucuk route) olustur ve rozet bunu periyodik (or. 10-15 sn) ve 'online' olayinda fetch ile yokla (kisa AbortController timeout 2-3 sn, cache:'no-store'). Uc durum goster: Bagli (health 200) / Sunucu yok (radyo var ama health basarisiz) / Cevrimdisi (navigator.onLine=false). navi

- [ ] **Tasima/yedek checklist'i (kritik gitignore'lu dosyalar) dokumante degil**  
  `reliability` | efor:S risk:low | .gitignore:4 ; .gitignore:11 ; src\lib\firebase\admin.ts:42 ; scripts\emulator-baslat.ps1:6  
  KURULUM.md/GUNCELLEME.md icine 'Tasima checklist' bolumu ekle: ZORUNLU kopyala = emulator-veri\ (canli veri), .env.local (ayarlar). service-account.json YEREL emulator modunda GEREKMEZ (sadece bulut moduna gecilirse) - bunu zorunlu listeden cikar. opsiyonel yedekler\ (gecmis zipler). Bunlarin git ile GELMEDIGINI acikca belirt. Ek olarak yedek scriptleri zaten emulators:export aldigindan, 'tasimada

- [ ] **Node surum on-kosulu pinlenmemis; seed --env-file Node 20.6+ gerektiriyor ama kontrol edilmiyor**  
  `reliability` | efor:S risk:low | Questo'yu Kur.bat:33 ; package.json:13 ; scripts\seed.mjs:12  
  (1) Kok package.json'a engines ekle: {"node": ">=20.6.0"}. (2) Kur.bat'taki Node kontrolune minimum surum dogrulamasi ekle (node -v ciktisini parse edip <20.6 ise net hata ver: '--env-file icin Node 20.6+ gerekli'). (3) KURULUM.md on-kosulunda 'Node.js LTS 20.6 veya uzeri (mevcut LTS onerilir)' yaz. Bu, 'kuruldu diyor ama demo veri gelmiyor' tipi sessiz hatayi onler.

- [ ] **Smart App Control (SAC) tuzagi kurulum oncesi adim olarak belge ile yakalanmiyor**  
  `ux` | efor:S risk:low | Questo'yu Kur.bat:124 ; scripts\engeli-kaldir.bat:18 ; (KURULUM.md eksik)  
  KURULUM.md'nin EN BASINA, '0. adim' olarak SAC kontrolu/kapatmasini koy: 'Windows Guvenligi > Uygulama ve tarayici denetimi > Akilli Uygulama Denetimi > Kapali. (Tek-yonlu: kapatinca Windows sifirlamadan tekrar acilamaz.)' ve '.bat Notepad ile aciliyorsa SAC veya MOTW sebebidir' tanisi. Belge .md oldugu icin bu adimi insan once okuyup uygulayabilir; .bat icine gomulu uyari SAC takiliyken zaten oku

- [ ] **verifySessionCookie checkRevoked=true her server isteginde auth emulatorune ekstra okuma yapiyor**  
  `perf-runtime` | efor:S risk:medium | src/lib/auth/session.ts:23  
  checkRevoked'u false yap (verifySessionCookie(c)) ve revoke'u yalnizca kritik aksiyonlarda (cikis/rol degisikligi sonrasi) tetikle; ya da kisa sureli bir in-memory cache ile ayni cookie icin saniyede bir kez revoke kontrol et. Yerel/tek kiraci ortamda imza dogrulamasi (checkRevoked=false) zaten yeterli guvenlik saglar. Bu, her sayfa gezinmesi ve API cagrisindaki gizli getUser okumasini kaldirir.

- [ ] **Kapanış yedeği ile emülatörün --export-on-exit'i aynı klasöre yarışıyor — çift yazım / bozulma riski**  
  `reliability` | efor:S risk:medium | scripts/emulator-baslat.ps1:26 ; scripts/kapanis-yedek.ps1:46  
  Tek kanonik yol seç: ya kapanış-script (emülatörü export-on-exit OLMADAN başlat), ya da sadece export-on-exit. İkisi tutulacaksa kapatma sırasını netleştir: önce kapanış-script export+swap TAMAMLANSIN sonra force-kill (force-kill'de export-on-exit zaten çalışmadığından export-on-exit'i kaldırmak en güvenlisi). Swap'taki kilit hatasına retry/bekleme ekle.

- [ ] **window.print() her seferinde manuel tarayici diyalogu; sessiz/otomatik yazdirma yok**  
  `ux` | efor:S risk:medium | src/app/admin/rapor/yazdir-btn.tsx:15  
  Sistem zaten production build + 'next start' ile yerel calistigi ve baslatma .bat'i tarayiciyi aciyor; .bat'in Chrome/Edge start satirlarina '--kiosk-printing' (veya ayri bir varsayilan-yazici profili) ekle. Boylece window.print() diyalogsuz varsayilan termal yaziciya basar. Alternatif (daha fazla efor, tam yerel): yerel kucuk Node yardimci surec uzerinden ESC/POS USB yaziciya dogrudan baski; ilk 

- [ ] **Kapanis: tum node.exe ve java.exe blanket-kill ediliyor**  
  `reliability` | efor:M risk:low | Questo'yu Durdur.bat:24-26 ; Questo'yu Durdur.bat:50-52 ; package.json:14  
  Sadece Questo'ya ait PID'leri oldur: kapanista hedef portlari (3000,8080,9099,4400,4500,9150) dinleyen OwningProcess PID'lerini bul (zaten kill-ports mantigi var) ve yalniz onlari Stop-Process et. Boylece hem daha guvenli hem '/IM' genel taramasindan daha hizli/kesin olur. Cocuk java/node proseslerinin de portu dinledigini dogrula (firebase CLI -> java zinciri kacmamali).

- [ ] **functions emülatörü hicbir zaman calismiyor; SLA ozelligi yerelde sessizce devre disi (olu kod)**  
  `correctness` | efor:M risk:low | firebase.json:6 ; firebase.json:17 ; scripts\emulator-baslat.ps1:22 ; functions\src\index.ts:34 ; src\types\model.ts:136  
  Karar verin: (a) SLA uyarisi isteniyorsa SLA mantigini client/SSR tarafina tasiyin — siparis listesi zaten kasiyer panelinde dinleniyor; olusturulduAt + Date.now() esik kontrolu istemcide yapilabilir, functions hic gerekmez. (b) SLA istenmiyorsa firebase.json:6-13 functions blogunu ve :17 functions emülatör satirini kaldirin, functions/ klasorunu ve Kaldir.bat:24 'functions\node_modules' adimini s

- [ ] **Kapanista export basarisizligi sessizce yutuluyor — force-kill'den once exit kodu kontrol edilmiyor (veri kaybi penceresi)**  
  `reliability` | efor:M risk:low | Questo'yu Durdur.bat:18 ; scripts\kapanis-yedek.ps1:39  
  Durdur.bat:18'de kapanis-yedek.ps1 cikis kodunu kontrol edin; basarisizsa (exit 1) java.exe'yi HEMEN kill etmeyip (satir 26) kullaniciya net uyari + tekrar deneme sansi verin (emülatör hala ayakta). kapanis-yedek.ps1:39-43 export basarisizliginda sessizce exit 1 donuyor ve Durdur.bat bunu yutuyor — 'kapanista yedek alinamadi, son 60 dk veri riskte' durumu kullaniciya gorunmuyor. Bu, force-kill kay

- [ ] **Adisyonlar listesinde N+1 okuma deseni: her acik adisyon icin ayri siparisler okumasi**  
  `perf-runtime` | efor:M risk:low | src/app/kasa/(panel)/adisyonlar/page.tsx:51  
  Iki secenek: (a) Kart ozeti icin gereken urun adlarini siparis yazarken adisyon dokumanina denormalize bir `kalemOzeti` alani olarak tutup tek adisyon okumasiyla goster (N+1 tamamen kalkar). (b) En azindan kart ozetini kaldirip yalnizca adisyon dokumanindaki mevcut `siparisSayisi` + `toplamKurus` ile goster (zaten adisyon dokumaninda var), detay sadece adisyona tiklayinca okunsun. Tek kafe icin (a

- [ ] **GarsonMenu tum urunleri filtresiz dinliyor; stoktaMi/aktif kategori filtresi clientta yapiliyor**  
  `perf-runtime` | efor:M risk:low | src/components/kasa/garson-menu.tsx:85 ; src/components/kasa/garson-menu.tsx:95  
  Siparis alma ekraninda urun/kategori statik sayilabilir: onSnapshot yerine bir kez `getDocs` + sayfa icinde cache; garson menuye girdiginde guncel cekilir, oturum boyunca tekrar okunmaz. Stok bilgisi siparis yazarken sunucuda transaction'da dogrulaniyor (servis.ts:159-181), o yuzden anlik stok push'una gerek yok. `where('stoktaMi','!=',false)` ONERILMEZ: Firestore != alani eksik dokumanlari dislar

- [ ] **GarsonMenu sepetTopla/sepetAdet ve sepetIcerigi JSX'i her render'da yeniden hesaplaniyor**  
  `perf-runtime` | efor:M risk:low | src/components/kasa/garson-menu.tsx:270 ; src/components/kasa/garson-menu.tsx:156 ; src/components/kasa/garson-menu.tsx:354  
  sepetTopla/sepetAdet'i useMemo([sepet]) ile hesapla. Daha onemlisi scroll-spy/aktifKategoriId state'ini urun render'indan ayir: kart agacini React.memo'lu alt bilesene cikar ki aktifKategoriId degisince urun kartlari render olmasin (chip vurgusu yalniz chip barini etkilesin).

- [ ] **Eşzamanlı ödeme talepleri transaction dışında — aşırı ödeme / kalan-altı yarış koşulu**  
  `correctness` | efor:M risk:low | src/app/api/adisyon/[id]/kasiyer-talep/route.ts:42 ; src/app/api/adisyon/[id]/kasiyer-talep/route.ts:77 ; src/lib/siparis/odeme.ts:9  
  Talep yazımını db.runTransaction içine al: tx içinde adisyonu + 'odendi' talepleri oku, kalanı hesapla, 0<kalan kontrolü yap ve yeni talebi aynı tx'te yaz. Böylece eşzamanlı iki ödeme serileşir; ikincisi güncel kalanı görür. odenmisTutarKurus'u tx.get alacak şekilde refactor et (az doküman okur, maliyet düşük).

- [ ] **Idempotency/audit koleksiyonları sonsuz büyür — emülatör TTL policy'leri uygulamaz**  
  `resource` | efor:M risk:low | src/lib/siparis/servis.ts:308 ; src/lib/audit/log.ts:43 ; firestore.rules:29  
  Emülatörde TTL çalışmadığından expireAt'a güvenme; periodic/bakım job'una manuel temizlik ekle: idempotency/ dokümanlarından expireAt<now (24h+) olanları sil; kullaniciAksiyonlari'ndan 180 gün öncesini sil. Idempotency anahtarı sabitlendikten sonra bu dokümanların gerçekten gerekli olduğunu da gözden geçir.

- [ ] **Periodic yedek döngüsü sonsuz, hata sayacı/alarm yok — yedekler haftalarca sessizce durabilir**  
  `reliability` | efor:M risk:low | scripts/yedek-periodic.ps1:58 ; scripts/yedek-periodic.ps1:121 ; scripts/gizli-calistir.vbs:27  
  Üst üste N (örn. 3) başarısız export'ta görünür uyarı üret: masaüstüne 'YEDEK ALINAMIYOR' dosyası yaz veya bir bayrak dosyası set et. Son başarılı yedek zamanını yedekler/son-yedek.txt ile tut; periyot×2'den eskiyse alarm. logs/yedek.log okunmasına güvenme.

- [ ] **Rapor cirosu odenen tutar degil siparis toplamKurus uzerinden - kismi odeme/zorla-kapatma ile gercek tahsilat uyusmaz**  
  `correctness` | efor:M risk:low | src/app/admin/rapor/page.tsx:179 ; src/app/api/adisyon/[id]/kapat/route.ts:60  
  Rapora 'tahsil edilen' (odemeTalepleri.odendi toplami) ile 'siparis edilen' (toplamKurus) ayrimi ekle; zorlaKapatilanKurus'u 'tahsil edilemeyen' olarak ayri goster. Boylece gun sonu kasa mutabakati gercek tahsilatla yapilir.

- [ ] **Kenarlik (border) kontrasti dusuk — input/checkbox/secim sinirlari WCAG 1.4.11 gecmiyor**  
  `ux` | efor:M risk:low | src/app/globals.css:42-43 ; src/components/kasa/garson-menu.tsx:879-885 ; src/components/kasa/odeme-talepleri.tsx:116-120  
  Etkilesimli ogelerin (input, checkbox/radio, secilebilir opsiyon karti, ayrik buton) kenarliklarini en az 3:1 olacak sekilde koyulastir — --border'i form/secim baglamlarinda daha koyu bir tona al ya da ayri --input-border tokeni tanimla. muted-foreground/70 gibi dusuk tintleri en az tam muted-foreground'a cikar. Salt-metin muted-foreground tonlarini degistirmeye gerek yok.

- [ ] **odenmisTutarKurus() icin saf reduce cekirdegi ayiklanip test edilemiyor (Firestore'a gomulu)**  
  `correctness` | efor:M risk:low | src/lib/siparis/odeme.ts:9-21 ; src/app/api/adisyon/[id]/kapat/route.ts:50-58  
  Saf bir yardimci ayikla: topla(docs: {toplamKurus?: number}[]): number ve odenmisTutarKurus ile kapat/route.ts bunu cagirsin. Yeni saf fonksiyona testler: toplamKurus eksik olan dokuman 0 sayilir mi (bilerek hatali veriyi yakalamak icin belki throw/log onerisi), toplamKurus=0 dokumanlari, bos liste -> 0, karisik degerlerin dogru toplandigi. Bu hem DRY hem testability kazanci saglar.

- [ ] **Termal yazici (58/80mm ESC/POS) icin print CSS yok; yalniz A4**  
  `ux` | efor:M risk:low | src/app/globals.css:412 ; src/app/globals.css:477  
  Yeni fis/mutfak-bilet bolgeleri eklenince bunlara ozel @page ekle: tek-sutun, mono/sistem font, 'size: 80mm auto; margin: 0' (58mm icin 58mm). Tailwind yerine fis-belge'ye sabit genislik (or. 72mm icerik) ver. Ayni window.print yolu, sadece termal-dostu CSS. Genislik tek kafe icin ortam degiskeni/ayar ile sabitlenebilir. Bulut yok.

- [ ] **Wi-Fi kopukken gonderme: kullaniciya 'baglanti yok' ozel geri bildirimi ve guvenli yeniden-dene yok; offline kuyruk yok**  
  `ux` | efor:M risk:low | src/components/kasa/garson-menu.tsx:331 ; src/lib/utils/hata.ts:30  
  (a) gonder() catch'inde network hatasini ayirt et: `if (e instanceof TypeError \|\| !navigator.onLine) toast.error('Baglanti yok. Siparis gonderilemedi, birkac saniye sonra tekrar deneyin.')` — sepet KORUNUR (zaten setSepet([]) sadece basaride cagriliyor, iyi). (b) Stabil idempotency anahtari (onceki bulgu) ile 1-2 kez otomatik kisa-gecikmeli retry (sadece network hatasinda) ekle; idempotent oldug

- [ ] **Kur.bat firebase-tools'u global kuruyor ama surum/varlik garantisi zayif, PATH gecikmesi sessiz hataya yol aciyor**  
  `reliability` | efor:M risk:low | Questo'yu Kur.bat:67 ; scripts\emulator-baslat.ps1:26 ; package.json:34  
  (1) KURULUM.md'de 'Kur.bat bittikten sonra TUM .bat/pencereleri kapatip Yonetim'i yeniden ac' notunu net ver (PATH yenilensin). (2) Daha saglam: firebase-tools'u projeye devDependency olarak ekleyip (sabit surum) npm scriptlerinde 'npx firebase ...' kullan; boylece PATH'e ve global kuruluma bagimlilik kalkar, surum repoyla pinlenir ve kafe PC'sinde tutarli olur. (3) Kur.bat'in son ekranina 'emulat

- [ ] **Kapanis yolu seri firebase CLI cagrisi + 2sn+1sn sabit timeout ile yavasliyor**  
  `perf-startup` | efor:M risk:medium | Questo'yu Durdur.bat:16-29 ; scripts/kapanis-yedek.ps1:30-37  
  1) Sabit 'timeout /t 2' yerine portlari kisa araliklarla yoklayan (or. 200ms x max 10) bekleme kullan - portlar serbest kalinca hemen devam et (Baslat.bat'taki TcpClient deseni hazir). 2) Export'u hizlandirma icin once en dusuk riskli adimi uygula (sabit bekleme -> poll); CLI yerine hub REST export'a gecis swap mantigini etkiledigi icin ikincil ve dikkatli yapilmali.

- [ ] **Masalar ve Adisyonlar listeleri canli degil — yeni siparis girince kasiyer manuel yenileme yapmali (router.refresh yok)**  
  `ux` | efor:M risk:medium | src/app/kasa/(panel)/masalar/page.tsx:33 ; src/app/kasa/(panel)/adisyonlar/page.tsx:32  
  (a) Iki liste sayfasini onSnapshot'li client component'e cevir (adisyonlar where durum==acik + masalar). (b) Daha az is: sayfalara odak/gorunurken belirli araliklarla router.refresh() cagiran kucuk bir 'CanliYenile' client wrapper ekle. (a) daha akici, (b) daha az degisiklik. Tek kasa ekrani varsayilarak oncelik orta.

- [ ] **Adisyonlar listesi: her acik adisyon icin ayri siparisler alt-koleksiyon sorgusu (N+1 okuma)**  
  `perf-runtime` | efor:M risk:medium | src/app/kasa/(panel)/adisyonlar/page.tsx:49  
  Kart ozeti icin gereken urun bilgisini adisyon dokumaninda denormalize tut (siparis yazilirken kalemOzeti alanini guncelle) — tek sorgu yeter. Alternatif: collectionGroup('siparisler') + adisyonId filtresi ile tek sorguda tum acik adisyonlarin kalemlerini cekip bellekte grupla. Mevcut N+1 desenini kaldirir.

- [ ] **kasiyer-talep: odeme yazimi transaction disinda - esZamanli iki odeme adisyon toplamini asabilir (cift tahsilat)**  
  `correctness` | efor:M risk:medium | src/app/api/adisyon/[id]/kasiyer-talep/route.ts:32 ; src/app/api/adisyon/[id]/kasiyer-talep/route.ts:42 ; src/app/api/adisyon/[id]/kasiyer-talep/route.ts:76 ; src/lib/siparis/odeme.ts:6  
  Tum kasiyer-talep akisini db.runTransaction icine al: tx.get(aRef), odendi taleplerini tx icinde topla, kalan hesapla, toplamKurus belirle, ayni transaction'da talep dokumanini set et. Boylece ikinci es zamanli istek retry/abort olur. Bulgu 2,4,9 ile birlesik refactor edilmeli.

- [ ] **odeme-talebi onayla: bekleyen musteri talebini kalan tutar dogrulamadan 'odendi' yapar - asiri odeme/cift dusme**  
  `correctness` | efor:M risk:medium | src/app/api/adisyon/[id]/odeme-talebi/[talepId]/onayla/route.ts:34 ; src/app/api/adisyon/[id]/odeme-talebi/[talepId]/onayla/route.ts:39  
  Onayla route'unu transaction'a al: adisyon + odendi talepleri oku, kalan hesapla, talebin toplamKurus'unu min(talep.toplamKurus, kalan)'a duzelt (kalan<=0 ise hata don/iptal et), sonra durum='odendi' yaz.

- [ ] **Esit bolme tabani istemcide donduruluyor - interleaved odeme/iptal/urun ekleme sonrasi yanlis kisi basi**  
  `correctness` | efor:M risk:medium | src/components/kasa/kasiyer-bolme.tsx:53 ; src/components/kasa/kasiyer-bolme.tsx:137 ; src/app/api/adisyon/[id]/kasiyer-talep/route.ts:58  
  Esit bolme tabanini sunucuda yonet: adisyona esitBolme:{taban,kisiSayisi,odenenDilim} durumu yaz, her dilim transaction'da odenenDilim++ ve guncel kalanla dogrula; N'den fazla dilim/kalan<dilim reddet. En azindan urun ekleme/iptal sonrasi UI'da esitTaban'i sifirla (component key ile).

- [ ] **Urun-bazli odeme: secilenKalemler.araToplamKurus istemciden geliyor, sunucu birim fiyati menuden/siparisten DOGRULAMIYOR**  
  `correctness` | efor:M risk:medium | src/app/api/adisyon/[id]/kasiyer-talep/route.ts:64 ; src/lib/utils/zod-semalar.ts:104  
  Urun yonteminde transaction icinde her secilen kalemin siparisini oku, birimFiyatKurus'u dogrula, araToplamKurus=sunucudaki birimFiyat*adet olarak SUNUCUDA yeniden hesapla, istenen adetin kalan odenmemis adedi asmadigini kontrol et. Istemci araToplamKurus'unu yalnizca gosterim icin kullan.

- [ ] **taskkill /F /IM node.exe ve java.exe TUM node/java proseslerini oldurur**  
  `reliability` | efor:M risk:medium | Questo'yu Durdur.bat:25 ; Questo'yu Durdur.bat:51  
  Durdur.bat'i port-bazli sonlandirmaya gecir (kill-ports gibi: 3000/8080/9099/4400/4500 portlarini tutan PID'leri oldur) ve global `/IM node.exe`,`/IM java.exe`'yi yalniz son care olarak, tercihen CommandLine'da proje yolu/`firebase`/`next` gecen prosesleri filtreleyerek kullan (Baslat.bat:50'deki Get-CimInstance CommandLine filtreleme deseni gibi).

- [ ] **Her acilista .next tam silinip yeniden build (kaynak degismese bile sik tetiklenir)**  
  `perf-startup` | efor:M risk:medium | scripts/uygulama-baslat.ps1:31 ; scripts/uygulama-baslat.ps1:40  
  Rebuild kararini icerik-hash bazli yapmak en saglami; pratikte LastWriteTime yeterliyse, gereksiz `.next` tam-silmeyi azaltmak icin: build basarisizsa zaten dev'e dusuluyor, basariliysa .next'i her seferinde silmek yerine Next'in kendi inkremental cache'ine guven. En azindan .env.local kopyalamasinin (Baslat.bat:19-22) dosya zamanini gereksiz degistirmedigini garanti et (icerik aynisa dokunma).

- [ ] **page.tsx:103-125 birim-fiyat geri-hesabi (round) ve tuketim-haritasi edge case testleri yok**  
  `correctness` | efor:M risk:medium | src/app/kasa/(panel)/adisyonlar/[adisyonId]/page.tsx:103-125 ; src/app/kasa/(panel)/adisyonlar/[adisyonId]/page.tsx:186-191  
  Eslestirme/tuketim cekirdegini saf modul olarak ayikla (orn. siparisKalemOdenenHesapla(siparisler, talepler)): girdi olarak duz nesneler alsin, Firestore'a dokunmasin. Testler: (1) tam bolunen birim - 4 cay araToplam=2000, birimFiyat=500, talep 2 birim -> odenen [2]; (2) bolunemeyen ANAHTAR uyusmazligi - birimFiyat=334 ama talep araToplam=1000/adet=3 -> round=333, eslesme KAYBINI gosteren regresyo

- [ ] **Yerel uretim build'inde offline cache yok: Wi-Fi anlik kopmasinda garson menusu komple bos ekran**  
  `reliability` | efor:M risk:medium | public/sw.js:17 ; src/app/sw-register.tsx:13 ; src/lib/utils/ortam.ts:14 ; src/components/kasa/garson-menu.tsx:91  
  SADECE YEREL icin minimal bir SW stratejisi: (a) sw-register.tsx'teki emulatorOrtami() erken-return'unu kaldirip SW'i yerelde de kaydet (veya NEXT_PUBLIC_USE_EMULATOR'dan bagimsiz, 'gercek bulut degil ama uretim build' icin ayri bir bayrak kullan). (b) public/sw.js'e: install'da app shell + statik chunk'lar icin precache; navigasyon ve _next/static icin stale-while-revalidate; /api/* ve ozellikle 

- [ ] **Adisyon kapatma TOCTOU + ayni masada cift acik adisyon riski**  
  `reliability` | efor:L risk:medium | src/app/api/adisyon/[id]/kapat/route.ts:50 ; src/app/api/adisyon/[id]/kasiyer-talep/route.ts:32 ; src/lib/siparis/servis.ts:118  
  Tum odeme/kapatma akislarini ayni adisyon dokumanini tx.get ile kilitleyen transaction'a al (bulgu 1 ile birlesik); odeme yaziminda da adisyon.durum'u tx icinde dogrula. Cift acik adisyona karsi masa dokumaninda kalici acikAdisyonId alani tutup siparisYaz transaction'inda masa dokumanini tx.get ile kilitleyerek tekillik garanti et.

- [ ] **Rapor 7-gun collectionGroup sorgusu tum dokumanlari cekip JS'te restoran-filtreliyor (tek-kiraci icin gereksiz)**  
  `perf-runtime` | efor:L risk:medium | src/app/admin/rapor/page.tsx:69 ; src/app/api/admin/rapor-sifirla/route.ts:57  
  Tek-kiraci oldugu icin gunluk ozet (rollup) dokumani yazmak (siparis yazimi sirasinda gunluk ciro/sayac dokumanina kategori/saat kirilimi eklemek) raporu O(1) okuma yapar. Minimum mudahale: kapali-veri purge (bulgu #2) bu sorgunun buyumesini de sinirlar.

### Dusuk etki (72)

- [ ] **Build tetikleyicisinde .env.local var; baslat.bat onu her ilk kurulumda 'dokunuyor'**  
  `perf-startup` | efor:S risk:low | scripts/uygulama-baslat.ps1:26-31 ; Questo'yu Başlat.bat:17-22  
  Build-tetikleme mantigini icerik-hash temelli yap (or. src+public+config dosyalarinin hash'i .next/.questo-build-hash ile karsilastir) ya da en azindan .env.local'i tetikleyici listesinden cikar (emulator ayarlari Next build ciktisini etkilemiyor; sadece runtime env). copy islemini de 'yoksa kopyala' ile sinirla (zaten oyle) ama tetikleyiciden cikarmak en garantili cozum.

- [ ] **Next.js telemetry kapali degil — build+start'a I/O ve agir-baslangic ekliyor**  
  `perf-startup` | efor:S risk:low | package.json:5-17 ; scripts/uygulama-baslat.ps1:13-15  
  package.json 'build' ve 'start' script'lerinde (ya da uygulama-baslat.ps1 basinda) $env:NEXT_TELEMETRY_DISABLED='1' set et. Sifir risk, kucuk-ama-bedava kazanc; diske gereksiz yazimi keser. Olculebilir hiz kazanci beklenmesin.

- [ ] **firebase.json'da kullanilmayan functions+ui emülatorleri ve functions config parse maliyeti**  
  `build` | efor:S risk:low | firebase.json:6-20 ; scripts/emulator-baslat.ps1:22  
  Yerel POS kullanimi icin firebase.json'dan 'functions' blogunu ve 'emulators.functions' + 'emulators.ui'yi (en az ui:enabled:false) kaldir/kapat. Boylece CLI parse yuzeyi sadelesir, UI portu (4000) bosa ayrilmaz ve kill-ports listesinden 4000/5001 duser. Not: functions/ klasoru kaynak iceriyor (src/index.ts, lib) ama node_modules yuklu degil; tamamen kaldirmak yerine emulator config'ten dislamak y

- [ ] **Acilista emülator hazir-bekleme adimi seri ve 3000 beklemesinden sonra ayrica yapiliyor**  
  `perf-startup` | efor:S risk:low | Questo'yu Başlat.bat:73-91  
  Tek bir PowerShell poll'unda 3000 + 9099 + 8080 ucunu birlikte yokla; ucu de acildiginda cik. Boylece ikinci spawn ve seri bekleme kalkar. Tarayiciyi 3000 acilir acilmaz acmak istenirse emulator beklemesi arka planda birakilabilir.

- [ ] **Cok katmanli proses spawn zinciri (wscript -> cmd -> npm -> node/powershell)**  
  `perf-startup` | efor:S risk:low | Questo'yu Başlat.bat:58-71 ; Questo'yu Başlat.bat:93-96 ; package.json:12-13  
  npm araciligini atla: gizli-calistir.vbs cagrilarinda 'npm run emulators' yerine dogrudan 'powershell -NoProfile -ExecutionPolicy Bypass -File scripts/emulator-baslat.ps1', 'npm run seed' yerine 'node --env-file=.env.local scripts/seed.mjs' kullan. Her arka plan isinde bir npm/Node yuklenme overhead'i kalkar. Komut tanimlarinin package.json ile senkron kalmasina dikkat et.

- [ ] **kill-ports listesinde kullanilmayan port (4000) ve eksik kapsamlar**  
  `code-quality` | efor:S risk:low | package.json:14 ; scripts/emulator-baslat.ps1:22  
  kill-ports listesinden 4000'i (UI kullanilmiyorsa) cikar; port listesini tek kaynaktan (or. ortak script/dosya) hem acilis temizligi hem kapanis kill'i icin kullan. Boylece blanket taskkill /IM ihtiyaci da kalkar (kapanis bulgusuyla birlikte uygula).

- [ ] **Baslat.bat sonunda 'cls' + sabit 2sn timeout ekrani gereksiz bekletiyor**  
  `perf-startup` | efor:S risk:low | Questo'yu Başlat.bat:122-139  
  Gizli modda (GIZLI=1) son ekran 'timeout /t 2'yi atla ya da 0.5sn yap; sadece gorunur (manuel) modda kisa bilgi ekrani goster. Boylece gizli/otomatik acilista 2sn kazanilir.

- [ ] **Periodik yedek ile kapanis yedegi cakisip kapanisi yavaslatabilir**  
  `reliability` | efor:S risk:low | scripts/yedek-periodic.ps1:41-80 ; scripts/kapanis-yedek.ps1:22-49 ; Questo'yu Durdur.bat:12-18  
  Periodik ve kapanis export'lari icin AYRI temp klasor adlari kullan (or. kapanis icin 'emulator-veri-kapanis-temp'). Kapanista once periodik prosesi olduktan sonra olasi yarim 'emulator-veri-yeni'/'-eski' klasorlerini guvenle temizle. Boylece tek-yazar garantisi ve deterministik kapanis saglanir.

- [ ] **auth emülatörü gerekli — kaldirma onerilmemeli (dogrulama: gerekli)**  
  `reliability` | efor:S risk:low | firebase.json:15 ; src\lib\firebase\client.ts:72 ; firestore.rules:10  
  Auth emülatörünü oldugu gibi birakin. client.ts:72 connectAuthEmulator ile kasiyer girisi yapiliyor, seed.mjs:325/332 createUser+setCustomUserClaims ile rol claim'i atiyor, firestore.rules:10-17 kasiyerMi()/sahipMi() request.auth.token.rol claim'ine dayaniyor — auth olmadan kurallar reddeder, giris calismaz. firebase.json:15 auth host 0.0.0.0 telefon LAN girisi icin dogru; client.ts:70 host=window

- [ ] **--export-on-exit, kapanis-yedek.ps1 ile cakisik/gereksiz; force-kill'de zaten calismiyor**  
  `reliability` | efor:S risk:low | scripts\emulator-baslat.ps1:26 ; Questo'yu Durdur.bat:18 ; scripts\kapanis-yedek.ps1:9  
  --export-on-exit'i emulator-baslat.ps1:26,29'dan kaldirip yalnizca kapanis-yedek.ps1 + yedek-periodic.ps1 atomik-swap export yoluna guvenin. Veri kaliciligi: baslangic --import (satir 26) + Durdur.bat:18 kapanis-yedek + periodic zaten tam kapsiyor. Boylece nadir graceful kapanista cift-export ve yaniltici-calismayan davranis ortadan kalkar.

- [ ] **kill-ports ve Durdur.bat port listeleri tutarsiz — UI/Hub portlari Durdur'da yok**  
  `reliability` | efor:S risk:low | package.json:14 ; Questo'yu Durdur.bat:31  
  Once UI'yi kapatin (ust bulgu). Sonra package.json:14 kill-ports listesini gercekten kullanilan portlarla sinirlayin: UI yoksa 4000 (ve reserved 4500/9150) kaldirilabilir; 3000(next)+8080(firestore)+9099(auth) ve Hub gerekirse 4400 kalir. Boylece kill-ports daha hizli (her port icin Get-NetTCPConnection pahali) ve Durdur.bat:31 dogrulama listesiyle tutarli olur. NOT: Durdur.bat:25-26 blanket taskk

- [ ] **singleProjectMode etkisi sinirli; .firebaserc demo-questo ile uyumlu (dogrulama)**  
  `code-quality` | efor:S risk:low | firebase.json:19 ; .firebaserc:3 ; .env.local:26  
  singleProjectMode: true oldugu gibi kalsin — tek-kiracida dogru ayar. Yalnizca dokumantasyon: .env.local:26 NEXT_PUBLIC_RESTORAN_ID=questo (restoran dokuman ID) ile .firebaserc:3 demo-questo (Firebase proje ID) FARKLI kavramlar oldugu netlestirilmeli. Aksiyon gerektirmez.

- [ ] **Firestore index'leri yerel-only kurulumda runtime'da etkisiz — emülatör composite index zorunlu kilmaz**  
  `code-quality` | efor:S risk:low | firestore.indexes.json:1  
  firestore.indexes.json'u SILMEYIN (ileride lazim olabilir) ama 'yerelde index optimizasyonu' bir kazanim degil — emülatör composite index zorunlulugu uygulamaz, runtime etkisi yok. Index dosyasina yerelde zaman harcamayin. Asil okuma/sorgu optimizasyonu sorgu kodunda (bu boyut kapsam disi).

- [ ] **Acik adisyon/siparis sorgularinda limit ve sayfalama yok; veri biriktikce tarama buyur**  
  `perf-runtime` | efor:S risk:low | src/app/kasa/(panel)/adisyonlar/[adisyonId]/page.tsx:57 ; src/app/kasa/(panel)/adisyonlar/page.tsx:41  
  Savunma icin: adisyon detayinda siparisler/odemeTalepleri'ne makul bir `.limit()` (or. 200) ekle; masalar listesinde sadece gereken alani Admin SDK `.select('ad')` ile cek. Boylece anormal birikimde bile okuma sabit kalir. Dusuk oncelik — bulgu #1 client onSnapshot'a gecisi bunu da kapsar.

- [ ] **Siparis durum degisikligi (durum/route) iptal yolunda urun basina ayri tx.get ile N+1 okuma**  
  `perf-runtime` | efor:S risk:low | src/app/api/siparis/[id]/durum/route.ts:122 ; src/app/api/admin/siparis-sil/route.ts:67  
  Dongudeki tekil `tx.get(uRef)` cagrilarini tek `tx.getAll(...refler)` cagrisina topla (src/lib/siparis/servis.ts:127 zaten getAll kullaniyor — ayni deseni uygula). Transaction icinde toplu okuma hem okuma sayisini hem tx penceresini kisaltir, contention azaltir. Iptalde once urun ID'lerini map'le, sonra getAll, sonra mevcut olanlari stokGeriAlim'a ekle.

- [ ] **Persistent IndexedDB cache aktif ama force-dynamic SSR sayfalar bu cache'ten faydalanamiyor (cift okuma yolu)**  
  `resource` | efor:S risk:low | src/lib/firebase/client.ts:91  
  Bulgu #1 ile birlikte ele alinmali: en cok degisen kasa ekranlarini client onSnapshot'a tasiyinca mevcut persistentLocalCache otomatik devreye girer (tekrar acilislarda local cache'ten aninda render + sadece delta network). Ayrica tek-sekme kullanimi GARANTILIYSE `persistentSingleTabManager` daha az IndexedDB senkron yuku getirir; birden fazla sekme/cihaz ihtimali varsa mevcut multi-tab manager'da

- [ ] **kategoriUrunleri ve aramaSonuc filtrelemesi O(kategori x urun) ve her urun snapshot'unda calisiyor**  
  `perf-runtime` | efor:S risk:low | src/components/kasa/garson-menu.tsx:124 ; src/components/kasa/garson-menu.tsx:113  
  Tek gecisle gruplandir: urunler uzerinde bir kez don, u.kategoriId'ye gore Map'e push et (stoktaMi !== false suzgeci ile). Boylece O(urunSayisi). useMemo bagimliliklari ayni kalir. aramaSonuc icin kucuk-harf onbellekleme buyuk menu disinda gereksiz.

- [ ] **Adisyon detayi: agir odeme/birim eslestirme hesaplamalari render govdesinde yapiliyor**  
  `code-quality` | efor:S risk:low | src/app/kasa/(panel)/adisyonlar/[adisyonId]/page.tsx:103 ; src/app/kasa/(panel)/adisyonlar/[adisyonId]/page.tsx:277  
  siparisKalemOdenen ve siparis bazli odenmisAlt'i bir kez hesaplayip hem siparis listesinde hem KasiyerBolme prop hazirliginda yeniden kullan (tek gecis). Server tarafi oldugu icin client perf etkisi yok; oncelik dusuk.

- [ ] **KasaShell sekmeleri her route degisiminde NAV.filter + aktifMi tekrar hesapliyor; iki ayri navigasyon listesi**  
  `code-quality` | efor:S risk:low | src/app/kasa/(panel)/kasa-shell.tsx:102 ; src/app/kasa/(panel)/kasa-shell.tsx:119  
  Filtrelenmis nav listesini useMemo([kullanici.sahip]) ile bir kez hesapla. Tek bir nav bileseni yazip responsive class ile hem mobil hem masaustunu kapsa (kod tekrarini onler). Dusuk oncelik.

- [ ] **OpsiyonSecici icinde ekFiyat/eksikGrup her render'da yeniden hesaplaniyor (modal acikken)**  
  `perf-runtime` | efor:S risk:low | src/components/kasa/garson-menu.tsx:806  
  ekFiyat ve eksikGrup'u useMemo([secimler, urun]) ile hesapla. Kucuk kazanim; ayni dosyadaki diger memo isleriyle birlikte yapilabilir.

- [ ] **MasaYonetimi: onAuthStateChanged icinde getIdToken(true) zorunlu token yenileme — gereksiz gecikme/istek**  
  `perf-startup` | efor:S risk:low | src/app/admin/masalar/masa-yonetimi.tsx:26  
  getIdToken(true) cagrisini kaldir; onAuthStateChanged zaten gecerli kullaniciyi verir (diger shell'lerle tutarli hale gelir). Custom claim tazeligi gerekirse yalniz claim degistiren islemden sonra hedefli yenile. authHazir bekleme suresini kisaltir.

- [ ] **optimizePackageImports'ta etkisiz/yanlis girisler (zod, firebase/app, firebase/auth)**  
  `build` | efor:S risk:low | next.config.ts:24 ; next.config.ts:25 ; next.config.ts:26 ; next.config.ts:27 ; next.config.ts:28 ; next.config.ts:29  
  optimizePackageImports'i gercekten fayda saglayan client barrel paketlerle sinirla: 'lucide-react', 'sonner', 'firebase/firestore' kalsin. 'zod', 'firebase/app', 'firebase/auth', 'react-hook-form', '@hookform/resolvers' girislerini cikar.

- [ ] **Build sirasinda ESLint calisiyor — production build'i yavaslatiyor**  
  `build` | efor:S risk:low | next.config.ts:8 ; package.json:10  
  next.config.ts'ye `eslint: { ignoreDuringBuilds: true }` ekle. Lint'i build'den ayirip yalnizca commit oncesi `npm run lint` ile calistir. typescript.ignoreBuildErrors EKLENMESIN — tip guvenligi korunmali, sadece ESLint build'den cikarilsin.

- [ ] **Uc ayri Google font ailesi yukleniyor — ilk render ve build agirligi**  
  `perf-startup` | efor:S risk:low | src/app/layout.tsx:24 ; src/app/layout.tsx:28  
  ONCELIK: layout.tsx:24'te Playfair_Display style'ini ['normal'] yap (italic hicbir yerde kullanilmiyor — italic WOFF2 indirmesi tamamen elenir, gorsel etki yok). JetBrains_Mono'yu KALDIRMA onerme — .micro-caps (4 kullanim) ona bagli; kaldirilirsa gorsel degisir (ayri ele alinmali, risk: medium).

- [ ] **ANALYZE bundle raporu hic calistirilmamis — somut bundle hedefi yok**  
  `build` | efor:S risk:low | next.config.ts:4 ; package.json:8  
  Bir kez `npm run analyze` calistir. Uretilen .next/analyze/*.html'den (a) firebase/firestore chunk boyutu, (b) app-check gercek payi, (c) en buyuk route bundle'lari (muhtemelen garson-menu.tsx 929 satir + firestore listener) gorulur; app-check kaldirma ve dynamic import onerileri olculur sekilde dogrulanir.

- [ ] **logo.jpg 52KB optimize edilmemis; favicon olarak da yeniden indiriliyor olabilir**  
  `resource` | efor:S risk:low | src/app/admin/admin-shell.tsx:68 ; src/app/kasa/(panel)/kasa-shell.tsx:86 ; src/app/manifest.ts:19  
  logo.jpg'yi makul orta boyuta (PWA ikonu icin ~192-256px, WebP, ~8-15KB) on-optimize et. Cok kucultme — manifest.ts:19 PWA kurulum ikonu olarak kullaniyor. Bu, next/image ilk optimizasyon CPU'sunu ve disk cache boyutunu azaltir. 'favicon yeniden indiriliyor' kismi gecersiz (logo.ico ayri).

- [ ] **Ödeme onaylama route'u transaction'sız ve aşırı-ödeme guard'ı yok**  
  `correctness` | efor:S risk:low | src/app/api/adisyon/[id]/odeme-talebi/[talepId]/onayla/route.ts:30 ; src/app/api/adisyon/[id]/odeme-talebi/[talepId]/onayla/route.ts:39  
  Akış gerçekten ölü ise route + OdemeOnayla component'ini kaldırarak hata/saldırı yüzeyini düşür. Tutulacaksa onayla'yı runTransaction'a al: tx içinde talebi oku, durum!='bekliyor' ise reddet, kalanı hesapla ve talep tutarı kalanı aşıyorsa sınırla/reddet, sonra durum güncelle.

- [ ] **Günlük sipariş sayacı yalnızca artıyor, iptal/silmede geri alınmıyor ve gün dönümünde yarış**  
  `correctness` | efor:S risk:low | src/lib/siparis/servis.ts:252 ; src/lib/siparis/sayac.ts:6  
  Mevcut transaction+merge benzersizliği koruyor (kabul). Ek iş gerekmez; gün-dönümü kenar durumunu bir kez test et ve kabulü yorumla dokümante et. Düşük öncelik.

- [ ] **Stok geri alımında stoktaMi:true koşulsuz set ediliyor — manuel 'satışa kapat' kararını eziyor**  
  `correctness` | efor:S risk:low | src/app/api/siparis/[id]/durum/route.ts:146 ; src/app/api/admin/siparis-sil/route.ts:85  
  Stok geri alımında stoktaMi:true'yu koşulsuz değil yalnız yeni miktar>0 olduğunda set et (zaten liste sadece stokMiktar'lı ürünleri içeriyor, çoğu durum doğru). stokTutarliMi (zod-semalar.ts:57) kuralıyla uyumlu tut. Düşük öncelik.

- [ ] **Hata yanıtları emülatör modunda iç hata mesajını istemciye/log'a sızdırıyor**  
  `security` | efor:S risk:low | src/lib/utils/hata.ts:63 ; src/lib/utils/hata.ts:65  
  İstemciye giden mesajı her zaman generic tut ('Beklenmedik bir hata, tekrar deneyin'); ayrıntıyı yalnız sunucu console/log'una yaz (satır 63 zaten yazıyor). emulatorOrtami() koşullu detay sızdırmayı kaldır. logs/ klasörünün yedek/aktarım listesinden hariç tutulduğunu doğrula.

- [ ] **Build başarısızlığında dev moduna sessiz düşme — fark edilmeyen yavaşlama ve maskelenen hata**  
  `reliability` | efor:S risk:low | scripts/uygulama-baslat.ps1:42  
  Dev'e düşmeyi koru ama görünür uyarı bırak: masaüstüne/uygulama içine 'BUILD BASARISIZ - YAVAS MOD' bayrağı yaz; build hatasını gizli log yerine okunabilir bir yere de yaz. Böylece fark edilip düzeltilir.

- [ ] **Esit bolme: ceil ile kisi basi yukari yuvarlanip UI tum dilimlerde sabit gosterir - makbuz son kisi icin tahsilattan farkli**  
  `correctness` | efor:S risk:low | src/lib/siparis/odeme.ts:35 ; src/components/kasa/kasiyer-bolme.tsx:93 ; src/components/kasa/kasiyer-bolme.tsx:284  
  UI'da her dilimin gercek tutarini goster (son dilim min(ceil,kalan) ile farkli) veya artigi acikca dagit: ilk (taban mod N) kisiye ceil, kalanlara floor. Sunucu zaten dogru toplam tahsil ediyor; sadece gosterimi hizala ki makbuz=tahsilat olsun.

- [ ] **esit yontemi: tabanKurus=0/toplamKurus<=0 olsa bile talep yazilir - sahte 'odendi' kayitlari, kalan kapanmaz**  
  `correctness` | efor:S risk:low | src/lib/siparis/odeme.ts:33 ; src/lib/utils/zod-semalar.ts:125 ; src/app/api/adisyon/[id]/kasiyer-talep/route.ts:76  
  Sunucuda hesaplanan toplamKurus<=0 ise talep yazma, hata don (mevcut route.ts:44-50 guard'ina benzer, tum yontemler icin). zod semasinda esit tabanKurus icin min(1) yap; 0-tutarli odeme talebi hicbir yontemde yazilmamali.

- [ ] **siparisYaz: araToplam/adisyon toplamKurus icin ust-sinir akil-saglik kontrolu yok**  
  `code-quality` | efor:S risk:low | src/lib/siparis/servis.ts:232 ; src/lib/siparis/servis.ts:263  
  araToplamKurus ve birikimli adisyon toplamKurus icin makul ust sinir / Number.isSafeInteger akil-saglik kontrolu ekle (orn tek kalem > 100_000_000kr ise hata). Ucuz savunma agi; mevcut sinirlar zaten tasmayi engelliyor, dusuk oncelik.

- [ ] **tlToKurus: admin fiyat girisinde ondalik basamak validasyonu yok ('19.999' sessiz yuvarlanir)**  
  `correctness` | efor:S risk:low | src/lib/utils/para.ts:12 ; src/app/admin/menu/menu-yonetimi.tsx:478 ; src/app/admin/menu/urun-opsiyonlari.tsx:294  
  Admin fiyat/ekFiyat formlarinda (menu-yonetimi.tsx:478, urun-opsiyonlari.tsx:294) girdiyi 2 ondalik basamaga kirp (round oncesi) veya step=0.01 + validasyon ekle ki '19.999' sessizce yukari yuvarlanmasin. Sistemin geri kalani kurus-integer oldugu icin baska float duzeltmesi gerekmiyor.

- [ ] **Durum-degistiren POST/PATCH route'larinda CSRF korumasi yok; tek savunma sameSite=lax**  
  `security` | efor:S risk:low | src/lib/auth/session.ts:36 ; src/app/api/admin/rapor-sifirla/route.ts:38 ; src/app/api/admin/siparis-sil/route.ts:21  
  Yikici POST route'larinda (rapor-sifirla, siparis-sil, adisyon/kapat, urun/masa/kategori delete) Origin header'ini sunucu kokeniyle (beklenen LAN IP / localhost) karsilastir; uyusmazsa 403. Dusuk efor, ek bagimlilik gerektirmez. Alternatif: ozel bir baslik (x-questo-csrf) iste.

- [ ] **kasiyer/siparis route'u restoran kapsamini (claims.restoranId) dogrulamiyor - diger kasiyer route'lariyla tutarsiz**  
  `security` | efor:S risk:low | src/app/api/kasiyer/siparis/route.ts:11 ; src/lib/admin/restoran.ts:11  
  kasiyer/siparis route'una da kapsamiDogrula(u) (src/lib/admin/restoran.ts:11) ekleyerek diger kasiyer route'lariyla ayni kapsam kontrolunu uygula. Tek satirlik ekleme; davranisi degistirmez, tutarliligi ve gelecekteki cok-restoran guvenligini saglar.

- [ ] **odeme-talebi/onayla route'u olu kod - hicbir akis 'bekliyor' durumu uretmiyor (yetki yuzeyi gereksiz acik)**  
  `code-quality` | efor:S risk:low | src/app/api/adisyon/[id]/odeme-talebi/[talepId]/onayla/route.ts:35 ; src/app/api/adisyon/[id]/kasiyer-talep/route.ts:83  
  Eger musteri-tarafi QR odeme (durum:'bekliyor' ureten akis) tasarimdan kaldirildiysa bu route'u tamamen sil; korunacaksa 'bekliyor' ureten gercek bir akis ekle. Olu yazma endpoint'ini kaldirmak yetki yuzeyini kucultur.

- [ ] **Sunucu hata mesajlari emulator ortaminda ic detay/yigin sizdiriyor (LAN istemcilerine)**  
  `security` | efor:S risk:low | src/lib/utils/hata.ts:64  
  Detayli hata mesajini yalnizca sunucu loguna (console.error zaten var, hata.ts:63) yaz; istemciye her zaman genel mesaj don ya da detayi sadece localhost/127.0.0.1 isteklerinde goster, LAN IP'lerinde gizle. Teshis icin sunucu logu yeterli.

- [ ] **Session cookie omru 5 gun ve yenilenmiyor; cikis yalniz client cookie siler, oturum revoke edilmiyor**  
  `security` | efor:S risk:low | src/app/api/auth/cikis/route.ts:7 ; src/lib/auth/cookie.ts:3 ; src/lib/auth/session.ts:23  
  auth/cikis route'unda cerezSil'den once oturum cookie'sinden uid coz (verifySessionCookie) ve getAdminAuth().revokeRefreshTokens(uid) cagir. checkRevoked:true zaten acik oldugundan revoke sonrasi tum session cookie'ler gecersiz olur. Ek olarak 5 gunluk omru kafe vardiyasina uygun kisaltmayi degerlendir.

- [ ] **Edge middleware yalniz cookie VARLIGINI kontrol ediyor; sahte/expired cookie ile sayfa kabugu kisa sure yuklenebilir**  
  `security` | efor:S risk:low | src/middleware.ts:17 ; src/app/admin/layout.tsx:11 ; src/app/kasa/(panel)/layout.tsx:11  
  Mevcut mimari kabul edilebilir; korunan sayfa layout'larinin guard'i zaten en basta await ettiginden veri cekmeden redirect garanti edilir - bunu koru. Istenirse middleware'de cookie degerinin asgari bicim/uzunluk kontrolu (JWT uc parca) eklenerek tamamen gecersiz degerler edge'de elenip sunucu yuku azaltilabilir. Dusuk oncelik.

- [ ] **Audit log (kullaniciAksiyonlari) TTL'e guveniyor ama emulatorde silinmez**  
  `resource` | efor:S risk:low | src/lib/audit/log.ts:43  
  Yukaridaki periyodik temizlik adimina `kullaniciAksiyonlari` icin de `expireAt < now` batch-delete ekle. Ek olarak kod yorumundaki 'TTL otomatik temizler' ifadesi yerel emulator icin yaniltici; bakim scriptinin gercek temizleyici oldugunu belgele.

- [ ] **emulator-veri-eski klasoru her export'ta yenilenip kalici olarak birakiliyor (veri 2x disk)**  
  `resource` | efor:S risk:low | scripts/yedek-periodic.ps1:72 ; scripts/kapanis-yedek.ps1:48  
  Atomik swap'in amaci yalniz yarim export'a karsi korunmak; basarili swap'tan SONRA `emulator-veri-eski`'yi silmek (veya bir sonraki dongude basinda silmek) guvenli. Swap basariliysa eskiyi Remove-Item ile temizle. `emulator-veri-yedek-demo1` elle silinebilir (gitignore'da zaten). Zip rotasyonu (yedekler/) zaten 30 gun tutuyor; ek bir tam kopyaya gerek yok.

- [ ] **firebase-debug.log ve firestore-debug.log temizlenmiyor, her acilista buyur**  
  `resource` | efor:S risk:low | Questo'yu Başlat.bat:54  
  Baslat.bat'in log temizleme dongusune (satir 54) `firebase-debug.log` ve `firestore-debug.log` (root) dosyalarini da ekle, ya da Durdur/Baslat'ta bunlari sil. Saf ASCII oldugu icin .bat kisiti sorun degil.

- [ ] **firebase.json'da functions(5001) ve UI(4000) emulatorleri tanimli ama baslatilmiyor — kafa karistirici/portlar bos tutuluyor**  
  `build` | efor:S risk:low | firebase.json:14 ; scripts/emulator-baslat.ps1:22  
  firebase.json'dan kullanilmayan `functions` ve `ui` emulator bloklarini kaldir (ya da ui.enabled:false). Boylece konfigurasyon gercek calistirilanla (auth+firestore) tutarli olur. NOT: Storage emulatoru kaldirma baska arac kapsaminda — buna dokunma; bu bulgu functions+ui icin.

- [ ] **Firestore persistentLocalCache (IndexedDB) tarayicida sinirsiz buyuyebilir; uzun acik kalan kasiyer sekmesinde bellek/disk artisi**  
  `resource` | efor:S risk:low | src/lib/firebase/client.ts:91  
  Yerel POS'ta offline persistence'in faydasi dusuk (emulator ayni LAN'da). persistentLocalCache yerine `memoryLocalCache` kullanmak (ya da cache boyutu sinirli persistent) uzun-acik sekmede disk/bellek birikimini sifirlar ve bayat-veri riskini azaltir. En azindan periyodik (gunluk) tarayici/sekme yenilemesi onerilebilir.

- [ ] **masa-yonetimi onSnapshot her auth degisiminde u.getIdToken(true) ile zorla token yenileme**  
  `code-quality` | efor:S risk:low | src/app/admin/masalar/masa-yonetimi.tsx:28  
  masa-yonetimi.tsx:28'deki `u.getIdToken(true)` force-refresh'i kaldir (sadece `setAuthHazir(!!u)` yeter; custom claim/rol degisimi yerel seed'de sabit). Diger ekranlarla tutarli olur, gereksiz emulator auth turu gider.

- [ ] **kapanis-yedek.ps1 yorumunda eski '15 dk' suresi (guncellik/dogruluk)**  
  `code-quality` | efor:S risk:low | scripts/kapanis-yedek.ps1:10  
  Yorumu 60 dk olarak guncelle (ya da 'periyodik yedek araligindan' diye sabit-sayisiz yaz). Salt belgelendirme; davranis dogru. Bu bulgu yalniz stale YORUM duzeltmesidir — 15->60 periyot DEGISIKLIGINI onermez (o baska arac kapsaminda).

- [ ] **Periodik yedek cikis kosulu yok; emulator olunce surekli WARN log uretip dongude doner**  
  `reliability` | efor:S risk:low | scripts/yedek-periodic.ps1:121  
  Donguye saglik kontrolu ekle: ust uste N (or. 3) basarisiz export'tan sonra 'emulator durmus' deyip prosesi sonlandir (exit). Alternatif: her dongude 8080/9099 portunu kontrol et, kapaliysa kisa bekleyip cik.

- [ ] **prefers-reduced-motion kurali HIC yok; sonsuz animasyonlar her zaman calisiyor**  
  `ux` | efor:S risk:low | src/app/globals.css:171-263 ; src/app/rol-kartlari.tsx:93 ; src/app/admin/loading.tsx  
  globals.css sonuna global bir reduced-motion blogu ekle: prefers-reduced-motion: reduce altinda fiilen calisan animasyonlari (Tailwind animate-spin/animate-pulse ve kullanilan anim-sheet-in/anim-fade-in/anim-rise/anim-fly-to-cart/page-flip gibi) kapat/kisalt (animation: none veya animation-duration: 0.01ms). Reduced-motion destegi gercek bir WCAG 2.3.3 eksigidir; tek satirlik global blok ile kapat

- [ ] **Durum yalnizca renkle iletiliyor (renk-bagimli bilgi)**  
  `ux` | efor:S risk:low | src/components/kasa/garson-menu.tsx:480-494 ; src/components/kasa/garson-menu.tsx:879-885 ; src/app/kasa/(panel)/masalar/page.tsx:86-100  
  Renkle iletilen secili-olma durumlarina ikincil gosterge ekle: secili kategori chip'ine aria-current='true', secili opsiyona tik/isaret ikonu. Masa kartinda bos/dolu zaten 'Acik' rozeti metni + 'Bos' metni ile ikincil gosterge var (sorun degil).

- [ ] **Navigasyonda aktif sekme ekran okuyucuya bildirilmiyor (aria-current yok)**  
  `ux` | efor:S risk:low | src/app/kasa/(panel)/kasa-shell.tsx:102-134 ; src/app/admin/admin-shell.tsx:77-92 ; src/components/kasa/garson-menu.tsx:480-494  
  Aktif nav linkine ve aktif kategori chip'ine aria-current='page' (chip icin 'true') ekle. Tek satirlik degisiklikle hem A11y hem renk-bagimsiz durum gostergesi (bir onceki bulguyla ortusur).

- [ ] **Sayfa yapisinda <main> landmark ve atla-baglantisi (skip link) eksik**  
  `ux` | efor:S risk:low | src/app/kasa/(panel)/kasa-shell.tsx:76-152 ; src/app/admin/admin-shell.tsx:57-128 ; src/app/layout.tsx:67-71  
  Shell'lerde {children}'i <main id='icerik'> icine al ve header'dan once gorunmez ama focus'ta gorunur bir 'Icerige atla' skip-link ekle (href='#icerik').

- [ ] **Restoran modelinde fis altbilgisi/adres/telefon/vergi alanlari yok**  
  `ux` | efor:S risk:low | src/types/model.ts:1 ; src/app/admin/rapor/page.tsx:48  
  Restoran dokumanina opsiyonel adres, telefon, fisAltNot (or. 'Bizi tercih ettiginiz icin tesekkurler') ve istenirse vergiNo alanlari ekle; bunu yapmadan once model.ts'e bir Restoran tipi tanimlamak da iyi olur (su an meta inline okunuyor). Fis/print CSS bu alanlari kosullu render etsin. Tek kiraci oldugu icin tek dokuman; migration gerekmez, alanlar opsiyonel kalir. Tamamen yerel.

- [ ] **Birkac .ps1 betiginde non-ASCII karakter var; sag-tik 'PowerShell ile calistir' yolunda ayristirma riski**  
  `build` | efor:S risk:low | scripts\yedek-periodic.ps1:1 ; scripts\kapanis-yedek.ps1:1 ; scripts\yedek-al-elle.ps1:1 ; scripts\yonetim-gui.ps1:1  
  Tutarlilik ve gelecekteki duzenleme guvenligi icin bu .ps1 dosyalarini da saf ASCII'ye cevir (Turkce harfleri ASCII karsiliklariyla: ç->c, ş->s vb.), VEYA kesin cozum olarak dosyalari UTF-8 with BOM kaydet (PowerShell 5.1 BOM'u dogru okur). En azindan elle/sag-tikla calistirilabilen yedek-al-elle.ps1 ve kapanis-yedek.ps1 oncelikli. Kontrol komutu MEMORY'de mevcut: ([IO.File]::ReadAllBytes($f) \| ?

- [ ] **Periodic + kapanis export ayri Node process spawn ediyor — weak PC'de I/O/CPU spike; 'degismediyse atla' optimizasyonu**  
  `perf-runtime` | efor:M risk:low | scripts\yedek-periodic.ps1:52 ; scripts\kapanis-yedek.ps1:33  
  Export'u yalnizca veri DEGISTIYSE yapin (son export'tan beri write yoksa atla) — boylece bos donemlerde gereksiz Node process + tam-klasor rename/delete I/O'su onlenir. Backup ARALIGI kapsam disi oldugundan yalnizca 'degismediyse atla' oneriliyor, aralik degil.

- [ ] **Emülatör log gurultusu kontrol edilmiyor — uzun oturumda buyuyen emulator.log + disk I/O**  
  `resource` | efor:M risk:low | scripts\emulator-baslat.ps1:22 ; Questo'yu Başlat.bat:60  
  emulator.log oturum-ici rotasyon/truncation ekleyin. Başlat.bat:54-55 baslangicta emulator.log'u siliyor (iyi) ama oturum tum gun acik kalirsa log surekli buyur. Pratik: periyodik truncation veya boyut esigi asilirsa yedek-periodic.ps1 icinde log'u kirpma. Firebase CLI emülatör verbosity bayragi sunmadigindan en pratik cozum dosya rotasyonu. Etki dusuk; disk dolmasini onler.

- [ ] **Rapor collectionGroup sorgusu tum kiracilari okuyup clientta path prefix ile filtreliyor**  
  `perf-runtime` | efor:M risk:low | src/app/admin/rapor/page.tsx:75 ; src/app/api/admin/rapor-sifirla/route.ts:63  
  Siparis dokumanlarina zaten yazilan bir `restoranId` alani (servis.ts siparis yazarken eklenebilir) ile collectionGroup sorgusuna `where('restoranId','==',R)` ekle; client-side path filtresi kalkar. firestore.indexes.json'a restoranId+olusturulduAt bileske index'i eklenir. Tek kiracida pratik kazanim dusuk; cok-kiraci genisleme dusunulmuyorsa erteленebilir.

- [ ] **Garson menu listenerlari kullanici menuden ayrildiktan sonra siparis onayinda hala acik kalabiliyor; ama asil sorun her urun ekleme akisinda tam menu yeniden okumasi**  
  `perf-runtime` | efor:M risk:low | src/components/kasa/garson-menu.tsx:75 ; src/app/kasa/(panel)/masa/[masaId]/page.tsx:43  
  Urun/kategori verisini panel layout seviyesinde bir React context/provider'da bir kez getDocs ile yukleyip ekleme akislari arasinda paylas; GarsonMenu her mount'ta sifirdan dinleyici kurmasin. Real-time gereksinimi dusuk (stok sunucuda dogrulaniyor). Not: mevcut cleanup zaten listener'lari kapatiyor (sizinti yok), asil kazanim tekrar mount basina yeniden okuma/dinleyici-kurulum maliyetini kaldirma

- [ ] **Adisyon detay sayfasinda odeme/kalem hesaplari her render'da tum siparis+talep dokumanlari uzerinde yeniden isleniyor (sunucu CPU)**  
  `perf-runtime` | efor:M risk:low | src/app/kasa/(panel)/adisyonlar/[adisyonId]/page.tsx:103  
  Bulgu #1 (client onSnapshot'a gecis) bu sorunu da cozer: sadece degisen dokumanlar gelir, hesap yalnizca gercek degisiklikte useMemo ile tekrarlanir. Gecis yapilmazsa en azindan odenen-birim ozetini odeme onaylanirken adisyon dokumanina denormalize edip her render'da yeniden hesaplamayi onle. Tek basina dusuk oncelik.

- [ ] **MenuYonetimi: urun listesi memosuz; kategori degisiminde tum urun kartlari ve form state cascade render**  
  `perf-runtime` | efor:M risk:low | src/app/admin/menu/menu-yonetimi.tsx:392 ; src/app/admin/menu/menu-yonetimi.tsx:585  
  Urun/kategori form modallarini ayri bilesenlere cikar (form state'i o bilesende tut) ki form input'lari ana listeyi render etmesin. Urun liste ogesini React.memo'lu 'UrunSatiri' bilesenine cikar. goruntulenenUrunler zaten useMemo'lu; asil sorun form state'inin liste ile ayni bilesende olmasi.

- [ ] **auditLogla sessizce yutuyor — kritik silme/sıfırlama işlemlerinde denetim izi kaybolabilir**  
  `reliability` | efor:M risk:low | src/lib/audit/log.ts:45 ; src/app/api/admin/siparis-sil/route.ts:100 ; src/app/api/admin/rapor-sifirla/route.ts:80  
  Yıkıcı işlemlerde (siparis.sil, rapor.sifirla) audit kaydını mümkünse aynı transaction/batch içinde tx.set ile yaz (ya ikisi de ya hiçbiri). En azından bu işlemlerde audit başarısızlığını yutmak yerine logla + yanıtında 'audit yazılamadı' uyarısı döndür.

- [ ] **Urun-bazli odeme: birim fiyat round() ile geri hesaplaniyor - ad+birim anahtariyla eslestirme kirilgan**  
  `correctness` | efor:M risk:low | src/app/kasa/(panel)/adisyonlar/[adisyonId]/page.tsx:107 ; src/app/kasa/(panel)/adisyonlar/[adisyonId]/page.tsx:109 ; src/lib/utils/zod-semalar.ts:104  
  Anahtari `siparisId\|\|urunId\|\|birimKurus` yap (ad yerine urunId; zaten kalemde urunId var). Odeme talebine secilenKalemler icine birimKurus'u dogrudan yaz (kasiyer-bolme.tsx:155'te biliniyor), round ile geri hesaplama. Boylece ayni ad farkli opsiyon kalemleri karismaz.

- [ ] **Siparis iptali: iptal edilen siparise ait odeme talepleri temizlenmiyor - hayalet odeme ve odenenBirimMap tutarsizligi**  
  `correctness` | efor:M risk:low | src/app/api/siparis/[id]/durum/route.ts:86 ; src/app/kasa/(panel)/adisyonlar/[adisyonId]/page.tsx:103  
  odenenBirimMap olusturulurken iptal edilen siparis id'lerini disla (page.tsx:104 donguusunde t.secilenKalemler[].siparisId iptal listesindeyse atla). Ek olarak iptali yalnizca kendi odenmis birim adedi 0 olan siparisler icin izin ver.

- [ ] **Sepete-ekle / odeme durum degisikliklerinde aria-live canli bolge yok**  
  `ux` | efor:M risk:low | src/components/kasa/garson-menu.tsx:546-571 ; src/components/kasa/kasiyer-bolme.tsx:286-304 ; src/components/kasa/baglanti-rozeti.tsx:31  
  Sepet ozet barina (garson-menu.tsx mobil bar 546-571 ve desktop panel) gorunmez bir aria-live='polite' bolge ekleyip 'Sepet: N kalem, toplam X' metnini guncelle. KasiyerBolme odeme sonucu icin de polite live-region ile durum duyur. Toast'a ek olarak degil, ondan bagimsiz olarak kalici uygulama durumu icin gerekli.

- [ ] **Modallarda focus-trap ve Escape tutarsiz; bazilari role=dialog ama aria-labelledby yok**  
  `ux` | efor:M risk:low | src/app/admin/menu/menu-yonetimi.tsx:392-421 ; src/app/admin/menu/urun-opsiyonlari.tsx:182-208 ; src/components/kasa/garson-menu.tsx:574-599 ; src/components/kasa/garson-menu.tsx:841-862  
  Ortak bir modal davranisi standartlastir: acilista ilk anlamli ogeye odak, kapanista tetikleyiciye odak iadesi, Escape ile kapatma, ve odak trap. aria-labelledby'yi her dialog'a baslik id'siyle ekle. onay-dialog.tsx ve garson onay penceresi referans alinabilir.

- [ ] **Urun karti role=button div; sayfada cogu metin text-xs/text-[10px] — hedef ve okunabilirlik**  
  `ux` | efor:M risk:low | src/components/kasa/garson-menu.tsx:702-762 ; src/app/admin/menu/menu-yonetimi.tsx:269-292 ; src/app/kasa/(panel)/masalar/page.tsx:96  
  Urun kartini gercek <button> yap (veya ic +/- kontrollerini karttan ayir) ki nested-interactive olmasin. p-1 ikon butonlarini en az 24x24 efektif dokunma alanina cikar. Kritik fiyat/durum metinlerinde text-[10px]/text-xs yerine en az text-sm tercih et; zoom acilinca (1. bulgu) bu zaten rahatlar.

- [ ] **kasiyer-bolme.tsx turetilmis hesaplar componente gomulu - test edilemez + O(n) find seciliToplam'da**  
  `code-quality` | efor:M risk:low | src/components/kasa/kasiyer-bolme.tsx:77-93 ; src/components/kasa/kasiyer-bolme.tsx:147-160  
  Saf fonksiyonlari ayri modul (orn. src/lib/siparis/bolme-hesap.ts) olarak ayikla: seciliToplamHesapla(secimMap, kalemler), kisiPayiHesapla(taban, kisiSayisi), esitTabanBelirle(esitTaban, kalan). seciliToplam icin O(n) lookup: tumKalemler'i bir Map<key,item>'a cevirip find yerine get kullan (test kolayligi icin, perf ikincil). Sonra testler: kisiPayiHesapla(1000,3)===334; seciliToplamHesapla(Map{'a

- [ ] **Print bolgesi izolasyonu hardcoded .rapor-belge'ye bagli; cok-belge icin yeniden kullanilamaz**  
  `code-quality` | efor:M risk:low | src/app/globals.css:417  
  Print izolasyonunu genellestir: yazdirilacak aktif bolgeye 'data-print-target' veya govdeye sinif (body.print-fis / body.print-mutfak / body.print-rapor) ekleyip @media print icinde o hedefe gore gorunurluk ve @page sec. Boylece tek window.print yoluyla uc farkli belge dogru genislik/yerlesimde basilir. Yapisal degisiklik, bulut yok.

- [ ] **PWA standalone (ana ekrana ekle) offline'da bos/hata ekrani: start_url '/' icin offline fallback yok**  
  `ux` | efor:M risk:low | src/app/manifest.ts:9 ; public/sw.js:17 ; src/app/layout.tsx:39  
  1. bulgudaki SW'i etkinlestirdikten sonra: navigasyon istekleri icin cache-first/SWR app shell + basarisizlikta minimal bir offline fallback HTML ('/offline' veya precache'li statik sayfa) don; bu sayfa 'Sunucuya ulasilamiyor. Wi-Fi baglantisini ve kafe bilgisayarinin acik oldugunu kontrol edin. Otomatik yeniden denenecek.' mesaji + periyodik /api/health yoklamasi ile baglanti gelince otomatik rel

- [ ] **Agir kosullu modallar next/dynamic ile lazy yuklenmiyor**  
  `perf-startup` | efor:M risk:medium | src/app/admin/menu/menu-yonetimi.tsx:20 ; src/app/kasa/(panel)/adisyonlar/[adisyonId]/page.tsx:14 ; src/app/kasa/(panel)/adisyonlar/[adisyonId]/page.tsx:15 ; src/components/kasa/kasiyer-bolme.tsx:1 ; src/components/kasa/odeme-talepleri.tsx:1  
  Net ve guvenli olan: menu-yonetimi.tsx (client) icindeki UrunOpsiyonlariModal'i next/dynamic ile ssr:false lazy yap — sadece Sliders butonuna basinca yuklenir. KasiyerBolme ve OdemeTalepleri Server Component (page.tsx) icinde oldugundan ssr:false ONERILMEZ (derleme hatasi); bunlari lazy yapmak istenirse once kucuk bir 'use client' wrapper'a tasinmalari gerekir — ekstra efor/risk getirir, oncelik d

- [ ] **Oto-giris 'devre disi' kosulu yalniz emulator sinyaline bagli - yerel uretim build'inde de aktif**  
  `security` | efor:M risk:medium | src/app/api/auth/oto-giris/route.ts:12 ; src/lib/utils/ortam.ts:14 ; .env.local:23  
  Oto-giris erisimini ortam bayragindan bagimsiz, acik bir 'cihaz guveni' kararina bagla: or. yalniz 127.0.0.1/localhost isteklerinde otomatik owner, LAN IP'lerinden (telefon) gelen isteklerde rol-bazli veya PIN'li giris iste. Istek IP'sini (x-forwarded-for / req) kontrol ederek kasiyer PC'si ile garson telefonlarini ayir. (Bulgu #1 ile birlikte cozulmeli.)

