import Link from 'next/link';
import { redirect } from 'next/navigation';
import { ProfileSetupForm } from '@/components/profile-setup-form';
import { createClient } from '@/lib/supabase/server';

export default async function AccountSettingsPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect('/auth/login');
  const { data: profile } = await supabase.rpc('ensure_my_profile') as { data: { username?: string | null; first_name?: string | null; last_name?: string | null; display_name?: string | null; role?: 'customer' | 'seller' | 'admin'; gender?: string | null; date_of_birth?: string | null; avatar_url?: string | null } | null };
  if (!profile?.username) redirect('/account/setup');

  return <main className="min-h-[100dvh] bg-[#f4f1ea] px-6 py-10 text-[#20211f] sm:px-10"><div className="mx-auto max-w-xl"><header className="flex items-center justify-between"><Link href="/" className="text-sm font-semibold tracking-[0.18em] hover:text-[#b64d2d]">TRANQUILITY</Link><Link href="/account" className="text-sm font-semibold text-[#b64d2d] hover:underline">Back to account</Link></header><section className="mt-24 rounded-2xl border border-[#ded9cf] bg-[#faf9f5] p-6 sm:p-10"><p className="text-sm font-semibold uppercase tracking-[0.2em] text-[#b64d2d]">Account settings</p><h1 className="mt-4 text-4xl font-semibold tracking-[-0.05em]">Your profile.</h1><p className="mt-4 leading-7 text-[#62645d]">Update your identity, role, and optional personal details. Admin access cannot be changed here.</p><ProfileSetupForm currentFirstName={profile.first_name ?? ''} currentLastName={profile.last_name ?? ''} currentDisplayName={profile.display_name ?? ''} currentUsername={profile.username ?? ''} currentRole={profile.role ?? 'customer'} currentGender={profile.gender ?? ''} currentDateOfBirth={profile.date_of_birth ?? ''} currentAvatarUrl={profile.avatar_url ?? ''} /><div className="mt-8 border-t border-[#ded9cf] pt-6"><h2 className="font-semibold">Need a password?</h2><p className="mt-2 text-sm leading-6 text-[#62645d]">Google users can create an email password by requesting a secure reset link.</p><Link href="/auth/forgot-password" className="mt-4 inline-block text-sm font-semibold text-[#b64d2d] hover:underline">Set or reset password</Link></div></section></div></main>;
}
