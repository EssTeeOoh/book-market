import Image from "next/image";
import Link from "next/link";
import { createClient } from "@/lib/supabase/server";

type Book = {
  id: string;
  slug: string;
  title: string;
  author_name: string;
  description: string;
  price_minor: number;
  currency: string;
  is_free: boolean;
  is_featured: boolean;
  published_at: string | null;
  like_count: number;
  cover_storage_key: string | null;
  cover_url: string | null;
};

function formatPrice(book: Book) {
  if (book.is_free) return "Free";
  return new Intl.NumberFormat("en-NG", { style: "currency", currency: book.currency.trim() || "NGN", maximumFractionDigits: 0 }).format(book.price_minor / 100);
}

function BookCard({ book }: { book: Book }) {
  return <Link href={`/books/${book.slug}`} className="group flex h-full flex-col rounded-2xl border border-[#ded9cf] bg-[#faf9f5] p-4 transition hover:-translate-y-1 hover:shadow-xl hover:shadow-[#3d3428]/10"><div className="relative flex aspect-[4/3] items-end overflow-hidden rounded-xl bg-[#dfe8df] bg-cover bg-center p-5" style={book.cover_url ? { backgroundImage: `url(${book.cover_url})` } : undefined} role={book.cover_url ? "img" : undefined} aria-label={book.cover_url ? `${book.title} cover` : undefined}>{!book.cover_url && <><div className="absolute -right-8 -top-12 h-36 w-36 rounded-full bg-[#b7c7b8]" /><div className="absolute bottom-4 right-5 h-20 w-14 rotate-6 rounded bg-[#c85a32] shadow-lg" /></>}<p className={`relative max-w-[85%] text-2xl font-semibold leading-tight tracking-[-0.04em] ${book.cover_url ? "text-white drop-shadow-[0_1px_3px_rgba(0,0,0,0.8)]" : "text-[#536052]"}`}>{book.title}</p></div><div className="flex flex-1 flex-col pt-5"><p className="text-xs font-semibold uppercase tracking-[0.16em] text-[#b64d2d]">{book.author_name}</p><p className="mt-3 line-clamp-2 text-sm leading-6 text-[#62645d]">{book.description}</p><div className="mt-auto flex items-center justify-between gap-3 pt-6 text-sm"><span className="font-semibold text-[#20211f]">{formatPrice(book)}</span><span className="text-[#62645d]">{book.like_count} likes</span></div></div></Link>;
}

function BookSection({ title, description, books }: { title: string; description: string; books: Book[] }) {
  if (books.length === 0) return null;
  return <section className="mx-auto max-w-7xl px-6 py-14 sm:px-10"><div className="mb-7 flex items-end justify-between gap-6"><div><p className="text-3xl font-semibold tracking-[-0.05em]">{title}</p><p className="mt-2 text-sm leading-6 text-[#62645d]">{description}</p></div><Link href="/books" aria-label="Browse all books" title="Browse books" className="hidden h-10 w-10 items-center justify-center rounded-full border border-[#d6d2c9] transition hover:border-[#b64d2d] sm:flex"><Image src="/books-icon.png" alt="" width={28} height={28} className="h-6 w-6" /></Link></div><div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-4">{books.map((book) => <BookCard key={book.id} book={book} />)}</div></section>;
}

function AccountIcon({ avatarUrl }: { avatarUrl?: string | null }) {
  if (avatarUrl) return <Image src={avatarUrl} alt="" width={40} height={40} className="h-full w-full rounded-full object-cover" />;
  return <svg aria-hidden="true" viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="1.8"><circle cx="12" cy="8" r="3.5" /><path strokeLinecap="round" d="M5.5 20c.8-3.1 3-4.7 6.5-4.7s5.7 1.6 6.5 4.7" /></svg>;
}

