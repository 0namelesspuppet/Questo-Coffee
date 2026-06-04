'use client';

import { useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { collection, onSnapshot, query, where } from 'firebase/firestore';
import { onAuthStateChanged } from 'firebase/auth';
import { getClientAuth, getClientDb } from '@/lib/firebase/client';

// SSR sayfayı yeniden yazmadan "canlı güncelleme" sağlar: verilen Firestore
// koleksiyonlarını client SDK ile dinler, bir DEĞİŞİKLİK olunca router.refresh()
// tetikler (debounce'lu). Sayfa aynı kalır (Admin SDK fetch + render); sadece veri
// gerçekten değişince otomatik tazelenir — manuel yenileme/her etkileşimde tam SSR
// çekimi yerine.
//
// Görünür çıktısı yoktur (null döner). Auth hazır olmadan dinlemeye başlamaz;
// onSnapshot hatası (emülatör/auth) sessizce yutulur — SSR verisi yine görünür.

export interface IzlemeSpec {
  /** Koleksiyon yolu (alt koleksiyon dahil, tek-parça slash path). */
  yol: string;
  /** Opsiyonel eşitlik filtresi alanı. */
  alan?: string;
  /** alan verildiyse karşılaştırma değeri. */
  deger?: string | number | boolean;
}

export function CanliYenile({ izle }: { izle: IzlemeSpec[] }) {
  const router = useRouter();
  const zamanlayici = useRef<ReturnType<typeof setTimeout> | null>(null);
  // Stabil bağımlılık: prop referansı her render değişse bile içerik aynıysa
  // effect yeniden kurulmasın.
  const izleKey = JSON.stringify(izle);

  useEffect(() => {
    const specs = JSON.parse(izleKey) as IzlemeSpec[];
    let firestoreUnsubs: Array<() => void> = [];
    const ilkGeldi = new Set<number>();

    const yenileDebounced = () => {
      if (zamanlayici.current) clearTimeout(zamanlayici.current);
      zamanlayici.current = setTimeout(() => router.refresh(), 250);
    };

    const authUnsub = onAuthStateChanged(getClientAuth(), (u) => {
      // Auth değişiminde dinleyicileri yeniden kur.
      firestoreUnsubs.forEach((f) => f());
      firestoreUnsubs = [];
      ilkGeldi.clear();
      if (!u) return;

      const db = getClientDb();
      specs.forEach((spec, i) => {
        const col = collection(db, spec.yol);
        const q =
          spec.alan !== undefined
            ? query(col, where(spec.alan, '==', spec.deger))
            : query(col);
        const unsub = onSnapshot(
          q,
          () => {
            // İlk snapshot = mevcut durum (SSR ile zaten geldi) → tazeleme.
            if (!ilkGeldi.has(i)) {
              ilkGeldi.add(i);
              return;
            }
            yenileDebounced();
          },
          () => {
            // Hata (auth/emülatör hazır değil) — sessiz geç; SSR verisi görünür.
          },
        );
        firestoreUnsubs.push(unsub);
      });
    });

    return () => {
      authUnsub();
      firestoreUnsubs.forEach((f) => f());
      if (zamanlayici.current) clearTimeout(zamanlayici.current);
    };
  }, [router, izleKey]);

  return null;
}
