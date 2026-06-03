'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Check, Minus, Plus, Users } from 'lucide-react';
import { formatTL } from '@/lib/utils/para';
import type { SiparisDurumu } from '@/types/model';

interface KalemOzet {
  ad: string;
  /** Henüz ödenmemiş (kalan) birim adedi. */
  adet: number;
  /** Tek birim fiyatı — birim birim ödeme için. */
  birimKurus: number;
  araToplamKurus: number;
}

interface SiparisOzet {
  id: string;
  gunlukNo: number;
  durum: SiparisDurumu;
  musteriAd?: string;
  kalemler: KalemOzet[];
  toplamKurus: number;
}

interface Props {
  adisyonId: string;
  /** Adisyonun kalan (ödenmemiş) tutarı. */
  toplamKurus: number;
  /** Adisyonun değişmeyen genel toplamı — "Kişi başı" sabit gösterimi için. */
  genelToplamKurus: number;
  siparisler: SiparisOzet[];
}

type Sekme = 'tam' | 'esit' | 'urun';

export function KasiyerBolme({
  adisyonId,
  toplamKurus,
  genelToplamKurus,
  siparisler,
}: Props) {
  const router = useRouter();
  const [aktifSekme, setAktifSekme] = useState<Sekme>('tam');
  const [kisiSayisi, setKisiSayisi] = useState(2);
  // Ürün seçerek ödeme: kalem anahtarı → seçilen birim adedi.
  const [seciliAdet, setSeciliAdet] = useState<Map<string, number>>(new Map());
  const [odenenSayisi, setOdenenSayisi] = useState(0);
  // Eşit bölmenin tabanı: ilk dilim ödenince o anki KALAN tutara sabitlenir.
  // Böylece önceden ürün seçerek kısmi ödeme yapıldıysa, eşit bölme genel
  // toplam değil kalan tutar üzerinden yapılır.
  const [esitTaban, setEsitTaban] = useState<number | null>(null);
  const [yukleniyor, setYukleniyor] = useState<string | null>(null);
  const [hata, setHata] = useState<string | null>(null);

  // Adisyon tamamen ödendiyse (kalan = 0) ödeme alanı yerine "Tamamen ödendi"
  // durumu gösterilir; 0 tutarlı talep oluşmaz.
  const tamamenOdendi = toplamKurus <= 0;

  const aktifSiparisler = siparisler.filter((s) => s.durum !== 'iptal');

  // Tüm aktif sipariş kalemleri (teslim durumu fark etmeksizin)
  const tumKalemler = aktifSiparisler.flatMap((s) =>
    s.kalemler.map((k, i) => ({
      key: `${s.id}-${i}`,
      siparisId: s.id,
      siparisNo: s.gunlukNo,
      musteriAd: s.musteriAd,
      ad: k.ad,
      adet: k.adet,
      birimKurus: k.birimKurus,
      araToplamKurus: k.araToplamKurus,
    })),
  );

  const seciliAdetToplam = Array.from(seciliAdet.values()).reduce(
    (acc, n) => acc + n,
    0,
  );
  const seciliToplam = Array.from(seciliAdet.entries()).reduce(
    (acc, [key, qty]) => {
      const item = tumKalemler.find((k) => k.key === key);
      return acc + (item ? item.birimKurus * qty : 0);
    },
    0,
  );

  // Bölünecek taban: ilk dilim ödendiyse sabitlenmiş tutar, yoksa o anki kalan.
  // Bir kişi ödeyince diğerlerinin payı düşmüş gibi görünmesin diye sabitlenir;
  // ama ürün seçerek yapılan kısmi ödemeler kalandan otomatik düşülmüş olur.
  const esitTabanKurus = esitTaban ?? toplamKurus;
  const kisiPayi = Math.ceil(esitTabanKurus / Math.max(1, kisiSayisi));

  const setKalemAdet = (key: string, adet: number) => {
    setSeciliAdet((prev) => {
      const next = new Map(prev);
      if (adet <= 0) next.delete(key);
      else next.set(key, adet);
      return next;
    });
  };

  const talep = async (
    body: Record<string, unknown>,
    anahtarId: string,
    onSuccess?: () => void,
  ) => {
    setYukleniyor(anahtarId);
    setHata(null);
    try {
      const res = await fetch(`/api/adisyon/${adisyonId}/kasiyer-talep`, {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify(body),
      });
      if (!res.ok) {
        const j = (await res.json().catch(() => ({}))) as { mesaj?: string };
        throw new Error(j.mesaj ?? `HTTP ${res.status}`);
      }
      onSuccess?.();
      router.refresh();
    } catch (e) {
      setHata(e instanceof Error ? e.message : 'Hata oluştu.');
    } finally {
      setYukleniyor(null);
    }
  };

  const tamOde = () => {
    if (tamamenOdendi) return; // 0 tutarlı talep guard'ı
    talep({ yontem: 'tam' }, `tam-${Date.now()}`);
  };

  const esitDilimOde = () => {
    if (tamamenOdendi) return; // 0 tutarlı talep guard'ı
    const taban = esitTaban ?? toplamKurus;
    const anahtar = `esit-${odenenSayisi}`;
    talep({ yontem: 'esit', kisiSayisi, tabanKurus: taban }, anahtar, () => {
      setEsitTaban(taban); // bölme tabanını ilk ödemede sabitle
      setOdenenSayisi((n) => n + 1);
    });
  };

  const urunOde = () => {
    if (tamamenOdendi) return; // 0 tutarlı talep guard'ı
    const kalemler = Array.from(seciliAdet.entries()).flatMap(([key, qty]) => {
      const item = tumKalemler.find((k) => k.key === key);
      if (!item || qty <= 0) return [];
      return [{
        siparisId: item.siparisId,
        siparisNo: item.siparisNo,
        ad: item.ad,
        adet: qty,
        araToplamKurus: item.birimKurus * qty,
      }];
    });
    if (kalemler.length === 0) return;
    const secimToplam = kalemler.reduce((acc, k) => acc + k.araToplamKurus, 0);
    if (secimToplam <= 0) return; // 0 tutarlı talep guard'ı
    talep(
      { yontem: 'urun', secilenKalemler: kalemler },
      `urun-${Date.now()}`,
      () => setSeciliAdet(new Map()),
    );
  };

  const sekmeler: { id: Sekme; etiket: string }[] = [
    { id: 'tam', etiket: 'Hesabı Öde' },
    { id: 'esit', etiket: 'Eşit Bölerek Öde' },
    { id: 'urun', etiket: 'Ürün Seçerek Öde' },
  ];

  return (
    <div className="space-y-3 rounded-lg border bg-card p-3">
      <div className="flex items-center gap-2 text-base font-semibold">
        <Users className="size-5" />
        Ödemeyi Al
      </div>

      {hata && (
        <p className="rounded-lg bg-destructive/10 px-3 py-2 text-xs text-destructive">
          {hata}
        </p>
      )}

      {tamamenOdendi ? (
        <div className="flex items-center gap-2 rounded-lg border border-emerald-600/30 bg-emerald-50 px-3 py-3 text-sm font-medium text-emerald-900 dark:bg-emerald-950/30 dark:text-emerald-200">
          <Check className="size-4 shrink-0" />
          Adisyon tamamen ödendi. Aşağıdan adisyonu kapatabilirsiniz.
        </div>
      ) : (
        <>
          {/* Sekme seçici */}
          <div className="flex gap-2 rounded-xl bg-muted p-1">
            {sekmeler.map((s) => (
              <button
                key={s.id}
                type="button"
                onClick={() => setAktifSekme(s.id)}
                className={`flex min-h-[3.5rem] flex-1 items-center justify-center rounded-lg px-2 py-2 text-center text-sm font-semibold leading-tight transition-colors ${
                  aktifSekme === s.id
                    ? 'bg-background text-foreground shadow-sm ring-1 ring-border'
                    : 'text-muted-foreground active:bg-background/50'
                }`}
              >
                {s.etiket}
              </button>
            ))}
          </div>

      {/* ─── Hesabı Öde (tüm masa tek seferde) ───────── */}
      {aktifSekme === 'tam' && (
        <div className="space-y-3">
          <div className="rounded-lg bg-muted/50 px-3 py-2 text-sm">
            <div className="flex justify-between text-muted-foreground">
              <span>Toplam</span>
              <span>{formatTL(genelToplamKurus)}</span>
            </div>
            <div className="flex justify-between font-medium mt-1">
              <span>Kalan</span>
              <span>{formatTL(toplamKurus)}</span>
            </div>
          </div>
          <button
            type="button"
            onClick={tamOde}
            disabled={!!yukleniyor}
            className="min-h-[56px] w-full rounded-xl bg-primary px-4 text-base font-bold text-primary-foreground shadow-soft transition active:scale-[0.98] disabled:opacity-50"
          >
            {yukleniyor ? '…' : `${formatTL(toplamKurus)} — Hesabı Öde`}
          </button>
        </div>
      )}

      {/* ─── Eşit Böl ────────────────────────────────── */}
      {aktifSekme === 'esit' && (
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-base text-muted-foreground">Kişi sayısı</span>
            <div className="flex items-center gap-3">
              <button
                type="button"
                onClick={() => setKisiSayisi((k) => Math.max(1, k - 1))}
                disabled={kisiSayisi <= 1}
                className="flex size-11 items-center justify-center rounded-full border active:bg-secondary disabled:opacity-40"
              >
                <Minus className="size-5" />
              </button>
              <span className="w-8 text-center text-lg font-semibold tabular-nums">
                {kisiSayisi}
              </span>
              <button
                type="button"
                onClick={() => setKisiSayisi((k) => Math.min(20, k + 1))}
                className="flex size-11 items-center justify-center rounded-full border active:bg-secondary"
              >
                <Plus className="size-5" />
              </button>
            </div>
          </div>

          <div className="rounded-lg bg-muted/50 px-3 py-2 text-sm">
            <div className="flex justify-between text-muted-foreground">
              <span>Bölünecek (kalan)</span>
              <span>{formatTL(esitTabanKurus)}</span>
            </div>
            <div className="flex justify-between font-medium mt-1">
              <span>Kişi başı</span>
              <span>{formatTL(kisiPayi)}</span>
            </div>
          </div>

          <div className="space-y-1.5">
            {Array.from({ length: kisiSayisi }).map((_, i) => {
              const odendi = i < odenenSayisi;
              const aktif = i === odenenSayisi;
              return (
                <div
                  key={i}
                  className="flex items-center justify-between gap-2 rounded-lg border px-3 py-2.5"
                >
                  <span className="text-base text-muted-foreground">
                    {i + 1}. kişi — {formatTL(kisiPayi)}
                  </span>
                  {odendi ? (
                    <span className="flex items-center gap-1 text-sm text-emerald-700 dark:text-emerald-400">
                      <Check className="size-4" /> Ödendi
                    </span>
                  ) : aktif ? (
                    <button
                      type="button"
                      onClick={esitDilimOde}
                      disabled={!!yukleniyor}
                      className="min-h-[44px] rounded-lg bg-primary px-5 text-base font-bold text-primary-foreground shadow-soft transition active:scale-[0.98] disabled:opacity-50"
                    >
                      {yukleniyor ? '…' : 'Ödeme al'}
                    </button>
                  ) : (
                    <span className="text-sm text-muted-foreground">bekliyor</span>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* ─── Ürün Seç ────────────────────────────────── */}
      {aktifSekme === 'urun' && (
        <div className="space-y-2">
          {tumKalemler.length === 0 ? (
            <p className="py-3 text-center text-sm text-muted-foreground">
              Henüz sipariş kalemi yok.
            </p>
          ) : (
            <>
              <ul className="max-h-72 space-y-0.5 overflow-y-auto">
                {aktifSiparisler.map((s) => (
                  <li key={s.id}>
                    <p className="px-2 pt-1.5 text-[11px] font-medium uppercase tracking-wide text-muted-foreground">
                      {s.musteriAd
                        ? `${s.musteriAd} — #${s.gunlukNo}`
                        : `Sipariş #${s.gunlukNo}`}
                    </p>
                    {s.kalemler.map((k, i) => {
                      const key = `${s.id}-${i}`;
                      const sec = seciliAdet.get(key) ?? 0;
                      return (
                        <div
                          key={key}
                          className="flex items-center gap-3 rounded-lg px-2 py-2.5"
                        >
                          <div className="min-w-0 flex-1">
                            <span className="text-base">
                              <span className="tabular-nums text-muted-foreground">
                                {k.adet}×
                              </span>{' '}
                              {k.ad}
                            </span>
                            <span className="block text-xs tabular-nums text-muted-foreground">
                              {formatTL(k.birimKurus)} / adet
                            </span>
                          </div>
                          {k.adet === 1 ? (
                            <button
                              type="button"
                              onClick={() => setKalemAdet(key, sec > 0 ? 0 : 1)}
                              className={`flex size-11 items-center justify-center rounded-lg border transition active:scale-[0.97] ${
                                sec > 0
                                  ? 'border-primary bg-primary text-primary-foreground'
                                  : 'active:bg-secondary'
                              }`}
                              aria-label={sec > 0 ? 'Seçimi kaldır' : 'Seç'}
                            >
                              <Check className="size-5" />
                            </button>
                          ) : (
                            <div className="flex items-center gap-2">
                              <button
                                type="button"
                                onClick={() => setKalemAdet(key, Math.max(0, sec - 1))}
                                disabled={sec <= 0}
                                className="flex size-11 items-center justify-center rounded-full border active:bg-secondary disabled:opacity-40"
                                aria-label="Azalt"
                              >
                                <Minus className="size-5" />
                              </button>
                              <span className="w-7 text-center text-lg font-semibold tabular-nums">
                                {sec}
                              </span>
                              <button
                                type="button"
                                onClick={() =>
                                  setKalemAdet(key, Math.min(k.adet, sec + 1))
                                }
                                disabled={sec >= k.adet}
                                className="flex size-11 items-center justify-center rounded-full border active:bg-secondary disabled:opacity-40"
                                aria-label="Artır"
                              >
                                <Plus className="size-5" />
                              </button>
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </li>
                ))}
              </ul>

              {seciliAdetToplam > 0 && (
                <div className="flex items-center justify-between gap-2 rounded-lg bg-muted/50 px-3 py-2.5">
                  <span className="text-lg font-semibold tabular-nums">
                    {seciliAdetToplam} ürün · {formatTL(seciliToplam)}
                  </span>
                  <button
                    type="button"
                    onClick={urunOde}
                    disabled={!!yukleniyor}
                    className="min-h-[48px] rounded-lg bg-primary px-5 text-base font-bold text-primary-foreground shadow-soft transition active:scale-[0.98] disabled:opacity-50"
                  >
                    {yukleniyor ? '…' : 'Ödeme al'}
                  </button>
                </div>
              )}
            </>
          )}
        </div>
      )}
        </>
      )}
    </div>
  );
}