export default async function Home() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  const { data, error } = await supabase.from("books").select("id, slug, title, author_name, description, price_minor, currency, is_free, is_featured, published_at, like_count, cover_storage_key").eq("status", "published").order("published_at", { ascending: false }).limit(24);
  const books = ((data ?? []) as Omit<Book, "cover_url">[]).map((book) => ({ ...book, cover_url: book.cover_storage_key ? supabase.storage.from("book-covers").getPublicUrl(book.cover_storage_key).data.publicUrl : null }));
  const newest = books.slice(0, 3);
  const featured = books.filter((book) => book.is_featured).slice(0, 4);
  const recommended = [...books].sort((a, b) => b.like_count - a.like_count).slice(0, 4);

  return <main className="min-h-[100dvh] bg-[#f4f1ea] text-[#20211f]"><nav className="mx-auto flex max-w-7xl items-center justify-between px-6 py-7 sm:px-10"><Link href="/" className="text-sm font-semibold tracking-[0.2em]">TRANQUILITY</Link><div className="flex items-center gap-5 text-sm font-medium"><Link href="/books" aria-label="Browse books" title="Browse books" className="flex h-10 w-10 items-center justify-center rounded-full border border-[#d6d2c9] transition hover:border-[#b64d2d]"><Image src="/books-icon.png" alt="" width={28} height={28} className="h-6 w-6" /></Link>{user ? <Link href="/account" aria-label="Open your account" title="My account" className="flex h-10 w-10 items-center justify-center rounded-full bg-[#20211f] text-white hover:bg-[#b64d2d]"><AccountIcon /></Link> : <><Link href="/auth/login" className="hover:text-[#b64d2d]">Sign in</Link><Link href="/auth/sign-up" className="rounded-full bg-[#20211f] px-4 py-2.5 text-white hover:bg-[#b64d2d]">Join the shelf</Link></>}</div></nav>
    <section className="relative mx-auto grid max-w-7xl gap-12 overflow-hidden px-6 pb-20 pt-14 sm:px-10 lg:grid-cols-[1.1fr_0.9fr] lg:items-center lg:pb-24 lg:pt-20"><div className="relative z-10 max-w-2xl"><p className="text-sm font-semibold uppercase tracking-[0.22em] text-[#b64d2d]">A marketplace for readers</p><h1 className="mt-6 text-6xl font-semibold leading-[0.95] tracking-[-0.07em] sm:text-8xl">Books with a little more <span className="text-[#b64d2d]">meaning.</span></h1><p className="mt-8 max-w-lg text-lg leading-8 text-[#62645d]">Find independent voices, sell stories you have finished, and keep your next good read within reach.</p></div><div className="relative min-h-[260px] lg:min-h-[360px]"><div className="absolute right-2 top-8 h-64 w-44 rotate-[8deg] rounded-[1.2rem] bg-[#c85a32] shadow-2xl shadow-[#b64d2d]/20 sm:right-16 sm:h-80 sm:w-56"><div className="absolute inset-5 border border-white/40" /><p className="absolute bottom-8 left-7 right-7 text-3xl font-semibold leading-tight text-white">The shape of a story</p></div><div className="absolute bottom-1 left-4 h-52 w-36 -rotate-[12deg] rounded-[1.2rem] bg-[#dfe8df] shadow-xl sm:left-16 sm:h-64 sm:w-44"><p className="absolute bottom-7 left-6 right-6 text-2xl font-semibold leading-tight text-[#536052]">A slower way to read</p></div></div></section>
    <section className="border-y border-[#ded9cf] bg-[#faf9f5]"><div className="mx-auto grid max-w-7xl gap-10 px-6 py-14 sm:px-10 lg:grid-cols-[1.05fr_0.95fr] lg:items-center"><div className="overflow-hidden rounded-[1.7rem] shadow-xl shadow-[#3d3428]/15"><Image src="/reading-book.png" alt="A reader enjoying a book in a warm library" width={1408} height={1120} priority className="h-[300px] w-full object-cover object-center sm:h-[380px]" /></div><div className="max-w-lg"><p className="text-sm font-semibold uppercase tracking-[0.2em] text-[#b64d2d]">Make room for a good story</p><h2 className="mt-4 text-4xl font-semibold leading-tight tracking-[-0.06em]">A shelf should feel like a place you want to return to.</h2><p className="mt-5 text-base leading-8 text-[#62645d]">Browse quietly, discover independent voices, and keep the books that stay with you. Tranquility brings the whole reading journey into one warm corner.</p><Link href="/books" className="mt-7 inline-flex rounded-full bg-[#20211f] px-5 py-3 text-sm font-semibold text-white hover:bg-[#b64d2d]">Explore the shelf</Link></div></div></section>
    {error ? <section className="mx-auto max-w-7xl px-6 pb-14 sm:px-10"><div className="rounded-2xl border border-[#e7b9aa] bg-[#fbe9e3] p-6 text-sm leading-6 text-[#8d321d]">The book catalog is temporarily unavailable. Please try again shortly.</div></section> : books.length === 0 ? <section className="mx-auto max-w-7xl px-6 pb-20 sm:px-10"><div className="rounded-2xl border border-[#ded9cf] bg-[#faf9f5] p-8"><p className="text-sm font-semibold uppercase tracking-[0.2em] text-[#b64d2d]">The shelf is being prepared</p><h2 className="mt-3 text-3xl font-semibold tracking-[-0.04em]">No published books yet.</h2><p className="mt-3 max-w-xl leading-7 text-[#62645d]">Once an admin or seller publishes a book, it will appear here for everyone to explore.</p></div></section> : <><BookSection title="Newest on the shelf" description="Fresh titles from readers and independent sellers." books={newest} />{user && <><BookSection title="Featured voices" description="Books selected to help you find your next favorite." books={featured} /><BookSection title="Readers are loving" description="The most-liked published books right now." books={recommended} /></>}</>}
    <section className="border-t border-[#ded9cf] bg-[#faf9f5]"><div className="mx-auto grid max-w-7xl gap-8 px-6 py-12 sm:px-10 md:grid-cols-3"><div><p className="text-3xl font-semibold tracking-[-0.04em]">New every day</p><p className="mt-2 text-sm leading-6 text-[#62645d]">Fresh titles from readers and independent sellers.</p></div><div><p className="text-3xl font-semibold tracking-[-0.04em]">One trusted shelf</p><p className="mt-2 text-sm leading-6 text-[#62645d]">Your purchases and downloads, gathered in one place.</p></div><div><p className="text-3xl font-semibold tracking-[-0.04em]">Stories shared</p><p className="mt-2 text-sm leading-6 text-[#62645d]">Upload your book and make it available to the right reader.</p></div></div></section>
  </main>;
}
