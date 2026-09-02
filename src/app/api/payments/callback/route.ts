import { NextResponse } from 'next/server';
import { fulfillPayment, verifyPaystackReference } from '@/lib/payments/paystack';
import { createAdminClient } from '@/lib/supabase/admin';

export async function GET(request: Request) {
  const url = new URL(request.url);
  const reference = url.searchParams.get('trxref') ?? url.searchParams.get('reference');
  if (!reference) return NextResponse.redirect(new URL('/account?payment=missing_reference', url.origin));
  try {
    const transaction = await verifyPaystackReference(reference);
    const bookId = transaction && await fulfillPayment(reference, transaction);
    if (!bookId) return NextResponse.redirect(new URL('/account?payment=not_verified', url.origin));
    const admin = createAdminClient();
    const { data: book } = await admin.from('books').select('slug').eq('id', bookId).single();
    return NextResponse.redirect(new URL(book ? `/books/${book.slug}?payment=success` : '/account?payment=success', url.origin));
  } catch {
    return NextResponse.redirect(new URL('/account?payment=verification_error', url.origin));
  }
}
