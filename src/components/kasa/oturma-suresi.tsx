'use client';

import { useEffect, useState } from 'react';
import { formatSure } from '@/lib/utils/sure';

// Açık masanın ne kadar süredir oturulduğunu canlı gösterir: baslangicMs
// (adisyon.acilisAt) referans alınır, her saniye yeniden hesaplanır.
// İlk render'da (SSR/hidrasyon) boş döner — sunucu/istemci saat farkından
// kaynaklı hidrasyon uyumsuzluğunu önlemek için süre yalnız mount sonrası çizilir.

export function OturmaSuresi({
  baslangicMs,
  className,
}: {
  baslangicMs: number;
  className?: string;
}) {
  const [simdi, setSimdi] = useState<number | null>(null);

  useEffect(() => {
    setSimdi(Date.now());
    const id = setInterval(() => setSimdi(Date.now()), 1000);
    return () => clearInterval(id);
  }, []);

  if (simdi === null) return null;
  const sn = Math.round((simdi - baslangicMs) / 1000);
  return <span className={className}>{formatSure(sn)}</span>;
}
