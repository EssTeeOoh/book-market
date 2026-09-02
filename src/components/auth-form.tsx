'use client';

import Link from 'next/link';
import Image from 'next/image';
import { useRouter } from 'next/navigation';
import { type FormEvent, useState } from 'react';
import { createClient } from '@/lib/supabase/client';

type AuthMode = 'login' | 'sign-up' | 'forgot-password' | 'reset-password';

const copy = {
  login: { title: 'Welcome back', description: 'Sign in to your reading shelf.', submit: 'Sign in' },
  'sign-up': { title: 'Create your account', description: 'Join a marketplace built for curious readers.', submit: 'Create account' },
  'forgot-password': { title: 'Reset your password', description: 'We will send a secure reset link to your email.', submit: 'Send reset link' },
  'reset-password': { title: 'Choose a new password', description: 'Use at least 8 characters for your new password.', submit: 'Update password' },
} as const;

export function AuthForm({ mode }: { mode: AuthMode }) {
  const router = useRouter();
  const supabase = createClient();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const details = copy[mode];

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    setMessage(null);
    setIsSubmitting(true);

    let result: { error: { message: string } | null };
    if (mode === 'login') {
      result = await supabase.auth.signInWithPassword({ email, password });
    } else if (mode === 'sign-up') {
      result = await supabase.auth.signUp({
        email,
        password,
        options: { emailRedirectTo: `${window.location.origin}/auth/callback` },
      });
    } else if (mode === 'forgot-password') {
      result = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: `${window.location.origin}/auth/reset-password`,
      });
    } else {
      result = await supabase.auth.updateUser({ password });
    }

    setIsSubmitting(false);
    if (result.error) {
      setError(result.error.message);
      return;
    }

    if (mode === 'login' || mode === 'reset-password') {
      router.push(mode === 'login' ? '/auth/continue' : '/');
      router.refresh();
      return;
    }

    setMessage(
      mode === 'sign-up'
        ? 'Account created. Check your email to confirm your address.'
        : 'If an account exists for that email, a reset link is on its way.',
    );
  }

  async function handleGoogleSignIn() {
    setError(null);
    setIsSubmitting(true);
    const { error: googleError } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: { redirectTo: `${window.location.origin}/auth/callback` },
    });
    if (googleError) {
      setIsSubmitting(false);
      setError(googleError.message);
    }
  }

  const showPassword = mode !== 'forgot-password';
  const isSignUp = mode === 'sign-up';

  return (
    <div className="w-full max-w-md">
      <p className="mb-5 text-xs font-semibold uppercase tracking-[0.24em] text-[#b64d2d]">Tranquility Books</p>
      <h1 className="text-4xl font-semibold tracking-[-0.04em] text-[#20211f]">{details.title}</h1>
      <p className="mt-3 text-base leading-7 text-[#62645d]">{details.description}</p>

      <form onSubmit={handleSubmit} className="mt-8 space-y-5">
        <div>
          <label htmlFor="email" className="mb-2 block text-sm font-medium text-[#20211f]">Email address</label>
          <input id="email" name="email" type="email" autoComplete="email" required value={email} onChange={(event) => setEmail(event.target.value)} className="w-full rounded-xl border border-[#d6d2c9] bg-white px-4 py-3 text-[#20211f] outline-none transition focus:border-[#b64d2d] focus:ring-2 focus:ring-[#b64d2d]/20" />
        </div>
        {showPassword && (
          <div>
            <label htmlFor="password" className="mb-2 block text-sm font-medium text-[#20211f]">{mode === 'reset-password' ? 'New password' : 'Password'}</label>
            <input id="password" name="password" type="password" autoComplete={mode === 'reset-password' ? 'new-password' : isSignUp ? 'new-password' : 'current-password'} minLength={8} required value={password} onChange={(event) => setPassword(event.target.value)} className="w-full rounded-xl border border-[#d6d2c9] bg-white px-4 py-3 text-[#20211f] outline-none transition focus:border-[#b64d2d] focus:ring-2 focus:ring-[#b64d2d]/20" />
          </div>
        )}
        {error && <p role="alert" className="rounded-xl bg-[#fbe9e3] px-4 py-3 text-sm leading-6 text-[#8d321d]">{error}</p>}
        {message && <p role="status" className="rounded-xl bg-[#e5eee6] px-4 py-3 text-sm leading-6 text-[#31563c]">{message}</p>}
        <button type="submit" disabled={isSubmitting} className="w-full rounded-xl bg-[#20211f] px-4 py-3.5 text-sm font-semibold text-white transition hover:bg-[#b64d2d] disabled:cursor-not-allowed disabled:opacity-60">{isSubmitting ? 'Please wait...' : details.submit}</button>
      </form>

      {(mode === 'login' || mode === 'sign-up') && (
        <>
          <div className="my-6 flex items-center gap-3 text-xs uppercase tracking-[0.18em] text-[#9a988f]"><span className="h-px flex-1 bg-[#d6d2c9]" />or<span className="h-px flex-1 bg-[#d6d2c9]" /></div>
          <button type="button" onClick={handleGoogleSignIn} disabled={isSubmitting} className="flex w-full items-center justify-center gap-3 rounded-xl border border-[#d6d2c9] bg-white px-4 py-3.5 text-sm font-semibold text-[#20211f] transition hover:border-[#20211f] disabled:cursor-not-allowed disabled:opacity-60"><Image src="/google-icon.png" alt="" width={24} height={24} />Continue with Google</button>
        </>
      )}

      <div className="mt-7 flex flex-wrap gap-x-3 gap-y-2 text-sm text-[#62645d]">
        {mode === 'login' && <><span>New here?</span><Link href="/auth/sign-up" className="font-semibold text-[#b64d2d] hover:underline">Create an account</Link><Link href="/auth/forgot-password" className="ml-auto font-semibold text-[#20211f] hover:underline">Forgot password?</Link></>}
        {mode === 'sign-up' && <><span>Already have an account?</span><Link href="/auth/login" className="font-semibold text-[#b64d2d] hover:underline">Sign in</Link></>}
        {mode === 'forgot-password' && <Link href="/auth/login" className="font-semibold text-[#b64d2d] hover:underline">Back to sign in</Link>}
        {mode === 'reset-password' && <Link href="/auth/login" className="font-semibold text-[#b64d2d] hover:underline">Back to sign in</Link>}
      </div>
    </div>
  );
}
