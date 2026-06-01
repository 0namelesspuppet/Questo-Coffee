'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Minus, Plus, Search, Trash2, X } from 'lucide-react';
import {
  collection,
  onSnapshot,
  orderBy,
  query,
  where,
} from 'firebase/firestore';
import { onAuthStateChanged } from 'firebase/auth';
import { getClientAuth, getClientDb } from '@/lib/firebase/client';
import { kategoriConverter, urunConverter } from '@/lib/firebase/converters';
import type { Kategori, Urun, UrunOpsiyonGrubu } from '@/types/model';
import { formatTL } from '@/lib/utils/para';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';

const RESTORAN = process.env.NEXT_PUBLIC_RESTORAN_ID as string;

interface SepetSecim {
  grupId: string;
  grupAd: string;
  secenekler: { id: string; ad: string; ekFiyatKurus: number }[];
}

interface SepetKalemi {
  satirId: string;
  urunId: string;
  ad: string;
  birimFiyatKurus: number;
  adet: number;
  secimler?: SepetSecim[];
}

interface Props {
  /** Sipariş gönderildikten sonra adisyona dönüş; verilmezse /kasa/adisyonlar/<id> */
  masaId: string;
  masaAd: string;
}

export function GarsonMenu({ masaId, masaAd }: Props) {
  const router = useRouter();
  const [kategoriler, setKategoriler] = useState<Kategori[]>([]);
  const [urunler, setUrunler] = useState<Urun[]>([]);
  const [aktifKategoriId, setAktifKategoriId] = useState<string | null>(null);
  const [arama, setArama] = useState('');
  const [yukleniyor, setYukleniyor] = useState(true);
  const [authHazir, setAuthHazir] = useState(false);
  const [sepet, setSepet] = useState<SepetKalemi[]>([]);
  const [opsiyonUrun, setOpsiyonUrun] = useState<Urun | null>(null);
  const [gonderiliyor, setGonderiliyor] = useState(false);
  const [sepetAcik, setSepetAcik] = useState(false);
  const satirSayaci = useRef(0);

  useEffect(() => {
    const unsub = onAuthStateChanged(getClientAuth(), (u) => {
      setAuthHazir(!!u);
    });
    return () => unsub();
  }, []);

  useEffect(() => {
    if (!authHazir) return;
    const db = getClientDb();
    const kQ = query(
      collection(db, `restoranlar/${RESTORAN}/kategoriler`).withConverter(
        kategoriConverter,
      ),
      where('aktifMi', '==', true),
      orderBy('sira', 'asc'),
    );
    const uQ = query(
      collection(db, `restoranlar/${RESTORAN}/urunler`).withConverter(
        urunConverter,
      ),
      orderBy('sira', 'asc'),
    );
    const u1 = onSnapshot(kQ, (snap) => {
      setKategoriler(snap.docs.map((d) => d.data()));
      setYukleniyor(false);
    });
    const u2 = onSnapshot(uQ, (snap) => {
      setUrunler(snap.docs.map((d) => d.data()));
    });
    return () => {
      u1();
      u2();
    };
  }, [authHazir]);

  useEffect(() => {
    if (!aktifKategoriId && kategoriler[0]) {
      setAktifKategoriId(kategoriler[0].id);
    }
  }, [kategoriler, aktifKategoriId]);

  const aramaAktif = arama.trim().length > 0;

  // Arama sonuçları (tüm ürünler arasında)
  const aramaSonuc = useMemo(() => {
    const term = arama.trim().toLocaleLowerCase('tr');
    if (!term) return [];
    return urunler.filter(
      (u) =>
        u.stoktaMi !== false &&
        u.ad.toLocaleLowerCase('tr').includes(term),
    );
  }, [urunler, arama]);

  // Kategori → ürünleri eşlemesi (feed grupları için)
  const kategoriUrunleri = useMemo(() => {
    const map: Record<string, Urun[]> = {};
    for (const k of kategoriler) {
      map[k.id] = urunler.filter(
        (u) => u.kategoriId === k.id && u.stoktaMi !== false,
      );
    }
    return map;
  }, [kategoriler, urunler]);

  // Bölüm referansları — scroll-spy ve smooth scroll için
  const sectionRefs = useRef<Record<string, HTMLElement | null>>({});
  const chipBarRef = useRef<HTMLElement | null>(null);
  // Chip'e tıklayınca başlayan programatik kaydırma sırasında scroll-spy'ı sustur
  // — yoksa observer ara bölümleri "aktif" yapıp hedefe gidişi bozabilir.
  const programatikKaydirma = useRef(false);
  const kaydirmaZaman = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Kategori chip'ine tıklayınca o bölüme smooth scroll
  const kategoriyeGit = (id: string) => {
    setAktifKategoriId(id);
    const el = sectionRefs.current[id];
    if (!el) return;
    programatikKaydirma.current = true;
    if (kaydirmaZaman.current) clearTimeout(kaydirmaZaman.current);
    kaydirmaZaman.current = setTimeout(() => {
      programatikKaydirma.current = false;
    }, 600);
    el.scrollIntoView({ behavior: 'smooth', block: 'start' });
  };

  // Scroll-spy: görünür bölümün chip'ini aktif yap
  useEffect(() => {
    if (aramaAktif) return;
    const observer = new IntersectionObserver(
      (entries) => {
        if (programatikKaydirma.current) return;
        const top = entries
          .filter((e) => e.isIntersecting)
          .sort(
            (a, b) => a.boundingClientRect.top - b.boundingClientRect.top,
          )[0];
        if (!top) return;
        const id = (top.target as HTMLElement).dataset.kategoriId;
        if (id) setAktifKategoriId(id);
      },
      {
        // Sticky bar altından viewport ortasına kadar olan bant = "aktif" bölge
        rootMargin: '-120px 0px -55% 0px',
        threshold: 0,
      },
    );
    for (const k of kategoriler) {
      const el = sectionRefs.current[k.id];
      if (el) observer.observe(el);
    }
    return () => observer.disconnect();
  }, [kategoriler, aramaAktif]);

  // Aktif chip'i yatay bar içinde ortala — sadece bar'ı yatay kaydır, sayfayı
  // dikey kaydırma (scrollIntoView gibi) ki bölüme yapılan kaydırmayı iptal etmesin.
  useEffect(() => {
    if (!aktifKategoriId || !chipBarRef.current) return;
    const bar = chipBarRef.current;
    const chip = bar.querySelector<HTMLElement>(
      `[data-chip-id="${aktifKategoriId}"]`,
    );
    if (!chip) return;
    const hedef =
      chip.offsetLeft - bar.clientWidth / 2 + chip.clientWidth / 2;
    bar.scrollTo({ left: hedef, behavior: 'smooth' });
  }, [aktifKategoriId]);


  const opsiyonluMu = (u: Urun) => (u.opsiyonGruplari?.length ?? 0) > 0;

  // Ürünün sepetteki toplam adedi (opsiyonlu varyantlar dahil)
  const urunAdedi = (urunId: string) =>
    sepet
      .filter((k) => k.urunId === urunId)
      .reduce((acc, k) => acc + k.adet, 0);

  // Ürünün sepetten bir adet düşürür: önce opsiyonsuz satır, yoksa en son
  // eklenen opsiyonlu varyant. 0'a inen satır tamamen kaldırılır.
  const urunCikar = (urun: Urun) => {
    setSepet((s) => {
      const opsiyonsuz = s.find((k) => k.urunId === urun.id && !k.secimler);
      if (opsiyonsuz) {
        if (opsiyonsuz.adet <= 1) {
          return s.filter((k) => k.satirId !== opsiyonsuz.satirId);
        }
        return s.map((k) =>
          k.satirId === opsiyonsuz.satirId ? { ...k, adet: k.adet - 1 } : k,
        );
      }
      let lastIdx = -1;
      for (let i = s.length - 1; i >= 0; i--) {
        if (s[i]?.urunId === urun.id) {
          lastIdx = i;
          break;
        }
      }
      const last = lastIdx >= 0 ? s[lastIdx] : undefined;
      if (!last) return s;
      if (last.adet <= 1) {
        return s.filter((_, i) => i !== lastIdx);
      }
      return s.map((k, i) => (i === lastIdx ? { ...k, adet: k.adet - 1 } : k));
    });
  };

  const urunEkle = (urun: Urun) => {
    if (opsiyonluMu(urun)) {
      setOpsiyonUrun(urun);
      return;
    }
    // Opsiyonsuz: aynı ürün varsa adet++; yoksa yeni satır
    setSepet((s) => {
      const mevcut = s.find((k) => k.urunId === urun.id && !k.secimler);
      if (mevcut) {
        return s.map((k) =>
          k.satirId === mevcut.satirId ? { ...k, adet: k.adet + 1 } : k,
        );
      }
      satirSayaci.current += 1;
      return [
        ...s,
        {
          satirId: `s${satirSayaci.current}`,
          urunId: urun.id,
          ad: urun.ad,
          birimFiyatKurus: urun.fiyatKurus,
          adet: 1,
        },
      ];
    });
  };

  const adetGuncelle = (satirId: string, yeni: number) => {
    setSepet((s) =>
      yeni <= 0
        ? s.filter((k) => k.satirId !== satirId)
        : s.map((k) => (k.satirId === satirId ? { ...k, adet: yeni } : k)),
    );
  };

  const sepetTopla = sepet.reduce(
    (acc, k) => acc + k.birimFiyatKurus * k.adet,
    0,
  );
  const sepetAdet = sepet.reduce((acc, k) => acc + k.adet, 0);

  const opsiyonlaEkle = (
    urun: Urun,
    secimler: SepetSecim[],
    ekFiyat: number,
  ) => {
    satirSayaci.current += 1;
    setSepet((s) => [
      ...s,
      {
        satirId: `s${satirSayaci.current}`,
        urunId: urun.id,
        ad: urun.ad,
        birimFiyatKurus: urun.fiyatKurus + ekFiyat,
        adet: 1,
        secimler,
      },
    ]);
    setOpsiyonUrun(null);
  };

  const gonder = async () => {
    if (sepet.length === 0 || gonderiliyor) return;
    setGonderiliyor(true);
    try {
      const res = await fetch('/api/kasiyer/siparis', {
        method: 'POST',
        headers: {
          'content-type': 'application/json',
          'idempotency-key': `${Date.now()}-${Math.random().toString(36).slice(2)}`,
        },
        body: JSON.stringify({
          masaId,
          kalemler: sepet.map((k) => ({
            urunId: k.urunId,
            adet: k.adet,
            ...(k.secimler && k.secimler.length > 0
              ? {
                  secimler: k.secimler.map((s) => ({
                    grupId: s.grupId,
                    secenekIds: s.secenekler.map((sc) => sc.id),
                  })),
                }
              : {}),
          })),
        }),
      });
      const j = (await res.json()) as { ok?: boolean; mesaj?: string; adisyonId?: string };
      if (!res.ok || !j.ok || !j.adisyonId) {
        throw new Error(j.mesaj ?? 'Sipariş gönderilemedi.');
      }
      toast.success(`${masaAd}: ${sepetAdet} kalem adisyona eklendi.`);
      setSepet([]);
      // Sipariş alındıktan sonra garsonu masaların listelendiği sekmeye geri
      // götür — böylece sıradaki masaya hızlıca geçebilir.
      router.replace('/kasa/masalar');
      // Router cache'ini boşalt ki masalar sayfası yeni adisyon/siparişle güncel
      // gelsin — yoksa sekme elle yenilenene kadar eski veri görünür.
      router.refresh();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Sipariş hatası.');
    } finally {
      setGonderiliyor(false);
    }
  };

  if (yukleniyor || !authHazir) {
    return (
      <div className="rounded-lg border bg-card p-8 text-center text-sm text-muted-foreground">
        Menü yükleniyor…
      </div>
    );
  }

  const sepetIcerigi = (
    <>
      <div className="flex items-center justify-between">
        <h2 className="text-sm font-semibold">
          Yeni sipariş ({sepetAdet})
        </h2>
        {sepet.length > 0 && (
          <button
            type="button"
            onClick={() => setSepet([])}
            className="inline-flex items-center gap-1 text-xs text-muted-foreground hover:text-destructive"
            aria-label="Sepeti temizle"
          >
            <Trash2 className="size-3.5" />
            Temizle
          </button>
        )}
      </div>

      {sepet.length === 0 ? (
        <p className="rounded-md border border-dashed py-6 text-center text-xs text-muted-foreground">
          Sol panelden ürün seç
        </p>
      ) : (
        <ul className="space-y-2 max-h-[calc(100vh-260px)] overflow-y-auto">
          {sepet.map((k) => (
            <li key={k.satirId} className="rounded-md border bg-background p-2">
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0 flex-1">
                  <div className="text-sm font-medium leading-snug">
                    {k.ad}
                  </div>
                  {k.secimler && k.secimler.length > 0 && (
                    <div className="text-xs text-muted-foreground">
                      {k.secimler
                        .map(
                          (s) =>
                            `${s.grupAd}: ${s.secenekler.map((x) => x.ad).join(', ')}`,
                        )
                        .join(' · ')}
                    </div>
                  )}
                  <div className="text-xs tabular-nums text-muted-foreground mt-0.5">
                    {formatTL(k.birimFiyatKurus * k.adet)}
                  </div>
                </div>
                <div className="inline-flex shrink-0 items-center rounded-full border bg-card">
                  <button
                    type="button"
                    onClick={() => adetGuncelle(k.satirId, k.adet - 1)}
                    className="flex size-8 items-center justify-center text-muted-foreground hover:text-foreground"
                    aria-label="Azalt"
                  >
                    <Minus className="size-3.5" />
                  </button>
                  <span className="w-6 text-center text-sm tabular-nums">
                    {k.adet}
                  </span>
                  <button
                    type="button"
                    onClick={() => adetGuncelle(k.satirId, k.adet + 1)}
                    className="flex size-8 items-center justify-center text-muted-foreground hover:text-foreground"
                    aria-label="Artır"
                  >
                    <Plus className="size-3.5" />
                  </button>
                </div>
              </div>
            </li>
          ))}
        </ul>
      )}

      <div className="flex items-center justify-between border-t pt-3 text-sm">
        <span className="text-muted-foreground">Toplam</span>
        <span className="text-base font-semibold tabular-nums">
          {formatTL(sepetTopla)}
        </span>
      </div>

      <button
        type="button"
        onClick={gonder}
        disabled={sepet.length === 0 || gonderiliyor}
        className="min-h-[60px] w-full rounded-xl bg-primary px-4 py-3.5 text-lg font-semibold text-primary-foreground shadow-soft transition active:scale-[0.98] disabled:opacity-50 lg:min-h-[52px] lg:py-3 lg:text-base"
      >
        {gonderiliyor ? 'Gönderiliyor…' : 'Sipariş Ver'}
      </button>
    </>
  );

  return (
    <div className="grid gap-3 pb-24 sm:gap-4 lg:grid-cols-[1fr_320px] lg:pb-0">
      <div className="space-y-2 sm:space-y-3">
        {/* Arama + kategoriler — mobilde sticky */}
        <div className="sticky top-11 z-20 -mx-2 space-y-2 border-b border-transparent bg-background/95 px-2 pt-1 pb-2 backdrop-blur supports-[backdrop-filter]:bg-background/80 sm:static sm:top-auto sm:mx-0 sm:border-0 sm:bg-transparent sm:p-0 sm:backdrop-blur-0">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
            <input
              type="search"
              value={arama}
              onChange={(e) => setArama(e.target.value)}
              placeholder="Ürün ara…"
              className="w-full rounded-md border bg-background pl-9 pr-3 py-2 text-sm outline-none focus:ring-2 focus:ring-ring"
            />
            {arama && (
              <button
                type="button"
                onClick={() => setArama('')}
                className="absolute right-1.5 top-1/2 -translate-y-1/2 rounded-md p-1 text-muted-foreground hover:text-foreground sm:right-2"
                aria-label="Aramayı temizle"
              >
                <X className="size-4" />
              </button>
            )}
          </div>

          {!aramaAktif && (
            <nav
              ref={chipBarRef}
              className="flex items-center gap-1.5 overflow-x-auto pb-0.5 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
              aria-label="Kategoriler"
            >
              {kategoriler.map((k) => {
                const aktif = k.id === aktifKategoriId;
                return (
                  <button
                    key={k.id}
                    type="button"
                    data-chip-id={k.id}
                    onClick={() => kategoriyeGit(k.id)}
                    className={cn(
                      'whitespace-nowrap rounded-full border px-3.5 py-1.5 text-sm transition sm:px-3',
                      aktif
                        ? 'border-primary bg-primary text-primary-foreground'
                        : 'border-border bg-card text-muted-foreground hover:text-foreground',
                    )}
                  >
                    {k.ad}
                  </button>
                );
              })}
            </nav>
          )}
        </div>

        {/* Ürün feed'i — arama açıkken düz liste, normalde kategoriye göre gruplu */}
        {aramaAktif ? (
          <UrunListesi
            urunler={aramaSonuc}
            urunAdedi={urunAdedi}
            urunEkle={urunEkle}
            urunCikar={urunCikar}
            bosMesaj="Eşleşen ürün yok."
          />
        ) : (
          <div className="space-y-5">
            {kategoriler.map((k) => {
              const lst = kategoriUrunleri[k.id] ?? [];
              if (lst.length === 0) return null;
              return (
                <section
                  key={k.id}
                  ref={(el) => {
                    sectionRefs.current[k.id] = el;
                  }}
                  data-kategori-id={k.id}
                  className="scroll-mt-28 sm:scroll-mt-4"
                >
                  <h2 className="mb-2 font-serif text-base font-semibold sm:text-lg">
                    {k.ad}
                  </h2>
                  <UrunListesi
                    urunler={lst}
                    urunAdedi={urunAdedi}
                    urunEkle={urunEkle}
                    urunCikar={urunCikar}
                    bosMesaj=""
                  />
                </section>
              );
            })}
          </div>
        )}
      </div>

      {/* Masaüstü: sağ sticky sepet paneli */}
      <aside className="hidden space-y-3 rounded-lg border bg-card p-3 lg:block lg:sticky lg:top-20 lg:self-start">
        {sepetIcerigi}
      </aside>

      {/* Mobil: alt sticky özet barı */}
      <div className="fixed inset-x-0 bottom-0 z-30 border-t bg-card shadow-[0_-4px_12px_rgba(0,0,0,0.08)] lg:hidden">
        <div className="mx-auto flex max-w-6xl items-stretch gap-2 px-3 py-3.5 pb-[max(0.875rem,env(safe-area-inset-bottom))]">
          <button
            type="button"
            onClick={() => setSepetAcik(true)}
            disabled={sepet.length === 0}
            className="flex min-h-[60px] flex-1 items-center justify-between gap-2 rounded-xl border bg-background px-4 py-3 text-left transition active:scale-[0.98] disabled:opacity-60"
            aria-label="Sepeti gör"
          >
            <span className="text-base font-semibold">
              {sepetAdet > 0 ? `${sepetAdet} kalem` : 'Sepet boş'}
            </span>
            <span className="text-base tabular-nums text-muted-foreground">
              {formatTL(sepetTopla)}
            </span>
          </button>
          <button
            type="button"
            onClick={gonder}
            disabled={sepet.length === 0 || gonderiliyor}
            className="min-h-[60px] min-w-[160px] rounded-xl bg-primary px-6 py-3.5 text-lg font-semibold text-primary-foreground shadow-soft transition active:scale-[0.97] disabled:opacity-40"
          >
            {gonderiliyor ? 'Gönderiliyor…' : 'Sipariş Ver'}
          </button>
        </div>
      </div>

      {/* Mobil: sepet bottom sheet */}
      {sepetAcik && (
        <div
          role="dialog"
          aria-modal="true"
          className="fixed inset-0 z-40 flex items-end bg-background/80 backdrop-blur lg:hidden"
          onClick={() => setSepetAcik(false)}
        >
          <div
            className="flex max-h-[85vh] w-full flex-col gap-3 overflow-hidden rounded-t-2xl border bg-card p-4 pb-[max(1rem,env(safe-area-inset-bottom))] shadow-lg"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="mx-auto h-1 w-10 shrink-0 rounded-full bg-border" />
            <div className="flex-1 space-y-3 overflow-y-auto">
              {sepetIcerigi}
            </div>
          </div>
        </div>
      )}

      {opsiyonUrun && (
        <OpsiyonSecici
          urun={opsiyonUrun}
          onIptal={() => setOpsiyonUrun(null)}
          onEkle={opsiyonlaEkle}
        />
      )}
    </div>
  );
}

