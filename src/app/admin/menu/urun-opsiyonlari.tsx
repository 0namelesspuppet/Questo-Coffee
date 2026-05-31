'use client';

import { useEffect, useState } from 'react';
import { Plus, Trash2, X } from 'lucide-react';
import { toast } from 'sonner';
import type { Urun, UrunOpsiyonGrubu } from '@/types/model';
import { tlToKurus } from '@/lib/utils/para';
import { cn } from '@/lib/utils';

interface Props {
  urun: Urun | null;
  onKapat: () => void;
  onKaydet: () => void;
}

interface DuzenleGrup {
  id: string;
  ad: string;
  tip: 'tek' | 'cok';
  zorunlu: boolean;
  secenekler: Array<{ id: string; ad: string; ekFiyatTL: string }>;
}

// Kısa ID — opsiyon grubu/seçeneği için (Firestore'a gömülü dizi).
// Uygulama LAN http'de çalışır; güvenli olmayan bağlamda crypto.randomUUID
// tanımsızdır, bu yüzden crypto.getRandomValues (her yerde mevcut) kullanılır.
const ID_ALFABE =
  '0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz';
const idUret = (): string => {
  const bytes = new Uint8Array(8);
  crypto.getRandomValues(bytes);
  let s = '';
  for (const b of bytes) s += ID_ALFABE[b % ID_ALFABE.length];
  return s;
};

const grubuYukle = (g: UrunOpsiyonGrubu): DuzenleGrup => ({
  id: g.id,
  ad: g.ad,
  tip: g.tip,
  zorunlu: g.zorunlu,
  secenekler: g.secenekler.map((s) => ({
    id: s.id,
    ad: s.ad,
    ekFiyatTL: (s.ekFiyatKurus / 100).toString(),
  })),
});

