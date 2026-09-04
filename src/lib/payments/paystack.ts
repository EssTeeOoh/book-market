import { createAdminClient } from '@/lib/supabase/admin';

type Verification = { status?: boolean; data?: { status?: string; amount?: number; currency?: string; reference?: string; id?: number } };

export async function verifyPaystackReference(reference: string) {
  const secretKey = process.env.PAYSTACK_SECRET_KEY;
  if (!secretKey) throw new Error('PAYSTACK_SECRET_KEY is not configured.');
  const response = await fetch(`https://api.paystack.co/transaction/verify/${encodeURIComponent(reference)}`, { headers: { Authorization: `Bearer ${secretKey}` }, cache: 'no-store' });
  const result = await response.json() as Verification;
  if (!response.ok || !result.status || result.data?.status !== 'success' || result.data.reference !== reference) return null;
  return result.data;
}

export async function fulfillPayment(reference: string, transaction: NonNullable<Verification['data']>) {
  const admin = createAdminClient();
  const { data: payment } = await admin.from('payments').select('id, order_id, amount_minor, currency, status').eq('provider_reference', reference).maybeSingle();
  if (!payment || payment.amount_minor !== transaction.amount || payment.currency.trim() !== transaction.currency?.trim()) return false;
  const { data: order } = await admin.from('orders').select('id, user_id, status').eq('id', payment.order_id).single();
  if (!order) return false;
  const now = new Date().toISOString();
  if (payment.status !== 'successful') {
    const { error } = await admin.from('payments').update({ status: 'successful', provider_transaction_id: String(transaction.id ?? ''), paid_at: now, raw_response: transaction }).eq('id', payment.id);
    if (error) return false;
  }
  if (order.status !== 'paid') {
    const { error } = await admin.from('orders').update({ status: 'paid', paid_at: now }).eq('id', order.id);
    if (error) return false;
  }
  const { data: item } = await admin.from('order_items').select('book_id').eq('order_id', order.id).single();
  if (!item) return false;
  const { error: libraryError } = await admin.from('library_items').upsert({ user_id: order.user_id, book_id: item.book_id, order_id: order.id }, { onConflict: 'user_id,book_id' });
  if (libraryError) return false;
  return item?.book_id ?? false;
}
