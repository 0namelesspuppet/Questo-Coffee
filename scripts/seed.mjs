// Demo veri seed script'i — Questo Coffea Co. spec datası.
//
// Kullanım:
//   node --env-file=.env.local scripts/seed.mjs
//
// Emulator modunda (FIRESTORE_EMULATOR_HOST set) mevcut menü temizlenir.

import { initializeApp, cert, getApps } from 'firebase-admin/app';
import { getFirestore, FieldValue } from 'firebase-admin/firestore';
import { getAuth } from 'firebase-admin/auth';
import { customAlphabet } from 'nanoid';

const restoranId = process.env.NEXT_PUBLIC_RESTORAN_ID;
if (!restoranId) {
  console.error('✗ NEXT_PUBLIC_RESTORAN_ID eksik (.env.local).');
  process.exit(1);
}

const emulatorHost = process.env.FIRESTORE_EMULATOR_HOST;
const projectId =
  process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID ?? 'demo-questo';

if (getApps().length === 0) {
  if (emulatorHost) {
    initializeApp({ projectId });
    console.log(`• Emulator: ${emulatorHost}`);
  } else {
    const inline = process.env.FIREBASE_SERVICE_ACCOUNT;
    const path = process.env.FIREBASE_SERVICE_ACCOUNT_PATH;
    let sa = inline && inline.trim().length > 0 ? inline : null;
    if (!sa && path && path.trim().length > 0) {
      const { readFileSync } = await import('node:fs');
      const { resolve } = await import('node:path');
      sa = readFileSync(resolve(path), 'utf8');
    }
    if (!sa) {
      console.error(
        '✗ FIREBASE_SERVICE_ACCOUNT veya FIREBASE_SERVICE_ACCOUNT_PATH eksik.',
      );
      process.exit(1);
    }
    const parsed = JSON.parse(sa);
    initializeApp({
      credential: cert({
        projectId: parsed.project_id,
        clientEmail: parsed.client_email,
        privateKey: parsed.private_key.replace(/\\n/g, '\n'),
      }),
    });
    console.log(`• Production project: ${parsed.project_id}`);
  }
}

const db = getFirestore();
const auth = getAuth();
const baseRef = db.collection('restoranlar').doc(restoranId);

const uretToken = customAlphabet(
  '0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz',
  22,
);

// ── Spec'in opsiyon şablonları ────────────────────────────────────────
const OPT_SUT = {
  id: 'sut',
  ad: 'Süt',
  tip: 'tek',
  zorunlu: true,
  secenekler: [
    { id: 'inek', ad: 'İnek sütü', ekFiyatKurus: 0 },
    { id: 'yulaf', ad: 'Yulaf sütü', ekFiyatKurus: 1000 },
    { id: 'badem', ad: 'Badem sütü', ekFiyatKurus: 1000 },
    { id: 'soya', ad: 'Soya sütü', ekFiyatKurus: 1000 },
  ],
};

const OPT_SEKER = {
  id: 'seker',
  ad: 'Şeker',
  tip: 'tek',
  zorunlu: true,
  secenekler: [
    { id: 'sade', ad: 'Sade', ekFiyatKurus: 0 },
    { id: 'az', ad: 'Az şekerli', ekFiyatKurus: 0 },
    { id: 'orta', ad: 'Orta şekerli', ekFiyatKurus: 0 },
    { id: 'sek', ad: 'Şekerli', ekFiyatKurus: 0 },
  ],
};

// ── Kategoriler ───────────────────────────────────────────────────────
const KATEGORILER = [
  { ad: 'Patso',                 sira: 1  },
  { ad: 'Tostlar',               sira: 2  },
  { ad: 'Burger',                sira: 3  },
  { ad: 'Yarım Ekmek & Kumru',   sira: 4  },
  { ad: 'Sepetler',              sira: 5  },
  { ad: 'Çıtır',                 sira: 6  },
  { ad: 'Makarnalar',            sira: 7  },
  { ad: 'Kahve',                 sira: 8  },
  { ad: 'Sıcak İçecekler',       sira: 9  },
  { ad: 'Fresh',                 sira: 10 },
  { ad: 'Çay',                   sira: 11 },
  { ad: 'Soğuk İçecekler',       sira: 12 },
];

