import 'server-only';

import {
  FieldValue,
  Timestamp,
  type DocumentReference,
} from 'firebase-admin/firestore';
import { getAdminDb } from '@/lib/firebase/admin';
import { AppError } from '@/lib/utils/hata';
import type { SiparisIstegiT } from '@/lib/utils/zod-semalar';
import { istanbulGunId } from './sayac';

export interface SiparisYazSonuc {
  adisyonId: string;
  siparisId: string;
  gunlukNo: number;
  toplamKurus: number;
}

interface OpsiyonSecenekOkuma {
  id: string;
  ad: string;
  ekFiyatKurus: number;
}
interface OpsiyonGrubuOkuma {
  id: string;
  ad: string;
  tip: 'tek' | 'cok';
  zorunlu: boolean;
  secenekler: OpsiyonSecenekOkuma[];
}
interface UrunOkuma {
  ad: string;
  fiyatKurus: number;
  stoktaMi: boolean;
  stokMiktar?: number;
  opsiyonGruplari?: OpsiyonGrubuOkuma[];
}

interface AdisyonOkuma {
  toplamKurus: number;
  siparisSayisi: number;
}

interface SayacOkuma {
  gunlukSiparisNo: number;
}

interface RateLimitOkuma {
  pencere: number[];
}

interface IdempotencyOkuma {
  musteriUid: string;
  sonuc: SiparisYazSonuc;
}

// ── Rate limit ayarları ────────────────────────────────────────────────
const RATE_PENCERE_MS = 60_000;
const RATE_LIMIT = 10;
// ── Idempotency ──────────────────────────────────────────────────────
const IDEMPOTENCY_TTL_MS = 24 * 60 * 60 * 1000;

const restoranId = (): string => {
  const id = process.env.NEXT_PUBLIC_RESTORAN_ID;
  if (!id) throw new AppError('yapilandirma', 'Restoran tanımlı değil.', 500);
  return id;
};

/**
 * Siparişi transaction içinde yazar (kasiyer/garson).
 *
 * Güvenlik garantileri:
 * - İstemciden gelen fiyat YOKSAYILIR; fiyatlar Firestore'dan okunur.
 * - Stokta olmayan ürün → işlem tümüyle geri alınır.
 * - Günlük sıra no atomik increment ile yazılır.
 * - Açık adisyon aynı transaction'da sorgulanıp tek tutulur (yarış koşulu yok).
 * - **Rate limit:** musteriUid başına 60 saniyede en fazla 10 sipariş.
 * - **Idempotency:** opsiyonel idempotencyKey ile aynı istek tekrarlanırsa
 *   önceki sonuç döner (24 saat TTL).
 */
export interface SiparisYazSecenekler {
  /** true ise rate limit kontrolu atlanir (kasiyer/garson icin). */
  rateLimitAtla?: boolean;
}

