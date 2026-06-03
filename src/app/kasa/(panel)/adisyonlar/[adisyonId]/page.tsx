import Link from 'next/link';
import { notFound } from 'next/navigation';
import { ArrowLeft, Plus } from 'lucide-react';
import { getAdminDb } from '@/lib/firebase/admin';
import { formatTL } from '@/lib/utils/para';
import type {
  Adisyon,
  Siparis,
  SiparisDurumu,
  SiparisKalemi,
  OdemeTalebi,
} from '@/types/model';
import { AdisyonuKapatBtn } from './kapat-btn';
import { OdemeTalepleri } from '@/components/kasa/odeme-talepleri';
import { KasiyerBolme } from '@/components/kasa/kasiyer-bolme';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

const DURUM_ETIKET: Record<SiparisDurumu, string> = {
  yeni: 'Alındı',
  hazirlaniyor: 'Hazırlanıyor',
  hazir: 'Hazır',
  teslim: 'Teslim edildi',
  iptal: 'İptal',
};

const R = (): string => {
  const id = process.env.NEXT_PUBLIC_RESTORAN_ID;
  if (!id) throw new Error('NEXT_PUBLIC_RESTORAN_ID tanımlı değil.');
  return id;
};

export default async function AdisyonDetay({
  params,
  searchParams,
}: {
  params: Promise<{ adisyonId: string }>;
  searchParams: Promise<{ garson?: string }>;
}) {
  const { adisyonId } = await params;
  const { garson } = await searchParams;
  // Garson modu (masalar listesinden ?garson=1 ile gelinince): yalnızca ne
  // sipariş edildiğini göster + "Ürün Ekle". Ödeme alma / adisyon kapatma
  // kasiyere özeldir (karışıklık olmasın diye) — bu modda gizlenir.
  const garsonModu = garson === '1';
  const db = getAdminDb();
  const restoranId = R();

  const aRef = db.doc(`restoranlar/${restoranId}/adisyonlar/${adisyonId}`);
  const aSnap = await aRef.get();
  if (!aSnap.exists) notFound();
  const adisyon = { id: aSnap.id, ...aSnap.data() } as unknown as Adisyon;

  const [masaSnap, siparisSnap, talepSnap] = await Promise.all([
    db.doc(`restoranlar/${restoranId}/masalar/${adisyon.masaId}`).get(),
    aRef.collection('siparisler').orderBy('olusturulduAt', 'asc').get(),
    aRef.collection('odemeTalepleri').orderBy('olusturulduAt', 'asc').get(),
  ]);

  const masaData = masaSnap.exists
    ? (masaSnap.data() as { ad: string })
    : null;
  const masaAd = masaData?.ad ?? 'Bilinmeyen masa';

  const siparisler = siparisSnap.docs.map(
    (d) => ({ id: d.id, ...d.data() }) as unknown as Siparis,
  );

  const talepler = talepSnap.docs.map((d) => {
    const data = d.data() as Omit<OdemeTalebi, 'id' | 'olusturulduAt'> & {
      olusturulduAt?: { toMillis?: () => number };
    };
    return {
      id: d.id,
      yontem: data.yontem,
      toplamKurus: data.toplamKurus as number,
      kisiSayisi: data.kisiSayisi,
      kisiPayi: data.kisiPayi as number | undefined,
      secilenKalemler: data.secilenKalemler?.map((k) => ({
        siparisId: k.siparisId,
        siparisNo: k.siparisNo,
        ad: k.ad,
        adet: k.adet,
        araToplamKurus: k.araToplamKurus as number,
      })),
      durum: data.durum,
      musteriAd: data.musteriAd,
      kaynak: data.kaynak,
    };
  });

  const acik = adisyon.durum === 'acik';

  const odenmisToplam = talepler
    .filter((t) => t.durum === 'odendi')
    .reduce((acc, t) => acc + t.toplamKurus, 0);
  const kalanToplam = Math.max(0, (adisyon.toplamKurus as number) - odenmisToplam);

  // Ürün bazlı ödeme: her kalem türünden kaç BİRİM ödendi?
  // Anahtar birim fiyat bazlı; "5× Çay"ın yalnız 2'si ödenebilsin diye birim sayar.
  // (Eski tam-satır talepleri de uyumlu: birim = araToplam/adet ile aynı anahtara düşer.)
  const odenenBirimMap = new Map<string, number>();
  for (const t of talepler) {
    if (t.durum !== 'odendi' || t.yontem !== 'urun' || !t.secilenKalemler) continue;
    for (const k of t.secilenKalemler) {
      const birim =
        k.adet > 0 ? Math.round(k.araToplamKurus / k.adet) : k.araToplamKurus;
      const kk = `${k.siparisId}||${k.ad}||${birim}`;
      odenenBirimMap.set(kk, (odenenBirimMap.get(kk) ?? 0) + k.adet);
    }
  }
  // Her siparişteki kalemlerin ödenmiş birim adedi
  const konsumMap = new Map(odenenBirimMap);
  const siparisKalemOdenen = new Map<string, number[]>();
  for (const s of siparisler) {
    const odenenler = (s.kalemler as SiparisKalemi[]).map((k) => {
      const kk = `${s.id}||${k.ad}||${k.birimFiyatKurus}`;
      const kalan = konsumMap.get(kk) ?? 0;
      const odenen = Math.min(k.adet, kalan);
      if (odenen > 0) konsumMap.set(kk, kalan - odenen);
      return odenen;
    });
    siparisKalemOdenen.set(s.id, odenenler);
  }

  return (
    <div className="mx-auto max-w-6xl p-4 space-y-4">
      <Link
        href={garsonModu ? '/kasa/masalar' : '/kasa/adisyonlar'}
        className="inline-flex items-center gap-1.5 text-sm text-muted-foreground"
      >
        <ArrowLeft className="size-4" />
        {garsonModu ? 'Masalar' : 'Adisyonlar'}
      </Link>

      <div className="flex items-end justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold">{masaAd}</h1>
          <p className="text-sm text-muted-foreground">
            {adisyon.siparisSayisi} sipariş · {acik ? 'Açık' : 'Kapalı'}
          </p>
        </div>
        <div className="text-right">
          {odenmisToplam > 0 ? (
            <>
              <p className="text-xs text-muted-foreground">
                Toplam{' '}
                <span className="line-through">
                  {formatTL(adisyon.toplamKurus)}
                </span>
              </p>
              <p className="text-2xl font-semibold tabular-nums">
                {formatTL(kalanToplam)}
                <span className="ml-1 text-xs font-normal text-muted-foreground">
                  kalan
                </span>
              </p>
              <p className="text-xs text-emerald-700 dark:text-emerald-400">
                {formatTL(odenmisToplam)} ödendi
              </p>
            </>
          ) : (
            <>
              <p className="text-xs text-muted-foreground">Toplam</p>
              <p className="text-2xl font-semibold">
                {formatTL(adisyon.toplamKurus)}
              </p>
            </>
          )}
        </div>
      </div>

      {acik && (
        <Link
          href={`/kasa/masa/${adisyon.masaId}?ekle=1`}
          className="flex min-h-[56px] w-full items-center justify-center gap-2 rounded-xl bg-primary px-4 text-lg font-bold text-primary-foreground shadow-soft transition active:scale-[0.98]"
        >
          <Plus className="size-5" strokeWidth={2.75} />
          Ürün Ekle
        </Link>
      )}

      <ul className="space-y-3">
        {siparisler.map((s) => {
          const odl = siparisKalemOdenen.get(s.id) ?? [];
          const odenmisAlt = (s.kalemler as SiparisKalemi[]).reduce(
            (acc, k, i) => acc + (odl[i] ?? 0) * (k.birimFiyatKurus as number),
            0,
          );
          const kalanAlt = (s.toplamKurus as number) - odenmisAlt;
          return (
            <li key={s.id} className="rounded-lg border bg-card p-3">
              <div className="flex items-center justify-between text-base">
                <div className="flex items-center gap-2">
                  <span className="font-medium">#{s.gunlukNo}</span>
                  {s.musteriAd && (
                    <span className="font-semibold">{s.musteriAd}</span>
                  )}
                </div>
                <span className="rounded-md border px-2 py-0.5 text-xs">
                  {DURUM_ETIKET[s.durum]}
                </span>
              </div>
              <ul className="mt-2 space-y-1.5 text-base">
                {(s.kalemler as SiparisKalemi[]).map((k, i) => {
                  const odenen = odl[i] ?? 0;
                  const tamOdendi = odenen >= k.adet;
                  return (
                  <li
                    key={`${k.urunId}-${i}`}
                    className={`flex items-start justify-between gap-2 ${tamOdendi ? 'opacity-40' : ''}`}
                  >
                    <span className={`min-w-0 ${tamOdendi ? 'line-through' : ''}`}>
                      <span className="tabular-nums text-muted-foreground">
                        {k.adet}×
                      </span>{' '}
                      {k.ad}
                      {odenen > 0 && !tamOdendi && (
                        <span className="ml-1 text-xs text-emerald-700 dark:text-emerald-400">
                          ({odenen} ödendi)
                        </span>
                      )}
                      {k.secimler && k.secimler.length > 0 && (
                        <span className="block text-sm text-foreground/80">
                          {k.secimler
                            .map(
                              (sec) =>
                                `${sec.grupAd}: ${sec.secenekler
                                  .map((s) => s.ad)
                                  .join(', ')}`,
                            )
                            .join(' · ')}
                        </span>
                      )}
                      {k.notlar && (
                        <span className="block text-sm text-muted-foreground">
                          Not: {k.notlar}
                        </span>
                      )}
                    </span>
                    <span
                      className={`shrink-0 tabular-nums text-sm ${tamOdendi ? 'line-through text-muted-foreground' : ''}`}
                    >
                      {formatTL(k.araToplamKurus)}
                    </span>
                  </li>
                  );
                })}
              </ul>
              <div className="mt-2 border-t pt-2 space-y-0.5">
                {odenmisAlt > 0 && (
                  <div className="flex justify-between text-xs text-emerald-700 dark:text-emerald-400">
                    <span>Ödenen</span>
                    <span className="tabular-nums">−{formatTL(odenmisAlt)}</span>
                  </div>
                )}
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">
                    {odenmisAlt > 0 ? 'Kalan' : 'Ara toplam'}
                  </span>
                  <span className="font-medium tabular-nums">
                    {formatTL(odenmisAlt > 0 ? kalanAlt : s.toplamKurus)}
                  </span>
                </div>
              </div>
            </li>
          );
        })}
      </ul>

      {acik && !garsonModu && (
        <KasiyerBolme
          adisyonId={adisyonId}
          toplamKurus={kalanToplam}
          genelToplamKurus={adisyon.toplamKurus as number}
          siparisler={siparisler
            .map((s) => {
              const odl = siparisKalemOdenen.get(s.id) ?? [];
              const odenmisAlt = (s.kalemler as SiparisKalemi[]).reduce(
                (acc, k, i) => acc + (odl[i] ?? 0) * (k.birimFiyatKurus as number),
                0,
              );
              return {
                id: s.id,
                gunlukNo: s.gunlukNo,
                durum: s.durum,
                musteriAd: s.musteriAd,
                toplamKurus: (s.toplamKurus as number) - odenmisAlt,
                kalemler: (s.kalemler as SiparisKalemi[])
                  .map((k, i) => {
                    const kalanAdet = k.adet - (odl[i] ?? 0);
                    const birim = k.birimFiyatKurus as number;
                    return {
                      ad: k.ad,
                      adet: kalanAdet,
                      birimKurus: birim,
                      araToplamKurus: kalanAdet * birim,
                    };
                  })
                  .filter((k) => k.adet > 0),
              };
            })
            .filter((s) => s.kalemler.length > 0)}
        />
      )}

      {!garsonModu && (
        <OdemeTalepleri adisyonId={adisyonId} talepler={talepler} />
      )}

      {acik && !garsonModu && (
        <AdisyonuKapatBtn adisyonId={adisyonId} kalanKurus={kalanToplam} />
      )}
    </div>
  );
}
