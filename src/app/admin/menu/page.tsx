import Link from 'next/link';
import { ArrowLeft } from 'lucide-react';
import { MenuYonetimi } from './menu-yonetimi';

export default function AdminMenuSayfasi() {
  return (
    <div className="mx-auto max-w-6xl p-4">
      <Link
        href="/admin/ayarlar"
        className="mb-2 inline-flex items-center gap-1.5 text-sm text-muted-foreground"
      >
        <ArrowLeft className="size-4" />
        Ayarlar
      </Link>
      <h1 className="mb-4 text-2xl font-semibold">Menü Yönetimi</h1>
      <MenuYonetimi />
    </div>
  );
}
