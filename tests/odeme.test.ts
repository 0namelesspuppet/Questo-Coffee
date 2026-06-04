import { describe, expect, it } from 'vitest';
import { esitOdemeTutariHesapla } from '@/lib/siparis/odeme';

describe('esitOdemeTutariHesapla', () => {
  it('tek kişi tüm adisyonu öder', () => {
    expect(esitOdemeTutariHesapla(1000, 1, 1000)).toBe(1000);
  });

  it('kişi başı ceil ile hesaplar, kalanı aşmaz', () => {
    // 1000 / 3 → ceil = 334
    expect(esitOdemeTutariHesapla(1000, 3, 1000)).toBe(334);
    expect(esitOdemeTutariHesapla(1000, 3, 666)).toBe(334);
    // son ödeyen küçük artığı kapatır (334 değil 332)
    expect(esitOdemeTutariHesapla(1000, 3, 332)).toBe(332);
  });

  it('tam bölünen tutarda herkes eşit öder', () => {
    expect(esitOdemeTutariHesapla(900, 3, 900)).toBe(300);
    expect(esitOdemeTutariHesapla(900, 3, 600)).toBe(300);
    expect(esitOdemeTutariHesapla(900, 3, 300)).toBe(300);
  });

  it('geçersiz/sınır girdilerinde 0 döner (fazla tahsilat yok)', () => {
    expect(esitOdemeTutariHesapla(1000, 0, 1000)).toBe(0);
    expect(esitOdemeTutariHesapla(1000, -2, 1000)).toBe(0);
    expect(esitOdemeTutariHesapla(1000, 3, 0)).toBe(0);
    expect(esitOdemeTutariHesapla(1000, 3, -50)).toBe(0);
  });

  it('invariant: hiçbir tek ödeme kalanı aşmaz ve toplam tam tahsil edilir', () => {
    const senaryolar: ReadonlyArray<readonly [number, number]> = [
      [1000, 3],
      [10, 9],
      [9999, 7],
      [100, 100],
      [1, 4],
      [12345, 6],
    ];
    for (const [toplam, n] of senaryolar) {
      let kalan = toplam;
      let topla = 0;
      let guard = 0;
      while (kalan > 0 && guard < 10000) {
        const tutar = esitOdemeTutariHesapla(toplam, n, kalan);
        expect(tutar).toBeGreaterThan(0); // ilerleme garantisi (sonsuz döngü yok)
        expect(tutar).toBeLessThanOrEqual(kalan); // asla kalanı aşmaz
        kalan -= tutar;
        topla += tutar;
        guard += 1;
      }
      expect(kalan).toBe(0); // tam tahsilat
      expect(topla).toBe(toplam); // ne eksik ne fazla — fazla tahsilat olmaz
    }
  });
});
