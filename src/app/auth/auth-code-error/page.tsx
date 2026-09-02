import Link from 'next/link';

export default function AuthCodeErrorPage() {
  return <div className="max-w-md text-center"><h1 className="text-3xl font-semibold tracking-[-0.04em]">That link has expired</h1><p className="mt-3 leading-7 text-[#62645d]">Please return to sign in and request a fresh authentication link.</p><Link href="/auth/login" className="mt-7 inline-flex rounded-xl bg-[#20211f] px-5 py-3 text-sm font-semibold text-white">Return to sign in</Link></div>;
}
