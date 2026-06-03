'use client';

import { useEffect, useState } from 'react';
import { Wifi, WifiOff } from 'lucide-react';

export function BaglantiRozeti() {
  const [online, setOnline] = useState(true);

  useEffect(() => {
    const on = () => setOnline(true);
    const off = () => setOnline(false);
    setOnline(navigator.onLine);
    window.addEventListener('online', on);
    window.addEventListener('offline', off);
    return () => {
      window.removeEventListener('online', on);
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
      title="Çevrimdışı — siparişler senkronize değil"
    >
      <WifiOff className="size-3.5" />
      Çevrimdışı
    </span>
  );
}
