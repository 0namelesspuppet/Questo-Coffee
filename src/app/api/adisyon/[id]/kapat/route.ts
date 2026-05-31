import { FieldValue } from 'firebase-admin/firestore';
import { apiKasiyer } from '@/lib/auth/guard';
import { getAdminDb } from '@/lib/firebase/admin';
import { AppError, httpHata } from '@/lib/utils/hata';

export const runtime = 'nodejs';

const restoranId = (): string => {
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
    const R = restoranId();
    if (u.claims.restoranId !== R) {
      throw new AppError('yetkisiz', 'Restoran kapsamı uyuşmuyor.', 403);
    }

    const { id } = await params;
    const url = new URL(req.url);
    // Kasiyer açıkça "kalan parayı yok say, yine de kapat" diyorsa override
    const zorla = url.searchParams.get('zorla') === '1';

    const db = getAdminDb();
    const aRef = db.doc(`restoranlar/${R}/adisyonlar/${id}`);

    let kalanKurus = 0;

    await db.runTransaction(async (tx) => {
      const aSnap = await tx.get(aRef);
      if (!aSnap.exists) {
        throw new AppError('adisyon_yok', 'Adisyon bulunamadı.', 404);
      }
      const a = aSnap.data() as {
        durum: string;
        masaId: string;
        toplamKurus: number;
      };
      if (a.durum !== 'acik') {
        throw new AppError('zaten_kapali', 'Adisyon zaten kapalı.', 409);
      }

      // Onaylanmış ödemeleri transaction içinde topla (tutarlılık için)
      const odenenSnap = await tx.get(
        aRef.collection('odemeTalepleri').where('durum', '==', 'odendi'),
      );
      const odenen = odenenSnap.docs.reduce(
        (acc, d) =>
          acc + ((d.data() as { toplamKurus?: number }).toplamKurus ?? 0),
        0,
      );
      kalanKurus = Math.max(0, a.toplamKurus - odenen);

      if (kalanKurus > 0 && !zorla) {
        throw new AppError(
          'odenmemis_tutar',
          `Adisyonda ödenmemiş ${kalanKurus} kuruş var. Zorla kapatmak için ?zorla=1.`,
          409,
        );
      }

      tx.update(aRef, {
        durum: 'kapali',
        kapanisAt: FieldValue.serverTimestamp(),
        ...(zorla && kalanKurus > 0
          ? { zorlaKapatildi: true, zorlaKapatilanKurus: kalanKurus }
          : {}),
      });
    });

    return Response.json({
      ok: true,
      ...(zorla && kalanKurus > 0 ? { zorla: true, atlanan: kalanKurus } : {}),
    });
  } catch (e) {
    return httpHata(e);
  }
}
