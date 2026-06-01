import Link from 'next/link';
import { ChevronRight, BookOpen, Grid3x3 } from 'lucide-react';
import { getAdminDb } from '@/lib/firebase/admin';
import { AyarForm } from './ayar-form';

export const dynamic = 'force-dynamic';

const R = (): string => {
  const id = process.env.NEXT_PUBLIC_RESTORAN_ID;
  if (!id) throw new Error('NEXT_PUBLIC_RESTORAN_ID tanımlı değil.');
  return id;
};

const YONETIM = [
  {
    yol: '/admin/menu',
    baslik: 'Menü Yönetimi',
    aciklama: 'Kategoriler, ürünler ve opsiyonlar',
    Ikon: BookOpen,
  },
  {
    yol: '/admin/masalar',
    baslik: 'Masa Yönetimi',
    aciklama: 'Masaları ekle, düzenle veya kaldır',
    Ikon: Grid3x3,
  },
];

export default async function AyarlarSayfasi() {
  const snap = await getAdminDb().doc(`restoranlar/${R()}`).get();
  const ad = snap.exists ? ((snap.data() as { ad?: string }).ad ?? '') : '';

  return (
    <div className="mx-auto max-w-xl p-4 space-y-6">
      <section className="space-y-3">
        <h2 className="text-sm font-medium text-muted-foreground">Yönetim</h2>
        <ul className="space-y-2">
          {YONETIM.map((y) => (
            <li key={y.yol}>
              <Link
                href={y.yol}
                className="flex items-center gap-3 rounded-lg border bg-card p-3 transition hover:bg-accent"
              >
                <span className="flex size-9 shrink-0 items-center justify-center rounded-md bg-secondary text-secondary-foreground">
                  <y.Ikon className="size-4" />
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block font-medium">{y.baslik}</span>
                  <span className="block text-xs text-muted-foreground">
                    {y.aciklama}
                  </span>
                </span>
                <ChevronRight className="size-4 shrink-0 text-muted-foreground" />
              </Link>
            </li>
          ))}
        </ul>
      </section>

      <section className="space-y-4">
        <h1 className="text-2xl font-semibold">Restoran Ayarları</h1>
        <AyarForm baslangic={{ ad }} />
      </section>
    </div>
  );
}
