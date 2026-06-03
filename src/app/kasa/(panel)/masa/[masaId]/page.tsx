import Link from 'next/link';
import { notFound, redirect } from 'next/navigation';
import { ArrowLeft } from 'lucide-react';
import { getAdminDb } from '@/lib/firebase/admin';
import { GarsonMenu } from '@/components/kasa/garson-menu';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

const R = (): string => {
  const id = process.env.NEXT_PUBLIC_RESTORAN_ID;
  if (!id) throw new Error('NEXT_PUBLIC_RESTORAN_ID tanımlı değil.');
  return id;
};

// Henuz acik adisyonu olmayan masa icin yeni siparis baslangic sayfasi.
// Adisyon olusur olusmaz GarsonMenu icinde /kasa/adisyonlar/<id>'ye yonlendirir.
//
// ?ekle=1 → "mevcut adisyona urun ekle" modu: acik adisyon olsa bile adisyona
// yonlendirmeyiz; menuyu acariz ki garson ayni masaya yeni urun ekleyebilsin.
// Siparis gonderilince GarsonMenu adisyon detayina geri doner (donusModu).
export default async function MasaSiparisSayfasi({
  params,
  searchParams,
}: {
  params: Promise<{ masaId: string }>;
  searchParams: Promise<{ ekle?: string }>;
}) {
  const { masaId } = await params;
  const { ekle } = await searchParams;
  const db = getAdminDb();
  const restoranId = R();

  const masaSnap = await db
    .doc(`restoranlar/${restoranId}/masalar/${masaId}`)
    .get();
  if (!masaSnap.exists) notFound();
  const masa = masaSnap.data() as { ad: string; aktifMi?: boolean };
  if (masa.aktifMi === false) notFound();

  // Bu masada zaten acik bir adisyon varsa o sayfaya yonlendir
  // (ekle modunda yonlendirme; ayni masaya urun eklemeye devam ederiz).
  const acikSnap = await db
    .collection(`restoranlar/${restoranId}/adisyonlar`)
    .where('masaId', '==', masaId)
    .where('durum', '==', 'acik')
    .limit(1)
    .get();
  const acikAdisyonId = acikSnap.empty ? null : acikSnap.docs[0]!.id;
  // ?ekle=1 yalnizca GERCEKTEN acik bir adisyon varken "ekle" modudur. Adisyon
  // bu arada kapanmissa ya da URL elle yazilmissa normal yeni-siparis akisina
  // duseriz — boylece geri linki asla bos "/kasa/adisyonlar/" olmaz (kirik link yok).
  const ekleModu = ekle === '1' && acikAdisyonId !== null;
  if (acikAdisyonId !== null && !ekleModu) {
    redirect(`/kasa/adisyonlar/${acikAdisyonId}`);
  }

  return (
    <div className="mx-auto max-w-6xl px-2 py-2 space-y-2 sm:px-4 sm:py-3 sm:space-y-3">
      {/* Mobil: tek satır kompakt başlık */}
      <div className="flex items-center gap-2 sm:hidden">
        <Link
          href={ekleModu ? `/kasa/adisyonlar/${acikAdisyonId}` : '/kasa/masalar'}
          aria-label={ekleModu ? 'Adisyona dön' : 'Masalar'}
          className="-ml-1 inline-flex size-8 items-center justify-center rounded-md text-muted-foreground active:bg-secondary"
        >
          <ArrowLeft className="size-4" />
        </Link>
        <h1 className="text-base font-semibold">{masa.ad}</h1>
        <span className="text-xs text-muted-foreground">
          {ekleModu ? '· ürün ekle' : '· yeni sipariş'}
        </span>
      </div>

      {/* Tablet/masaüstü: ayrıntılı başlık */}
      <div className="hidden sm:block">
        <Link
          href={ekleModu ? `/kasa/adisyonlar/${acikAdisyonId}` : '/kasa/masalar'}
          className="inline-flex items-center gap-1.5 text-sm text-muted-foreground"
        >
          <ArrowLeft className="size-4" />
          {ekleModu ? 'Adisyon' : 'Masalar'}
        </Link>
        <h1 className="mt-2 text-2xl font-semibold">{masa.ad}</h1>
        <p className="text-sm text-muted-foreground">
          {ekleModu ? 'Mevcut adisyona ürün ekleniyor' : 'İlk sipariş alınıyor'}
        </p>
      </div>

      <GarsonMenu masaId={masaId} masaAd={masa.ad} eklemeMi={ekleModu} />
    </div>
  );
}
