import { z } from 'zod';
import { FieldValue } from 'firebase-admin/firestore';
import { apiKasiyer } from '@/lib/auth/guard';
import { getAdminDb } from '@/lib/firebase/admin';
import { AppError, httpHata } from '@/lib/utils/hata';
import { DurumGirdi } from '@/lib/utils/zod-semalar';
import type { SiparisDurumu } from '@/types/model';

export const runtime = 'nodejs';

const Govde = DurumGirdi.extend({
  adisyonId: z.string().min(1).max(64),
});

const IZIN: Record<SiparisDurumu, SiparisDurumu[]> = {
  yeni: ['hazirlaniyor', 'iptal'],
  hazirlaniyor: ['hazir', 'iptal'],
  hazir: ['teslim'],
  teslim: [],
  iptal: [],
};

const restoranId = (): string => {
  const id = process.env.NEXT_PUBLIC_RESTORAN_ID;
  if (!id) throw new AppError('yapilandirma', 'Restoran tanımlı değil.', 500);
  return id;
};

export async function PATCH(
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
    const body = Govde.parse(await req.json());

    const db = getAdminDb();
    const sRef = db.doc(
      `restoranlar/${R}/adisyonlar/${body.adisyonId}/siparisler/${id}`,
    );
    const aRef = db.doc(`restoranlar/${R}/adisyonlar/${body.adisyonId}`);

    await db.runTransaction(async (tx) => {
      // ── Okumalar ───────────────────────────────────────────────────
      const sSnap = await tx.get(sRef);
      if (!sSnap.exists) {
        throw new AppError('siparis_yok', 'Sipariş bulunamadı.', 404);
      }
      const mevcut = sSnap.data() as {
        durum: SiparisDurumu;
        toplamKurus: number;
        kalemler?: Array<{ urunId: string; adet: number }>;
      };
      const izin = IZIN[mevcut.durum];
      if (!izin.includes(body.durum)) {
        throw new AppError(
          'gecersiz_durum',
          `${mevcut.durum} → ${body.durum} geçişine izin yok.`,
          400,
        );
      }

      let adisyonGuncelle: {
        toplamKurus: number;
        siparisSayisi: number;
      } | null = null;

      const stokGeriAlim: Array<{
        ref: FirebaseFirestore.DocumentReference;
        miktar: number;
        yenidenAc: boolean;
      }> = [];

      if (body.durum === 'iptal') {
        const aSnap = await tx.get(aRef);
        if (aSnap.exists) {
          const a = aSnap.data() as {
            toplamKurus: number;
            siparisSayisi: number;
          };
          const yeniToplam = Math.max(0, a.toplamKurus - mevcut.toplamKurus);

          // Ödenmiş tutarın altına düşemez — ödeme yapılmışsa iptal yasak
          const odenenSnap = await tx.get(
            aRef.collection('odemeTalepleri').where('durum', '==', 'odendi'),
          );
          const odenen = odenenSnap.docs.reduce(
            (acc, d) =>
              acc + ((d.data() as { toplamKurus?: number }).toplamKurus ?? 0),
            0,
          );
          if (yeniToplam < odenen) {
            throw new AppError(
              'odeme_yapilmis',
              `Bu siparişi iptal etmek adisyon toplamını (${yeniToplam}kr) ödenen tutarın (${odenen}kr) altına düşürür. İptal yasak.`,
              409,
            );
          }

          adisyonGuncelle = {
            toplamKurus: yeniToplam,
            siparisSayisi: Math.max(0, a.siparisSayisi - 1),
          };
        }

        // Stok geri al — kalemler içindeki ürünleri oku, stokMiktar varsa ekle
        if (mevcut.kalemler && mevcut.kalemler.length > 0) {
          const istenenMap = new Map<string, number>();
          for (const k of mevcut.kalemler) {
            istenenMap.set(
              k.urunId,
              (istenenMap.get(k.urunId) ?? 0) + k.adet,
            );
          }
          for (const [urunId, adet] of istenenMap.entries()) {
            const uRef = db.doc(`restoranlar/${R}/urunler/${urunId}`);
            const uSnap = await tx.get(uRef);
            if (!uSnap.exists) continue;
            const ud = uSnap.data() as { stokMiktar?: number };
            if (typeof ud.stokMiktar === 'number') {
              stokGeriAlim.push({
                ref: uRef,
                miktar: ud.stokMiktar + adet,
                // Yalnızca stok 0'a düşüp OTOMATİK kapandıysa yeniden aç; stok
                // zaten >0 iken manuel 'satışa kapat' kararını ezme.
                yenidenAc: ud.stokMiktar === 0,
              });
            }
          }
        }
      }

      // ── Yazımlar ───────────────────────────────────────────────────
      tx.update(sRef, {
        durum: body.durum,
        [`durumTarihleri.${body.durum}`]: FieldValue.serverTimestamp(),
      });

      if (adisyonGuncelle) {
        tx.update(aRef, adisyonGuncelle);
      }

      for (const g of stokGeriAlim) {
        tx.update(g.ref, {
          stokMiktar: g.miktar,
          ...(g.yenidenAc ? { stoktaMi: true } : {}),
        });
      }
    });

    return Response.json({ ok: true });
  } catch (e) {
    return httpHata(e);
  }
}
