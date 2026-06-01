'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { RotateCcw, Trash2 } from 'lucide-react';
import { toast } from 'sonner';
import { useOnay } from '@/components/ortak/onay-dialog';

/**
 * Seçili günün raporunu sıfırlar (günün tüm siparişlerini rapor dışı bırakır)
 * veya sıfırlamayı geri alır. Veri silinmez; yalnız rapor istatistiğinden
 * çıkarılır — denemelik/test günlerini temizlemek için.
 */
export function RaporSifirlaBtn({
  tarih,
  haricVar,
  hedefler,
}: {
  tarih: string;
  haricVar: boolean;
  /** Rapor sayfasının o an gösterdiği günün siparişleri (adisyonId+siparisId). */
  hedefler: { adisyonId: string; siparisId: string }[];
}) {
  const onay = useOnay();
  const router = useRouter();
  const [yukleniyor, setYukleniyor] = useState(false);

  const calistir = async (haric: boolean) => {
    if (haric) {
      const ok = await onay({
        baslik: 'Günün raporunu sıfırla',
        mesaj:
          'Bu günün TÜM siparişleri rapordan çıkarılacak (ciro sıfırlanır). ' +
          'Siparişler silinmez, istediğin zaman geri alabilirsin. Devam edilsin mi?',
        onayEtiket: 'Sıfırla',
        tehlikeli: true,
      });
      if (!ok) return;
    }
    setYukleniyor(true);
    try {
      const res = await fetch('/api/admin/rapor-sifirla', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ tarih, haric, hedefler }),
      });
      if (!res.ok) {
        const j = (await res.json().catch(() => ({}))) as { mesaj?: string };
        throw new Error(j.mesaj ?? `HTTP ${res.status}`);
      }
      const j = (await res.json()) as { etkilenen?: number };
      toast.success(
        haric
          ? `Rapor sıfırlandı (${j.etkilenen ?? 0} sipariş çıkarıldı).`
          : `Sıfırlama geri alındı (${j.etkilenen ?? 0} sipariş geri eklendi).`,
      );
      router.refresh();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'İşlem başarısız.');
    } finally {
      setYukleniyor(false);
    }
  };

  return (
    <div className="flex items-center gap-2">
      {haricVar && (
        <button
          type="button"
          onClick={() => void calistir(false)}
          disabled={yukleniyor}
          className="inline-flex items-center gap-1.5 rounded-md border px-3 py-1 text-sm text-emerald-700 disabled:opacity-50 dark:text-emerald-400"
        >
          <RotateCcw className="size-4" />
          Sıfırlamayı geri al
        </button>
      )}
      <button
        type="button"
        onClick={() => void calistir(true)}
        disabled={yukleniyor}
        className="inline-flex items-center gap-1.5 rounded-md border border-destructive/40 px-3 py-1 text-sm text-destructive disabled:opacity-50"
      >
        <Trash2 className="size-4" />
        Raporu sıfırla
      </button>
    </div>
  );
}