// ── Ürünler (fiyatlar TRY → kuruş) ────────────────────────────────────
const URUNLER = [
  // ── Patso ─────────────────────────────────────────────────────────
  { ad: 'Sade Patso',     kat: 'Patso', fiyatKurus:  9500, sira: 1, aciklama: 'Çıtır patates kızartması ve özel baharatlı karışım.' },
  { ad: 'Sucuklu Patso',  kat: 'Patso', fiyatKurus: 11000, sira: 2, aciklama: 'Patates ve soğanın üzerinde sucuk ve sos uyumu.' },
  { ad: 'Sosisli Patso',  kat: 'Patso', fiyatKurus: 11000, sira: 3, aciklama: 'Çıtır patates ve sosisle doyurucu birleşim.' },
  { ad: 'Salamlı Patso',  kat: 'Patso', fiyatKurus: 11000, sira: 4, aciklama: 'Patates kızartması ve salam ile klasik lezzetler.' },
  { ad: 'Karışık Patso',  kat: 'Patso', fiyatKurus: 12500, sira: 5, aciklama: 'Sucuk, sosis ve salamın harmonik bir araya gelişi.', sefOnerisi: true },
  { ad: 'Mega Patso',     kat: 'Patso', fiyatKurus: 14500, sira: 6, aciklama: '1 porsiyon ekstra patates ile büyük patso keyfi.' },

  // ── Tostlar ───────────────────────────────────────────────────────
  { ad: 'Kaşarlı Tost',           kat: 'Tostlar', fiyatKurus: 12000, sira: 1  },
  { ad: 'Sucuk Kaşar Tost',       kat: 'Tostlar', fiyatKurus: 13500, sira: 2  },
  { ad: 'Salamlı Tost',           kat: 'Tostlar', fiyatKurus: 13000, sira: 3  },
  { ad: 'Karışık Tost',           kat: 'Tostlar', fiyatKurus: 14500, sira: 4  },
  { ad: 'Double Karışık Tost',    kat: 'Tostlar', fiyatKurus: 16500, sira: 5  },
  { ad: 'Triple Tost',            kat: 'Tostlar', fiyatKurus: 19000, sira: 6  },
  { ad: 'Cheddarlı Tost',         kat: 'Tostlar', fiyatKurus: 12000, sira: 7  },
  { ad: 'Cheddarlı Karışık Tost', kat: 'Tostlar', fiyatKurus: 14500, sira: 8  },
  { ad: 'Triple Cheddar',         kat: 'Tostlar', fiyatKurus: 18000, sira: 9  },
  { ad: 'Bazlama Tost',           kat: 'Tostlar', fiyatKurus: 16000, sira: 10, aciklama: 'Tiftikli, kaşarlı, bal-mayonezli.' },

  // ── Burger ────────────────────────────────────────────────────────
  { ad: 'Tavuk Burger',        kat: 'Burger', fiyatKurus: 16000, sira: 1 },
  { ad: 'Double Tavuk Burger', kat: 'Burger', fiyatKurus: 20000, sira: 2 },
  { ad: 'Crispy Burger',       kat: 'Burger', fiyatKurus: 21000, sira: 3 },
  { ad: 'Hamburger',           kat: 'Burger', fiyatKurus: 24500, sira: 4 },
  { ad: 'Cheeseburger',        kat: 'Burger', fiyatKurus: 25500, sira: 5, aciklama: 'Dana köfte ile bol peynirli çıtır burger.' },
  { ad: 'Barbekü Burger',      kat: 'Burger', fiyatKurus: 25500, sira: 6, aciklama: 'Barbekü soslu dana köfte, soğan, turşu.' },
  { ad: 'Double Crispy Burger',kat: 'Burger', fiyatKurus: 25500, sira: 7 },
  { ad: 'Double Cheese Burger',kat: 'Burger', fiyatKurus: 34000, sira: 8, aciklama: 'Çift dana köfte, çift peynir.', sefOnerisi: true },

  // ── Yarım Ekmek & Kumru ───────────────────────────────────────────
  { ad: 'Yarım Ekmek Köfte', kat: 'Yarım Ekmek & Kumru', fiyatKurus: 16000, sira: 1 },
  { ad: 'Yarım Ekmek Sucuk', kat: 'Yarım Ekmek & Kumru', fiyatKurus: 16000, sira: 2 },
  { ad: 'Kumru',             kat: 'Yarım Ekmek & Kumru', fiyatKurus: 14000, sira: 3, aciklama: 'Özel kumru ekmeğinde sucuk, salam ve kaşar peyniri.' },
  { ad: 'Double Kumru',      kat: 'Yarım Ekmek & Kumru', fiyatKurus: 18000, sira: 4, aciklama: 'Çift porsiyon malzemeyle daha doyurucu kumru.' },

  // ── Sepetler ──────────────────────────────────────────────────────
  { ad: 'Çıtır Tavuk Sepeti', kat: 'Sepetler', fiyatKurus: 15000, sira: 1, aciklama: 'Altın renki çıtır tavuk parçaları.' },
  { ad: 'Çıtır Kanat Sepeti', kat: 'Sepetler', fiyatKurus: 16000, sira: 2, aciklama: 'Baharatlı çıtır tavuk kanatları.', sefOnerisi: true },
  { ad: 'Sosis Sepeti',       kat: 'Sepetler', fiyatKurus: 13000, sira: 3, aciklama: 'Kızarmış sosislerle pratik bir sepet.' },
  { ad: 'Doyum Sepeti',       kat: 'Sepetler', fiyatKurus: 17500, sira: 4, aciklama: 'Karışık ürünlerle hazırlanmış bol porsiyon.' },
  { ad: 'Patates Sepeti',     kat: 'Sepetler', fiyatKurus: 11000, sira: 5, aciklama: 'Patates kızartması.' },

  // ── Çıtır ─────────────────────────────────────────────────────────
  { ad: '500 gr Çıtır Tavuk',         kat: 'Çıtır', fiyatKurus: 28000, sira: 1 },
  { ad: '1 kg Çıtır Tavuk',           kat: 'Çıtır', fiyatKurus: 50000, sira: 2 },
  { ad: '500 gr Çıtır Kanat',         kat: 'Çıtır', fiyatKurus: 35000, sira: 3 },

  // ── Makarnalar ────────────────────────────────────────────────────
  { ad: 'Alfredo',             kat: 'Makarnalar', fiyatKurus: 16000, sira: 1 },
  { ad: 'Karbonara',           kat: 'Makarnalar', fiyatKurus: 16000, sira: 2 },
  { ad: 'Domates Soslu',       kat: 'Makarnalar', fiyatKurus: 18000, sira: 3 },
  { ad: 'Kremalı Mantarlı',    kat: 'Makarnalar', fiyatKurus: 18000, sira: 4 },
  { ad: 'Tavuklu',             kat: 'Makarnalar', fiyatKurus: 18000, sira: 5 },
  { ad: 'Penne Arrabbiata',    kat: 'Makarnalar', fiyatKurus: 18000, sira: 6 },
  { ad: 'Penne Somon',         kat: 'Makarnalar', fiyatKurus: 18000, sira: 7 },
  { ad: 'Bucatini',            kat: 'Makarnalar', fiyatKurus: 18000, sira: 8 },
  { ad: 'Cafe de Paris',       kat: 'Makarnalar', fiyatKurus: 18000, sira: 9, aciklama: 'Özel cafe de paris sosuyla hazırlanmış makarna.' },

  // ── Kahve ─────────────────────────────────────────────────────────
  { ad: 'Americano',    kat: 'Kahve', fiyatKurus: 10000, sira: 1 },
  { ad: 'Espresso',     kat: 'Kahve', fiyatKurus:  6500, sira: 2, aciklama: 'Tek shot.' },
  { ad: 'Espresso Double', kat: 'Kahve', fiyatKurus: 8500, sira: 3, aciklama: 'Çift shot.' },
  { ad: 'Cortado',      kat: 'Kahve', fiyatKurus: 10000, sira: 4 },
  { ad: 'Cappuccino',   kat: 'Kahve', fiyatKurus: 13000, sira: 5, opsiyonGruplari: [OPT_SUT] },
  { ad: 'Flat White',   kat: 'Kahve', fiyatKurus: 15000, sira: 6 },
  { ad: 'Latte',        kat: 'Kahve', fiyatKurus: 15000, sira: 7, opsiyonGruplari: [OPT_SUT] },
  { ad: 'Türk Kahvesi', kat: 'Kahve', fiyatKurus:  7000, sira: 8, opsiyonGruplari: [OPT_SEKER] },

  { ad: 'Bico Latte',           kat: 'Kahve', fiyatKurus: 16000, sira: 9,  altKategori: 'Aromatik Latte' },
  { ad: 'Toffee Nut Latte',     kat: 'Kahve', fiyatKurus: 16000, sira: 10, altKategori: 'Aromatik Latte' },
  { ad: 'Pecan Latte',          kat: 'Kahve', fiyatKurus: 16000, sira: 11, altKategori: 'Aromatik Latte' },
  { ad: 'Pumpkin Spice Latte',  kat: 'Kahve', fiyatKurus: 16000, sira: 12, altKategori: 'Aromatik Latte' },
  { ad: 'Cookie Latte',         kat: 'Kahve', fiyatKurus: 16000, sira: 13, altKategori: 'Aromatik Latte' },
  { ad: 'Salted Caramel Latte', kat: 'Kahve', fiyatKurus: 16000, sira: 14, altKategori: 'Aromatik Latte', sefOnerisi: true },
  { ad: 'Irish Latte',          kat: 'Kahve', fiyatKurus: 16000, sira: 15, altKategori: 'Aromatik Latte' },
  { ad: 'Mocha',                kat: 'Kahve', fiyatKurus: 16000, sira: 16, altKategori: 'Mocha' },
  { ad: 'White Mocha',          kat: 'Kahve', fiyatKurus: 16000, sira: 17, altKategori: 'Mocha' },
  { ad: 'Dark Mocha',           kat: 'Kahve', fiyatKurus: 16000, sira: 18, altKategori: 'Mocha' },

  // ── Sıcak İçecekler ───────────────────────────────────────────────
  { ad: 'Sahlep',          kat: 'Sıcak İçecekler', fiyatKurus: 12000, sira: 1 },
  { ad: 'Sıcak Çikolata',  kat: 'Sıcak İçecekler', fiyatKurus: 12000, sira: 2 },
  { ad: 'Beyaz Çikolata',  kat: 'Sıcak İçecekler', fiyatKurus: 12000, sira: 3 },
  { ad: 'Bardak Çikolata', kat: 'Sıcak İçecekler', fiyatKurus: 14000, sira: 4 },

  // ── Fresh ─────────────────────────────────────────────────────────
  { ad: 'Orange Mango',      kat: 'Fresh', fiyatKurus: 15000, sira: 1 },
  { ad: 'Cool Lime',         kat: 'Fresh', fiyatKurus: 15000, sira: 2 },
  { ad: 'Berry Hibiscus',    kat: 'Fresh', fiyatKurus: 15000, sira: 3 },
  { ad: 'Passion Fruit Mango', kat: 'Fresh', fiyatKurus: 15000, sira: 4 },
  { ad: 'Manta Cubano',      kat: 'Fresh', fiyatKurus: 15000, sira: 5 },

  // ── Çay ───────────────────────────────────────────────────────────
  { ad: 'Bardak Çay',   kat: 'Çay', fiyatKurus:  3000, sira: 1 },
  { ad: 'Fincan Çay',   kat: 'Çay', fiyatKurus:  5000, sira: 2 },
  { ad: 'Ihlamur',      kat: 'Çay', fiyatKurus:  8000, sira: 3 },
  { ad: 'Nane Limon',   kat: 'Çay', fiyatKurus: 10000, sira: 4 },
  { ad: 'Hibiskus',     kat: 'Çay', fiyatKurus: 10000, sira: 5 },
  { ad: 'Kuşburnu',     kat: 'Çay', fiyatKurus:  3500, sira: 6 },
  { ad: 'Kivi',         kat: 'Çay', fiyatKurus:  3500, sira: 7 },
  { ad: 'Muz',          kat: 'Çay', fiyatKurus:  3500, sira: 8 },
  { ad: 'Karadut',      kat: 'Çay', fiyatKurus:  3500, sira: 9 },
  { ad: 'Prenses',      kat: 'Çay', fiyatKurus:  3500, sira: 10 },

  // ── Soğuk İçecekler ───────────────────────────────────────────────
  { ad: 'Gazoz',        kat: 'Soğuk İçecekler', fiyatKurus:  6000, sira: 1 },
  { ad: 'Fuse Tea',     kat: 'Soğuk İçecekler', fiyatKurus:  8500, sira: 2 },
  { ad: 'Coca-Cola',    kat: 'Soğuk İçecekler', fiyatKurus:  8500, sira: 3 },
  { ad: 'Fanta',        kat: 'Soğuk İçecekler', fiyatKurus:  8500, sira: 4 },
  { ad: 'Sprite',       kat: 'Soğuk İçecekler', fiyatKurus:  8500, sira: 5 },
  { ad: 'Su',           kat: 'Soğuk İçecekler', fiyatKurus:  2000, sira: 6 },
  { ad: 'Soda',         kat: 'Soğuk İçecekler', fiyatKurus:  4000, sira: 7 },
  { ad: 'Meyveli Soda', kat: 'Soğuk İçecekler', fiyatKurus:  8000, sira: 8 },
  { ad: 'Churchill',    kat: 'Soğuk İçecekler', fiyatKurus:  8500, sira: 9 },
  { ad: 'Redbull',      kat: 'Soğuk İçecekler', fiyatKurus: 11000, sira: 10 },
];

