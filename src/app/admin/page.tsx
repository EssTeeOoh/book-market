import Link from 'next/link';
import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { publishBook, rejectBook, archiveBook, deleteBook } from './actions';
import { DeleteBookButton } from './delete-book-button';
import { AdminActionButton } from './admin-action-button';

async function AccountIcon() {
  const supabase = await createClient();
  const { data: profile } = await supabase.rpc('ensure_my_profile') as { data: { avatar_url?: string | null } | null };
  if (profile?.avatar_url) return <img src={profile.avatar_url} alt="" className="h-full w-full rounded-full object-cover" />;
  return <svg aria-hidden="true" viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="1.8"><circle cx="12" cy="8" r="3.5" /><path strokeLinecap="round" d="M5.5 20c.8-3.1 3-4.7 6.5-4.7s5.7 1.6 6.5 4.7" /></svg>;
}

type Props = { searchParams: Promise<{ archived?: string; deleted?: string; error?: string; warning?: string }> };

export default async function AdminPage({ searchParams }: Props) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect('/auth/login');
  const { data: profile } = await supabase.rpc('ensure_my_profile');
  if (!profile || profile.role !== 'admin' || profile.status !== 'active') redirect('/account');
  const { data: books } = await supabase.from('books').select('id, title, author_name, status, created_at, owner_id').order('created_at', { ascending: false });
  const params = await searchParams;

  return <main className="min-h-[100dvh] bg-[#f4f1ea] px-6 py-8 text-[#20211f] sm:px-10"><div className="mx-auto max-w-6xl"><nav className="flex items-center justify-between"><Link href="/" className="text-sm font-semibold tracking-[0.2em]">TRANQUILITY</Link><Link href="/account" aria-label="Open your account" title="My account" className="flex h-10 w-10 items-center justify-center overflow-hidden rounded-full bg-[#20211f] text-white transition hover:bg-[#b64d2d]"><AccountIcon /></Link></nav>{params.archived && <p role="status" className="mt-6 rounded-xl bg-[#e5eee6] px-4 py-3 text-sm text-[#31563c]">Book archived successfully.</p>}{params.deleted && <p role="status" className="mt-6 rounded-xl bg-[#e5eee6] px-4 py-3 text-sm text-[#31563c]">Book deleted successfully.</p>}{params.warning && <p role="status" className="mt-6 rounded-xl bg-[#fff4d6] px-4 py-3 text-sm text-[#765b16]">{params.warning}</p>}{params.error && <p role="alert" className="mt-6 rounded-xl bg-[#fbe9e3] px-4 py-3 text-sm text-[#8d321d]">{params.error}</p>}<header className="pb-10 pt-20"><p className="text-sm font-semibold uppercase tracking-[0.2em] text-[#b64d2d]">Admin workspace</p><h1 className="mt-4 text-6xl font-semibold tracking-[-0.07em]">Review the shelf.</h1><p className="mt-5 max-w-xl text-lg leading-8 text-[#62645d]">Review seller submissions and manage what is visible in the public catalogue.</p></header><section className="overflow-hidden rounded-2xl border border-[#ded9cf] bg-[#faf9f5]"><div className="grid grid-cols-[1.5fr_1fr_0.8fr_1.2fr] gap-4 border-b border-[#ded9cf] px-5 py-4 text-xs font-semibold uppercase tracking-[0.12em] text-[#817e74]"><span>Book</span><span>Owner</span><span>Status</span><span>Action</span></div>{(books ?? []).map((book) => <div key={book.id} className="grid grid-cols-[1.5fr_1fr_0.8fr_1.2fr] items-center gap-4 border-b border-[#ded9cf] px-5 py-5 text-sm last:border-0"><div><p className="font-semibold">{book.title}</p><p className="mt-1 text-[#62645d]">{book.author_name}</p></div><span className="truncate text-[#62645d]">{book.owner_id.slice(0, 8)}...</span><span className="font-semibold capitalize text-[#b64d2d]">{book.status.replace('_', ' ')}</span><div className="flex flex-wrap gap-2">{book.status !== 'published' && book.status !== 'archived' && <form action={publishBook}><input type="hidden" name="book_id" value={book.id} /><AdminActionButton label="Publish" pendingLabel="Publishing..." /></form>}{book.status !== 'rejected' && book.status !== 'published' && book.status !== 'archived' && <form action={rejectBook}><input type="hidden" name="book_id" value={book.id} /><AdminActionButton label="Reject" pendingLabel="Rejecting..." variant="light" /></form>}{book.status !== 'archived' && <form action={archiveBook}><input type="hidden" name="book_id" value={book.id} /><AdminActionButton label="Archive" pendingLabel="Archiving..." variant="light" /></form>}{book.status !== 'archived' && <form action={deleteBook}><input type="hidden" name="book_id" value={book.id} /><DeleteBookButton /></form>}</div></div>)}{(!books || books.length === 0) && <p className="px-5 py-8 text-sm text-[#62645d]">No books have been uploaded yet.</p>}</section></div></main>;
}
