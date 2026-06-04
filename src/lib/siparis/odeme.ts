import type { DocumentReference } from 'firebase-admin/firestore';

/**
 * Onaylanmış (durum=odendi) ödeme taleplerinin toplam tutarı — SAF fonksiyon.
 * Firestore'dan bağımsız test edilebilir (saf çekirdek).
 */
export const odenenToplamKurus = (
  talepler: ReadonlyArray<{ durum?: string; toplamKurus?: number }>,
): number =>
  talepler
    .filter((t) => t.durum === 'odendi')
    .reduce((acc, t) => acc + (t.toplamKurus ?? 0), 0);

/**
 * Adisyonun şu ana kadar onaylanmış ödeme talepleri toplamı (Firestore okur).
 * Saf çekirdeği odenenToplamKurus'tur.
 */
export async function odenmisTutarKurus(
  adisyonRef: DocumentReference,
): Promise<number> {
  const snap = await adisyonRef
    .collection('odemeTalepleri')
    .where('durum', '==', 'odendi')
    .get();
  return odenenToplamKurus(
    snap.docs.map((d) => d.data() as { durum?: string; toplamKurus?: number }),
  );
}

/**
 * Eşit bölmede ödenecek tutarı hesaplar; bilinen kalan tutara göre sınırlar.
 * - kisi başına ceil(toplam/N) tahsil edilir, ama kalan tutardan fazla olamaz.
 * - Böylece son ödeme yapan kişi otomatik olarak küçük artığı kapatır.
 */
export function esitOdemeTutariHesapla(
  adisyonToplamKurus: number,
  kisiSayisi: number,
  kalanKurus: number,
): number {
  if (kisiSayisi < 1) return 0;
  if (kalanKurus <= 0) return 0;
  const kisiBasi = Math.ceil(adisyonToplamKurus / kisiSayisi);
  return Math.min(kisiBasi, kalanKurus);
}
