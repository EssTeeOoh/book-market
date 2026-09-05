import { NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { createClient } from '@/lib/supabase/server';

const uuidPattern = /^[0-9a-f-]{36}$/;
const extensionPattern = /^[a-z0-9]{1,10}$/;

export async function POST(request: Request) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Sign in before uploading.' }, { status: 401 });

  const { data: profile, error: profileError } = await supabase.rpc('ensure_my_profile');
  if (profileError || !profile || !['seller', 'admin'].includes(profile.role) || profile.status !== 'active') {
    return NextResponse.json({ error: 'Only active sellers and admins can upload books.' }, { status: 403 });
  }

  const body = await request.json().catch(() => null) as { bookId?: string; kind?: 'pdf' | 'cover'; extension?: string } | null;
  if (!body?.bookId || !uuidPattern.test(body.bookId) || !body.kind) return NextResponse.json({ error: 'Invalid upload request.' }, { status: 400 });

  const extension = body.kind === 'pdf' ? 'pdf' : body.extension?.toLowerCase();
  if (!extension || !extensionPattern.test(extension)) return NextResponse.json({ error: 'Invalid file extension.' }, { status: 400 });
  const path = `${user.id}/${body.bookId}/${body.kind === 'pdf' ? 'book.pdf' : `cover.${extension}`}`;
  const admin = createAdminClient();
  const { data, error } = await admin.storage.from(body.kind === 'pdf' ? 'book-files' : 'book-covers').createSignedUploadUrl(path, { upsert: false });
  if (error || !data?.token) return NextResponse.json({ error: error?.message ?? 'Could not prepare the upload.' }, { status: 500 });
  return NextResponse.json({ path, token: data.token });
}
