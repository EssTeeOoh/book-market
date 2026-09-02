import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

export async function GET(request: Request) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.redirect(new URL('/auth/login', request.url));

  const { data: profile } = await supabase.rpc('ensure_my_profile') as { data: { username?: string | null } | null };
  return NextResponse.redirect(new URL(profile?.username ? '/' : '/account/setup', request.url));
}
