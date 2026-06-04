import 'server-only';

import { cookies } from 'next/headers';
import { getAdminAuth } from '@/lib/firebase/admin';
import type { DecodedIdToken } from 'firebase-admin/auth';
import { COOKIE_ADI, COOKIE_OMUR_MS } from './cookie';
import { emulatorOrtami } from '@/lib/utils/ortam';

export { COOKIE_ADI };

export const oturumCereziUret = async (idToken: string): Promise<string> => {
  return getAdminAuth().createSessionCookie(idToken, {
    expiresIn: COOKIE_OMUR_MS,
  });
};

export const oturumCereziDogrula =
  async (): Promise<DecodedIdToken | null> => {
    const c = (await cookies()).get(COOKIE_ADI)?.value;
    if (!c) return null;
    try {
      // checkRevoked=false (varsayılan): her istekte auth emülatörüne ekstra
      // round-trip YAPMAZ → yerel POS'ta her sayfa yüklemesini hızlandırır.
      // Trade-off: zorla iptal edilen oturum, çerez ömrü (5 gün) dolana ya da
      // yeniden giriş yapılana kadar geçerli kalır — tek-kafe LAN güven modelinde
      // kabul edilebilir (sunucu-taraflı token revocation akışı yok).
      return await getAdminAuth().verifySessionCookie(c);
    } catch {
      return null;
    }
  };

export const cerezAyarla = async (value: string): Promise<void> => {
  (await cookies()).set(COOKIE_ADI, value, {
    httpOnly: true,
    // Secure yalnız gerçek üretimde (HTTPS). Yerel POS HTTP üzerinden çalışır
    // (telefon/LAN: http://192.168.x.x) — Secure olursa cookie gönderilmez ve
    // oturum kırılır. Emülatör ortamında Secure kapalı.
    secure: !emulatorOrtami(),
    sameSite: 'lax',
    path: '/',
    maxAge: COOKIE_OMUR_MS / 1000,
  });
};

export const cerezSil = async (): Promise<void> => {
  (await cookies()).delete(COOKIE_ADI);
};
