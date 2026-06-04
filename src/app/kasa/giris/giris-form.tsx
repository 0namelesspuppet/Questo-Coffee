'use client';

import { useEffect, useState } from 'react';
import Image from 'next/image';
import { useRouter, useSearchParams } from 'next/navigation';
import { toast } from 'sonner';
import { otoGirisYap } from '@/lib/auth/oto-giris-client';

export function GirisForm() {
  const router = useRouter();
  const params = useSearchParams();
  const geri = params.get('geri') ?? '/kasa';

  const [hata, setHata] = useState<string | null>(null);

  useEffect(() => {
    let iptal = false;

    const calistir = async () => {
      try {
        // GÜVENLİ VARSAYILAN: çerez düştüğünde önceki rol bilinemez → en DÜŞÜK
        // yetkiyle (garson, sahip:false) gir. Owner/kasiyer olmak için ana
        // ekrandaki "Kasiyer" kartı (açık kullanıcı eylemi) kullanılmalı —
        // sessiz yeniden-giriş asla owner'a yükseltmemeli.
        await otoGirisYap('garson');
        if (iptal) return;
        router.replace(geri);
        router.refresh();
      } catch (e) {
        if (iptal) return;
        const msg =
          e instanceof Error
            ? e.message.replace(/^Firebase:\s*/i, '')
            : 'Giriş başarısız.';
        setHata(msg);
        toast.error(msg);
      }
    };

    void calistir();
    return () => {
      iptal = true;
    };
  }, [router, geri]);

  return (
    <div className="w-full max-w-sm space-y-5 rounded-2xl border bg-card p-6 shadow-soft text-center">
      <div className="flex items-center justify-center">
        <div className="relative size-12 overflow-hidden rounded-full shadow-soft">
          <Image
            src="/logo.jpg"
            alt="Questo"
            fill
            sizes="48px"
            className="object-cover"
          />
        </div>
      </div>

      {hata && (
        <>
          <p className="text-sm text-destructive" role="alert">
            {hata}
          </p>
          <button
            type="button"
            onClick={() => window.location.reload()}
            className="w-full rounded-md bg-primary px-3 py-2 text-sm font-medium text-primary-foreground"
          >
            Tekrar dene
          </button>
        </>
      )}
    </div>
  );
}
