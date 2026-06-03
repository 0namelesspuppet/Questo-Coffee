import { FieldValue } from 'firebase-admin/firestore';
import { apiKasiyer } from '@/lib/auth/guard';
import { getAdminDb } from '@/lib/firebase/admin';
import { AppError, httpHata } from '@/lib/utils/hata';
import { OdemeTalebiIstegi } from '@/lib/utils/zod-semalar';
import { esitOdemeTutariHesapla, odenmisTutarKurus } from '@/lib/siparis/odeme';

export const runtime = 'nodejs';

const R = (): string => {
  const id = process.env.NEXT_PUBLIC_RESTORAN_ID;
  if (!id) throw new AppError('yapilandirma', 'Restoran tanımlı değil.', 500);
  return id;
};

export async function POST(
  req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const u = await apiKasiyer();
    const restoranId = R();
    if (u.claims.restoranId !== restoranId) {
      throw new AppError('yetkisiz', 'Restoran kapsamı uyuşmuyor.', 403);
    }

    const body = OdemeTalebiIstegi.parse(await req.json());
    const { id: adisyonId } = await params;
    const db = getAdminDb();

    const aRef = db.doc(`restoranlar/${restoranId}/adisyonlar/${adisyonId}`);
    const aSnap = await aRef.get();
    if (!aSnap.exists) {
      throw new AppError('adisyon_yok', 'Adisyon bulunamadı.', 404);
    }
    const adisyon = aSnap.data() as { durum: string; toplamKurus: number };
    if (adisyon.durum !== 'acik') {
      throw new AppError('adisyon_kapali', 'Adisyon açık değil.', 409);
    }

    // Kalan-farkındalı hesaplama
    const odenmis = await odenmisTutarKurus(aRef);
    const kalan = Math.max(0, adisyon.toplamKurus - odenmis);
    if (kalan <= 0) {
      throw new AppError(
        'tamamen_odendi',
        'Adisyon zaten tamamen ödenmiş.',
        409,
      );
    }

    let toplamKurus: number;
    let extra: Record<string, unknown> = {};

    if (body.yontem === 'esit') {
      // Bölünecek taban: istemci kısmi ödeme sonrası kalan tutarı gönderebilir;
      // gönderilmezse genel toplam kullanılır. Genel toplamı aşamaz.
      const taban =
        body.tabanKurus != null
          ? Math.min(body.tabanKurus, adisyon.toplamKurus)
          : adisyon.toplamKurus;
      toplamKurus = esitOdemeTutariHesapla(taban, body.kisiSayisi, kalan);
      extra = { kisiSayisi: body.kisiSayisi, kisiPayi: toplamKurus };
    } else if (body.yontem === 'urun') {
      const secimToplam = body.secilenKalemler.reduce(
        (acc, k) => acc + k.araToplamKurus,
        0,
      );
      toplamKurus = Math.min(secimToplam, kalan);
      extra = { secilenKalemler: body.secilenKalemler };
    } else {
      // 'tam' — adisyonun KALAN tutarı (toplam değil!)
      toplamKurus = kalan;
    }

    const talepRef = aRef.collection('odemeTalepleri').doc();
    await talepRef.set({
      adisyonId,
      yontem: body.yontem,
      toplamKurus,
      ...extra,
      ...(body.musteriAd ? { musteriAd: body.musteriAd } : {}),
      durum: 'odendi',
      kaynak: 'kasiyer',
      kasiyerUid: u.uid,
      olusturulduAt: FieldValue.serverTimestamp(),
    });

    return Response.json({ ok: true, talepId: talepRef.id, toplamKurus });
  } catch (e) {
    return httpHata(e);
  }
}
