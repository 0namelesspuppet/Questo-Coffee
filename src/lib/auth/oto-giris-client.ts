'use client';

import { signInWithCustomToken } from 'firebase/auth';
import { getClientAuth } from '@/lib/firebase/client';

// Tek noktadan otomatik giriş: server'dan özel token al, client'ta oturum aç,
// server-side session cookie kur. /kasa/giris sayfası ve kasa/admin shell'leri
// kullanıcı oturumu yokken aynı akışı çağırır.
//
// Emülatör açılışta ~25-40 sn hazır olmaz; bu süre içinde "Garson/Kasiyer"
// tıklanırsa giriş bağlantı reddi (ECONNREFUSED) alır. Kalıcı hata göstermek
// yerine kısa aralıklarla TEKRAR DENE — böylece rol kartı "Aç" spinner'ında
// bekler ve emülatör hazır olunca sorunsuz girilir.
const MAKS_DENEME = 12;
const DENEME_ARASI_MS = 800;

class GeciciGirisHatasi extends Error {}

const bekle = (ms: number) => new Promise<void>((r) => setTimeout(r, ms));

// Geçici (tekrar denenebilir) bir hata mı? Sunucu 503 (emülatör hazır değil)
// ya da istemci tarafı ağ/emülatör hatası (signInWithCustomToken vb.).
const geciciMi = (e: unknown): boolean => {
  if (e instanceof GeciciGirisHatasi) return true;
  const mesaj = e instanceof Error ? e.message : String(e ?? '');
  const kod =
    typeof e === 'object' && e !== null && 'code' in e
      ? String((e as { code: unknown }).code)
      : '';
  return (
    /ECONNREFUSED|network-request-failed|unavailable|Failed to fetch|NetworkError|hazırlan/i.test(
      mesaj,
    ) || /network-request-failed|unavailable/i.test(kod)
  );
};

async function girisTekDene(rol?: string): Promise<void> {
  const tokenRes = await fetch('/api/auth/oto-giris', {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify(rol ? { rol } : {}),
  });
  if (!tokenRes.ok) {
    const j = (await tokenRes.json().catch(() => ({}))) as { mesaj?: string };
    // 503 = emülatör henüz hazır değil → tekrar denenebilir.
    if (tokenRes.status === 503) {
      throw new GeciciGirisHatasi(j.mesaj ?? 'Sistem hazırlanıyor…');
    }
    throw new Error(j.mesaj ?? 'Otomatik giriş başlatılamadı.');
  }
  const { customToken } = (await tokenRes.json()) as { customToken: string };

  const cred = await signInWithCustomToken(getClientAuth(), customToken);
  // Custom token ile yeni signin yapildi -> ID token zaten taze, force refresh gereksiz.
  const idToken = await cred.user.getIdToken();

  const sessionRes = await fetch('/api/auth/session', {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ idToken }),
  });
  if (!sessionRes.ok) {
    const j = (await sessionRes.json().catch(() => ({}))) as { mesaj?: string };
    throw new Error(j.mesaj ?? 'Oturum oluşturulamadı.');
  }
}

export async function otoGirisYap(rol?: string): Promise<void> {
  let sonHata: unknown;
  for (let deneme = 1; deneme <= MAKS_DENEME; deneme++) {
    try {
      await girisTekDene(rol);
      return;
    } catch (e) {
      sonHata = e;
      // Geçici değilse ya da denemeler bittiyse gerçek hatayı fırlat.
      if (!geciciMi(e) || deneme === MAKS_DENEME) throw e;
      await bekle(DENEME_ARASI_MS);
    }
  }
  throw sonHata;
}
