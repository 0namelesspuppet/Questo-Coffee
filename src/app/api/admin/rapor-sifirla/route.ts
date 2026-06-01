import { z } from 'zod';
import { FieldValue } from 'firebase-admin/firestore';
import { Timestamp } from 'firebase-admin/firestore';
import { apiSahip } from '@/lib/auth/guard';
import { getAdminDb } from '@/lib/firebase/admin';
import { httpHata } from '@/lib/utils/hata';
import { kapsamiDogrula } from '@/lib/admin/restoran';
import { auditLogla } from '@/lib/audit/log';
import { istanbulGunAraligi } from '@/lib/siparis/sayac';

export const runtime = 'nodejs';

const Govde = z.object({
  tarih: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  // true → o günün TÜM siparişlerini rapordan çıkar (sıfırla)
  // false → o günün hariç tutulan siparişlerini rapora geri ekle (geri al)
  haric: z.boolean(),
  // Rapor sayfasının o an gösterdiği siparişlerin kesin listesi. Verilirse bu
  // belgeler doğrudan güncellenir; verilmezse güne göre collectionGroup sorgusu
  // kullanılır. Açık liste, yeni siparişlerin collectionGroup index gecikmesi
  // yüzünden atlanmasını önler (aksi halde sıfırlama eksik kalıp "ikinci tık"
  // gerektirir).
  hedefler: z
    .array(
      z.object({
        adisyonId: z.string().min(1),
        siparisId: z.string().min(1),
      }),
    )
    .optional(),
});

/**
 * Seçili günün raporunu sıfırlar (tüm siparişleri rapor dışı bırakır) ya da
 * sıfırlamayı geri alır. Sipariş/adisyon verisine dokunulmaz; yalnız her
 * siparişin `raporDisi` bayrağı toplu güncellenir. Otomatik kayıt aynen sürer.
 */
export async function POST(req: Request) {
  try {
    const u = await apiSahip();
    const R = kapsamiDogrula(u);
    const { tarih, haric, hedefler } = Govde.parse(await req.json());

    const db = getAdminDb();

    // Güncellenecek belge referansları: açık liste varsa onu kullan (rapor
    // sayfasının gösterdiği kesin küme), yoksa güne göre collectionGroup sorgusu.
    let refler: FirebaseFirestore.DocumentReference[];
    if (hedefler && hedefler.length > 0) {
      refler = hedefler.map((h) =>
        db.doc(
          `restoranlar/${R}/adisyonlar/${h.adisyonId}/siparisler/${h.siparisId}`,
        ),
      );
    } else {
      const { baslangic, bitis } = istanbulGunAraligi(tarih);
      const snap = await db
        .collectionGroup('siparisler')
        .where('olusturulduAt', '>=', Timestamp.fromDate(baslangic))
        .where('olusturulduAt', '<=', Timestamp.fromDate(bitis))
        .get();
      refler = snap.docs
        .filter((d) => d.ref.path.startsWith(`restoranlar/${R}/`))
        .map((d) => d.ref);
    }

    // 500'lük batch limiti — parça parça yaz
    let sayac = 0;
    for (let i = 0; i < refler.length; i += 450) {
      const batch = db.batch();
      for (const ref of refler.slice(i, i + 450)) {
        batch.update(ref, {
          raporDisi: haric ? true : FieldValue.delete(),
        });
        sayac++;
      }
      await batch.commit();
    }

    await auditLogla(u, R, {
      aksiyon: 'rapor.sifirla',
      kaynak: `rapor/${tarih}`,
      sonrakiVeri: { haric, etkilenen: sayac },
    });

    return Response.json({ ok: true, etkilenen: sayac });
  } catch (e) {
    return httpHata(e);
  }
}
