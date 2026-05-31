import { describe, expect, it } from 'vitest';
import {
  DurumGirdi,
  KategoriGirdi,
  MasaGirdi,
  RestoranAyar,
  SiparisIstegi,
  UrunGirdi,
  UrunYama,
} from '@/lib/utils/zod-semalar';

describe('SiparisIstegi şeması', () => {
  it('geçerli minimal istek doğrulanır', () => {
    const r = SiparisIstegi.parse({
      masaId: 'masa1',
      kalemler: [{ urunId: 'u1', adet: 2 }],
    });
    expect(r.kalemler).toHaveLength(1);
  });

  it('boş kalemler reddedilir', () => {
    expect(() =>
      SiparisIstegi.parse({ masaId: 'masa1', kalemler: [] }),
    ).toThrow();
  });

  it('adet 0 veya negatif reddedilir', () => {
    expect(() =>
      SiparisIstegi.parse({
        masaId: 'masa1',
        kalemler: [{ urunId: 'u1', adet: 0 }],
      }),
    ).toThrow();
  });

  it('çok fazla kalem (>50) reddedilir', () => {
    const kalemler = Array.from({ length: 51 }, (_, i) => ({
      urunId: `u${i}`,
      adet: 1,
    }));
    expect(() =>
      SiparisIstegi.parse({ masaId: 'masa1', kalemler }),
    ).toThrow();
  });

  it('notlar 200 karakterden uzun olamaz', () => {
    expect(() =>
      SiparisIstegi.parse({
        masaId: 'masa1',
        kalemler: [{ urunId: 'u1', adet: 1, notlar: 'x'.repeat(201) }],
      }),
    ).toThrow();
  });
});

describe('UrunGirdi şeması', () => {
  it('istemcinin fiyatKurus alanı integer olmalı', () => {
    expect(() =>
      UrunGirdi.parse({
        kategoriId: 'k1',
        ad: 'Test',
        fiyatKurus: 12.5,
        stoktaMi: true,
        sira: 1,
      }),
    ).toThrow();
  });

  it('negatif fiyat reddedilir', () => {
    expect(() =>
      UrunGirdi.parse({
        kategoriId: 'k1',
        ad: 'Test',
        fiyatKurus: -100,
        stoktaMi: true,
        sira: 1,
      }),
    ).toThrow();
  });

  it('UrunYama tüm alanları opsiyonel kılar', () => {
    expect(UrunYama.parse({})).toEqual({});
    expect(UrunYama.parse({ stoktaMi: false })).toEqual({ stoktaMi: false });
  });
});

describe('DurumGirdi', () => {
  it("'yeni' iletilmesi reddedilir (yalnız ileri geçişler)", () => {
    expect(() => DurumGirdi.parse({ durum: 'yeni' })).toThrow();
  });

  it("'hazirlaniyor', 'hazir', 'teslim', 'iptal' kabul edilir", () => {
    for (const d of ['hazirlaniyor', 'hazir', 'teslim', 'iptal'] as const) {
      expect(DurumGirdi.parse({ durum: d }).durum).toBe(d);
    }
  });
});

describe('KategoriGirdi / MasaGirdi / RestoranAyar', () => {
  it('boş ad reddedilir', () => {
    expect(() => KategoriGirdi.parse({ ad: '' })).toThrow();
    expect(() => MasaGirdi.parse({ ad: '   ' })).toThrow();
    expect(() => RestoranAyar.parse({ ad: '' })).toThrow();
  });
});
