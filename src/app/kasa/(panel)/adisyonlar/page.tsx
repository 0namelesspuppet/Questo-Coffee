import Link from 'next/link';
import { getAdminDb } from '@/lib/firebase/admin';
import { formatTL } from '@/lib/utils/para';
import { karsilastirMasaAdi } from '@/lib/utils/masa';
import type { SiparisKalemi } from '@/types/model';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

const R = (): string => {
  const id = process.env.NEXT_PUBLIC_RESTORAN_ID;
  if (!id) throw new Error('NEXT_PUBLIC_RESTORAN_ID tanımlı değil.');
  return id;
};

interface AdisyonDoc {
  masaId: string;
  toplamKurus: number;
  siparisSayisi: number;
}

interface MasaDoc {
  ad: string;
}

interface KalemOzet {
  ad: string;
  adet: number;
  araToplamKurus: number;
}

export default async function AdisyonlarSayfasi() {
  const db = getAdminDb();
  const restoranId = R();

  const [adisyonSnap, masaSnap] = await Promise.all([
    db
      .collection(`restoranlar/${restoranId}/adisyonlar`)
      .where('durum', '==', 'acik')
      .get(),
    db.collection(`restoranlar/${restoranId}/masalar`).get(),
  ]);

  const masaAdi = new Map<string, string>(
    masaSnap.docs.map((d) => [d.id, (d.data() as MasaDoc).ad]),
  );

  // Her açık adisyonun siparişlerini paralel çek ve ürünleri (ad bazında) topla.
  const kalemlerByAdisyon = await Promise.all(
    adisyonSnap.docs.map(async (d) => {
      const siparisSnap = await d.ref.collection('siparisler').get();
      const ozet = new Map<string, KalemOzet>();
      for (const s of siparisSnap.docs) {
        const kalemler = (s.data().kalemler ?? []) as SiparisKalemi[];
        for (const k of kalemler) {
          const mevcut = ozet.get(k.ad);
          if (mevcut) {
            mevcut.adet += k.adet;
            mevcut.araToplamKurus += k.araToplamKurus as number;
          } else {
            ozet.set(k.ad, {
              ad: k.ad,
              adet: k.adet,
              araToplamKurus: k.araToplamKurus as number,
            });
          }
        }
      }
      return [d.id, Array.from(ozet.values())] as const;
    }),
  );
  const kalemMap = new Map<string, KalemOzet[]>(kalemlerByAdisyon);

  const kartlar = adisyonSnap.docs
    .map((d) => {
      const a = d.data() as AdisyonDoc;
      return {
        id: d.id,
        masaId: a.masaId,
        masaAd: masaAdi.get(a.masaId) ?? 'Bilinmeyen masa',
        toplamKurus: a.toplamKurus,
        siparisSayisi: a.siparisSayisi,
        kalemler: kalemMap.get(d.id) ?? [],
      };
    })
    .sort((a, b) => karsilastirMasaAdi(a.masaAd, b.masaAd));

  return (
    <div className="mx-auto max-w-6xl p-4 space-y-4">
      <h1 className="text-2xl font-semibold">Açık Adisyonlar</h1>
      {kartlar.length === 0 ? (
        <p className="rounded-lg border bg-card p-8 text-center text-sm text-muted-foreground">
          Şu an açık adisyon yok.
        </p>
      ) : (
        <ul className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {kartlar.map((k) => (
            <li key={k.id}>
              <Link
                href={`/kasa/adisyonlar/${k.id}`}
                className="flex h-full flex-col rounded-lg border bg-card p-4 transition hover:bg-accent"
              >
                <div className="flex items-center justify-between">
                  <span className="font-medium">{k.masaAd}</span>
                  <span className="rounded-md border px-2 py-0.5 text-xs">
                    {k.siparisSayisi} sipariş
                  </span>
                </div>

                {k.kalemler.length > 0 ? (
                  <ul className="mt-3 space-y-1 text-sm">
                    {k.kalemler.map((kal, i) => (
                      <li
                        key={`${kal.ad}-${i}`}
                        className="flex items-start justify-between gap-2"
                      >
                        <span className="min-w-0">
                          <span className="tabular-nums text-muted-foreground">
                            {kal.adet}×
                          </span>{' '}
                          {kal.ad}
                        </span>
                        <span className="shrink-0 tabular-nums text-xs text-muted-foreground">
                          {formatTL(kal.araToplamKurus)}
                        </span>
                      </li>
                    ))}
                  </ul>
                ) : (
                  <p className="mt-3 text-sm text-muted-foreground">
                    Henüz ürün eklenmemiş.
                  </p>
                )}

                <div className="mt-auto flex items-end justify-between gap-2 border-t pt-3">
                  <span className="pt-1 text-xs text-muted-foreground">
                    Ödenecek toplam
                  </span>
                  <span className="text-xl font-semibold tabular-nums">
                    {formatTL(k.toplamKurus)}
                  </span>
                </div>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
