'use server';

import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';

export type UploadState = { error?: string };

function slugify(value: string) {
  return value.toLowerCase().trim().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '').slice(0,  seventyFive);
}

const seventyFive = 75;

export async function createBook(previousState: UploadState, formData: FormData): Promise<UploadState> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: 'You must be signed in to upload a book.' };

  const { data: profile, error: profileError } = await supabase.rpc('ensure_my_profile');
  if (profileError) return { error: `Could not verify your profile: ${profileError.message}` };
  if (!profile || (profile.role !== 'seller' && profile.role !== 'admin')) return { error: 'Only sellers and admins can upload books.' };
  if (profile.status !== 'active') return { error: 'This account is not active and cannot upload books.' };

  const title = String(formData.get('title') ?? '').trim();
  const authorName = String(formData.get('author_name') ?? '').trim();
  const description = String(formData.get('description') ?? '').trim();
  const isFree = formData.get('is_free') === 'on';
  const priceNaira = Number(formData.get('price') ?? 0);
  const pdf = formData.get('pdf');
  const cover = formData.get('cover');

  if (title.length < 2 || authorName.length < 2 || description.length < 20) return { error: 'Enter a title, author, and description of at least 20 characters.' };
  if (!(pdf instanceof File) || pdf.size === 0 || pdf.type !== 'application/pdf') return { error: 'Choose a valid PDF file.' };
  if (pdf.size > 20 * 1024 * 1024) return { error: 'The PDF must be 20 MB or smaller.' };
  if (!isFree && (!Number.isFinite(priceNaira) || priceNaira <= 0)) return { error: 'Enter a valid price, or mark the book as free.' };
  if (cover instanceof File && cover.size > 0 && (!cover.type.startsWith('image/') || cover.size > 10 * 1024 * 1024)) return { error: 'The cover must be an image of 10 MB or smaller.' };

  const bookId = crypto.randomUUID();
  const baseSlug = slugify(title) || 'book';
  const slug = `${baseSlug}-${bookId.slice(0, 8)}`;
  const folder = `${user.id}/${bookId}`;
  const pdfPath = `${folder}/book.pdf`;
  const coverPath = cover instanceof File && cover.size > 0 ? `${folder}/cover` : null;

  const pdfUpload = await supabase.storage.from('book-files').upload(pdfPath, pdf, { contentType: 'application/pdf', upsert: false });
  if (pdfUpload.error) return { error: `Could not upload the PDF: ${pdfUpload.error.message}` };

  if (coverPath && cover instanceof File) {
    const coverUpload = await supabase.storage.from('book-covers').upload(coverPath, cover, { contentType: cover.type, upsert: false });
    if (coverUpload.error) {
      await supabase.storage.from('book-files').remove([pdfPath]);
      return { error: `Could not upload the cover: ${coverUpload.error.message}` };
    }
  }

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
    await supabase.storage.from('book-files').remove([pdfPath]);
    if (coverPath) await supabase.storage.from('book-covers').remove([coverPath]);
    return { error: `Could not save the book: ${insertError.message}` };
  }

  revalidatePath('/');
  revalidatePath('/books');
  redirect('/account?uploaded=1');
}
