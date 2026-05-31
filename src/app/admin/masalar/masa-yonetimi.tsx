'use client';

import { useEffect, useState } from 'react';
import { Pencil, Plus, Trash2 } from 'lucide-react';
import { collection, onSnapshot, query } from 'firebase/firestore';
import { onAuthStateChanged } from 'firebase/auth';
import { getClientAuth, getClientDb } from '@/lib/firebase/client';
import { masaConverter } from '@/lib/firebase/converters';
import type { Masa } from '@/types/model';
import { cn } from '@/lib/utils';
import { karsilastirMasaAdi } from '@/lib/utils/masa';
import { useOnay } from '@/components/ortak/onay-dialog';

const RESTORAN = process.env.NEXT_PUBLIC_RESTORAN_ID as string;

export function MasaYonetimi() {
  const onay = useOnay();
  const [masalar, setMasalar] = useState<Masa[]>([]);
  const [yeni, setYeni] = useState({ acik: false, ad: '' });
  const [duzenleId, setDuzenleId] = useState<string | null>(null);
  const [duzenleAd, setDuzenleAd] = useState('');
  const [hata, setHata] = useState<string | null>(null);
  const [calisan, setCalisan] = useState<string | null>(null);
  const [authHazir, setAuthHazir] = useState(false);

  useEffect(() => {
    const unsub = onAuthStateChanged(getClientAuth(), async (u) => {
      if (u) await u.getIdToken(true);
      setAuthHazir(!!u);
    });
    return () => unsub();
  }, []);

  useEffect(() => {
    if (!authHazir) return;
    const q = query(
      collection(getClientDb(), `restoranlar/${RESTORAN}/masalar`).withConverter(
        masaConverter,
      ),
    );
    const unsub = onSnapshot(q, (s) =>
      setMasalar(
        s.docs.map((d) => d.data()).sort((a, b) => karsilastirMasaAdi(a.ad, b.ad)),
      ),
    );
    return () => unsub();
  }, [authHazir]);

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

  const ekle = async () => {
    if (!yeni.ad.trim()) return;
    try {
      setCalisan('yeni');
      await istek('/api/admin/masa', 'POST', { ad: yeni.ad.trim() });
      setYeni({ acik: false, ad: '' });
    } catch (e) {
      setHata(e instanceof Error ? e.message : 'Hata');
    } finally {
      setCalisan(null);
    }
  };

  const adKaydet = async (id: string) => {
    try {
      setCalisan(id);
      await istek(`/api/admin/masa/${id}`, 'PATCH', { ad: duzenleAd.trim() });
      setDuzenleId(null);
    } catch (e) {
      setHata(e instanceof Error ? e.message : 'Hata');
    } finally {
      setCalisan(null);
    }
  };

  const aktifDegistir = async (m: Masa, aktif: boolean) => {
    try {
      setCalisan(m.id);
      await istek(`/api/admin/masa/${m.id}`, 'PATCH', { aktifMi: aktif });
    } catch (e) {
      setHata(e instanceof Error ? e.message : 'Hata');
    } finally {
      setCalisan(null);
    }
  };

  const sil = async (m: Masa) => {
    const ok = await onay({
      baslik: `${m.ad} masasını sil`,
      mesaj: 'Masa kalıcı olarak silinir. Açık adisyonu olan masa silinemez.',
      onayEtiket: 'Sil',
      tehlikeli: true,
    });
    if (!ok) return;
    try {
      setCalisan(m.id);
      await istek(`/api/admin/masa/${m.id}`, 'DELETE');
    } catch (e) {
      setHata(e instanceof Error ? e.message : 'Hata');
    } finally {
      setCalisan(null);
    }
  };

  return (
    <div className="space-y-4">
      {hata && (
        <p
          role="alert"
          className="rounded-md border border-destructive/40 bg-destructive/5 px-3 py-2 text-sm text-destructive"
        >
          {hata}
        </p>
      )}

      <div className="flex items-center justify-between">
        <p className="text-sm text-muted-foreground">
          {masalar.length} masa
        </p>
        <button
          type="button"
          onClick={() => setYeni({ acik: true, ad: '' })}
          className="inline-flex items-center gap-1.5 rounded-md bg-primary px-3 py-1.5 text-sm text-primary-foreground"
        >
          <Plus className="size-4" />
          Yeni masa
        </button>
      </div>

      {yeni.acik && (
        <div className="flex gap-2 rounded-md border bg-card p-3">
          <input
            type="text"
            placeholder="Masa adı (örn. M3, Bahçe-2)"
            value={yeni.ad}
            onChange={(e) => setYeni((y) => ({ ...y, ad: e.target.value }))}
            className="flex-1 rounded-md border bg-background px-2 py-1.5 text-sm"
          />
          <button
            type="button"
            onClick={ekle}
            disabled={calisan === 'yeni' || !yeni.ad.trim()}
            className="rounded-md bg-primary px-3 py-1.5 text-sm text-primary-foreground disabled:opacity-50"
          >
            Ekle
          </button>
          <button
            type="button"
            onClick={() => setYeni({ acik: false, ad: '' })}
            className="rounded-md border px-3 py-1.5 text-sm"
          >
            İptal
          </button>
        </div>
      )}

      <ul className="space-y-2">
        {masalar.map((m) => {
          const calisiyor = calisan === m.id;
          return (
            <li
              key={m.id}
              className={cn(
                'flex flex-wrap items-center gap-3 rounded-lg border bg-card p-3',
                !m.aktifMi && 'opacity-60',
              )}
            >
              <div className="min-w-0 flex-1 space-y-0.5">
                {duzenleId === m.id ? (
                  <div className="flex gap-2">
                    <input
                      type="text"
                      value={duzenleAd}
                      onChange={(e) => setDuzenleAd(e.target.value)}
                      className="flex-1 rounded-md border bg-background px-2 py-1 text-sm"
                    />
                    <button
                      type="button"
                      onClick={() => adKaydet(m.id)}
                      disabled={calisiyor || !duzenleAd.trim()}
                      className="rounded-md bg-primary px-2.5 py-1 text-xs text-primary-foreground disabled:opacity-50"
                    >
                      Kaydet
                    </button>
                    <button
                      type="button"
                      onClick={() => setDuzenleId(null)}
                      className="rounded-md border px-2.5 py-1 text-xs"
                    >
                      İptal
                    </button>
                  </div>
                ) : (
                  <div className="font-medium">{m.ad}</div>
                )}
              </div>

              <div className="flex items-center gap-1">
                <label className="inline-flex items-center gap-1 text-xs text-muted-foreground">
                  <input
                    type="checkbox"
                    checked={m.aktifMi}
                    disabled={calisiyor}
                    onChange={(e) => aktifDegistir(m, e.target.checked)}
                  />
                  Aktif
                </label>
                <button
                  type="button"
                  aria-label="Adı düzenle"
                  onClick={() => {
                    setDuzenleId(m.id);
                    setDuzenleAd(m.ad);
                  }}
                  className="p-1.5"
                >
                  <Pencil className="size-3.5" />
                </button>
                <button
                  type="button"
                  aria-label="Sil"
                  disabled={calisiyor}
                  onClick={() => sil(m)}
                  className="p-1.5 text-destructive disabled:opacity-50"
                >
                  <Trash2 className="size-3.5" />
                </button>
              </div>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
