'use server';

import { revalidatePath } from 'next/cache';
import { createClient } from '@/lib/supabase/server';

export async function toggleLike(bookId: string, slug: string) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: 'Sign in to like books.' };
  const { data: existing } = await supabase.from('book_likes').select('book_id').eq('book_id', bookId).eq('user_id', user.id).maybeSingle();
  const mutation = existing ? await supabase.from('book_likes').delete().eq('book_id', bookId).eq('user_id', user.id) : await supabase.from('book_likes').insert({ book_id: bookId, user_id: user.id });
  if (mutation.error) return { error: mutation.error.message };
  const { data: book } = await supabase.from('books').select('like_count').eq('id', bookId).single();
  revalidatePath(`/books/${slug}`);
  revalidatePath('/');
  revalidatePath('/books');
  return { liked: !existing, likeCount: book?.like_count ?? 0 };
}
