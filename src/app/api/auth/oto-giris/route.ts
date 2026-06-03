import { getAdminAuth } from '@/lib/firebase/admin';
import { AppError, baglantiReddiHatasi, httpHata } from '@/lib/utils/hata';
import { emulatorOrtami } from '@/lib/utils/ortam';

export const runtime = 'nodejs';

export async function POST() {
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
    const email =
      process.env.KASA_OTOGIRIS_EMAIL ?? process.env.SEED_SAHIP_EMAIL;
    if (!email) {
      throw new AppError(
        'yapilandirma_eksik',
        'Otomatik giriş için KASA_OTOGIRIS_EMAIL tanımlanmalı.',
        500,
      );
    }

    const user = await getAdminAuth().getUserByEmail(email);
    const claims = (user.customClaims ?? {}) as {
      rol?: string;
      sahip?: boolean;
      restoranId?: string;
    };
    if (claims.rol !== 'kasiyer') {
      throw new AppError(
        'yapilandirma_eksik',
        `Otomatik giriş kullanıcısı (${email}) için kasiyer claim'i yok.`,
        500,
      );
    }

    const customToken = await getAdminAuth().createCustomToken(user.uid, {
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
