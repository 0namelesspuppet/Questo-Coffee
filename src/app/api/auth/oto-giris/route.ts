import { getAdminAuth } from '@/lib/firebase/admin';
import { AppError, baglantiReddiHatasi, httpHata } from '@/lib/utils/hata';
import { emulatorOrtami } from '@/lib/utils/ortam';

export const runtime = 'nodejs';

export async function POST(req: Request) {
  try {
    // Otomatik giriş yalnızca yerel/emülatör POS'ta — gerçek bulut üretiminde
    // (emülatör yok) kesin yasak. NODE_ENV değil emülatör sinyaline bakılır,
    // çünkü hız için yerel POS da NODE_ENV=production ile çalışır.
    if (!emulatorOrtami()) {
      throw new AppError(
        'devre_disi',
        'Otomatik giriş üretim ortamında devre dışıdır.',
        403,
      );
    }

    // İstemci hangi rolle girmek istiyor? 'garson' → sahip:false hesabı; diğer
    // her durum (gövdesiz dahil) → owner (sahip:true). Geriye dönük uyumlu.
    let rol: string | undefined;
    try {
      const govde = (await req.json().catch(() => ({}))) as { rol?: unknown };
      if (typeof govde.rol === 'string') rol = govde.rol;
    } catch {
      // gövdesiz istek — varsayılan owner akışı
    }

    const ownerEmail =
      process.env.KASA_OTOGIRIS_EMAIL ?? process.env.SEED_SAHIP_EMAIL;
    const garsonEmail = process.env.SEED_GARSON_EMAIL ?? 'garson@questo.local';
    if (!ownerEmail) {
      throw new AppError(
        'yapilandirma_eksik',
        'Otomatik giriş için KASA_OTOGIRIS_EMAIL tanımlanmalı.',
        500,
      );
    }

    const auth = getAdminAuth();

    // Garson rolü istendiyse garson hesabını dene; yoksa owner'a DÜŞ — login asla
    // kırılmasın (eski kurulumlarda garson hesabı henüz oluşmamış olabilir).
    let user;
    if (rol === 'garson') {
      try {
        user = await auth.getUserByEmail(garsonEmail);
      } catch (e) {
        // YALNIZCA 'garson hesabı yok' durumunda owner'a düş (eski kurulum).
        // Geçici/bağlantı hataları (ECONNREFUSED vb.) dış catch'e gitsin → 503
        // (client retry eder); garson geçici hatada owner'a YÜKSELMESİN.
        const kod =
          e && typeof e === 'object' && 'code' in e
            ? String((e as { code: unknown }).code)
            : '';
        if (kod !== 'auth/user-not-found') throw e;
        user = await auth.getUserByEmail(ownerEmail);
      }
    } else {
      user = await auth.getUserByEmail(ownerEmail);
    }

    const claims = (user.customClaims ?? {}) as {
      rol?: string;
      sahip?: boolean;
      restoranId?: string;
    };
    if (claims.rol !== 'kasiyer') {
      throw new AppError(
        'yapilandirma_eksik',
        `Otomatik giriş kullanıcısı (${user.email}) için kasiyer claim'i yok.`,
        500,
      );
    }

    // sahip flag HESABIN claim'inden gelir: garson hesabı sahip:false, owner true.
    const customToken = await auth.createCustomToken(user.uid, {
      rol: 'kasiyer',
      sahip: claims.sahip === true,
      ...(claims.restoranId ? { restoranId: claims.restoranId } : {}),
    });

    return Response.json({ ok: true, customToken });
  } catch (e) {
    // Emülatör açılışta (~25-40 sn) henüz hazır değilken tıklanırsa bağlantı
    // reddi olur; kalıcı hata değil — istemci tekrar denesin diye 503 dön.
    if (baglantiReddiHatasi(e)) {
      return httpHata(
        new AppError(
          'emulator_hazir_degil',
          'Sistem henüz hazırlanıyor, birkaç saniye sonra tekrar deneyin.',
          503,
        ),
      );
    }
    return httpHata(e);
  }
}
