import 'server-only';

import { writeFile } from 'node:fs/promises';
import { join } from 'node:path';

/** Periyodik yedek scriptinin (scripts/yedek-periodic.ps1) izlediği bayrak. */
const BAYRAK_DOSYA = 'emulator-veri.degisti';

/**
 * Emulator modunda veriyi "hemen diske yedekle" sinyali verir.
 *
 * Firestore emulator tüm veriyi BELLEKTE tutar; diske yalnızca bir export
 * sırasında yazar. Bir yazma işleminden (örn. menü fiyatı güncelleme) sonra
 * bu bayrak dosyasını oluştururuz. `scripts/yedek-periodic.ps1` bayrağı
 * birkaç saniyede bir kontrol edip, varsa veriyi anında `emulator-veri/`
 * klasörüne export eder ve bayrağı siler.
 *
 * Böylece düzenlemeler, uygulama düzgün (Durdur.bat ile) kapatılmasa bile —
 * pencere kapatma, PC kapanışı, çökme — en fazla birkaç saniyelik gecikmeyle
 * kalıcı olur.
 *
 * Emulator modu dışında (production = gerçek Firestore) hiçbir şey yapmaz;
 * orada veri zaten kalıcıdır.
 */
export async function veriYedeginiTetikle(): Promise<void> {
  if (!process.env.FIRESTORE_EMULATOR_HOST) return;
  try {
    await writeFile(
      join(process.cwd(), BAYRAK_DOSYA),
      new Date().toISOString(),
      'utf8',
    );
  } catch {
    // Bayrak yazılamazsa sessizce geç — periyodik güvenlik yedeği yine yakalar.
  }
}
