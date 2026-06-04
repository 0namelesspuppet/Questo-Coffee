'use client';

import Image from 'next/image';
import Link from 'next/link';
import { usePathname, useSearchParams } from 'next/navigation';
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

type Rol = 'garson' | 'kasiyer';

interface NavItem {
  yol: string;
  etiket: string;
  /** Tanımlıysa yalnız bu role görünür; tanımsız = her role görünür.
   *  garson = sahip:false, kasiyer = sahip:true (rapor/ayarları gören sahip). */
  rol?: Rol;
  /** Bu sekmeyi aktif sayan ek yollar (alt sayfalar/ilgili akışlar). */
  altYollar?: string[];
}

const NAV: NavItem[] = [
  // Garson: ana sayfa kısayolu + masalar (adisyonları görmesine gerek yok).
  { yol: '/', etiket: 'Ana Sayfa', rol: 'garson' },
  { yol: '/kasa/masalar', etiket: 'Masalar', rol: 'garson', altYollar: ['/kasa/masa'] },
  // Kasiyer: adisyonlar + rapor + ayarlar (masaları görmesine gerek yok).
  { yol: '/kasa/adisyonlar', etiket: 'Adisyonlar', rol: 'kasiyer' },
  { yol: '/admin/rapor', etiket: 'Rapor', rol: 'kasiyer' },
  {
    yol: '/admin/ayarlar',
    etiket: 'Ayarlar',
    rol: 'kasiyer',
    altYollar: ['/admin/menu', '/admin/masalar'],
  },
];

const navGorunur = (n: NavItem, sahip: boolean): boolean => {
  if (!n.rol) return true;
  return n.rol === (sahip ? 'kasiyer' : 'garson');
};

const aktifMi = (mevcut: string, garsonModu: boolean, n: NavItem) => {
  // Bir masadan açılan adisyon detayı (garson akışı, ?garson=1) kavramsal olarak
  // "Masalar" sekmesine aittir. Kasiyerin "Adisyonlar" (ödeme) listesiyle
  // karışmasın diye bu durumda Masalar sekmesini aktif say.
  if (garsonModu && mevcut.startsWith('/kasa/adisyonlar/')) {
    return n.yol === '/kasa/masalar';
  }
  return [n.yol, ...(n.altYollar ?? [])].some(
    (y) => mevcut === y || mevcut.startsWith(y + '/'),
  );
};

export function KasaShell({ kullanici, children }: Props) {
  const yol = usePathname();
  const aramaParam = useSearchParams();
  const garsonModu = aramaParam.get('garson') === '1';
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
      // Mevcut oturumun rolünü KORU: garson (sahip:false) ise garson olarak
      // yeniden giriş yap — aksi halde client oturumu düşen garson sessizce
      // owner'a (sahip:true) yükselirdi.
      otoGirisYap(kullanici.sahip ? undefined : 'garson').catch(() => {
        otoGirisCalisti.current = false;
      });
    });
    return () => unsub();
  }, [kullanici.sahip]);

  return (
    <div className="min-h-screen">
      <a
        href="#ana-icerik"
        className="sr-only focus:not-sr-only focus:absolute focus:left-2 focus:top-2 focus:z-50 focus:rounded-md focus:bg-primary focus:px-3 focus:py-2 focus:text-sm focus:text-primary-foreground"
      >
        İçeriğe atla
      </a>
      <header className="sticky top-0 z-30 border-b bg-background/95 backdrop-blur">
        <div className="mx-auto flex max-w-6xl items-center gap-2 px-3 py-1.5 sm:gap-4 sm:px-4 sm:py-2">
          <Link
            href="/"
            className="hidden shrink-0 items-center gap-2 font-semibold sm:flex"
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
            className="flex flex-1 items-stretch gap-1.5 sm:hidden"
            aria-label="Bölümler"
          >
            {NAV.filter((n) => navGorunur(n, kullanici.sahip)).map((n) => {
              const aktif = aktifMi(yol, garsonModu, n);
              return (
                <Link
                  key={n.yol}
                  href={n.yol}
                  aria-current={aktif ? 'page' : undefined}
                  className={cn(
                    'flex min-w-0 flex-1 basis-0 items-center justify-center rounded-md px-1 py-2 text-sm font-semibold leading-tight transition-colors',
                    aktif
                      ? 'bg-secondary text-secondary-foreground'
                      : 'text-muted-foreground active:bg-secondary/60',
                  )}
                >
                  <span className="truncate">{n.etiket}</span>
                </Link>
              );
            })}
          </nav>

          {/* Masaüstü: yatay nav */}
          <nav className="hidden flex-1 items-center gap-1 text-sm sm:flex">
            {NAV.filter((n) => navGorunur(n, kullanici.sahip)).map((n) => {
              const aktif = aktifMi(yol, garsonModu, n);
              return (
                <Link
                  key={n.yol}
                  href={n.yol}
                  aria-current={aktif ? 'page' : undefined}
                  className={cn(
                    'rounded-md px-2.5 py-1',
                    aktif
                      ? 'bg-secondary text-secondary-foreground'
                      : 'text-muted-foreground hover:text-foreground',
                  )}
                >
                  {n.etiket}
                </Link>
              );
            })}
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

      <main id="ana-icerik" tabIndex={-1}>
        {children}
      </main>
    </div>
  );
}
