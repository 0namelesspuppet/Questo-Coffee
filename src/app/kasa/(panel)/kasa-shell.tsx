'use client';

import Image from 'next/image';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useEffect, useRef, useState } from 'react';
import { onAuthStateChanged } from 'firebase/auth';
import { getClientAuth } from '@/lib/firebase/client';
import { otoGirisYap } from '@/lib/auth/oto-giris-client';
import { BaglantiRozeti } from '@/components/kasa/baglanti-rozeti';
import { cn } from '@/lib/utils';

interface Props {
  kullanici: { sahip: boolean };
  children: React.ReactNode;
}

interface NavItem {
  yol: string;
  etiket: string;
  sahipGerek?: boolean;
  /** Bu sekmeyi aktif sayan ek yollar (alt sayfalar/ilgili akışlar). */
  altYollar?: string[];
}

const NAV: NavItem[] = [
  { yol: '/kasa/masalar', etiket: 'Masalar', altYollar: ['/kasa/masa'] },
  { yol: '/kasa/adisyonlar', etiket: 'Adisyonlar' },
  { yol: '/admin/rapor', etiket: 'Rapor', sahipGerek: true },
  {
    yol: '/admin/ayarlar',
    etiket: 'Ayarlar',
    sahipGerek: true,
    altYollar: ['/admin/menu', '/admin/masalar'],
  },
];

const aktifMi = (mevcut: string, n: NavItem) =>
  [n.yol, ...(n.altYollar ?? [])].some(
    (y) => mevcut === y || mevcut.startsWith(y + '/'),
  );

export function KasaShell({ kullanici, children }: Props) {
  const yol = usePathname();
  const [authHazir, setAuthHazir] = useState(false);
  const otoGirisCalisti = useRef(false);

  useEffect(() => {
    const unsub = onAuthStateChanged(getClientAuth(), (u) => {
      if (u) {
        setAuthHazir(true);
        return;
      }
      setAuthHazir(false);
      // Server cookie var (middleware geçirdi) ama client oturumu yok —
      // sessizce oto-giriş yap; aksi halde Firestore listener'ları
      // 'permission-denied' verir.
      if (otoGirisCalisti.current) return;
      otoGirisCalisti.current = true;
      otoGirisYap().catch(() => {
        otoGirisCalisti.current = false;
      });
    });
    return () => unsub();
  }, []);

  return (
    <div className="min-h-screen">
      <header className="sticky top-0 z-30 border-b bg-background/95 backdrop-blur">
        <div className="mx-auto flex max-w-6xl items-center gap-2 px-3 py-1.5 sm:gap-4 sm:px-4 sm:py-2">
          <Link
            href="/"
            className="flex shrink-0 items-center gap-2 font-semibold"
          >
            <span className="relative size-7 overflow-hidden rounded-full">
              <Image
                src="/logo.jpg"
                alt="Questo"
                fill
                sizes="28px"
                className="object-cover"
              />
            </span>
            <span className="hidden font-serif sm:inline">Questo · Kasa</span>
          </Link>

          {/* Mobil: üst barı tam kaplayan sekme çubuğu — hamburger yok, hepsi
              tek dokunuşla görünür ve erişilebilir. */}
          <nav
            className="flex flex-1 items-center gap-1 overflow-x-auto text-sm [scrollbar-width:none] sm:hidden [&::-webkit-scrollbar]:hidden"
            aria-label="Bölümler"
          >
            {NAV.filter((n) => !n.sahipGerek || kullanici.sahip).map((n) => (
              <Link
                key={n.yol}
                href={n.yol}
                className={cn(
                  'flex-1 whitespace-nowrap rounded-md px-2 py-1.5 text-center font-medium',
                  aktifMi(yol, n)
                    ? 'bg-secondary text-secondary-foreground'
                    : 'text-muted-foreground',
                )}
              >
                {n.etiket}
              </Link>
            ))}
          </nav>

          {/* Masaüstü: yatay nav */}
          <nav className="hidden flex-1 items-center gap-1 text-sm sm:flex">
            {NAV.filter((n) => !n.sahipGerek || kullanici.sahip).map((n) => (
              <Link
                key={n.yol}
                href={n.yol}
                className={cn(
                  'rounded-md px-2.5 py-1',
                  aktifMi(yol, n)
                    ? 'bg-secondary text-secondary-foreground'
                    : 'text-muted-foreground hover:text-foreground',
                )}
              >
                {n.etiket}
              </Link>
            ))}
          </nav>

          <div className="flex shrink-0 items-center">
            <BaglantiRozeti />
          </div>
        </div>
      </header>

      {!authHazir && (
        <div className="mx-auto max-w-6xl px-4 pt-4">
          <div className="rounded-md border border-amber-300/40 bg-amber-50 px-3 py-2 text-sm dark:bg-amber-950/30">
            Oturum yükleniyor…
          </div>
        </div>
      )}

      {children}
    </div>
  );
}
