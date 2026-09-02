import Link from 'next/link';
import { redirect } from 'next/navigation';
import { ProfileSetupForm } from '@/components/profile-setup-form';
import { createClient } from '@/lib/supabase/server';

export default async function AccountSetupPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect('/auth/login');
  const { data: profile } = await supabase.rpc('ensure_my_profile') as { data: { username?: string | null; full_name?: string | null } | null };
  if (profile?.username) redirect('/account');

  return <main className="min-h-[100dvh] bg-[#f4f1ea] px-6 py-10 text-[#20211f] sm:px-10"><div className="mx-auto max-w-xl"><header><Link href="/" className="text-sm font-semibold tracking-[0.18em] hover:text-[#b64d2d]">TRANQUILITY</Link></header><section className="mt-24 rounded-2xl border border-[#ded9cf] bg-[#faf9f5] p-6 sm:p-10"><p className="text-sm font-semibold uppercase tracking-[0.2em] text-[#b64d2d]">One last step</p><h1 className="mt-4 text-4xl font-semibold tracking-[-0.05em]">Set up your account.</h1><p className="mt-4 leading-7 text-[#62645d]">Choose how people will recognize you on Tranquility. You can update your display name later, and Google users can create a password from account settings.</p><ProfileSetupForm currentFirstName={(user.user_metadata?.first_name ?? '').toString()} currentLastName={(user.user_metadata?.last_name ?? '').toString()} /></section></div></main>;
}
