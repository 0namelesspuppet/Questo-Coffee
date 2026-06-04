'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useState, type MouseEvent } from 'react';
import { toast } from 'sonner';
import {
  ArrowRight,
  ClipboardList,
  Loader2,
  UtensilsCrossed,
} from 'lucide-react';
import { otoGirisYap } from '@/lib/auth/oto-giris-client';
import { cn } from '@/lib/utils';

interface RolKart {
  href: string;
  rol: string;
  baslik: string;
  altyazi: string;
  aciklama: string;
  Ikon: typeof UtensilsCrossed;
}

const ROLLER: RolKart[] = [
  {
    href: '/kasa/masalar',
    rol: 'garson',
    baslik: 'Garson',
    altyazi: 'Masalar',
    aciklama: 'Masaya git, menüden ürün seç, adisyona ekle.',
    Ikon: UtensilsCrossed,
  },
  {
    href: '/kasa/adisyonlar',
    rol: 'kasiyer',
    baslik: 'Kasiyer',
    altyazi: 'Adisyonlar',
    aciklama: 'Açık adisyonları gör, ödemeleri al, kapat.',
    Ikon: ClipboardList,
  },
];

export function RolKartlari() {
  const router = useRouter();
  const [yuklenenHref, setYuklenenHref] = useState<string | null>(null);

  const tikla = async (
    e: MouseEvent<HTMLAnchorElement>,
    href: string,
    rol: string,
  ) => {
    e.preventDefault();
    if (yuklenenHref) return;
    setYuklenenHref(href);
    try {
      await otoGirisYap(rol);
      router.push(href);
      router.refresh();
    } catch (err) {
      setYuklenenHref(null);
      const msg =
        err instanceof Error
          ? err.message.replace(/^Firebase:\s*/i, '')
          : 'Giriş başarısız.';
      toast.error(msg);
    }
  };

  return (
    <ul className="grid grid-cols-1 gap-4 sm:grid-cols-2">
      {ROLLER.map((r) => {
        const yukleniyor = yuklenenHref === r.href;
        const baskaYukleniyor = yuklenenHref !== null && !yukleniyor;
        return (
          <li key={r.href}>
            <Link
              href={r.href}
              onClick={(e) => tikla(e, r.href, r.rol)}
              className={cn(
                'group flex h-full flex-col items-start gap-4 rounded-2xl border bg-card p-6 text-left shadow-soft transition active:scale-[0.98] hover:bg-accent/40',
                baskaYukleniyor && 'pointer-events-none opacity-60',
              )}
            >
              <span className="flex size-12 items-center justify-center rounded-full bg-primary/10 text-primary">
                <r.Ikon className="size-6" />
              </span>
              <div className="space-y-1">
                <p className="micro-caps text-muted-foreground">{r.altyazi}</p>
                <h2 className="font-serif text-2xl leading-none">
                  {r.baslik}
                </h2>
              </div>
              <p className="text-sm leading-relaxed text-muted-foreground">
                {r.aciklama}
              </p>
              <span className="mt-auto inline-flex items-center gap-1.5 text-sm font-medium text-primary">
                Aç
                {yukleniyor ? (
                  <Loader2 className="size-4 animate-spin" />
                ) : (
                  <ArrowRight className="size-4 transition group-hover:translate-x-0.5" />
                )}
              </span>
            </Link>
          </li>
        );
      })}
    </ul>
  );
}
