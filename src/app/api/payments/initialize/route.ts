import { NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { createClient } from '@/lib/supabase/server';
import { findPaidOrderForBook, ensureLibraryEntitlement } from '@/lib/payments/entitlements';

export async function POST(request: Request) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Sign in before checkout.' }, { status: 401 });
  const secretKey = process.env.PAYSTACK_SECRET_KEY;
  if (!secretKey) return NextResponse.json({ error: 'PAYSTACK_SECRET_KEY is not configured.' }, { status: 500 });

  const { data: profile } = await supabase.rpc('ensure_my_profile');
  if (profile?.role === 'admin') return NextResponse.json({ error: 'Administrator accounts cannot purchase books.' }, { status: 403 });
  const body = await request.json().catch(() => null) as { bookId?: string } | null;
  if (!body?.bookId) return NextResponse.json({ error: 'A book is required.' }, { status: 400 });
  const { data: book, error: bookError } = await supabase.from('books').select('id, title, owner_id, price_minor, currency, is_free, status').eq('id', body.bookId).eq('status', 'published').maybeSingle();
  if (bookError || !book) return NextResponse.json({ error: 'Book not found.' }, { status: 404 });
  if (book.is_free) return NextResponse.json({ error: 'Free-book entitlements will be added next.' }, { status: 400 });

  const admin = createAdminClient();
  const { data: existingLibraryItem } = await admin.from('library_items').select('id').eq('user_id', user.id).eq('book_id', book.id).maybeSingle();
  if (existingLibraryItem) return NextResponse.json({ error: 'You already own this book. Open your library to download it.' }, { status: 409 });
  const previousPaidOrder = await findPaidOrderForBook(admin, user.id, book.id);
  if (previousPaidOrder) {
    await ensureLibraryEntitlement(admin, user.id, book.id, previousPaidOrder);
    return NextResponse.json({ error: 'You already paid for this book. Open your library to download it.' }, { status: 409 });
  }

  const reference = `tranquility-${crypto.randomUUID()}`;
  const { data: order, error: orderError } = await admin.from('orders').insert({ user_id: user.id, subtotal_minor: book.price_minor, platform_fee_minor: 0, total_minor: book.price_minor, currency: book.currency.trim(), status: 'pending' }).select('id').single();
  if (orderError || !order) return NextResponse.json({ error: `Could not create order: ${orderError?.message ?? 'unknown error'}` }, { status: 500 });
  const { error: itemError } = await admin.from('order_items').insert({ order_id: order.id, book_id: book.id, seller_id: book.owner_id, book_title: book.title, unit_price_minor: book.price_minor, platform_fee_minor: 0, seller_amount_minor: book.price_minor });
  if (itemError) { await admin.from('orders').delete().eq('id', order.id); return NextResponse.json({ error: `Could not create order item: ${itemError.message}` }, { status: 500 }); }
  const { error: paymentError } = await admin.from('payments').insert({ order_id: order.id, provider: 'paystack', provider_reference: reference, amount_minor: book.price_minor, currency: book.currency.trim(), status: 'initiated' });
  if (paymentError) { await admin.from('orders').delete().eq('id', order.id); return NextResponse.json({ error: `Could not create payment: ${paymentError.message}` }, { status: 500 }); }

  const baseUrl = process.env.NEXT_PUBLIC_APP_URL ?? new URL(request.url).origin;
  const paystackResponse = await fetch('https://api.paystack.co/transaction/initialize', { method: 'POST', headers: { Authorization: `Bearer ${secretKey}`, 'Content-Type': 'application/json' }, body: JSON.stringify({ email: user.email, amount: String(book.price_minor), currency: 'NGN', reference, callback_url: `${baseUrl}/api/payments/callback` }) });
  const paystack = await paystackResponse.json() as { status?: boolean; message?: string; data?: { authorization_url?: string } };
  if (!paystackResponse.ok || !paystack.status || !paystack.data?.authorization_url) return NextResponse.json({ error: paystack.message ?? 'Paystack could not initialize checkout.' }, { status: 502 });
  return NextResponse.json({ authorizationUrl: paystack.data.authorization_url });
}