export function UrunOpsiyonlariModal({ urun, onKapat, onKaydet }: Props) {
  const [gruplar, setGruplar] = useState<DuzenleGrup[]>([]);
  const [kaydediliyor, setKaydediliyor] = useState(false);

  useEffect(() => {
    if (!urun) return;
    setGruplar((urun.opsiyonGruplari ?? []).map(grubuYukle));
  }, [urun]);

  if (!urun) return null;

  const grupEkle = () =>
    setGruplar((g) => [
      ...g,
      {
        id: idUret(),
        ad: '',
        tip: 'tek',
        zorunlu: true,
        secenekler: [{ id: idUret(), ad: '', ekFiyatTL: '0' }],
      },
    ]);

  const grupSil = (grupId: string) =>
    setGruplar((g) => g.filter((x) => x.id !== grupId));

  const grupGuncelle = (grupId: string, p: Partial<DuzenleGrup>) =>
    setGruplar((g) =>
      g.map((x) => (x.id === grupId ? { ...x, ...p } : x)),
    );

  const secenekEkle = (grupId: string) =>
    setGruplar((g) =>
      g.map((x) =>
        x.id === grupId
          ? {
              ...x,
              secenekler: [
                ...x.secenekler,
                { id: idUret(), ad: '', ekFiyatTL: '0' },
              ],
            }
          : x,
      ),
    );

  const secenekSil = (grupId: string, secenekId: string) =>
    setGruplar((g) =>
      g.map((x) =>
        x.id === grupId
          ? { ...x, secenekler: x.secenekler.filter((s) => s.id !== secenekId) }
          : x,
      ),
    );

  const secenekGuncelle = (
    grupId: string,
    secenekId: string,
    p: Partial<{ ad: string; ekFiyatTL: string }>,
  ) =>
    setGruplar((g) =>
      g.map((x) =>
        x.id === grupId
          ? {
              ...x,
              secenekler: x.secenekler.map((s) =>
                s.id === secenekId ? { ...s, ...p } : s,
              ),
            }
          : x,
      ),
    );

  const kaydet = async () => {
    // Validasyon
    for (const grup of gruplar) {
      if (!grup.ad.trim()) {
        toast.error('Grup adı boş olamaz.');
        return;
      }
      if (grup.secenekler.length === 0) {
        toast.error(`${grup.ad}: en az bir seçenek olmalı.`);
        return;
      }
      for (const sec of grup.secenekler) {
        if (!sec.ad.trim()) {
          toast.error(`${grup.ad}: seçenek adı boş olamaz.`);
          return;
        }
        const fiyat = parseFloat(sec.ekFiyatTL.replace(',', '.'));
        if (isNaN(fiyat) || fiyat < 0) {
          toast.error(`${sec.ad}: geçerli bir ek fiyat girin.`);
          return;
        }
      }
    }

    const payload = {
      opsiyonGruplari: gruplar.map((g) => ({
        id: g.id,
        ad: g.ad.trim(),
        tip: g.tip,
        zorunlu: g.zorunlu,
        secenekler: g.secenekler.map((s) => ({
          id: s.id,
          ad: s.ad.trim(),
          ekFiyatKurus: tlToKurus(
            parseFloat(s.ekFiyatTL.replace(',', '.')) || 0,
          ),
        })),
      })),
    };

    setKaydediliyor(true);
    try {
      const res = await fetch(`/api/admin/urun/${urun.id}`, {
        method: 'PATCH',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify(payload),
      });
      if (!res.ok) {
        const j = (await res.json().catch(() => ({}))) as { mesaj?: string };
        throw new Error(j.mesaj ?? 'Kaydedilemedi.');
      }
      toast.success('Opsiyonlar güncellendi.');
      onKaydet();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Hata');
    } finally {
      setKaydediliyor(false);
    }
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      className="fixed inset-0 z-40 flex items-end justify-center sm:items-center"
    >
      <button
        type="button"
        onClick={onKapat}
        aria-label="Kapat"
        className="absolute inset-0 bg-foreground/40 backdrop-blur-sm"
      />
      <div className="relative w-full max-w-2xl max-h-[92dvh] overflow-y-auto rounded-t-3xl bg-card shadow-floating anim-sheet-in sm:rounded-3xl">
        <header className="sticky top-0 z-10 flex items-center justify-between gap-3 border-b bg-card/95 px-5 py-3 backdrop-blur">
          <div>
            <p className="micro-caps text-muted-foreground">Opsiyonlar</p>
            <h2 className="font-serif text-xl leading-tight">{urun.ad}</h2>
          </div>
          <button
            type="button"
            onClick={onKapat}
            aria-label="Kapat"
            className="inline-flex size-9 items-center justify-center rounded-full bg-background text-foreground shadow-soft active:scale-90"
          >
            <X className="size-4" />
          </button>
        </header>

        <div className="space-y-4 p-5">
          {gruplar.length === 0 && (
            <p className="rounded-xl border border-dashed bg-muted/40 p-5 text-center text-sm text-muted-foreground">
              Bu ürünün opsiyonu yok. &quot;Grup ekle&quot; ile boy, şeker
              oranı, ekstra gibi seçimler ekleyebilirsin.
            </p>
          )}

          {gruplar.map((grup) => (
            <div
              key={grup.id}
              className="space-y-3 rounded-2xl border bg-background p-4"
            >
              <div className="flex items-start gap-2">
                <input
                  type="text"
                  value={grup.ad}
                  placeholder="Grup adı (örn. Boy)"
                  onChange={(e) =>
                    grupGuncelle(grup.id, { ad: e.target.value })
                  }
                  maxLength={60}
                  className="flex-1 rounded-lg border bg-card px-3 py-1.5 text-sm outline-none focus:ring-1 focus:ring-foreground"
                />
                <button
                  type="button"
                  onClick={() => grupSil(grup.id)}
                  aria-label="Grubu sil"
                  className="rounded-full p-2 text-destructive transition active:scale-90"
                >
                  <Trash2 className="size-4" />
                </button>
              </div>

              <div className="flex flex-wrap items-center gap-3 text-sm">
                <label className="inline-flex items-center gap-1.5">
                  <input
                    type="radio"
                    name={`tip-${grup.id}`}
                    checked={grup.tip === 'tek'}
                    onChange={() => grupGuncelle(grup.id, { tip: 'tek' })}
                  />
                  Tek seçim
                </label>
                <label className="inline-flex items-center gap-1.5">
                  <input
                    type="radio"
                    name={`tip-${grup.id}`}
                    checked={grup.tip === 'cok'}
                    onChange={() => grupGuncelle(grup.id, { tip: 'cok' })}
                  />
                  Çoklu
                </label>
                <label className="inline-flex items-center gap-1.5">
                  <input
                    type="checkbox"
                    checked={grup.zorunlu}
                    onChange={(e) =>
                      grupGuncelle(grup.id, { zorunlu: e.target.checked })
                    }
                  />
                  Zorunlu
                </label>
              </div>

              <ul className="space-y-1.5">
                {grup.secenekler.map((sec) => (
                  <li key={sec.id} className="flex items-center gap-2">
                    <input
                      type="text"
                      value={sec.ad}
                      placeholder="Seçenek (örn. Büyük)"
                      onChange={(e) =>
                        secenekGuncelle(grup.id, sec.id, {
                          ad: e.target.value,
                        })
                      }
                      maxLength={60}
                      className="flex-1 rounded-lg border bg-card px-3 py-1.5 text-sm outline-none focus:ring-1 focus:ring-foreground"
                    />
                    <div className="inline-flex items-center gap-1 rounded-lg border bg-card px-2 text-sm">
                      <span className="text-muted-foreground">+</span>
                      <input
                        type="text"
                        inputMode="decimal"
                        value={sec.ekFiyatTL}
                        onChange={(e) =>
                          secenekGuncelle(grup.id, sec.id, {
                            ekFiyatTL: e.target.value,
                          })
                        }
                        className="w-16 bg-transparent py-1.5 text-right tabular-nums outline-none"
                      />
                      <span className="text-xs text-muted-foreground">₺</span>
                    </div>
                    <button
                      type="button"
                      onClick={() => secenekSil(grup.id, sec.id)}
                      aria-label="Seçeneği sil"
                      className={cn(
                        'rounded-full p-1.5 text-muted-foreground transition active:scale-90',
                        grup.secenekler.length <= 1 && 'opacity-30',
                      )}
                      disabled={grup.secenekler.length <= 1}
                    >
                      <Trash2 className="size-3.5" />
                    </button>
                  </li>
                ))}
              </ul>

              <button
                type="button"
                onClick={() => secenekEkle(grup.id)}
                className="inline-flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground"
              >
                <Plus className="size-3.5" />
                Seçenek ekle
              </button>
            </div>
          ))}

          <button
            type="button"
            onClick={grupEkle}
            className="inline-flex w-full items-center justify-center gap-1.5 rounded-xl border border-dashed bg-card py-3 text-sm text-muted-foreground transition hover:bg-accent/40"
          >
            <Plus className="size-4" />
            Grup ekle (boy, şeker oranı, ekstra…)
          </button>
        </div>

        <footer className="sticky bottom-0 z-10 flex items-center justify-end gap-2 border-t bg-card/95 px-5 py-3 backdrop-blur">
          <button
            type="button"
            onClick={onKapat}
            className="rounded-full border bg-background px-4 py-2 text-sm"
          >
            İptal
          </button>
          <button
            type="button"
            onClick={kaydet}
            disabled={kaydediliyor}
            className="rounded-full bg-primary px-4 py-2 text-sm font-medium text-primary-foreground shadow-soft disabled:opacity-50"
          >
            {kaydediliyor ? 'Kaydediliyor…' : 'Kaydet'}
          </button>
        </footer>
      </div>
    </div>
  );
}
