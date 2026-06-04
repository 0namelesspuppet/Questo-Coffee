'use client';

import { useEffect, useState } from 'react';
import { Wifi, WifiOff } from 'lucide-react';

export function BaglantiRozeti() {
  const [online, setOnline] = useState(true);

  useEffect(() => {
    let iptal = false;

    // navigator.onLine yalnız cihazın bir ağı var mı der; oysa POS için asıl
    // önemli olan Questo SUNUCUSUNA (bu origin) erişilebiliyor mu. Telefon
    // Wi-Fi'da ama PC kapalı/erişilemezse navigator.onLine yine 'true' der ve
    // YANLIŞ "Bağlı" gösterirdi. Bu yüzden hafif bir HEAD isteğiyle gerçek
    // erişilebilirliği yokla.
    const kontrol = async () => {
      if (typeof navigator !== 'undefined' && !navigator.onLine) {
        if (!iptal) setOnline(false);
        return;
      }
      try {
        const ctrl = new AbortController();
        const zaman = setTimeout(() => ctrl.abort(), 4000);
        await fetch('/manifest.webmanifest', {
          method: 'HEAD',
          cache: 'no-store',
          signal: ctrl.signal,
        });
        clearTimeout(zaman);
        if (!iptal) setOnline(true);
      } catch {
        if (!iptal) setOnline(false);
      }
    };

    const off = () => {
      if (!iptal) setOnline(false);
    };

    kontrol();
    const id = setInterval(kontrol, 15000);
    window.addEventListener('online', kontrol);
    window.addEventListener('offline', off);
    return () => {
      iptal = true;
      clearInterval(id);
      window.removeEventListener('online', kontrol);
      window.removeEventListener('offline', off);
    };
  }, []);

  return online ? (
    <span
      className="inline-flex items-center gap-1 text-xs text-muted-foreground"
      title="Çevrimiçi"
    >
      <Wifi className="size-3.5" />
      <span className="hidden sm:inline">Bağlı</span>
    </span>
  ) : (
    <span
      role="status"
      className="inline-flex items-center gap-1 text-xs font-medium text-destructive"
      title="Sunucuya erişilemiyor — siparişler senkronize değil"
    >
      <WifiOff className="size-3.5" />
      Çevrimdışı
    </span>
  );
}
