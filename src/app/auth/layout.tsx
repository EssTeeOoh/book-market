import Link from 'next/link';

export default function AuthLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <main className="min-h-[100dvh] bg-[#f4f1ea] px-6 py-8 text-[#20211f] sm:px-10">
      <div className="mx-auto grid min-h-[calc(100dvh-4rem)] max-w-6xl overflow-hidden rounded-[2rem] border border-[#ded9cf] bg-[#faf9f5] shadow-[0_24px_80px_rgba(61,52,40,0.08)] lg:grid-cols-[0.9fr_1.1fr]">
        <section className="relative hidden overflow-hidden bg-[#dfe8df] p-12 lg:block">
          <div className="absolute -right-20 -top-20 h-72 w-72 rounded-full bg-[#c85a32]/15" />
          <div className="absolute -bottom-28 -left-20 h-80 w-80 rounded-full bg-[#b7c7b8]/70" />
          <Link href="/" className="relative text-sm font-semibold tracking-[0.18em]">TRANQUILITY</Link>
          <div className="relative mt-40 max-w-sm">
            <p className="text-sm font-semibold uppercase tracking-[0.2em] text-[#b64d2d]">A quieter shelf</p>
            <h2 className="mt-5 text-5xl font-semibold leading-[1.02] tracking-[-0.05em]">Find stories worth keeping close.</h2>
            <p className="mt-6 text-base leading-7 text-[#536052]">Discover independent books, share your own work, and build a reading life that feels like yours.</p>
          </div>
        </section>
        <section className="flex items-center justify-center p-7 sm:p-12">{children}</section>
      </div>
    </main>
  );
}
