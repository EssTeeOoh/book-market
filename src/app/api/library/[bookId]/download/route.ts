import { NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { createClient } from '@/lib/supabase/server';
import { ensureLibraryEntitlement, findPaidOrderForBook } from '@/lib/payments/entitlements';

type Props = { params: Promise<{ bookId: string }> };

export async function GET(_request: Request, { params }: Props) {
  const { bookId } = await params;
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Sign in required.' }, { status: 401 });
  const admin = createAdminClient();
  let { data: entitlement } = await admin.from('library_items').select('id, order_id').eq('user_id', user.id).eq('book_id', bookId).maybeSingle();
  if (!entitlement) {
    const paidOrderId = await findPaidOrderForBook(admin, user.id, bookId);
    if (paidOrderId && await ensureLibraryEntitlement(admin, user.id, bookId, paidOrderId)) {
      const repaired = await admin.from('library_items').select('id, order_id').eq('user_id', user.id).eq('book_id', bookId).maybeSingle();
      entitlement = repaired.data;
    }
  }
  if (!entitlement) return NextResponse.json({ error: 'This book is not in your library.' }, { status: 403 });
  const { data: book } = await admin.from('books').select('title, pdf_storage_key').eq('id', bookId).eq('status', 'published').maybeSingle();
  if (!book) return NextResponse.json({ error: 'Book not found.' }, { status: 404 });
  const { data: signed, error } = await admin.storage.from('book-files').createSignedUrl(book.pdf_storage_key, 60);
  if (error || !signed?.signedUrl) return NextResponse.json({ error: 'Download could not be prepared.' }, { status: 500 });
  const fileResponse = await fetch(signed.signedUrl);
  if (!fileResponse.ok || !fileResponse.body) return NextResponse.json({ error: 'The PDF could not be retrieved.' }, { status: 502 });
  await admin.from('download_events').insert({ user_id: user.id, book_id: bookId, order_id: entitlement.order_id });
  await admin.from('library_items').update({ last_downloaded_at: new Date().toISOString() }).eq('id', entitlement.id);
  const filename = `${book.title.replace(/[^a-z0-9]+/gi, '-').replace(/^-|-$/g, '').slice(0, 80) || 'book'}.pdf`;
  return new NextResponse(fileResponse.body, { headers: { 'Content-Type': 'application/pdf', 'Content-Disposition': `attachment; filename="${filename}"`, 'Cache-Control': 'private, no-store' } });
}
