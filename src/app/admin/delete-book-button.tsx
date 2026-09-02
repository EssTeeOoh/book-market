'use client';

export function DeleteBookButton() {
  return <button type="submit" onClick={(event) => { if (!window.confirm('Delete this book and its uploaded files permanently?')) event.preventDefault(); }} className="rounded-lg border border-[#e7b9aa] px-3 py-2 text-xs font-semibold text-[#8d321d] hover:bg-[#fbe9e3]">Delete</button>;
}
