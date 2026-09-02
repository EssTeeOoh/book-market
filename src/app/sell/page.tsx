import Link from 'next/link';
import { redirect } from 'next/navigation';
import { UploadForm } from './upload-form';
import { createClient } from '@/lib/supabase/server';

export default async function SellPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect('/auth/login');
  const { data: profile, error: profileError } = await supabase.rpc('ensure_my_profile');
  if (!profile || (profile.role !== 'seller' && profile.role !== 'admin')) {
    return <main className="min-h-[100dvh] bg-[#f4f1ea] px-6 py-8 text-[#20211f] sm:px-10"><div className="mx-auto max-w-3xl"><nav className="flex items-center justify-between"><Link href="/" className="text-sm font-semibold tracking-[0.2em]">TRANQUILITY</Link><Link href="/account" className="text-sm font-semibold text-[#b64d2d] hover:underline">My account</Link></nav><section className="mt-24 rounded-2xl border border-[#e7b9aa] bg-[#fbe9e3] p-8"><p className="text-sm font-semibold uppercase tracking-[0.2em] text-[#8d321d]">Seller access required</p><h1 className="mt-4 text-3xl font-semibold">This account cannot upload books yet.</h1><p className="mt-4 leading-7 text-[#8d321d]">The signed-in account is currently detected as <strong>{profile?.role ?? 'no profile role'}</strong>{profile?.status ? ` (${profile.status})` : ''}. Change the role on the profile row belonging to {user.email}, then sign out and sign in again.</p>{profileError && <p className="mt-4 text-sm text-[#8d321d]">Profile lookup error: {profileError.message}</p>}</section></div></main>;
  }

  return <main className="min-h-[100dvh] bg-[#f4f1ea] px-6 py-8 text-[#20211f] sm:px-10"><div className="mx-auto max-w-3xl"><nav className="flex items-center justify-between"><Link href="/" className="text-sm font-semibold tracking-[0.2em]">TRANQUILITY</Link><Link href="/account" className="text-sm font-semibold text-[#b64d2d] hover:underline">My account</Link></nav><header className="pb-8 pt-20"><p className="text-sm font-semibold uppercase tracking-[0.2em] text-[#b64d2d]">Seller workspace</p><h1 className="mt-4 text-6xl font-semibold tracking-[-0.07em]">Share a book.</h1><p className="mt-5 max-w-xl text-lg leading-8 text-[#62645d]">Upload the details and files. Your book will be saved as a draft for review before it can appear publicly.</p></header><section className="rounded-2xl border border-[#ded9cf] bg-[#faf9f5] p-6 sm:p-8"><UploadForm /></section></div></main>;
}
