type AdminClient = ReturnType<typeof import('@/lib/supabase/admin').createAdminClient>;

export async function findPaidOrderForBook(admin: AdminClient, userId: string, bookId: string) {
  const { data: orders } = await admin.from('orders').select('id').eq('user_id', userId).eq('status', 'paid');
  const orderIds = orders?.map((order) => order.id) ?? [];
  if (orderIds.length === 0) return null;
  const { data: items } = await admin.from('order_items').select('order_id').in('order_id', orderIds).eq('book_id', bookId);
  const matchingOrderIds = items?.map((item) => item.order_id) ?? [];
  if (matchingOrderIds.length === 0) return null;
  const { data: payments } = await admin.from('payments').select('order_id').in('order_id', matchingOrderIds).eq('status', 'successful');
  return payments?.[0]?.order_id ?? null;
}

export async function ensureLibraryEntitlement(admin: AdminClient, userId: string, bookId: string, orderId: string) {
  const { error } = await admin.from('library_items').upsert({ user_id: userId, book_id: bookId, order_id: orderId }, { onConflict: 'user_id,book_id' });
  return !error;
}
