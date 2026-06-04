import { apiKasiyer } from '@/lib/auth/guard';
import { getAdminDb } from '@/lib/firebase/admin';
import { AppError, httpHata } from '@/lib/utils/hata';

export const runtime = 'nodejs';

const R = (): string => {
  const id = process.env.NEXT_PUBLIC_RESTORAN_ID;
  if (!id) throw new AppError('yapilandirma', 'Restoran tanımlı değil.', 500);
  return id;
};

export async function POST(
  _req: Request,
  { params }: { params: Promise<{ id: string; talepId: string }> },
) {
  try {
    const u = await apiKasiyer();
    const restoranId = R();
    if (u.claims.restoranId !== restoranId) {
      throw new AppError('yetkisiz', 'Restoran kapsamı uyuşmuyor.', 403);
    }

    const { id: adisyonId, talepId } = await params;
    const db = getAdminDb();

    const aRef = db.doc(`restoranlar/${restoranId}/adisyonlar/${adisyonId}`);
    const talepRef = aRef.collection('odemeTalepleri').doc(talepId);

    // Onaylama TEK transaction'da + aşırı-ödeme guard: bekleyen talep, kalan
    // tutar (adisyon - diğer onaylı ödemeler) içinde kalmalı.
    await db.runTransaction(async (tx) => {
      const talepSnap = await tx.get(talepRef);
      if (!talepSnap.exists) {
        throw new AppError('talep_yok', 'Ödeme talebi bulunamadı.', 404);
      }
      const talep = talepSnap.data() as {
        durum: string;
        toplamKurus?: number;
      };
      if (talep.durum !== 'bekliyor') {
        throw new AppError('talep_islendi', 'Bu talep zaten işlenmiş.', 409);
      }

      const aSnap = await tx.get(aRef);
      if (!aSnap.exists) {
        throw new AppError('adisyon_yok', 'Adisyon bulunamadı.', 404);
      }
      const adisyon = aSnap.data() as { toplamKurus?: number };
      const odenmisSnap = await tx.get(
        aRef.collection('odemeTalepleri').where('durum', '==', 'odendi'),
      );
      const odenmis = odenmisSnap.docs.reduce(
        (acc, d) =>
          acc + ((d.data() as { toplamKurus?: number }).toplamKurus ?? 0),
        0,
      );
      const kalan = Math.max(0, (adisyon.toplamKurus ?? 0) - odenmis);
      if ((talep.toplamKurus ?? 0) > kalan) {
        throw new AppError(
          'asiri_odeme',
          'Talep tutarı kalan tutarı aşıyor; onaylanmadı.',
          409,
        );
      }

      tx.update(talepRef, { durum: 'odendi' });
    });

    return Response.json({ ok: true });
  } catch (e) {
    return httpHata(e);
  }
}
