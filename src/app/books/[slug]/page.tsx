import Link from "next/link";
import { notFound } from "next/navigation";
import { CheckoutButton } from "@/components/checkout-button";
import { LikeButton } from "@/components/like-button";
import { createClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

type Props = { params: Promise<{ slug: string }>; searchParams: Promise<{ payment?: string }> };

async function AccountIcon() {
  const supabase = await createClient();
  const { data: profile } = await supabase.rpc("ensure_my_profile") as { data: { avatar_url?: string | null } | null };
  if (profile?.avatar_url) return <img src={profile.avatar_url} alt="" className="h-full w-full rounded-full object-cover" />;
  return <svg aria-hidden="true" viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="1.8"><circle cx="12" cy="8" r="3.5" /><path strokeLinecap="round" d="M5.5 20c.8-3.1 3-4.7 6.5-4.7s5.7 1.6 6.5 4.7" /></svg>;
}

export default async function BookDetailsPage({ params, searchParams }: Props) {
  const { slug } = await params;
  const { payment } = await searchParams;
  const supabase = await createClient();
  const { data: book, error } = await supabase.from("books").select("id, title, author_name, description, price_minor, currency, is_free, like_count, published_at, cover_storage_key").eq("slug", slug).eq("status", "published").maybeSingle();
  if (error || !book) notFound();
  const price = book.is_free ? "Free" : new Intl.NumberFormat("en-NG", { style: "currency", currency: book.currency.trim() || "NGN", maximumFractionDigits: 0 }).format(book.price_minor / 100);
  const coverUrl = book.cover_storage_key ? supabase.storage.from("book-covers").getPublicUrl(book.cover_storage_key).data.publicUrl : null;
  const { data: { user } } = await supabase.auth.getUser();
  const { data: currentLike } = user ? await supabase.from("book_likes").select("book_id").eq("book_id", book.id).eq("user_id", user.id).maybeSingle() : { data: null };
  const { data: profile } = user ? await supabase.rpc("ensure_my_profile") : { data: null };
  const { data: entitlement } = user ? await supabase.from("library_items").select("id").eq("user_id", user.id).eq("book_id", book.id).maybeSingle() : { data: null };
  const isAdmin = profile?.role === "admin";
  return <main className="min-h-[100dvh] bg-[#f4f1ea] px-6 py-8 text-[#20211f] sm:px-10"><div className="mx-auto max-w-5xl"><nav className="flex items-center justify-between"><Link href="/" className="text-sm font-semibold tracking-[0.2em]">TRANQUILITY</Link><div className="flex items-center gap-5"><Link href="/books" aria-label="Browse books" title="Browse books" className="flex h-10 w-10 items-center justify-center rounded-full border border-[#d6d2c9] transition hover:border-[#b64d2d]"><img src="/books-icon.png" alt="" className="h-6 w-6" /></Link>{user && <Link href="/account" aria-label="Open your account" title="My account" className="flex h-10 w-10 items-center justify-center overflow-hidden rounded-full bg-[#20211f] text-white hover:bg-[#b64d2d]"><AccountIcon /></Link>}</div></nav><section className="grid gap-12 pb-20 pt-20 lg:grid-cols-[0.7fr_1.3fr] lg:items-center"><div className="relative flex aspect-[4/5] max-h-[560px] items-end overflow-hidden rounded-[1.5rem] bg-[#dfe8df] p-8 shadow-xl">{coverUrl && <img src={coverUrl} alt={`${book.title} cover`} className="absolute inset-0 h-full w-full object-cover" />}<p className={`relative text-5xl font-semibold leading-[0.95] tracking-[-0.06em] ${coverUrl ? "text-white drop-shadow-[0_1px_3px_rgba(0,0,0,0.8)]" : "text-[#536052]"}`}>{book.title}</p></div><div>{payment === "success" && <p role="status" className="mb-6 rounded-xl bg-[#e5eee6] px-4 py-3 text-sm leading-6 text-[#31563c]">Payment verified. This book is now in your library.</p>}<p className="text-sm font-semibold uppercase tracking-[0.2em] text-[#b64d2d]">Book details</p><h1 className="mt-5 text-6xl font-semibold leading-[0.95] tracking-[-0.07em]">{book.title}</h1><p className="mt-5 text-lg text-[#62645d]">by {book.author_name}</p><p className="mt-8 max-w-xl text-base leading-8 text-[#62645d]">{book.description}</p><div className="mt-9 flex flex-wrap items-center gap-5"><span className="text-2xl font-semibold">{price}</span><span className="text-sm text-[#62645d]">{book.like_count} likes</span></div><div className="mt-8 flex flex-wrap items-center gap-4"><LikeButton bookId={book.id} slug={slug} initialLiked={Boolean(currentLike)} initialCount={book.like_count} />{isAdmin ? <p className="rounded-full border border-[#d6d2c9] px-5 py-3 text-sm font-semibold text-[#62645d]">Admin account: purchasing disabled</p> : entitlement ? <a href={`/api/library/${book.id}/download`} className="rounded-full bg-[#20211f] px-6 py-3.5 text-sm font-semibold text-white hover:bg-[#b64d2d]">Download book</a> : user ? <CheckoutButton bookId={book.id} /> : <><Link href="/auth/login" className="rounded-full bg-[#20211f] px-6 py-3.5 text-sm font-semibold text-white hover:bg-[#b64d2d]">Sign in to buy</Link><Link href="/auth/sign-up" className="rounded-full border border-[#c9c4ba] px-6 py-3.5 text-sm font-semibold hover:border-[#20211f]">Create an account</Link></>}</div><p className="mt-5 text-xs leading-5 text-[#817e74]">Payments are processed securely by Paystack. Downloads unlock after payment verification.</p></div></section></div></main>;
}
