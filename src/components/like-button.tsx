'use client';

import { useEffect, useState, useTransition } from 'react';
import { toggleLike } from '@/app/books/like-actions';
import { createClient } from '@/lib/supabase/client';

export function LikeButton({ bookId, slug, initialLiked, initialCount }: { bookId: string; slug: string; initialLiked: boolean; initialCount: number }) {
  const [liked, setLiked] = useState(initialLiked);
  const [count, setCount] = useState(initialCount);
  const [error, setError] = useState<string | null>(null);
  const [isAuthenticated, setIsAuthenticated] = useState<boolean | null>(null);
  const [isPending, startTransition] = useTransition();

  useEffect(() => {
    const supabase = createClient();
    let active = true;
    supabase.auth.getUser().then(({ data }) => {
      if (active) setIsAuthenticated(Boolean(data.user));
    });
    const { data: authListener } = supabase.auth.onAuthStateChange((_event, session) => {
      if (active) setIsAuthenticated(Boolean(session?.user));
    });
    return () => {
      active = false;
      authListener.subscription.unsubscribe();
    };
  }, []);
  function handleLike() {
    setError(null);
    startTransition(async () => {
      const result = await toggleLike(bookId, slug);
      if (result.error) { setError(result.error); return; }
      setLiked(result.liked ?? false);
      setCount(result.likeCount ?? count);
    });
  }
  if (isAuthenticated !== true) return null;
  return <div><button type="button" onClick={handleLike} disabled={isPending} aria-label={liked ? `Unlike this book. ${count} likes` : `Like this book. ${count} likes`} aria-pressed={liked} title={liked ? 'Unlike this book' : 'Like this book'} className={`flex h-12 w-12 items-center justify-center rounded-full border transition ${liked ? 'border-[#b64d2d] bg-[#b64d2d] text-white' : 'border-[#c9c4ba] text-[#20211f] hover:border-[#b64d2d] hover:text-[#b64d2d]'} disabled:opacity-60`}><svg aria-hidden="true" viewBox="0 0 24 24" className="h-5 w-5" fill={liked ? 'currentColor' : 'none'} stroke="currentColor" strokeWidth="1.8"><path strokeLinecap="round" strokeLinejoin="round" d="M20.8 8.7c0 5.5-8.8 10.1-8.8 10.1S3.2 14.2 3.2 8.7A4.5 4.5 0 0 1 12 6.5a4.5 4.5 0 0 1 8.8 2.2Z" /></svg></button><span className="sr-only">{count} likes</span>{error && <p role="alert" className="mt-2 text-xs text-[#8d321d]">{error}</p>}</div>;
}
