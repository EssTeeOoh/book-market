-- Seller payout foundation for the Paystack Transfers model.
-- Sellers receive bank transfers through a Paystack recipient; they do not need
-- to create or manage a Paystack dashboard subaccount.

create table public.seller_payout_accounts (
  id uuid primary key default gen_random_uuid(),
  seller_id uuid not null unique references public.profiles(id) on delete cascade,
  recipient_code text unique,
  bank_code text,
  bank_name text,
  account_name text,
  account_number_last4 text,
  currency char(3) not null default 'NGN',
  status text not null default 'incomplete' check (status in ('incomplete', 'pending', 'active', 'disabled', 'failed')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.payouts (
  id uuid primary key default gen_random_uuid(),
  seller_id uuid not null references public.profiles(id),
  amount_minor integer not null,
  currency char(3) not null default 'NGN',
  recipient_code text not null,
  transfer_code text unique,
  status text not null default 'queued' check (status in ('queued', 'processing', 'successful', 'failed', 'reversed')),
  attempt_count integer not null default 0,
  failure_reason text,
  scheduled_at timestamptz,
  paid_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint payouts_amount_positive check (amount_minor > 0),
  constraint payouts_attempts_nonnegative check (attempt_count >= 0)
);

create table public.seller_earnings (
  id uuid primary key default gen_random_uuid(),
  seller_id uuid not null references public.profiles(id),
  order_id uuid not null references public.orders(id),
  order_item_id uuid not null unique references public.order_items(id),
  book_id uuid not null references public.books(id),
  gross_amount_minor integer not null,
  platform_fee_minor integer not null,
  payment_fee_minor integer not null default 0,
  seller_amount_minor integer not null,
  status text not null default 'pending' check (status in ('pending', 'eligible', 'queued', 'paid', 'failed', 'reversed')),
  payout_id uuid references public.payouts(id),
  eligible_at timestamptz not null,
  paid_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint seller_earnings_amounts_nonnegative check (
    gross_amount_minor >= 0 and platform_fee_minor >= 0 and payment_fee_minor >= 0 and seller_amount_minor >= 0
  )
);

create index seller_earnings_seller_status_idx on public.seller_earnings (seller_id, status, eligible_at);
create index payouts_seller_status_idx on public.payouts (seller_id, status, created_at desc);

alter table public.seller_payout_accounts enable row level security;
alter table public.payouts enable row level security;
alter table public.seller_earnings enable row level security;

create policy "Sellers can read their payout account"
on public.seller_payout_accounts for select to authenticated
using (seller_id = (select auth.uid()) or (select public.is_admin()));

create policy "Admins can manage payout accounts"
on public.seller_payout_accounts for all to authenticated
using ((select public.is_admin()))
with check ((select public.is_admin()));

create policy "Sellers can read their payouts"
on public.payouts for select to authenticated
using (seller_id = (select auth.uid()) or (select public.is_admin()));

create policy "Admins can manage payouts"
on public.payouts for all to authenticated
using ((select public.is_admin()))
with check ((select public.is_admin()));

create policy "Sellers can read their earnings"
on public.seller_earnings for select to authenticated
using (seller_id = (select auth.uid()) or (select public.is_admin()));

create policy "Admins can manage earnings"
on public.seller_earnings for all to authenticated
using ((select public.is_admin()))
with check ((select public.is_admin()));

grant select on public.seller_payout_accounts to authenticated;
grant select on public.payouts to authenticated;
grant select on public.seller_earnings to authenticated;
grant select, insert, update, delete on public.seller_payout_accounts to service_role;
grant select, insert, update, delete on public.payouts to service_role;
grant select, insert, update, delete on public.seller_earnings to service_role;
