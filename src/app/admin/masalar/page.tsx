import Link from 'next/link';
import { ArrowLeft } from 'lucide-react';
import { MasaYonetimi } from './masa-yonetimi';

export default function AdminMasalarSayfasi() {
  return (
    <div className="mx-auto max-w-4xl p-4">
      <Link
        href="/admin/ayarlar"
        className="mb-2 inline-flex items-center gap-1.5 text-sm text-muted-foreground"
      >
        <ArrowLeft className="size-4" />
        Ayarlar
      </Link>
      <h1 className="mb-4 text-2xl font-semibold">Masa Yönetimi</h1>
      <MasaYonetimi />
    </div>
  );
}
