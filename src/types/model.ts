/**
 * Tüm para alanları kuruş (integer). Kayan nokta yok.
 * Kurus branded type — kazara TL ile karışmasını TS engelliyor.
 */
export type Kurus = number & { readonly __brand: 'Kurus' };

export const Kurus = (n: number): Kurus => {
  if (!Number.isInteger(n) || n < 0) {
    throw new Error(`Geçersiz kuruş değeri: ${n}`);
  }
  return n as Kurus;
};

export type SiparisDurumu =
  | 'yeni'
  | 'hazirlaniyor'
  | 'hazir'
  | 'teslim'
  | 'iptal';

export type AdisyonDurumu = 'acik' | 'kapali';

export type PersonelRolu = 'kasiyer';

export interface PersonelClaims {
  rol: PersonelRolu;
  sahip?: boolean; // menü/masa/kullanıcı yönetim yetkisi
  restoranId: string;
}

export interface KategoriStory {
  /** Üst etiket — örn. 'Mevsim notu', 'Mutfaktan' */
  kicker?: string;
  /** Başlık — örn. 'Sıcağa karşı, sabırla.' */
  title?: string;
  /** Gövde metni */
  body: string;
  /** İmza — örn. '— Barista ekibi' */
  sign?: string;
}

export interface Kategori {
  id: string;
  ad: string;
  sira: number;
  aktifMi: boolean;
  /** Roma rakamı — I, II, III, IV (menü kitabı stili) */
  roman?: 'I' | 'II' | 'III' | 'IV';
  /** Kategorinin alt sloganı — 'Tek menşeli çekirdek, taze kavrum.' */
  tagline?: string;
  /** Kategorinin hikâye paneli (varsa) */
  story?: KategoriStory;
}

export interface UrunOpsiyonSecenek {
  id: string;
  ad: string;
  ekFiyatKurus: Kurus;
}

export type UrunOpsiyonTipi = 'tek' | 'cok';

export interface UrunOpsiyonGrubu {
  id: string;
  ad: string;
  /** 'tek' = radio (zorunlu olur genelde) · 'cok' = checkbox */
  tip: UrunOpsiyonTipi;
  zorunlu: boolean;
  secenekler: UrunOpsiyonSecenek[];
}

export interface Urun {
  id: string;
  kategoriId: string;
  ad: string;
  aciklama?: string;
  fiyatKurus: Kurus;
  stoktaMi: boolean;
  /** Opsiyonel sayısal stok. undefined → sınırsız (boolean stoktaMi yeterli). */
  stokMiktar?: number;
  gorselUrl?: string;
  sira: number;
  opsiyonGruplari?: UrunOpsiyonGrubu[];
  /** Spec rozeti — admin/seed atar ('şefin önerisi') */
  sefOnerisi?: boolean;
  /** Kitap menü sayfa içi alt grup başlığı — örn. 'Espresso Bazlı', 'Türk Usulü' */
  altKategori?: string;
}

export interface Masa {
  id: string;
  ad: string;
  aktifMi: boolean;
  olusturulduAt: Date;
}

export interface SiparisSecimSnapshot {
  grupAd: string;
  secenekler: Array<{ ad: string; ekFiyatKurus: Kurus }>;
}

export interface SiparisKalemi {
  urunId: string;
  ad: string;
  /** Birim fiyat = baz fiyat + opsiyon ek fiyatları */
  birimFiyatKurus: Kurus;
  adet: number;
  notlar?: string;
  secimler?: SiparisSecimSnapshot[];
  araToplamKurus: Kurus;
}

export interface SiparisDurumTarihleri {
  yeni: Date;
  hazirlaniyor?: Date;
  hazir?: Date;
  teslim?: Date;
  iptal?: Date;
}

export interface Siparis {
  id: string;
  adisyonId: string;
  masaId: string;
  musteriUid: string;
  gunlukNo: number;
  kalemler: SiparisKalemi[];
  toplamKurus: Kurus;
  durum: SiparisDurumu;
  durumTarihleri: SiparisDurumTarihleri;
  olusturulduAt: Date;
  /** Yönetici raporda hariç tuttuysa true — denemelik/test siparişleri ciroya
   *  karışmasın diye. Gerçek sipariş silinmez, yalnız rapor istatistiğinden çıkar. */
  raporDisi?: boolean;
  /** SLA Cloud Function tarafından konur (10 dk yeni / 15 dk hazırlanıyor). */
  slaUyari?: boolean;
  /** Siparişi veren kişinin adı — hesap bölme için isteğe bağlı. */
  musteriAd?: string;
}

export interface Adisyon {
  id: string;
  masaId: string;
  durum: AdisyonDurumu;
  toplamKurus: Kurus;
  acilisAt: Date;
  kapanisAt?: Date;
  siparisSayisi: number;
}

export type OdemeTalebiDurumu = 'bekliyor' | 'odendi' | 'iptal';
export type OdemeTalebiYontemi = 'esit' | 'urun';

export interface OdemeTalebiKalemi {
  siparisId: string;
  siparisNo: number;
  ad: string;
  adet: number;
  araToplamKurus: Kurus;
}

export interface OdemeTalebi {
  id: string;
  adisyonId: string;
  musteriUid?: string;
  yontem: OdemeTalebiYontemi;
  toplamKurus: Kurus;
  kisiSayisi?: number;
  kisiPayi?: Kurus;
  secilenKalemler?: OdemeTalebiKalemi[];
  durum: OdemeTalebiDurumu;
  olusturulduAt: Date;
  /** Ödemeyi yapan kişinin adı — kişiye göre hesap bölme için. */
  musteriAd?: string;
  /** Talebin kaynağı — müşteri mi yoksa kasiyer mi oluşturdu. */
  kaynak?: 'musteri' | 'kasiyer';
}
