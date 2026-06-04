'use client';

import { useEffect, useMemo, useState } from 'react';
import { Pencil, Plus, Sliders, Trash2, X } from 'lucide-react';
import {
  collection,
  onSnapshot,
  orderBy,
  query,
} from 'firebase/firestore';
import { onAuthStateChanged } from 'firebase/auth';
import { getClientAuth, getClientDb } from '@/lib/firebase/client';
import {
  kategoriConverter,
  urunConverter,
} from '@/lib/firebase/converters';
import type { Kategori, Urun } from '@/types/model';
import { formatTL, tlToKurus } from '@/lib/utils/para';
import { cn } from '@/lib/utils';
import { useOnay } from '@/components/ortak/onay-dialog';
import { UrunOpsiyonlariModal } from './urun-opsiyonlari';

const RESTORAN = process.env.NEXT_PUBLIC_RESTORAN_ID as string;

interface KategoriForm {
  ad: string;
  sira: number;
  aktifMi: boolean;
}
interface UrunForm {
  ad: string;
  kategoriId: string;
  fiyatTL: string;
  aciklama: string;
  stoktaMi: boolean;
  stokMiktar: string; // boş ise sınırsız
  sira: number;
}

const bosKategori: KategoriForm = { ad: '', sira: 0, aktifMi: true };
const bosUrun: UrunForm = {
  ad: '',
  kategoriId: '',
  fiyatTL: '',
  aciklama: '',
  stoktaMi: true,
  stokMiktar: '',
  sira: 0,
};