// 15 masa: "Masa 1" .. "Masa 15"
const MASALAR = Array.from({ length: 15 }, (_, i) => `Masa ${i + 1}`);

// ── Helpers ────────────────────────────────────────────────────────────
const koleksiyonuBosalt = async (koleksiyon) => {
  const snap = await baseRef.collection(koleksiyon).get();
  if (snap.empty) return 0;
  const batch = db.batch();
  snap.docs.forEach((d) => batch.delete(d.ref));
  await batch.commit();
  return snap.size;
};

const main = async () => {
  console.log(`Seed başlıyor → restoranlar/${restoranId}\n`);

  // Idempotent: emulator modunda menü zaten doluysa yeniden seed etme.
  // Aksi halde her açılışta masalar silinip yeniden eklenir => masa token'ları
  // (QR kodları) değişir ve basılı QR'lar bozulur. Zorla yeniden yüklemek için
  // SEED_FORCE=1 (bkz. "Demo Veriyi Yukle.bat").
  const zorla = process.env.SEED_FORCE === '1';
  if (emulatorHost && !zorla) {
    const mevcut = await baseRef.collection('urunler').limit(1).get();
    if (!mevcut.empty) {
      console.log(
        '• Menü zaten dolu — demo veri atlandı (yeniden yüklemek için "Demo Veriyi Yukle.bat").',
      );
      console.log('\n✓ Seed atlandı (mevcut veri korundu).');
      return;
    }
  }

  if (emulatorHost) {
    console.log('• Emulator modu — mevcut menü/masalar temizleniyor…');
    const k = await koleksiyonuBosalt('kategoriler');
    const u = await koleksiyonuBosalt('urunler');
    const m = await koleksiyonuBosalt('masalar');
    console.log(`  × ${k} kategori, ${u} urun, ${m} masa silindi\n`);
  } else {
    console.log('⚠ Production modu — mevcut veri ÜZERİNE eklenir.\n');
  }

  // Restoran meta — sahibi/şehir bilgisi
  await baseRef.set(
    {
      ad: 'Questo Coffea Co.',
      sehir: 'Manisa',
      yil: 2026,
    },
    { merge: true },
  );
  console.log('+ restoran: Questo Coffea Co. (Manisa)');

  // Kategoriler
  const katMap = {};
  for (const k of KATEGORILER) {
    const ref = await baseRef.collection('kategoriler').add({
      ad: k.ad,
      sira: k.sira,
      aktifMi: true,
      ...(k.roman ? { roman: k.roman } : {}),
      ...(k.tagline ? { tagline: k.tagline } : {}),
      ...(k.story ? { story: k.story } : {}),
      olusturulduAt: FieldValue.serverTimestamp(),
    });
    katMap[k.ad] = ref.id;
    console.log(`+ kategori: ${k.roman ?? ''} ${k.ad}`);
  }

  // Ürünler
  let urunSayisi = 0;
  for (const u of URUNLER) {
    await baseRef.collection('urunler').add({
      ad: u.ad,
      kategoriId: katMap[u.kat],
      fiyatKurus: u.fiyatKurus,
      stoktaMi: true,
      sira: u.sira,
      ...(u.aciklama ? { aciklama: u.aciklama } : {}),
      ...(u.opsiyonGruplari ? { opsiyonGruplari: u.opsiyonGruplari } : {}),
      ...(u.sefOnerisi ? { sefOnerisi: true } : {}),
      olusturulduAt: FieldValue.serverTimestamp(),
    });
    urunSayisi++;
  }
  console.log(`+ ${urunSayisi} ürün eklendi`);

  // Masalar
  for (const ad of MASALAR) {
    const token = uretToken();
    await baseRef.collection('masalar').add({
      ad,
      token,
      aktifMi: true,
      olusturulduAt: FieldValue.serverTimestamp(),
    });
  }
  console.log(`+ ${MASALAR.length} masa eklendi (M1-M${MASALAR.length})`);

  const email = process.env.SEED_SAHIP_EMAIL;
  const VARSAYILAN_SIFRE = 'questo123';
  if (email) {
    try {
      let user;
      try {
        user = await auth.getUserByEmail(email);
      } catch {
        // Kullanıcı yok — oluştur
        user = await auth.createUser({
          email,
          password: VARSAYILAN_SIFRE,
          emailVerified: true,
        });
        console.log(`+ kullanıcı oluşturuldu: ${email}  şifre: ${VARSAYILAN_SIFRE}`);
      }
      await auth.setCustomUserClaims(user.uid, {
        rol: 'kasiyer',
        sahip: true,
        restoranId,
      });
      console.log(`+ claim: ${email} → kasiyer + sahip`);
    } catch (e) {
      console.warn(
        `! ${email} için işlem başarısız: ${
          e instanceof Error ? e.message : e
        }`,
      );
    }
  }

  console.log('\n✓ Seed tamamlandı.');
  console.log(
    '\nMasaları görmek için: http://localhost:3000 (dev kısayolu kartı)',
  );
};

main().catch((e) => {
  console.error('✗ Seed hatası:', e);
  process.exit(1);
});
