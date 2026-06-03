import { z } from 'zod';

// ── Kasiyer → sipariş POST ──────────────────────────────────────────────
export const SepetSecimGirdi = z.object({
  grupId: z.string().min(1).max(64),
  secenekIds: z.array(z.string().min(1).max(64)).min(0).max(20),
});

export const SiparisKalemiGirdi = z.object({
  urunId: z.string().min(1).max(64),
  adet: z.number().int().min(1).max(99),
  notlar: z.string().trim().max(200).optional(),
  secimler: z.array(SepetSecimGirdi).max(10).optional(),
});

export const SiparisIstegi = z.object({
  masaId: z.string().min(1).max(64),
  kalemler: z.array(SiparisKalemiGirdi).min(1).max(50),
  musteriAd: z.string().trim().min(1).max(50).optional(),
});
export type SiparisIstegiT = z.infer<typeof SiparisIstegi>;

// ── Admin: ürün opsiyonları ─────────────────────────────────────────────
export const UrunOpsiyonSecenekGirdi = z.object({
  id: z.string().min(1).max(64),
  ad: z.string().trim().min(1).max(60),
  ekFiyatKurus: z.number().int().min(0).max(1_000_000),
});

export const UrunOpsiyonGrubuGirdi = z.object({
  id: z.string().min(1).max(64),
  ad: z.string().trim().min(1).max(60),
  tip: z.enum(['tek', 'cok']),
  zorunlu: z.boolean(),
  secenekler: z.array(UrunOpsiyonSecenekGirdi).min(1).max(20),
});

// ── Admin: ürün / kategori / masa ───────────────────────────────────────
export const UrunGirdi = z.object({
  kategoriId: z.string().min(1),
  ad: z.string().trim().min(1).max(120),
  aciklama: z.string().trim().max(500).optional(),
  fiyatKurus: z.number().int().min(0).max(1_000_000),
  stoktaMi: z.boolean(),
  stokMiktar: z.number().int().min(0).max(100_000).optional(),
  sira: z.number().int().min(0).max(9999).default(0),
  gorselUrl: z.string().url().optional(),
  opsiyonGruplari: z.array(UrunOpsiyonGrubuGirdi).max(10).optional(),
});
export type UrunGirdiT = z.infer<typeof UrunGirdi>;

/**
 * stoktaMi ↔ stokMiktar tutarlılık kontrolü. POST/PATCH route'larında
 * `UrunGirdi.parse(body)` sonrası çağır. UrunGirdi.partial() ile uyumlu
 * olsun diye discriminated union veya superRefine yerine ayrı fonksiyon.
 */
export const stokTutarliMi = (
  v: Partial<Pick<UrunGirdiT, 'stoktaMi' | 'stokMiktar'>>,
): string | null => {
  if (v.stoktaMi === false && (v.stokMiktar ?? 0) > 0) {
    return 'Stokta yok işaretliyken stok miktarı 0 olmalı.';
  }
  if (v.stoktaMi === true && v.stokMiktar === 0) {
    return 'Stok miktarı 0 ise stokta yok olarak işaretle.';
  }
  return null;
};

export const KategoriGirdi = z.object({
  ad: z.string().trim().min(1).max(80),
  sira: z.number().int().min(0).max(9999).default(0),
  aktifMi: z.boolean().default(true),
});
export type KategoriGirdiT = z.infer<typeof KategoriGirdi>;

export const MasaGirdi = z.object({
  ad: z.string().trim().min(1).max(40),
});
export type MasaGirdiT = z.infer<typeof MasaGirdi>;

// ── PATCH varyantları (kısmi) ──────────────────────────────────────────
// gorselUrl ayrıca null kabul eder: null → mevcut görseli kaldır (alan silinir).
export const UrunYama = UrunGirdi.partial().extend({
  gorselUrl: z.string().url().nullable().optional(),
});
export const KategoriYama = KategoriGirdi.partial();
export const MasaYama = z.object({
  ad: z.string().trim().min(1).max(40).optional(),
  aktifMi: z.boolean().optional(),
});

// ── Restoran ayarları ──────────────────────────────────────────────────
export const RestoranAyar = z.object({
  ad: z.string().trim().min(1).max(120),
});

// ── Kasa: durum güncelleme ──────────────────────────────────────────────
export const DurumGirdi = z.object({
  durum: z.enum(['hazirlaniyor', 'hazir', 'teslim', 'iptal']),
});
export type DurumGirdiT = z.infer<typeof DurumGirdi>;

// ── Ayrı ödeme talebi (kasiyer) ────────────────────────────────────────
const OdemeTalebiKalemiGirdi = z.object({
  siparisId: z.string().min(1).max(128),
  siparisNo: z.number().int().min(1),
  ad: z.string().trim().min(1).max(120),
  adet: z.number().int().min(1).max(99),
  araToplamKurus: z.number().int().min(0).max(100_000_000),
});

export const OdemeTalebiIstegi = z.discriminatedUnion('yontem', [
  z.object({
    yontem: z.literal('tam'),
    musteriAd: z.string().trim().min(1).max(50).optional(),
  }),
  z.object({
    yontem: z.literal('esit'),
    kisiSayisi: z.number().int().min(2).max(20),
    /**
     * Bölünecek taban tutar (kuruş). Verilmezse adisyonun genel toplamı
     * kullanılır. Ürün seçerek kısmi ödeme yapıldıktan sonra kalan tutarın
     * eşit bölünmesi için, bölme anındaki KALAN tutar buradan gönderilir.
     */
    tabanKurus: z.number().int().min(0).max(100_000_000).optional(),
    musteriAd: z.string().trim().min(1).max(50).optional(),
  }),
  z.object({
    yontem: z.literal('urun'),
    secilenKalemler: z.array(OdemeTalebiKalemiGirdi).min(1).max(100),
    musteriAd: z.string().trim().min(1).max(50).optional(),
  }),
]);
export type OdemeTalebiIstegiT = z.infer<typeof OdemeTalebiIstegi>;