function UrunListesi({
  urunler,
  urunAdedi,
  urunEkle,
  urunCikar,
  bosMesaj,
}: {
  urunler: Urun[];
  urunAdedi: (id: string) => number;
  urunEkle: (u: Urun) => void;
  urunCikar: (u: Urun) => void;
  bosMesaj: string;
}) {
  if (urunler.length === 0) {
    return (
      <div className="rounded-lg border bg-card p-8 text-center text-sm text-muted-foreground">
        {bosMesaj}
      </div>
    );
  }
  return (
    <ul className="grid grid-cols-2 gap-2.5 sm:gap-3 lg:grid-cols-3">
      {urunler.map((u) => {
        const adet = urunAdedi(u.id);
        return (
          <li key={u.id}>
            <div
              role="button"
              tabIndex={0}
              onClick={() => urunEkle(u)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' || e.key === ' ') {
                  e.preventDefault();
                  urunEkle(u);
                }
              }}
              className="relative flex h-full min-h-[10rem] w-full cursor-pointer flex-col justify-between gap-3 rounded-xl border bg-card p-4 text-left shadow-soft transition active:bg-secondary/40 sm:min-h-[9rem]"
              aria-label={`${u.ad} ekle`}
            >
              <span className="block text-base font-semibold leading-snug line-clamp-3">
                {u.ad}
              </span>
              <div className="flex items-end justify-between gap-2">
                <span className="text-base font-medium tabular-nums text-foreground">
                  {formatTL(u.fiyatKurus)}
                </span>
                {adet === 0 ? (
                  <span
                    aria-hidden="true"
                    className="inline-flex h-12 min-w-12 shrink-0 items-center justify-center rounded-full bg-primary px-3 text-primary-foreground shadow-soft sm:h-11 sm:min-w-11"
                  >
                    <Plus className="size-5" strokeWidth={3} />
                  </span>
                ) : (
                  <div
                    className="inline-flex h-12 shrink-0 items-center rounded-full bg-primary text-primary-foreground shadow-soft sm:h-11"
                    onClick={(e) => e.stopPropagation()}
                  >
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        urunCikar(u);
                      }}
                      className="flex h-12 w-12 items-center justify-center rounded-l-full active:bg-primary/80 sm:h-11 sm:w-11"
                      aria-label={`${u.ad} azalt`}
                    >
                      <Minus className="size-5" strokeWidth={3} />
                    </button>
                    <span className="min-w-7 text-center text-base font-bold tabular-nums sm:min-w-6 sm:text-sm">
                      {adet}
                    </span>
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        urunEkle(u);
                      }}
                      className="flex h-12 w-12 items-center justify-center rounded-r-full active:bg-primary/80 sm:h-11 sm:w-11"
                      aria-label={`${u.ad} ekle`}
                    >
                      <Plus className="size-5" strokeWidth={3} />
                    </button>
                  </div>
                )}
              </div>
            </div>
          </li>
        );
      })}
    </ul>
  );
}