export function MenuYonetimi() {
  const onay = useOnay();
  const [kategoriler, setKategoriler] = useState<Kategori[]>([]);
  const [urunler, setUrunler] = useState<Urun[]>([]);
  const [aktif, setAktif] = useState<string | null>(null);
  const [katForm, setKatForm] = useState<{
    acik: boolean;
    duzenleId: string | null;
    veri: KategoriForm;
  }>({ acik: false, duzenleId: null, veri: bosKategori });
  const [urunForm, setUrunForm] = useState<{
    acik: boolean;
    duzenleId: string | null;
    veri: UrunForm;
  }>({ acik: false, duzenleId: null, veri: bosUrun });
  const [opsiyonUrun, setOpsiyonUrun] = useState<Urun | null>(null);
  const [hata, setHata] = useState<string | null>(null);
  const [yukleniyor, setYukleniyor] = useState(true);

  useEffect(() => {
    const db = getClientDb();
    let u1: (() => void) | undefined;
    let u2: (() => void) | undefined;
    let katYuklendi = false;
    let urunYuklendi = false;
    const tamamlandiKontrol = () => {
      if (katYuklendi && urunYuklendi) setYukleniyor(false);
    };

    // Auth hazır olmadan onSnapshot kurmak permission hatası verir (kurallar
    // kasiyer girişi ister). Önce oturumu bekle, sonra dinlemeyi kur.
    const authUnsub = onAuthStateChanged(getClientAuth(), (user) => {
      u1?.();
      u2?.();
      u1 = undefined;
      u2 = undefined;
      katYuklendi = false;
      urunYuklendi = false;
      if (!user) return;

      const kQ = query(
        collection(db, `restoranlar/${RESTORAN}/kategoriler`).withConverter(
          kategoriConverter,
        ),
        orderBy('sira', 'asc'),
      );
      const uQ = query(
        collection(db, `restoranlar/${RESTORAN}/urunler`).withConverter(
          urunConverter,
        ),
        orderBy('sira', 'asc'),
      );
      // Boş durumu ("Henüz ürün yok.") yalnızca her iki sorgu da ilk kez
      // yüklendikten sonra göster; aksi halde veri gelmeden yanıltıcı görünür.
      u1 = onSnapshot(
        kQ,
        (s) => {
          setKategoriler(s.docs.map((d) => d.data()));
          katYuklendi = true;
          tamamlandiKontrol();
        },
        () => {},
      );
      u2 = onSnapshot(
        uQ,
        (s) => {
          setUrunler(s.docs.map((d) => d.data()));
          urunYuklendi = true;
          tamamlandiKontrol();
        },
        () => {},
      );
    });

    return () => {
      authUnsub();
      u1?.();
      u2?.();
    };
  }, []);

  useEffect(() => {
    if (!aktif && kategoriler[0]) setAktif(kategoriler[0].id);
  }, [kategoriler, aktif]);

  const goruntulenenUrunler = useMemo(
    () => urunler.filter((u) => u.kategoriId === aktif),
    [urunler, aktif],
  );

  const istek = async (
    yol: string,
    method: 'POST' | 'PATCH' | 'DELETE',
    body?: unknown,
  ) => {
    setHata(null);
    const res = await fetch(yol, {
      method,
      headers: body ? { 'content-type': 'application/json' } : undefined,
      body: body ? JSON.stringify(body) : undefined,
    });
    if (!res.ok) {
      const j = (await res.json().catch(() => ({}))) as { mesaj?: string };
      throw new Error(j.mesaj ?? 'İşlem başarısız.');
    }
    return res.json();
  };

  // ── Kategori işlemleri ─────────────────────────────────────────────
  const kategoriKaydet = async () => {
    try {
      const veri = katForm.veri;
      if (katForm.duzenleId) {
        await istek(`/api/admin/kategori/${katForm.duzenleId}`, 'PATCH', veri);
      } else {
        await istek('/api/admin/kategori', 'POST', veri);
      }
      setKatForm({ acik: false, duzenleId: null, veri: bosKategori });
    } catch (e) {
      setHata(e instanceof Error ? e.message : 'Hata');
    }
  };

  const kategoriSil = async (id: string) => {
    const ok = await onay({
      baslik: 'Kategoriyi sil',
      mesaj: 'Bu kategoriyi silmek istediğine emin misin? İşlem geri alınamaz.',
      onayEtiket: 'Sil',
      tehlikeli: true,
    });
    if (!ok) return;
    try {
      await istek(`/api/admin/kategori/${id}`, 'DELETE');
    } catch (e) {
      setHata(e instanceof Error ? e.message : 'Hata');
    }
  };

  // ── Ürün işlemleri ─────────────────────────────────────────────────
  const urunKaydet = async () => {
    try {
      const v = urunForm.veri;
      const tl = parseFloat(v.fiyatTL.replace(',', '.'));
      if (Number.isNaN(tl) || tl < 0) throw new Error('Geçersiz fiyat.');

      let stokMiktar: number | undefined;
      if (v.stokMiktar.trim() !== '') {
        const sm = parseInt(v.stokMiktar, 10);
        if (Number.isNaN(sm) || sm < 0) {
          throw new Error('Geçersiz stok miktarı.');
        }
        stokMiktar = sm;
      }

      const payload: Record<string, unknown> = {
        ad: v.ad,
        kategoriId: v.kategoriId || aktif,
        fiyatKurus: tlToKurus(tl),
        aciklama: v.aciklama || undefined,
        stoktaMi: v.stoktaMi,
        sira: v.sira,
        ...(stokMiktar !== undefined ? { stokMiktar } : {}),
      };
      if (urunForm.duzenleId) {
        await istek(`/api/admin/urun/${urunForm.duzenleId}`, 'PATCH', payload);
      } else {
        await istek('/api/admin/urun', 'POST', payload);
      }
      setUrunForm({ acik: false, duzenleId: null, veri: bosUrun });
    } catch (e) {
      setHata(e instanceof Error ? e.message : 'Hata');
    }
  };

  const urunSil = async (id: string) => {
    const ok = await onay({
      baslik: 'Ürünü sil',
      mesaj: 'Bu ürünü silmek istediğine emin misin? İşlem geri alınamaz.',
      onayEtiket: 'Sil',
      tehlikeli: true,
    });
    if (!ok) return;
    try {
      await istek(`/api/admin/urun/${id}`, 'DELETE');
    } catch (e) {
      setHata(e instanceof Error ? e.message : 'Hata');
    }
  };

  const stokDegistir = async (u: Urun, yeni: boolean) => {
    try {
      await istek(`/api/admin/urun/${u.id}`, 'PATCH', { stoktaMi: yeni });
    } catch (e) {
      setHata(e instanceof Error ? e.message : 'Hata');
    }
  };

  return (
    <div className="grid grid-cols-1 gap-4 md:grid-cols-[260px_1fr]">
      {hata && (
        <p
          role="alert"
          className="md:col-span-2 rounded-md border border-destructive/40 bg-destructive/5 px-3 py-2 text-sm text-destructive"
        >
          {hata}
        </p>
      )}

      {/* ── Kategoriler ── */}
      <aside className="space-y-2">
        <div className="flex items-center justify-between">
          <h2 className="text-sm font-medium">Kategoriler</h2>
          <button
            type="button"
            onClick={() =>
              setKatForm({ acik: true, duzenleId: null, veri: bosKategori })
            }
            className="inline-flex items-center gap-1 rounded-md border px-2 py-1 text-xs"
          >
            <Plus className="size-3.5" />
            Ekle
          </button>
        </div>
        <ul className="space-y-1">
          {kategoriler.map((k) => (
            <li key={k.id}>
              <div
                className={cn(
                  'group flex items-center justify-between gap-2 rounded-md border px-2 py-1.5',
                  aktif === k.id && 'border-primary bg-accent',
                )}
              >
                <button
                  type="button"
                  onClick={() => setAktif(k.id)}
                  className="flex-1 text-left text-sm"
                >
                  {k.ad}
                  {!k.aktifMi && (
                    <span className="ml-1 text-xs text-muted-foreground">
                      (pasif)
                    </span>
                  )}
                </button>
                <div className="flex shrink-0 gap-1 sm:opacity-0 sm:transition sm:group-hover:opacity-100">
                  <button
                    type="button"
                    aria-label="Düzenle"
                    onClick={() =>
                      setKatForm({
                        acik: true,
                        duzenleId: k.id,
                        veri: { ad: k.ad, sira: k.sira, aktifMi: k.aktifMi },
                      })
                    }
                    className="p-1"
                  >
                    <Pencil className="size-3.5" />
                  </button>
                  <button
                    type="button"
                    aria-label="Sil"
                    onClick={() => kategoriSil(k.id)}
                    className="p-1 text-destructive"
                  >
                    <Trash2 className="size-3.5" />
                  </button>
                </div>
              </div>
            </li>
          ))}
        </ul>

        {katForm.acik && (
          <div className="space-y-2 rounded-md border bg-card p-3">
            <input
              type="text"
              placeholder="Kategori adı"
              value={katForm.veri.ad}
              onChange={(e) =>
                setKatForm((f) => ({
                  ...f,
                  veri: { ...f.veri, ad: e.target.value },
                }))
              }
              className="w-full rounded-md border bg-background px-2 py-1.5 text-sm"
            />
            <div className="flex gap-2">
              <input
                type="number"
                min={0}
                placeholder="Sıra"
                value={katForm.veri.sira}
                onChange={(e) =>
                  setKatForm((f) => ({
                    ...f,
                    veri: { ...f.veri, sira: Number(e.target.value) },
                  }))
                }
                className="w-20 rounded-md border bg-background px-2 py-1.5 text-sm"
              />
              <label className="inline-flex items-center gap-1.5 text-sm">
                <input
                  type="checkbox"
                  checked={katForm.veri.aktifMi}
                  onChange={(e) =>
                    setKatForm((f) => ({
                      ...f,
                      veri: { ...f.veri, aktifMi: e.target.checked },
                    }))
                  }
                />
                Aktif
              </label>
            </div>
            <div className="flex gap-2">
              <button
                type="button"
                onClick={kategoriKaydet}
                disabled={!katForm.veri.ad.trim()}
                className="flex-1 rounded-md bg-primary px-3 py-1.5 text-sm text-primary-foreground disabled:opacity-50"
              >
                {katForm.duzenleId ? 'Güncelle' : 'Ekle'}
              </button>
              <button
                type="button"
                onClick={() =>
                  setKatForm({ acik: false, duzenleId: null, veri: bosKategori })
                }
                className="rounded-md border px-3 py-1.5 text-sm"
              >
                İptal
              </button>
            </div>
          </div>
        )}
      </aside>

      {/* ── Ürünler ── */}
      <section className="space-y-2">
        <div className="flex items-center justify-between">
          <h2 className="text-sm font-medium">
            Ürünler
            {aktif && (
              <span className="ml-2 text-xs text-muted-foreground">
                · {kategoriler.find((k) => k.id === aktif)?.ad}
              </span>
            )}
          </h2>
          {aktif && (
            <button
              type="button"
              onClick={() =>
                setUrunForm({
                  acik: true,
                  duzenleId: null,
                  veri: { ...bosUrun, kategoriId: aktif },
                })
              }
              className="inline-flex items-center gap-1 rounded-md border px-2 py-1 text-xs"
            >
              <Plus className="size-3.5" />
              Ürün ekle
            </button>
          )}
        </div>

        {urunForm.acik && (
          <div
            role="dialog"
            aria-modal="true"
            className="fixed inset-0 z-40 flex items-end justify-center sm:items-center"
          >
            <button
              type="button"
              onClick={() =>
                setUrunForm({ acik: false, duzenleId: null, veri: bosUrun })
              }
              aria-label="Kapat"
              className="absolute inset-0 bg-foreground/40 backdrop-blur-sm"
            />
            <div className="relative w-full max-w-lg max-h-[92dvh] overflow-y-auto rounded-t-3xl bg-card shadow-floating anim-sheet-in sm:rounded-3xl">
              <header className="sticky top-0 z-10 flex items-center justify-between gap-3 border-b bg-card/95 px-5 py-3 backdrop-blur">
                <h2 className="font-serif text-xl leading-tight">
                  {urunForm.duzenleId ? 'Ürünü düzenle' : 'Ürün ekle'}
                </h2>
                <button
                  type="button"
                  onClick={() =>
                    setUrunForm({ acik: false, duzenleId: null, veri: bosUrun })
                  }
                  aria-label="Kapat"
                  className="inline-flex size-9 items-center justify-center rounded-full bg-background text-foreground shadow-soft active:scale-90"
                >
                  <X className="size-4" />
                </button>
              </header>

              <div className="space-y-3 p-5">
                <label className="flex flex-col gap-1 text-xs text-muted-foreground">
                  Ürün adı
                  <input
                    type="text"
                    placeholder="Ürün adı"
                    value={urunForm.veri.ad}
                    onChange={(e) =>
                      setUrunForm((f) => ({
                        ...f,
                        veri: { ...f.veri, ad: e.target.value },
                      }))
                    }
                    className="w-full rounded-md border bg-background px-2 py-2 text-sm text-foreground"
                  />
                </label>
                <label className="flex flex-col gap-1 text-xs text-muted-foreground">
                  Açıklama (opsiyonel)
                  <textarea
                    placeholder="Açıklama"
                    rows={2}
                    value={urunForm.veri.aciklama}
                    onChange={(e) =>
                      setUrunForm((f) => ({
                        ...f,
                        veri: { ...f.veri, aciklama: e.target.value },
                      }))
                    }
                    className="w-full rounded-md border bg-background px-2 py-2 text-sm text-foreground"
                  />
                </label>
                <label className="flex flex-col gap-1 text-xs text-muted-foreground">
                  Kategori
                  <select
                    value={urunForm.veri.kategoriId}
                    onChange={(e) =>
                      setUrunForm((f) => ({
                        ...f,
                        veri: { ...f.veri, kategoriId: e.target.value },
                      }))
                    }
                    className="w-full rounded-md border bg-background px-2 py-2 text-sm text-foreground"
                  >
                    {kategoriler.map((k) => (
                      <option key={k.id} value={k.id}>
                        {k.ad}
                      </option>
                    ))}
                  </select>
                </label>
                <div className="grid grid-cols-2 gap-2">
                  <label className="flex flex-col gap-1 text-xs text-muted-foreground">
                    Fiyat (TL)
                    <input
                      type="text"
                      inputMode="decimal"
                      placeholder="0,00"
                      value={urunForm.veri.fiyatTL}
                      onChange={(e) =>
                        setUrunForm((f) => ({
                          ...f,
                          veri: { ...f.veri, fiyatTL: e.target.value },
                        }))
                      }
                      className="rounded-md border bg-background px-2 py-2 text-sm text-foreground"
                    />
                  </label>
                  <label className="flex flex-col gap-1 text-xs text-muted-foreground">
                    Sıra
                    <input
                      type="number"
                      min={0}
                      placeholder="0"
                      value={urunForm.veri.sira}
                      onChange={(e) =>
                        setUrunForm((f) => ({
                          ...f,
                          veri: { ...f.veri, sira: Number(e.target.value) },
                        }))
                      }
                      className="rounded-md border bg-background px-2 py-2 text-sm text-foreground"
                    />
                  </label>
                </div>
                <div className="flex flex-wrap items-center gap-3 text-sm">
                  <label className="inline-flex items-center gap-1.5">
                    <input
                      type="checkbox"
                      checked={urunForm.veri.stoktaMi}
                      onChange={(e) =>
                        setUrunForm((f) => ({
                          ...f,
                          veri: { ...f.veri, stoktaMi: e.target.checked },
                        }))
                      }
                    />
                    Stokta
                  </label>
                  <label className="inline-flex items-center gap-1.5">
                    <span className="text-muted-foreground">Stok adet:</span>
                    <input
                      type="number"
                      min={0}
                      placeholder="sınırsız"
                      value={urunForm.veri.stokMiktar}
                      onChange={(e) =>
                        setUrunForm((f) => ({
                          ...f,
                          veri: { ...f.veri, stokMiktar: e.target.value },
                        }))
                      }
                      className="w-20 rounded-md border bg-background px-2 py-1 text-sm tabular-nums"
                    />
                    <span className="text-xs text-muted-foreground">
                      boş = sınırsız
                    </span>
                  </label>
                </div>
              </div>

              <footer className="sticky bottom-0 z-10 flex items-center justify-end gap-2 border-t bg-card/95 px-5 py-3 backdrop-blur">
                <button
                  type="button"
                  onClick={() =>
                    setUrunForm({ acik: false, duzenleId: null, veri: bosUrun })
                  }
                  className="rounded-full border bg-background px-4 py-2 text-sm"
                >
                  İptal
                </button>
                <button
                  type="button"
                  onClick={urunKaydet}
                  disabled={!urunForm.veri.ad.trim() || !urunForm.veri.fiyatTL}
                  className="rounded-full bg-primary px-4 py-2 text-sm font-medium text-primary-foreground shadow-soft disabled:opacity-50"
                >
                  {urunForm.duzenleId ? 'Güncelle' : 'Ekle'}
                </button>
              </footer>
            </div>
          </div>
        )}

        <ul className="space-y-2">
          {yukleniyor ? (
            Array.from({ length: 4 }).map((_, i) => (
              <li
                key={i}
                className="flex items-start gap-3 rounded-lg border bg-card p-3"
              >
                <div className="flex-1 space-y-2 py-1">
                  <div className="h-4 w-1/3 animate-pulse rounded bg-muted" />
                  <div className="h-3 w-2/3 animate-pulse rounded bg-muted" />
                  <div className="h-4 w-16 animate-pulse rounded bg-muted" />
                </div>
              </li>
            ))
          ) : goruntulenenUrunler.length === 0 ? (
            <li className="rounded-lg border border-dashed bg-card/50 p-6 text-center text-xs text-muted-foreground">
              Henüz ürün yok.
            </li>
          ) : (
            goruntulenenUrunler.map((u) => (
              <li
                key={u.id}
                className="flex flex-wrap items-start gap-3 rounded-lg border bg-card p-3 sm:flex-nowrap"
              >
                <div className="flex-1 min-w-0">
                  <div className="font-medium">{u.ad}</div>
                  {u.aciklama && (
                    <p className="text-xs text-muted-foreground line-clamp-2">
                      {u.aciklama}
                    </p>
                  )}
                  <div className="mt-1 text-sm font-semibold">
                    {formatTL(u.fiyatKurus)}
                  </div>
                </div>
                <div className="flex w-full shrink-0 items-center justify-end gap-1 sm:w-auto">
                  <label className="mr-1 inline-flex items-center gap-1 text-xs text-muted-foreground">
                    <input
                      type="checkbox"
                      checked={u.stoktaMi}
                      onChange={(e) => stokDegistir(u, e.target.checked)}
                    />
                    Stokta
                  </label>
                  <button
                    type="button"
                    aria-label="Opsiyonlar"
                    title="Opsiyonlar (boy, şeker, ekstra)"
                    onClick={() => setOpsiyonUrun(u)}
                    className={cn(
                      'inline-flex h-9 min-w-9 items-center justify-center gap-0.5 rounded-md px-2',
                      (u.opsiyonGruplari?.length ?? 0) > 0 &&
                        'text-primary',
                    )}
                  >
                    <Sliders className="size-4" />
                    {(u.opsiyonGruplari?.length ?? 0) > 0 && (
                      <span className="text-[10px] tabular-nums">
                        {u.opsiyonGruplari!.length}
                      </span>
                    )}
                  </button>
                  <button
                    type="button"
                    aria-label="Düzenle"
                    onClick={() =>
                      setUrunForm({
                        acik: true,
                        duzenleId: u.id,
                        veri: {
                          ad: u.ad,
                          kategoriId: u.kategoriId,
                          fiyatTL: (u.fiyatKurus / 100).toString(),
                          aciklama: u.aciklama ?? '',
                          stoktaMi: u.stoktaMi,
                          stokMiktar:
                            u.stokMiktar !== undefined
                              ? String(u.stokMiktar)
                              : '',
                          sira: u.sira,
                        },
                      })
                    }
                    className="inline-flex size-9 items-center justify-center rounded-md"
                  >
                    <Pencil className="size-4" />
                  </button>
                  <button
                    type="button"
                    aria-label="Sil"
                    onClick={() => urunSil(u.id)}
                    className="inline-flex size-9 items-center justify-center rounded-md text-destructive"
                  >
                    <Trash2 className="size-4" />
                  </button>
                </div>
              </li>
            ))
          )}
        </ul>
      </section>

      <UrunOpsiyonlariModal
        urun={opsiyonUrun}
        onKapat={() => setOpsiyonUrun(null)}
        onKaydet={() => setOpsiyonUrun(null)}
      />
    </div>
  );
}
