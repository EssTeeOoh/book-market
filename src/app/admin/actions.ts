'use server';

import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';

async function requireAdmin() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect('/auth/login');
  const { data: profile } = await supabase.rpc('ensure_my_profile');
  if (!profile || profile.role !== 'admin' || profile.status !== 'active') redirect('/account');
  return supabase;
}

export async function publishBook(formData: FormData) {
  const supabase = await requireAdmin();
  const bookId = String(formData.get('book_id') ?? '');
  await supabase.from('books').update({ status: 'published', published_at: new Date().toISOString(), rejection_reason: null }).eq('id', bookId);
  revalidatePath('/');
  revalidatePath('/books');
  revalidatePath('/admin');
}

export async function rejectBook(formData: FormData) {
  const supabase = await requireAdmin();
  const bookId = String(formData.get('book_id') ?? '');
  await supabase.from('books').update({ status: 'rejected', rejection_reason: 'Needs changes before publication.' }).eq('id', bookId);
  revalidatePath('/admin');
}
