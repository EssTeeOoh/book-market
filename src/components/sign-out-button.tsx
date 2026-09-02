'use client';

import { useRouter } from 'next/navigation';
import Link from 'next/link';
import Image from 'next/image';
import { createClient } from '@/lib/supabase/client';

export function SignOutButton() {
  const router = useRouter();

  async function signOut() {
    await createClient().auth.signOut();
    router.push('/auth/login');
    router.refresh();
  }

  return <div className="flex items-center gap-3"><Link href="/account/settings" aria-label="Open settings" title="Settings" className="flex h-10 w-10 items-center justify-center rounded-full border border-[#d6d2c9] transition hover:border-[#b64d2d]"><Image src="/settings-icon.png" alt="" width={24} height={24} className="h-5 w-5" /></Link><button type="button" onClick={signOut} className="rounded-lg border border-[#d6d2c9] px-4 py-2 text-sm font-semibold text-[#20211f] hover:border-[#b64d2d] hover:text-[#b64d2d]">Sign out</button></div>;
}
