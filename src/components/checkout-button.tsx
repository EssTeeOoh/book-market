'use client';

import { useState } from 'react';

export function CheckoutButton({ bookId }: { bookId: string }) {
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  async function startCheckout() {
    setPending(true);
    setError(null);
    const response = await fetch('/api/payments/initialize', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ bookId }) });
    const result = await response.json() as { authorizationUrl?: string; error?: string };
    if (!response.ok || !result.authorizationUrl) { setError(result.error ?? 'Checkout could not start.'); setPending(false); return; }
    window.location.assign(result.authorizationUrl);
  }
  return <div><button type="button" onClick={startCheckout} disabled={pending} className="rounded-full bg-[#20211f] px-6 py-3.5 text-sm font-semibold text-white hover:bg-[#b64d2d] disabled:opacity-60">{pending ? 'Opening checkout...' : 'Buy now'}</button>{error && <p role="alert" className="mt-2 text-xs text-[#8d321d]">{error}</p>}</div>;
}
