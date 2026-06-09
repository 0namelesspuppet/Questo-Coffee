import 'server-only';

import { FieldValue, Timestamp } from 'firebase-admin/firestore';
import { getAdminDb } from '@/lib/firebase/admin';
import { veriYedeginiTetikle } from '@/lib/firebase/kalicilik';
import type { OturumKullanicisi } from '@/lib/auth/guard';

export interface AuditKayit {
  /** Eylem adı — '<kaynak>.<işlem>' formatinda, ör. 'urun.create' */
  aksiyon: string;
  /** İlgili belge yolu veya iş kimliği */
  kaynak: string;
  oncekiVeri?: unknown;
  sonrakiVeri?: unknown;
  meta?: Record<string, unknown>;
}

/** Audit kayıtları 180 gün sonra otomatik silinsin */
const TTL_GUN = 180;
const TTL_MS = TTL_GUN * 24 * 60 * 60 * 1000;

/**
 * Admin eylemlerini denetim kaydı olarak tutar. Hata durumunda sessizce
 * loglar — denetim yazımı asıl operasyonu engellemez.
 *
 * **TTL:** Her belgeye `expireAt` Timestamp field'i yazılır. Firestore
 * Console'dan `kullaniciAksiyonlari` koleksiyonu için TTL policy
 * tanımlanmalı (Indexes → TTL → Add policy → `expireAt` field).
 * Tek seferlik kurulum sonrası eski kayıtlar otomatik temizlenir.
 */
export const auditLogla = async (
  u: OturumKullanicisi,
  restoranId: string,
  kayit: AuditKayit,
): Promise<void> => {
  try {
    await getAdminDb()
      .collection(`restoranlar/${restoranId}/kullaniciAksiyonlari`)
      .add({
        uid: u.uid,
        eposta: u.email ?? null,
        ...kayit,
        zaman: FieldValue.serverTimestamp(),
        expireAt: Timestamp.fromMillis(Date.now() + TTL_MS),
      });
  } catch (e) {
    console.error('[audit] log yazılamadı:', e);
  }

  // Bu admin yazma işlemini (menü/fiyat/kategori/masa/ayar) emulator modunda
  // hemen diske kalıcı kıl; uygulama düzgün kapatılmasa bile korunsun.
  // Production'da no-op. Audit yazımı başarısız olsa bile çalışsın diye dışarıda.
  await veriYedeginiTetikle();
};
