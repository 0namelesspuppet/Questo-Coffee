'use client';

import { useEffect, useState } from 'react';
import { Printer } from 'lucide-react';
import { formatTL } from '@/lib/utils/para';

interface FisKalemi {
  ad: string;
  adet: number;
  araToplamKurus: number;
}

interface Props {
  restoranAd: string;
  restoranSehir?: string;
  masaAd: string;
  kalemler: FisKalemi[];
  toplamKurus: number;
  /** Kısmi ödeme yapıldıysa şimdiye dek ödenen tutar. */
  odenmisKurus?: number;
}

/**
 * Müşteri hesap fişi. "Yazdır" tıklanınca window.print() çağrılır; baskıda
 * yalnız .fis-belge görünür (globals.css @media print). 80mm dar kolon olarak
 * basılır — termal yazıcıya da A4'e de uyar (yazıcı kağıt boyutu Windows'tan).
 */
export function HesapFisi({
  restoranAd,
  restoranSehir,
  masaAd,
  kalemler,
  toplamKurus,
  odenmisKurus = 0,
}: Props) {
  const kalan = Math.max(0, toplamKurus - odenmisKurus);
  // Tarihi yalnız client'ta üret (SSR hidrasyon uyuşmazlığı olmasın diye boş başlar).
  const [tarih, setTarih] = useState('');
  useEffect(() => {
    setTarih(new Date().toLocaleString('tr-TR'));
  }, []);

  return (
    <>
      <button
        type="button"
        onClick={() => window.print()}
        className="yazdir-gizle inline-flex w-full items-center justify-center gap-1.5 rounded-md border px-3 py-2 text-sm font-medium text-foreground transition active:scale-[0.98]"
      >
        <Printer className="size-4" />
        Hesap Fişi Yazdır
      </button>

      <div className="fis-belge" aria-hidden="true">
        <div className="fis-baslik">
          <strong>{restoranAd}</strong>
          {restoranSehir ? <div>{restoranSehir}</div> : null}
        </div>
        <div className="fis-meta">
          {masaAd}
          {tarih ? ` · ${tarih}` : ''}
        </div>
        <hr />
        <ul className="fis-kalemler">
          {kalemler.map((k, i) => (
            <li key={`${k.ad}-${i}`}>
              <span>
                {k.adet}× {k.ad}
              </span>
              <span>{formatTL(k.araToplamKurus)}</span>
            </li>
          ))}
        </ul>
        <hr />
        {odenmisKurus > 0 ? (
          <>
            <div className="fis-satir">
              <span>Toplam</span>
              <span>{formatTL(toplamKurus)}</span>
            </div>
            <div className="fis-satir">
              <span>Ödenen</span>
              <span>-{formatTL(odenmisKurus)}</span>
            </div>
            <div className="fis-toplam">
              <span>Kalan</span>
              <span>{formatTL(kalan)}</span>
            </div>
          </>
        ) : (
          <div className="fis-toplam">
            <span>Toplam</span>
            <span>{formatTL(toplamKurus)}</span>
          </div>
        )}
        <div className="fis-dipnot">Teşekkür ederiz</div>
      </div>
    </>
  );
}
