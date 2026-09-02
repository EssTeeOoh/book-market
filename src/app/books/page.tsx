import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

type Book = { id: string; slug: string; title: string; author_name: string; description: string; price_minor: number; currency: string; is_free: boolean; like_count: number; cover_storage_key: string | null };

function price(book: Book) {
  if (book.is_free) return "Free";
  return new Intl.NumberFormat("en-NG", { style: "currency", currency: book.currency.trim() || "NGN", maximumFractionDigits: 0 }).format(book.price_minor / 100);
}

async function AccountIcon() {
  const supabase = await createClient();
  const { data: profile } = await supabase.rpc('ensure_my_profile') as { data: { avatar_url?: string | null } | null };
  if (profile?.avatar_url) return <img src={profile.avatar_url} alt="" className="h-full w-full rounded-full object-cover" />;
  return <svg aria-hidden="true" viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="1.8"><circle cx="12" cy="8" r="3.5" /><path strokeLinecap="round" d="M5.5 20c.8-3.1 3-4.7 6.5-4.7s5.7 1.6 6.5 4.7" /></svg>;
}

export default async function BooksPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/auth/login?next=/books");
  const { data, error } = await supabase.from("books").select("id, slug, title, author_name, description, price_minor, currency, is_free, like_count, cover_storage_key").eq("status", "published").order("published_at", { ascending: false });
  const books = (data ?? []) as Book[];

  return <main className="min-h-[100dvh] bg-[#f4f1ea] px-6 py-8 text-[#20211f] sm:px-10"><div className="mx-auto max-w-7xl"><nav className="flex items-center justify-between"><Link href="/" className="text-sm font-semibold tracking-[0.2em]">TRANQUILITY</Link><Link href="/account" aria-label="Open your account" title="My account" className="flex h-10 w-10 items-center justify-center rounded-full bg-[#20211f] text-white transition hover:bg-[#b64d2d]"><AccountIcon /></Link></nav><header className="pb-12 pt-20"><p className="text-sm font-semibold uppercase tracking-[0.2em] text-[#b64d2d]">The public shelf</p><h1 className="mt-4 text-6xl font-semibold tracking-[-0.07em]">Explore books.</h1><p className="mt-5 max-w-xl text-lg leading-8 text-[#62645d]">Browse every published title currently available on Tranquility.</p></header>{error ? <div className="rounded-2xl border border-[#e7b9aa] bg-[#fbe9e3] p-6 text-sm text-[#8d321d]">The book catalog is temporarily unavailable. Please try again shortly.</div> : books.length === 0 ? <div className="rounded-2xl border border-[#ded9cf] bg-[#faf9f5] p-8 leading-7 text-[#62645d]">No published books are available yet.</div> : <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-4">{books.map((book) => { const coverUrl = book.cover_storage_key ? supabase.storage.from("book-covers").getPublicUrl(book.cover_storage_key).data.publicUrl : null; return <Link href={`/books/${book.slug}`} key={book.id} className="rounded-2xl border border-[#ded9cf] bg-[#faf9f5] p-4 transition hover:-translate-y-1 hover:shadow-xl hover:shadow-[#3d3428]/10"><div className="flex aspect-[4/3] items-end rounded-xl bg-[#dfe8df] bg-cover bg-center p-5" style={coverUrl ? { backgroundImage: `url(${coverUrl})` } : undefined} role={coverUrl ? "img" : undefined} aria-label={coverUrl ? `${book.title} cover` : undefined}><p className={`text-2xl font-semibold leading-tight tracking-[-0.04em] ${coverUrl ? "text-white drop-shadow-[0_1px_3px_rgba(0,0,0,0.8)]" : "text-[#536052]"}`}>{book.title}</p></div><p className="mt-5 text-xs font-semibold uppercase tracking-[0.16em] text-[#b64d2d]">{book.author_name}</p><p className="mt-3 line-clamp-2 text-sm leading-6 text-[#62645d]">{book.description}</p><div className="mt-5 flex justify-between text-sm"><span className="font-semibold">{price(book)}</span><span className="text-[#62645d]">{book.like_count} likes</span></div></Link>; })}</div>}</div></main>;
}
