'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import { useOnay } from '@/components/ortak/onay-dialog';
import { formatSure } from '@/lib/utils/sure';

export function AdisyonuKapatBtn({
  adisyonId,
  kalanKurus,
}: {
  adisyonId: string;
  kalanKurus: number;
}) {
  const router = useRouter();
  const onay = useOnay();
  const [yukleniyor, setYukleniyor] = useState(false);
  const [hata, setHata] = useState<string | null>(null);

  const kapat = async () => {
    if (kalanKurus > 0) {
      toast.warning('Tüm ödemeler alınmadan adisyon kapatılamaz.');
      return;
    }
    const ok = await onay({
      baslik: 'Adisyonu kapat',
      mesaj: 'Adisyon kalıcı olarak kapatılır. İşlem geri alınamaz.',
      onayEtiket: 'Kapat',
      tehlikeli: true,
    });
    if (!ok) return;
    setYukleniyor(true);
    setHata(null);
    try {
      const res = await fetch(`/api/adisyon/${adisyonId}/kapat`, {
        method: 'POST',
      });
      if (!res.ok) {
        const j = (await res.json().catch(() => ({}))) as { mesaj?: string };
        throw new Error(j.mesaj ?? 'Kapatılamadı.');
      }
      const j = (await res.json().catch(() => ({}))) as {
        oturmaSuresiSn?: number;
      };
      toast.success(
        j.oturmaSuresiSn !== undefined
          ? `Adisyon kapatıldı · Masa ${formatSure(j.oturmaSuresiSn)} oturdu`
          : 'Adisyon kapatıldı.',
      );
      router.replace('/kasa/adisyonlar');
      router.refresh();
    } catch (e) {
      setHata(e instanceof Error ? e.message : 'Hata');
    } finally {
      setYukleniyor(false);
    }
  };

  return (
    <div className="space-y-2 rounded-lg border border-destructive/30 bg-destructive/5 p-3">
      {hata && <p className="text-sm text-destructive">{hata}</p>}
      <button
        type="button"
        onClick={kapat}
        disabled={yukleniyor || kalanKurus > 0}
        className="min-h-[56px] w-full rounded-xl bg-destructive px-4 text-base font-bold text-destructive-foreground shadow-soft transition active:scale-[0.98] disabled:opacity-40"
      >
        {yukleniyor
          ? 'Kapatılıyor…'
          : kalanKurus > 0
            ? 'Tüm ödemeler alınmadan kapatılamaz'
            : 'Adisyonu Kapat'}
      </button>
    </div>
  );
}
