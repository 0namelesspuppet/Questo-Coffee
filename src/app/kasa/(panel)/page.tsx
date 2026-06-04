import { redirect } from 'next/navigation';
import { kasiyerGerekli } from '@/lib/auth/guard';

export const dynamic = 'force-dynamic';

export default async function KasaAnaSayfa() {
  const u = await kasiyerGerekli('/kasa');
  // Kasiyer (sahip) adisyonlarla, garson masalarla çalışır.
  redirect(u.claims.sahip ? '/kasa/adisyonlar' : '/kasa/masalar');
}
