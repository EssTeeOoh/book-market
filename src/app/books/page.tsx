import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

type Book = { id: string; slug: string; title: string; author_name: string; description: string; price_minor: number; currency: string; is_free: boolean; like_count: number; cover_storage_key: string | null };

function price(book: Book) {
  if (book.is_free) return "Free";
  return new Intl.NumberFormat("en-NG", { style: "currency", currency: book.currency.trim() || "NGN", maximumFractionDigits: 0 }).format(book.price_minor / 100);
}

async function AccountIcon() {
  const supabase = await createClient();
  const { data: profile } = await supabase.rpc("ensure_my_profile") as { data: { avatar_url?: string | null } | null };
  if (profile?.avatar_url) return <img src={profile.avatar_url} alt="" className="h-full w-full object-cover" />;
  return <svg aria-hidden="true" viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="1.8"><circle cx="12" cy="8" r="3.5" /><path strokeLinecap="round" d="M5.5 20c.8-3.1 3-4.7 6.5-4.7s5.7 1.6 6.5 4.7" /></svg>;
}

export default async function BooksPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/auth/login?next=/books");
  const { data, error } = await supabase.from("books").select("id, slug, title, author_name, description, price_minor, currency, is_free, like_count, cover_storage_key").eq("status", "published").order("published_at", { ascending: false });
  const books = (data ?? []) as Book[];

  return <main className="min-h-[100dvh] bg-[#f7f8f6] px-5 py-5 text-[#1d2420] sm:px-10 sm:py-7"><div className="mx-auto max-w-7xl"><nav className="flex items-center justify-between"><Link href="/" className="text-sm font-semibold tracking-[0.2em]">TRANQUILITY</Link><Link href="/account" aria-label="Open your account" title="My account" className="flex h-10 w-10 items-center justify-center overflow-hidden rounded-full bg-[#1d2420] text-white transition hover:bg-[#f26445]"><AccountIcon /></Link></nav><header className="pb-10 pt-14 sm:pb-12 sm:pt-20"><p className="text-xs font-semibold uppercase tracking-[0.2em] text-[#f26445]">The public shelf</p><h1 className="mt-4 text-5xl font-semibold tracking-[-0.07em] sm:text-7xl">Explore books.</h1><p className="mt-5 max-w-xl text-base leading-8 text-[#68726b] sm:text-lg">Browse every published title currently available on Tranquility.</p></header>{error ? <div className="rounded-2xl border border-[#f2b8aa] bg-[#fff0eb] p-6 text-sm text-[#8d321d]">The book catalog is temporarily unavailable.</div> : books.length === 0 ? <div className="rounded-2xl border border-[#e1e7e2] bg-white p-8 leading-7 text-[#68726b]">No published books are available yet.</div> : <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">{books.map((book) => { const coverUrl = book.cover_storage_key ? supabase.storage.from("book-covers").getPublicUrl(book.cover_storage_key).data.publicUrl : null; return <Link href={`/books/${book.slug}`} key={book.id} className="group rounded-[1.25rem] border border-[#e1e7e2] bg-white p-3 transition hover:-translate-y-1 hover:shadow-xl hover:shadow-[#1d2420]/10 sm:p-4"><div className="relative flex aspect-[4/5] items-end overflow-hidden rounded-[1rem] bg-[#eef2ef] p-4">{coverUrl && <img src={coverUrl} alt={`${book.title} cover`} className="absolute inset-0 h-full w-full object-cover transition duration-500 group-hover:scale-105" />}<p className={`relative max-w-[85%] text-xl font-semibold leading-tight tracking-[-0.04em] ${coverUrl ? "text-white drop-shadow-[0_1px_3px_rgba(0,0,0,0.8)]" : "text-[#536052]"}`}>{book.title}</p></div><p className="mt-4 line-clamp-1 text-[0.68rem] font-semibold uppercase tracking-[0.14em] text-[#f26445]">{book.author_name}</p><p className="mt-2 line-clamp-2 text-sm leading-6 text-[#68726b]">{book.description}</p><div className="mt-5 flex justify-between text-sm"><span className="font-semibold">{price(book)}</span><span className="text-[#68726b]">{book.like_count} likes</span></div></Link>; })}</div>}</div></main>;
}
