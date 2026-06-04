'use client';

import {
  getApp,
  getApps,
  initializeApp,
  type FirebaseApp,
} from 'firebase/app';
import {
  connectAuthEmulator,
  getAuth,
  type Auth,
} from 'firebase/auth';
import {
  connectFirestoreEmulator,
  getFirestore,
  initializeFirestore,
  persistentLocalCache,
  persistentMultipleTabManager,
  type Firestore,
} from 'firebase/firestore';
import {
  initializeAppCheck,
  ReCaptchaV3Provider,
  type AppCheck,
} from 'firebase/app-check';

const yapilandirma = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
};

const emulatorAcik = process.env.NEXT_PUBLIC_USE_EMULATOR === '1';

let _app: FirebaseApp | null = null;
let _auth: Auth | null = null;
let _db: Firestore | null = null;
let _appCheck: AppCheck | null = null;
let _emulatorBaglandi = false;

const baslat = (): FirebaseApp => {
  if (_app) return _app;
  _app = getApps().length ? getApp() : initializeApp(yapilandirma);

  if (typeof window !== 'undefined' && !emulatorAcik && !_appCheck) {
    const siteKey = process.env.NEXT_PUBLIC_APPCHECK_SITE_KEY;
    if (siteKey) {
      try {
        _appCheck = initializeAppCheck(_app, {
          provider: new ReCaptchaV3Provider(siteKey),
          isTokenAutoRefreshEnabled: true,
        });
      } catch (e) {
        console.warn('[questo] AppCheck başlatılamadı:', e);
      }
    }
  }
  return _app;
};

const emulatoraBagla = (auth: Auth, db: Firestore) => {
  if (_emulatorBaglandi || !emulatorAcik) return;
  if (typeof window === 'undefined') return;
  // Sayfayı serve eden host'a göre emulator host'unu seç:
  // localhost → emulator localhost'ta
  // 192.168.x.x (telefon LAN) → emulator aynı IP üzerinden
  //
  // 'localhost' Windows'ta IPv6 (::1) çözülebilir; emulator IPv4 (0.0.0.0)
  // dinler → client ::1'e bağlanmaya çalışıp SESSİZCE başarısız olur ve
  // onSnapshot canlı veriyi alamaz (eski/cache veri görünür). Sunucu zaten
  // FIRESTORE_EMULATOR_HOST=127.0.0.1 kullanıyor; client da aynı IPv4'e bağlansın.
  const hamHost = window.location.hostname || 'localhost';
  const host = hamHost === 'localhost' ? '127.0.0.1' : hamHost;
  try {
    connectAuthEmulator(auth, `http://${host}:9099`, {
      disableWarnings: true,
    });
    connectFirestoreEmulator(db, host, 8080);
    _emulatorBaglandi = true;
    console.log(`[questo] Emulator bağlantısı kuruldu → ${host}`);
  } catch (e) {
    console.warn('[questo] Emulator bağlantısı başarısız:', e);
  }
};

export const getClientApp = (): FirebaseApp => baslat();

const firestoreOlustur = (app: FirebaseApp): Firestore => {
  // SSR ortamında IndexedDB yok — bu blok yalnızca client'ta çalışır.
  // initializeFirestore yalnızca ilk kez çağrılabilir; ikinci çağrıda
  // hata atar, bu yüzden try/catch ile getFirestore fallback.
  if (typeof window === 'undefined') return getFirestore(app);

  // Emulator modunda KALICI cache KULLANMA (varsayılan bellek-içi cache).
  // Neden: emulator verisi sıfırlanıp yeniden seed'lenince (örn. "Demo Veriyi
  // Yukle.bat") ürünler YENİ otomatik id alır; eski id'ler silinir. Kalıcı
  // IndexedDB cache eski ürünleri göstermeye devam edebilir → garson o ürünü
  // sipariş eder ama sunucu emulator'de o id'yi BULAMAZ ("Ürün bulunamadı").
  // Yerel emulator zaten aynı makinede; offline cache'in pratik faydası yok.
  if (emulatorAcik) return getFirestore(app);

  try {
    return initializeFirestore(app, {
      localCache: persistentLocalCache({
        tabManager: persistentMultipleTabManager(),
      }),
    });
  } catch {
    return getFirestore(app);
  }
};

const tumServisleriHazirla = () => {
  if (!_auth) _auth = getAuth(baslat());
  if (!_db) _db = firestoreOlustur(baslat());
  if (emulatorAcik && !_emulatorBaglandi) {
    emulatoraBagla(_auth, _db);
  }
};

export const getClientAuth = (): Auth => {
  tumServisleriHazirla();
  return _auth!;
};

export const getClientDb = (): Firestore => {
  tumServisleriHazirla();
  return _db!;
};
