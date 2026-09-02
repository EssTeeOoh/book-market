'use server';

import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';

export type UploadState = { error?: string };

function slugify(value: string) {
  return value.toLowerCase().trim().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '').slice(0, 75);
}

export async function createBook(_previousState: UploadState, formData: FormData): Promise<UploadState> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  console.info('[upload] authenticated request received');
  if (!user) return { error: 'You must be signed in to upload a book.' };

  const { data: profile, error: profileError } = await supabase.rpc('ensure_my_profile');
  console.info('[upload] profile check completed', { ok: !profileError, role: profile?.role ?? null });
  if (profileError) return { error: `Could not verify your profile: ${profileError.message}` };
  if (!profile || (profile.role !== 'seller' && profile.role !== 'admin')) return { error: 'Only sellers and admins can upload books.' };
  if (profile.status !== 'active') return { error: 'This account is not active and cannot upload books.' };

  const title = String(formData.get('title') ?? '').trim();
  const authorName = String(formData.get('author_name') ?? '').trim();
  const description = String(formData.get('description') ?? '').trim();
  const isFree = formData.get('is_free') === 'on';
  const priceNaira = Number(formData.get('price') ?? 0);
  const bookId = String(formData.get('book_id') ?? '');
  const pdfPath = String(formData.get('pdf_path') ?? '');
  const coverPathValue = String(formData.get('cover_path') ?? '');
  const coverPath = coverPathValue || null;

  if (title.length < 2 || authorName.length < 2 || description.length < 20) return { error: 'Enter a title, author, and description of at least 20 characters.' };
  if (!/^[0-9a-f-]{36}$/.test(bookId)) return { error: 'The upload session is invalid. Please try again.' };
  if (pdfPath !== `${user.id}/${bookId}/book.pdf`) return { error: 'The PDF upload path is invalid.' };
  if (coverPath && coverPath !== `${user.id}/${bookId}/cover`) return { error: 'The cover upload path is invalid.' };
  if (!isFree && (!Number.isFinite(priceNaira) || priceNaira <= 0)) return { error: 'Enter a valid price, or mark the book as free.' };

  const slug = `${slugify(title) || 'book'}-${bookId.slice(0, 8)}`;
  const { error: insertError } = await supabase.from('books').insert({
    id: bookId,
    owner_id: user.id,
    title,
    slug,
    author_name: authorName,
    description,
    price_minor: isFree ? 0 : Math.round(priceNaira * 100),
    currency: 'NGN',
    is_free: isFree,
    cover_storage_key: coverPath,
    pdf_storage_key: pdfPath,
    source: profile.role === 'admin' ? 'admin' : 'seller',
    status: profile.role === 'admin' ? 'published' : 'draft',
    published_at: profile.role === 'admin' ? new Date().toISOString() : null,
  });

  if (insertError) {
    console.error('[upload] book metadata insert failed', { code: insertError.code, message: insertError.message });
    await supabase.storage.from('book-files').remove([pdfPath]);
    if (coverPath) await supabase.storage.from('book-covers').remove([coverPath]);
    return { error: `Could not save the book: ${insertError.message}` };
  }

  console.info('[upload] book metadata inserted', { bookId });

  revalidatePath('/');
  revalidatePath('/books');
  redirect('/account?uploaded=1');
}
