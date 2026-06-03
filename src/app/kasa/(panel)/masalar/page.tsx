import Link from 'next/link';
import { getAdminDb } from '@/lib/firebase/admin';
import { formatTL } from '@/lib/utils/para';
import { karsilastirMasaAdi } from '@/lib/utils/masa';

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

interface MasaKart {
  masaId: string;
  ad: string;
  acikAdisyonId: string | null;
  toplamKurus: number;
  siparisSayisi: number;
}

export default async function AdisyonlarSayfasi() {
  const db = getAdminDb();
  const restoranId = R();

  const [adisyonSnap, masaSnap] = await Promise.all([
    db
      .collection(`restoranlar/${restoranId}/adisyonlar`)
      .where('durum', '==', 'acik')
      .get(),
    db
      .collection(`restoranlar/${restoranId}/masalar`)
      .where('aktifMi', '==', true)
      .get(),
  ]);

  const acikMap = new Map<string, { id: string; data: AdisyonDoc }>();
  for (const d of adisyonSnap.docs) {
    const data = d.data() as AdisyonDoc;
    acikMap.set(data.masaId, { id: d.id, data });
  }

  const kartlar: MasaKart[] = masaSnap.docs
    .map((m) => {
      const acik = acikMap.get(m.id);
      return {
        masaId: m.id,
        ad: (m.data() as MasaDoc).ad,
        acikAdisyonId: acik?.id ?? null,
        toplamKurus: acik?.data.toplamKurus ?? 0,
        siparisSayisi: acik?.data.siparisSayisi ?? 0,
      };
    })
    .sort((a, b) => karsilastirMasaAdi(a.ad, b.ad));

  return (
    <div className="mx-auto max-w-6xl p-4 space-y-4">
      <h1 className="text-2xl font-semibold">Masalar</h1>
      {kartlar.length === 0 ? (
        <p className="rounded-lg border bg-card p-8 text-center text-sm text-muted-foreground">
          Tanımlı masa yok.
        </p>
      ) : (
        <ul className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
          {kartlar.map((k) => {
            const acik = k.acikAdisyonId !== null;
            return (
              <li key={k.masaId}>
                <Link
                  href={
                    acik
                      ? `/kasa/adisyonlar/${k.acikAdisyonId}?garson=1`
                      : `/kasa/masa/${k.masaId}`
                  }
                  className={
                    'flex aspect-square flex-col justify-between rounded-lg border p-3 shadow-soft transition active:scale-[0.98] ' +
                    (acik
                      ? 'border-primary/50 bg-primary/5 hover:bg-primary/10'
                      : 'bg-card hover:bg-accent/40')
                  }
                >
                  <div className="flex items-start justify-between">
                    <span className="font-medium">{k.ad}</span>
                    {acik && (
                      <span className="rounded-full border border-primary/40 bg-primary/10 px-1.5 py-0.5 text-[10px] font-medium uppercase text-primary">
                        Açık
                      </span>
                    )}
                  </div>
                  {acik ? (
                    <div className="space-y-0.5">
                      <div className="text-xs text-muted-foreground">
                        {k.siparisSayisi} sipariş
                      </div>
                      <div className="text-lg font-semibold tabular-nums">
                        {formatTL(k.toplamKurus)}
                      </div>
                    </div>
                  ) : (
                    <div className="text-xs text-muted-foreground">Boş</div>
                  )}
                </Link>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
