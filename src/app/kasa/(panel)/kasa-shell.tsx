'use client';

import Image from 'next/image';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useEffect, useRef, useState } from 'react';
import { Menu, X } from 'lucide-react';
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
  { yol: '/kasa/adisyonlar', etiket: 'Adisyonlar' },
  { yol: '/kasa/masalar', etiket: 'Kasa', altYollar: ['/kasa/masa'] },
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
  const [menuAcik, setMenuAcik] = useState(false);
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
        <div className="mx-auto flex max-w-6xl items-center justify-between gap-3 px-3 py-1.5 sm:px-4 sm:py-2">
          <div className="flex items-center gap-4">
            <Link href="/" className="flex items-center gap-2 font-semibold">
              <span className="relative size-7 overflow-hidden rounded-full">
                <Image
                  src="/logo.jpg"
                  alt="Questo"
                  fill
                  sizes="28px"
                  className="object-cover"
                />
              </span>
              <span className="font-serif">Questo · Kasa</span>
            </Link>
            <nav className="hidden items-center gap-1 text-sm sm:flex">
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
          </div>
          <div className="flex items-center gap-3">
            <BaglantiRozeti />
            <button
              type="button"
              className="rounded-md p-1 text-muted-foreground sm:hidden"
              onClick={() => setMenuAcik((v) => !v)}
              aria-label="Menüyü aç/kapat"
            >
              {menuAcik ? <X className="size-5" /> : <Menu className="size-5" />}
            </button>
          </div>
        </div>

        {menuAcik && (
          <nav className="flex flex-col gap-1 border-t bg-background px-4 py-2 text-sm sm:hidden">
            {NAV.filter((n) => !n.sahipGerek || kullanici.sahip).map((n) => (
              <Link
                key={n.yol}
                href={n.yol}
                onClick={() => setMenuAcik(false)}
                className={cn(
                  'rounded-md px-3 py-2',
                  aktifMi(yol, n)
                    ? 'bg-secondary text-secondary-foreground'
                    : 'text-muted-foreground hover:text-foreground',
                )}
              >
                {n.etiket}
              </Link>
            ))}
          </nav>
        )}
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
