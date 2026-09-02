export default function Loading() {
  return <main className="flex min-h-[100dvh] items-center justify-center bg-[#f4f1ea] px-6 text-[#20211f]"><div className="flex flex-col items-center gap-5 text-center" role="status" aria-live="polite"><div className="h-12 w-12 animate-spin rounded-full border-4 border-[#d6d2c9] border-t-[#b64d2d]" /><p className="text-sm font-semibold uppercase tracking-[0.2em] text-[#b64d2d]">Opening your shelf</p><span className="sr-only">Loading page</span></div></main>;
}