function OpsiyonSecici({
  urun,
  onIptal,
  onEkle,
}: {
  urun: Urun;
  onIptal: () => void;
  onEkle: (urun: Urun, secimler: SepetSecim[], ekFiyat: number) => void;
}) {
  // Her grup için varsayılan seçim: zorunlu/tek tipte ilk seçenek
  const [secimler, setSecimler] = useState<Record<string, Set<string>>>(() => {
    const out: Record<string, Set<string>> = {};
    for (const g of urun.opsiyonGruplari ?? []) {
      out[g.id] =
        g.zorunlu && g.tip === 'tek' && g.secenekler[0]
          ? new Set([g.secenekler[0].id])
          : new Set();
    }
    return out;
  });

  const grup = (g: UrunOpsiyonGrubu, secenekId: string, checked: boolean) => {
    setSecimler((prev) => {
      const yeni = new Set(prev[g.id]);
      if (g.tip === 'tek') {
        yeni.clear();
        if (checked) yeni.add(secenekId);
      } else {
        if (checked) yeni.add(secenekId);
        else yeni.delete(secenekId);
      }
      return { ...prev, [g.id]: yeni };
    });
  };

  const ekFiyat = (urun.opsiyonGruplari ?? []).reduce((acc, g) => {
    const set = secimler[g.id];
    if (!set) return acc;
    return (
      acc +
      g.secenekler
        .filter((sc) => set.has(sc.id))
        .reduce((a, sc) => a + sc.ekFiyatKurus, 0)
    );
  }, 0);

  const eksikGrup = (urun.opsiyonGruplari ?? []).find(
    (g) => g.zorunlu && (secimler[g.id]?.size ?? 0) === 0,
  );

  const ekle = () => {
    if (eksikGrup) return;
    const liste: SepetSecim[] = [];
    for (const g of urun.opsiyonGruplari ?? []) {
      const set = secimler[g.id] ?? new Set<string>();
      const secilenler = g.secenekler.filter((sc) => set.has(sc.id));
      if (secilenler.length === 0) continue;
      liste.push({
        grupId: g.id,
        grupAd: g.ad,
        secenekler: secilenler.map((sc) => ({
          id: sc.id,
          ad: sc.ad,
          ekFiyatKurus: sc.ekFiyatKurus as number,
        })),
      });
    }
    onEkle(urun, liste, ekFiyat);
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      className="fixed inset-0 z-50 flex items-end justify-center bg-background/80 p-0 backdrop-blur sm:items-center sm:p-6"
      onClick={onIptal}
    >
      <div
        className="w-full max-w-md space-y-4 rounded-t-2xl border bg-card p-4 shadow-lg sm:rounded-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between gap-2">
          <h2 className="font-serif text-lg">{urun.ad}</h2>
          <button
            type="button"
            onClick={onIptal}
            className="rounded-md p-1 text-muted-foreground hover:text-foreground"
            aria-label="Kapat"
          >
            <X className="size-5" />
          </button>
        </div>

        <div className="max-h-[60vh] space-y-4 overflow-y-auto">
          {(urun.opsiyonGruplari ?? []).map((g) => (
            <div key={g.id} className="space-y-1.5">
              <div className="flex items-baseline justify-between">
                <span className="text-sm font-medium">{g.ad}</span>
                <span className="text-xs text-muted-foreground">
                  {g.zorunlu ? 'zorunlu' : 'opsiyonel'} ·{' '}
                  {g.tip === 'tek' ? 'tek seç' : 'çoklu seç'}
                </span>
              </div>
              <ul className="space-y-1">
                {g.secenekler.map((sc) => {
                  const seciliMi = secimler[g.id]?.has(sc.id) ?? false;
                  return (
                    <li key={sc.id}>
                      <label
                        className={cn(
                          'flex cursor-pointer items-center justify-between gap-2 rounded-md border px-3 py-2 text-sm',
                          seciliMi
                            ? 'border-primary bg-primary/5'
                            : 'border-border bg-background',
                        )}
                      >
                        <span className="flex items-center gap-2">
                          <input
                            type={g.tip === 'tek' ? 'radio' : 'checkbox'}
                            name={`grup-${g.id}`}
                            checked={seciliMi}
                            onChange={(e) => grup(g, sc.id, e.target.checked)}
                            className="size-4 accent-primary"
                          />
                          {sc.ad}
                        </span>
                        {sc.ekFiyatKurus > 0 && (
                          <span className="text-xs tabular-nums text-muted-foreground">
                            +{formatTL(sc.ekFiyatKurus)}
                          </span>
                        )}
                      </label>
                    </li>
                  );
                })}
              </ul>
            </div>
          ))}
        </div>

        <div className="flex items-center justify-between border-t pt-3 text-sm">
          <span className="text-muted-foreground">Birim fiyat</span>
          <span className="font-semibold tabular-nums">
            {formatTL(urun.fiyatKurus + ekFiyat)}
          </span>
        </div>

        <button
          type="button"
          onClick={ekle}
          disabled={!!eksikGrup}
          className="w-full rounded-md bg-primary px-3 py-2 text-sm font-medium text-primary-foreground disabled:opacity-50"
        >
          {eksikGrup ? `${eksikGrup.ad} seç` : 'Sepete ekle'}
        </button>
      </div>
    </div>
  );
}
