// İstemci tarafı POST yardımcısı.
//
// Emülatör açılış penceresinde (~25-40 sn) ya da geçici ağ hatasında sunucu 503
// döner; bu yardımcı kısa, artan aralıklarla birkaç kez tekrar dener. Sipariş gibi
// YAZMA isteklerinde SABİT bir idempotency anahtarı ile çağrılırsa tekrar güvenlidir:
// sunucu (servis.ts) aynı anahtarı görünce önceki sonucu döndürür, çift yazmaz.

export interface PostYineleSonuc {
  ok: boolean;
  status: number;
  data: { ok?: boolean; mesaj?: string; [k: string]: unknown };
}

const bekle = (ms: number) => new Promise<void>((r) => setTimeout(r, ms));

export async function postYinele(
  url: string,
  govde: string,
  opts: { idempotencyKey?: string; denemeSayisi?: number } = {},
): Promise<PostYineleSonuc> {
  const denemeSayisi = opts.denemeSayisi ?? 4;
  let sonHata: unknown;

  for (let i = 0; i < denemeSayisi; i++) {
    try {
      const res = await fetch(url, {
        method: 'POST',
        headers: {
          'content-type': 'application/json',
          ...(opts.idempotencyKey
            ? { 'idempotency-key': opts.idempotencyKey }
            : {}),
        },
        body: govde,
      });

      // 503 = sistem hazırlanıyor (emülatör henüz hazır değil). Bekle, tekrar dene.
      if (res.status === 503 && i < denemeSayisi - 1) {
        await bekle(400 * (i + 1));
        continue;
      }

      const data = (await res
        .json()
        .catch(() => ({}))) as PostYineleSonuc['data'];
      return { ok: res.ok, status: res.status, data };
    } catch (e) {
      // Ağ hatası (fetch throw) — emülatör henüz dinlemiyor olabilir.
      sonHata = e;
      if (i < denemeSayisi - 1) {
        await bekle(400 * (i + 1));
        continue;
      }
    }
  }

  throw sonHata instanceof Error
    ? sonHata
    : new Error('Sistem hazırlanamadı, lütfen birkaç saniye sonra tekrar deneyin.');
}
