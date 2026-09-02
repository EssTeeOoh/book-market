'use client';

import { useFormStatus } from 'react-dom';

export function AdminActionButton({ label, pendingLabel, variant = 'dark' }: { label: string; pendingLabel: string; variant?: 'dark' | 'light' }) {
  const { pending } = useFormStatus();
  return <button type="submit" disabled={pending} className={variant === 'dark' ? 'rounded-lg bg-[#20211f] px-3 py-2 text-xs font-semibold text-white hover:bg-[#b64d2d] disabled:cursor-not-allowed disabled:opacity-60' : 'rounded-lg border border-[#d6d2c9] px-3 py-2 text-xs font-semibold hover:border-[#20211f] disabled:cursor-not-allowed disabled:opacity-60'}>{pending ? pendingLabel : label}</button>;
}
