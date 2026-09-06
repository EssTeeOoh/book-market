import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

export async function GET(request: Request) {
  const requestUrl = new URL(request.url);
  const code = requestUrl.searchParams.get('code');
  const requestedNext = requestUrl.searchParams.get('next') ?? '/';
  const nextPath = requestedNext.startsWith('/') && !requestedNext.startsWith('//') ? requestedNext : '/account';

  if (!code) {
    return NextResponse.redirect(new URL('/auth/auth-code-error', requestUrl.origin));
  }

  const supabase = await createClient();
  const { error } = await supabase.auth.exchangeCodeForSession(code);
  if (error) {
    return NextResponse.redirect(new URL('/auth/auth-code-error', requestUrl.origin));
  }

  // Password recovery must land on the new-password screen, not onboarding.
  if (nextPath === '/auth/reset-password') {
    return NextResponse.redirect(new URL(nextPath, requestUrl.origin));
  }

  const { data: profile } = await supabase.rpc('ensure_my_profile') as { data: { username?: string | null } | null };
  if (!profile?.username) {
    return NextResponse.redirect(new URL('/account/setup', requestUrl.origin));
  }

  return NextResponse.redirect(new URL(nextPath === '/' ? '/' : nextPath, requestUrl.origin));
}
