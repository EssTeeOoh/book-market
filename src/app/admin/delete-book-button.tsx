'use client';

import { useFormStatus } from 'react-dom';

export function DeleteBookButton() {
  const { pending } = useFormStatus();
  return <button type="submit" disabled={pending} onClick={(event) => { if (!window.confirm('Delete this book and its uploaded files permanently?')) event.preventDefault(); }} className="rounded-lg border border-[#e7b9aa] px-3 py-2 text-xs font-semibold text-[#8d321d] hover:bg-[#fbe9e3] disabled:cursor-not-allowed disabled:opacity-60">{pending ? 'Deleting...' : 'Delete'}</button>;
}
