import { apiKasiyer } from '@/lib/auth/guard';
import { siparisYaz } from '@/lib/siparis/servis';
import { httpHata } from '@/lib/utils/hata';
import { SiparisIstegi } from '@/lib/utils/zod-semalar';

export const runtime = 'nodejs';

// Garson/kasiyer siparis girisi — kasiyer auth ile, idempotency ile cift istek korumalidir.
// Masa, masaId ile dogrudan cozulur (token yok).
export async function POST(req: Request) {
  try {
    const u = await apiKasiyer();
    const body = SiparisIstegi.parse(await req.json());

    const idempotencyKey =
      req.headers.get('idempotency-key')?.slice(0, 128) ?? undefined;

    const sonuc = await siparisYaz(body, u.uid, idempotencyKey);
    return Response.json({ ok: true, ...sonuc });
  } catch (e) {
    return httpHata(e);
  }
}