export const siparisYaz = async (
  istek: SiparisIstegiT,
  musteriUid: string,
  idempotencyKey?: string,
  secenekler: SiparisYazSecenekler = {},
): Promise<SiparisYazSonuc> => {
  const R = restoranId();
  const db = getAdminDb();

  const masalarRef = db.collection(`restoranlar/${R}/masalar`);
  const adisyonlarRef = db.collection(`restoranlar/${R}/adisyonlar`);
  const urunlerRefBase = db.collection(`restoranlar/${R}/urunler`);
  const sayacRef = db.doc(
    `restoranlar/${R}/sayaclar/${istanbulGunId()}`,
  );
  const rateRef = secenekler.rateLimitAtla
    ? null
    : db.doc(`rateLimit/${musteriUid}`);
  const idempotencyRef = idempotencyKey
    ? db.doc(`idempotency/${idempotencyKey}`)
    : null;

  return await db.runTransaction(async (tx) => {
    // ── 1) Idempotency kontrolü ────────────────────────────────────────
    if (idempotencyRef) {
      const idemSnap = await tx.get(idempotencyRef);
      if (idemSnap.exists) {
        const data = idemSnap.data() as IdempotencyOkuma;
        if (data.musteriUid !== musteriUid) {
          throw new AppError(
            'idempotency_carpisma',
            'Bu istek anahtarı başka bir kullanıcıya ait.',
            409,
          );
        }
        return data.sonuc;
      }
    }

    // ── 2) Rate limit kontrolü ─────────────────────────────────────────
    const simdi = Date.now();
    let guncelPencere: number[] = [];
    if (rateRef) {
      const rateSnap = await tx.get(rateRef);
      const oncekiPencere = rateSnap.exists
        ? ((rateSnap.data() as RateLimitOkuma).pencere ?? [])
        : [];
      guncelPencere = oncekiPencere.filter(
        (t) => simdi - t < RATE_PENCERE_MS,
      );
      if (guncelPencere.length >= RATE_LIMIT) {
        const ilkZaman = guncelPencere[0] ?? simdi;
        const beklemeSn = Math.ceil(
          (RATE_PENCERE_MS - (simdi - ilkZaman)) / 1000,
        );
        throw new AppError(
          'rate_limit',
          `Çok sık sipariş veriyorsunuz. ${beklemeSn} saniye sonra tekrar deneyin.`,
          429,
        );
      }
    }

    // ── 3) Diğer okumalar (yazılardan önce HEPSİ) ──────────────────────
    const masaRef = masalarRef.doc(istek.masaId);
    const masaSnap = await tx.get(masaRef);
    if (!masaSnap.exists || masaSnap.data()?.aktifMi !== true) {
      throw new AppError('masa_yok', 'Masa bulunamadı veya pasif.', 404);
    }
    const masaId = masaSnap.id;

    const acikQ = adisyonlarRef
      .where('masaId', '==', masaId)
      .where('durum', '==', 'acik')
      .limit(1);
    const acikSnap = await tx.get(acikQ);

    const urunRefler: DocumentReference[] = istek.kalemler.map((k) =>
      urunlerRefBase.doc(k.urunId),
    );
    const urunSnaps = await tx.getAll(...urunRefler);

    const sayacSnap = await tx.get(sayacRef);

    // ── 4) Hesaplama ───────────────────────────────────────────────────
    // Aynı ürün birden fazla satırda istenirse stoktan toplam düşmeli
    const urunBasinaToplamAdet = new Map<string, number>();
    for (let i = 0; i < istek.kalemler.length; i++) {
      const istem = istek.kalemler[i]!;
      urunBasinaToplamAdet.set(
        istem.urunId,
        (urunBasinaToplamAdet.get(istem.urunId) ?? 0) + istem.adet,
      );
    }

    let toplamKurus = 0;
    const stokGuncellemeleri: Array<{
      ref: DocumentReference;
      yeniMiktar: number;
    }> = [];
    const stokKayitlandi = new Set<string>();

    const kalemler = urunSnaps.map((s, i) => {
      const istem = istek.kalemler[i]!;
      if (!s.exists) {
        throw new AppError(
          'urun_yok',
          `Ürün bulunamadı: ${istem.urunId}`,
          400,
        );
      }
      const u = s.data() as UrunOkuma;
      if (!u.stoktaMi) {
        throw new AppError('stok_yok', `Stokta yok: ${u.ad}`, 409);
      }

      // Sayısal stok kontrolü (varsa). Aynı ürün birden fazla satırda
      // olsa bile toplam adet üzerinden tek seferlik karşılaştır.
      if (typeof u.stokMiktar === 'number') {
        const istenenToplam = urunBasinaToplamAdet.get(s.id) ?? 0;
        if (istenenToplam > u.stokMiktar) {
          throw new AppError(
            'stok_yetmez',
            `${u.ad}: yalnız ${u.stokMiktar} adet kaldı.`,
            409,
          );
        }
        if (!stokKayitlandi.has(s.id)) {
          stokGuncellemeleri.push({
            ref: urunlerRefBase.doc(s.id),
            yeniMiktar: u.stokMiktar - istenenToplam,
          });
          stokKayitlandi.add(s.id);
        }
      }

      // ── Modifier (opsiyon) doğrulama + ek fiyat hesabı ──────────────
      const opGruplari = u.opsiyonGruplari ?? [];
      const secimMap = new Map(
        (istem.secimler ?? []).map((sec) => [sec.grupId, sec.secenekIds]),
      );
      let ekFiyat = 0;
      const secimSnapshot: Array<{
        grupAd: string;
        secenekler: Array<{ ad: string; ekFiyatKurus: number }>;
      }> = [];

      for (const grup of opGruplari) {
        const seciliIds = secimMap.get(grup.id) ?? [];
        if (grup.zorunlu && seciliIds.length === 0) {
          throw new AppError(
            'opsiyon_eksik',
            `${u.ad}: "${grup.ad}" seçimi zorunlu.`,
            400,
          );
        }
        if (grup.tip === 'tek' && seciliIds.length > 1) {
          throw new AppError(
            'opsiyon_gecersiz',
            `${u.ad} → ${grup.ad}: yalnız bir seçim olabilir.`,
            400,
          );
        }
        const secilenler = grup.secenekler.filter((sc) =>
          seciliIds.includes(sc.id),
        );
        if (secilenler.length !== seciliIds.length) {
          throw new AppError(
            'opsiyon_gecersiz',
            `${u.ad} → ${grup.ad}: bilinmeyen seçenek.`,
            400,
          );
        }
        for (const sc of secilenler) ekFiyat += sc.ekFiyatKurus;
        if (secilenler.length > 0) {
          secimSnapshot.push({
            grupAd: grup.ad,
            secenekler: secilenler.map((sc) => ({
              ad: sc.ad,
              ekFiyatKurus: sc.ekFiyatKurus,
            })),
          });
        }
      }

      const birimFiyat = u.fiyatKurus + ekFiyat;
      const araToplamKurus = birimFiyat * istem.adet;
      toplamKurus += araToplamKurus;

      return {
        urunId: s.id,
        ad: u.ad,
        birimFiyatKurus: birimFiyat,
        adet: istem.adet,
        ...(istem.notlar ? { notlar: istem.notlar } : {}),
        ...(secimSnapshot.length > 0 ? { secimler: secimSnapshot } : {}),
        araToplamKurus,
      };
    });

    const mevcutAdisyon = acikSnap.empty ? null : acikSnap.docs[0]!;
    const adisyonRef = mevcutAdisyon
      ? mevcutAdisyon.ref
      : adisyonlarRef.doc();

    const oncekiNo = sayacSnap.exists
      ? (sayacSnap.data() as SayacOkuma).gunlukSiparisNo
      : 0;
    const gunlukNo = oncekiNo + 1;

    const simdiTs = FieldValue.serverTimestamp();

    // ── 5) Yazımlar ────────────────────────────────────────────────────
    if (mevcutAdisyon) {
      const m = mevcutAdisyon.data() as AdisyonOkuma;
      tx.update(adisyonRef, {
        toplamKurus: m.toplamKurus + toplamKurus,
        siparisSayisi: m.siparisSayisi + 1,
      });
    } else {
      tx.set(adisyonRef, {
        masaId,
        durum: 'acik',
        toplamKurus,
        acilisAt: simdiTs,
        siparisSayisi: 1,
      });
    }

    tx.set(sayacRef, { gunlukSiparisNo: gunlukNo }, { merge: true });

    const siparisRef = adisyonRef.collection('siparisler').doc();
    tx.set(siparisRef, {
      adisyonId: adisyonRef.id,
      masaId,
      musteriUid,
      gunlukNo,
      kalemler,
      toplamKurus,
      durum: 'yeni',
      durumTarihleri: { yeni: simdiTs },
      olusturulduAt: simdiTs,
      ...(istek.musteriAd ? { musteriAd: istek.musteriAd } : {}),
    });

    // Stok düşürme (varsa). 0'a düşerse stoktaMi otomatik false.
    for (const g of stokGuncellemeleri) {
      tx.update(g.ref, {
        stokMiktar: g.yeniMiktar,
        ...(g.yeniMiktar === 0 ? { stoktaMi: false } : {}),
      });
    }

    // Rate limit penceresini guncelle (varsa)
    if (rateRef) {
      tx.set(rateRef, { pencere: [...guncelPencere, simdi] }, { merge: true });
    }

    const sonuc: SiparisYazSonuc = {
      adisyonId: adisyonRef.id,
      siparisId: siparisRef.id,
      gunlukNo,
      toplamKurus,
    };

    // Idempotency doc'unu yaz (TTL field ile)
    if (idempotencyRef) {
      tx.set(idempotencyRef, {
        musteriUid,
        sonuc,
        expireAt: Timestamp.fromMillis(simdi + IDEMPOTENCY_TTL_MS),
      });
    }

    return sonuc;
  });
};
