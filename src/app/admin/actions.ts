'use server';

import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/admin';

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

export async function archiveBook(formData: FormData) {
  const supabase = await requireAdmin();
  const bookId = String(formData.get('book_id') ?? '');
  const { error } = await supabase.from('books').update({ status: 'archived' }).eq('id', bookId);
  if (error) redirect(`/admin?error=${encodeURIComponent(`Could not archive the book: ${error.message}`)}`);
  revalidatePath('/');
  revalidatePath('/books');
  revalidatePath('/admin');
  redirect('/admin?archived=1');
}

export async function deleteBook(formData: FormData) {
  const supabase = await requireAdmin();
  const bookId = String(formData.get('book_id') ?? '');
  if (!/^[0-9a-f-]{36}$/.test(bookId)) redirect('/admin?error=Invalid%20book%20ID.');

  const { data: book, error: bookError } = await supabase
    .from('books')
    .select('pdf_storage_key, cover_storage_key')
    .eq('id', bookId)
    .maybeSingle();
  if (bookError) redirect(`/admin?error=${encodeURIComponent(`Could not find the book: ${bookError.message}`)}`);
  if (!book) redirect('/admin?error=Book%20not%20found.');

  const admin = createAdminClient();
  const [{ count: orderItemCount }, { count: libraryItemCount }, { count: downloadEventCount }] = await Promise.all([
    admin.from('order_items').select('id', { count: 'exact', head: true }).eq('book_id', bookId),
    admin.from('library_items').select('id', { count: 'exact', head: true }).eq('book_id', bookId),
    admin.from('download_events').select('id', { count: 'exact', head: true }).eq('book_id', bookId),
  ]);
  if ((orderItemCount ?? 0) > 0 || (libraryItemCount ?? 0) > 0 || (downloadEventCount ?? 0) > 0) {
    redirect('/admin?error=This%20book%20has%20purchase%20or%20download%20history.%20Archive%20it%20instead%20of%20deleting%20it.');
  }
  const { error: deleteError } = await admin.from('books').delete().eq('id', bookId);
  if (deleteError) redirect(`/admin?error=${encodeURIComponent(`Could not delete the book: ${deleteError.message}`)}`);

  const storageDeletes = [
    admin.storage.from('book-files').remove([book.pdf_storage_key]),
    ...(book.cover_storage_key ? [admin.storage.from('book-covers').remove([book.cover_storage_key])] : []),
  ];
  const storageResults = await Promise.all(storageDeletes);
  const storageError = storageResults.find(({ error }) => error)?.error;
  revalidatePath('/');
  revalidatePath('/books');
  revalidatePath('/admin');
  if (storageError) redirect(`/admin?warning=${encodeURIComponent(`Book deleted, but a Storage file could not be removed: ${storageError.message}`)}`);
  redirect('/admin?deleted=1');
}
