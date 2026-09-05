'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import { createBook, type UploadState } from './actions';

type UploadStage = 'idle' | 'pdf' | 'cover' | 'saving';

async function uploadWithSignedUrl(supabase: ReturnType<typeof createClient>, userId: string, bookId: string, kind: 'pdf' | 'cover', file: File) {
  const extension = kind === 'pdf' ? 'pdf' : (file.name.split('.').pop()?.toLowerCase().replace(/[^a-z0-9]/g, '') || 'jpg');
  const response = await fetch('/api/uploads/signed', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ bookId, kind, extension }) });
  const result = await response.json() as { path?: string; token?: string; error?: string };
  if (!response.ok || !result.path || !result.token) throw new Error(result.error ?? `Could not prepare the ${kind} upload.`);
  const bucket = kind === 'pdf' ? 'book-files' : 'book-covers';
  const { error } = await supabase.storage.from(bucket).uploadToSignedUrl(result.path, result.token, file, { contentType: file.type || (kind === 'pdf' ? 'application/pdf' : 'image/jpeg') });
  if (error) throw new Error(error.message);
  return result.path;
}

export function UploadForm() {
  const router = useRouter();
  const [isFree, setIsFree] = useState(false);
  const [state, setState] = useState<UploadState>({});
  const [pending, setPending] = useState(false);
  const [uploadStage, setUploadStage] = useState<UploadStage>('idle');

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setState({});
    setPending(true);
    const form = event.currentTarget;
    const formData = new FormData(form);
    const pdf = formData.get('pdf');
    const cover = formData.get('cover');

    if (!(pdf instanceof File) || pdf.size === 0 || pdf.type !== 'application/pdf') {
      setState({ error: 'Choose a valid PDF file.' }); setPending(false); return;
    }
    if (pdf.size > 20 * 1024 * 1024) {
      setState({ error: 'The PDF must be 20 MB or smaller.' }); setPending(false); return;
    }
    if (cover instanceof File && cover.size > 0 && (!cover.type.startsWith('image/') || cover.size > 10 * 1024 * 1024)) {
      setState({ error: 'The cover must be an image of 10 MB or smaller.' }); setPending(false); return;
    }

    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) { setState({ error: 'Your session expired. Please sign in again.' }); setPending(false); return; }

    const bookId = crypto.randomUUID();
    const pdfPath = `${user.id}/${bookId}/book.pdf`;
    const coverExtension = cover instanceof File && cover.size > 0
      ? (cover.name.split('.').pop()?.toLowerCase().replace(/[^a-z0-9]/g, '') || 'jpg')
      : '';
    const coverPath = cover instanceof File && cover.size > 0 ? `${user.id}/${bookId}/cover.${coverExtension}` : '';

    setUploadStage('pdf');
    try {
      await uploadWithSignedUrl(supabase, user.id, bookId, 'pdf', pdf);
    } catch (error) {
      setState({ error: `Could not upload the PDF: ${error instanceof Error ? error.message : 'Please try again.'}` }); setPending(false); setUploadStage('idle'); return;
    }

    if (coverPath && cover instanceof File) {
      setUploadStage('cover');
      try {
        await uploadWithSignedUrl(supabase, user.id, bookId, 'cover', cover);
      } catch (error) {
        await supabase.storage.from('book-files').remove([pdfPath]);
        setState({ error: `Could not upload the cover: ${error instanceof Error ? error.message : 'Please try again.'}` }); setPending(false); setUploadStage('idle'); return;
      }
    }

    formData.set('book_id', bookId);
    formData.set('pdf_path', pdfPath);
    formData.set('cover_path', coverPath);
    formData.delete('pdf');
    formData.delete('cover');

    try {
      setUploadStage('saving');
      const result = await Promise.race([
        createBook({}, formData),
        new Promise<UploadState>((resolve) => setTimeout(() => resolve({ error: 'The book record is taking too long to save. Check the deployment logs and try again.' }), 30000)),
      ]);
      if (result?.error) {
        await supabase.storage.from('book-files').remove([pdfPath]);
        if (coverPath) await supabase.storage.from('book-covers').remove([coverPath]);
        setState(result); setUploadStage('idle');
      } else if (result?.success) {
        router.push('/account?uploaded=1');
        router.refresh();
      }
    } catch {
      await supabase.storage.from('book-files').remove([pdfPath]);
      if (coverPath) await supabase.storage.from('book-covers').remove([coverPath]);
      setState({ error: 'The upload could not be completed. Please try again.' }); setUploadStage('idle');
    }
    setPending(false);
  }

  const stageLabel = uploadStage === 'pdf' ? 'Uploading PDF...' : uploadStage === 'cover' ? 'Uploading cover image...' : uploadStage === 'saving' ? 'Saving book details...' : null;

  return <form onSubmit={handleSubmit} className="mt-8 space-y-5">
    <div><label htmlFor="title" className="mb-2 block text-sm font-medium">Book title</label><input id="title" name="title" required className="w-full rounded-xl border border-[#d6d2c9] bg-white px-4 py-3 outline-none focus:border-[#b64d2d]" /></div>
    <div><label htmlFor="author_name" className="mb-2 block text-sm font-medium">Author name</label><input id="author_name" name="author_name" required className="w-full rounded-xl border border-[#d6d2c9] bg-white px-4 py-3 outline-none focus:border-[#b64d2d]" /></div>
    <div><label htmlFor="description" className="mb-2 block text-sm font-medium">Description</label><textarea id="description" name="description" required minLength={20} rows={5} className="w-full rounded-xl border border-[#d6d2c9] bg-white px-4 py-3 outline-none focus:border-[#b64d2d]" /></div>
    <div><label htmlFor="price" className="mb-2 block text-sm font-medium">Price in Nigerian naira</label><input id="price" name="price" type="number" min="0" step="0.01" defaultValue="0" disabled={isFree} className="w-full rounded-xl border border-[#d6d2c9] bg-white px-4 py-3 outline-none focus:border-[#b64d2d] disabled:cursor-not-allowed disabled:bg-[#eeeae2] disabled:text-[#817e74]" /></div>
    <label className="flex items-center gap-3 text-sm"><input name="is_free" type="checkbox" checked={isFree} onChange={(event) => setIsFree(event.target.checked)} className="h-4 w-4 accent-[#b64d2d]" /> This book is free</label>
    <div><label htmlFor="cover" className="mb-2 block text-sm font-medium">Cover image <span className="font-normal text-[#817e74]">(optional, 10 MB max)</span></label><input id="cover" name="cover" type="file" accept="image/*" className="block w-full text-sm text-[#62645d] file:mr-3 file:rounded-lg file:border-0 file:bg-[#dfe8df] file:px-3 file:py-2 file:font-semibold" /></div>
    <div><label htmlFor="pdf" className="mb-2 block text-sm font-medium">PDF book <span className="font-normal text-[#817e74]">(required, 20 MB max)</span></label><input id="pdf" name="pdf" type="file" accept="application/pdf,.pdf" required className="block w-full text-sm text-[#62645d] file:mr-3 file:rounded-lg file:border-0 file:bg-[#dfe8df] file:px-3 file:py-2 file:font-semibold" /></div>
    {state.error && <p role="alert" className="rounded-xl bg-[#fbe9e3] px-4 py-3 text-sm leading-6 text-[#8d321d]">{state.error}</p>}
    {stageLabel && <div className="flex items-center gap-3 rounded-xl border border-[#d6d2c9] bg-[#f4f1ea] px-4 py-3 text-sm text-[#62645d]" role="status" aria-live="polite"><span className="h-4 w-4 animate-spin rounded-full border-2 border-[#d6d2c9] border-t-[#b64d2d]" />{stageLabel}</div>}
    <button type="submit" disabled={pending} className="w-full rounded-xl bg-[#20211f] px-4 py-3.5 text-sm font-semibold text-white hover:bg-[#b64d2d] disabled:opacity-60">{pending ? 'Uploading...' : 'Save book as draft'}</button>
  </form>;
}
