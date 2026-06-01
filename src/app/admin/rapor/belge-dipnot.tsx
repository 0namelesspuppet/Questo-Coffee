'use client';

import { useEffect, useState } from 'react';

const istFmt = new Intl.DateTimeFormat('tr-TR', {
  timeZone: 'Europe/Istanbul',
  dateStyle: 'long',
  timeStyle: 'short',
});

/**
 * Belgenin (PDF) en altındaki "… tarihinde oluşturulmuştur" dipnotu.
 * Yalnız baskıda görünür (ekranda CSS ile gizli). Zaman, sunucu render anı
 * yerine baskı/kaydetme anında üretilir — böylece kaydedilen PDF güncel saati
 * taşır.
 */
export function BelgeDipnot({ restoranAd }: { restoranAd: string }) {
  const [zaman, setZaman] = useState('');

  useEffect(() => {
    const guncelle = () => setZaman(istFmt.format(new Date()));
    guncelle();
    // Kullanıcı "Belge olarak kaydet" deyip yazdırma diyaloğunu açtığında
    // zamanı tam o ana göre tazele.
    window.addEventListener('beforeprint', guncelle);
    return () => window.removeEventListener('beforeprint', guncelle);
  }, []);

  return (
    <div className="belge-dipnot">
      {restoranAd} · Bu belge {zaman} tarihinde Questo tarafından
      oluşturulmuştur.
    </div>
  );
}
