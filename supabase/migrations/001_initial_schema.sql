-- Initial schema for the digital book marketplace MVP.
-- RLS policies are added in a separate follow-up migration after this schema is applied.

create extension if not exists pgcrypto;

create type public.user_role as enum ('customer', 'seller', 'admin');
create type public.user_status as enum ('active', 'suspended', 'deleted');
create type public.book_status as enum (
  'draft',
  'pending_review',
  'published',
  'rejected',
  'archived'
);
create type public.book_source as enum ('seller', 'admin');
create type public.order_status as enum (
  'pending',
  'paid',
  'failed',
  'cancelled',
  'refunded'
);
create type public.payment_provider as enum ('paystack', 'flutterwave');
create type public.payment_status as enum (
  'initiated',
  'pending',
  'successful',
  'failed',
  'refunded'
);
create type public.review_decision as enum ('approved', 'rejected');
create type public.report_status as enum (
  'open',
  'investigating',
  'resolved',
  'dismissed'
);
create type public.email_status as enum ('queued', 'sent', 'failed');

create table public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  full_name text,
  avatar_url text,
  role public.user_role not null default 'customer',
  status public.user_status not null default 'active',
  email_verified_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.categories (
  id uuid primary key default gen_random_uuid(),
  name text not null unique,
  slug text not null unique,
  description text,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.tags (
  id uuid primary key default gen_random_uuid(),
  name text not null unique,
  slug text not null unique,
  created_at timestamptz not null default now()
);

create table public.books (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references public.profiles(id),
  category_id uuid references public.categories(id),
  title text not null,
  slug text not null unique,
  author_name text not null,
  description text not null,
  price_minor integer not null default 0,
  currency char(3) not null default 'NGN',
  is_free boolean not null default false,
  cover_storage_key text,
  pdf_storage_key text not null,
  source public.book_source not null default 'seller',
  status public.book_status not null default 'draft',
  rejection_reason text,
  is_featured boolean not null default false,
  published_at timestamptz,
  like_count integer not null default 0,
  download_count integer not null default 0,
  purchase_count integer not null default 0,
  copyright_confirmed_at timestamptz,
  terms_accepted_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint books_price_nonnegative check (price_minor >= 0),
  constraint books_price_matches_free_status check (
    (is_free and price_minor = 0)
    or (not is_free and price_minor > 0)
  )
);

create table public.book_tags (
  book_id uuid not null references public.books(id) on delete cascade,
  tag_id uuid not null references public.tags(id) on delete cascade,
  primary key (book_id, tag_id)
);

create table public.book_likes (
  book_id uuid not null references public.books(id) on delete cascade,
  user_id uuid not null references public.profiles(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (book_id, user_id)
);

create table public.orders (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id),
  subtotal_minor integer not null,
  platform_fee_minor integer not null default 0,
  total_minor integer not null,
  currency char(3) not null default 'NGN',
  status public.order_status not null default 'pending',
  paid_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint orders_subtotal_nonnegative check (subtotal_minor >= 0),
  constraint orders_platform_fee_nonnegative check (platform_fee_minor >= 0),
  constraint orders_total_nonnegative check (total_minor >= 0)
);

create table public.order_items (
  id uuid primary key default gen_random_uuid(),
  order_id uuid not null references public.orders(id) on delete cascade,
  book_id uuid not null references public.books(id),
  seller_id uuid not null references public.profiles(id),
  book_title text not null,
  unit_price_minor integer not null,
  platform_fee_minor integer not null default 0,
  seller_amount_minor integer not null,
  created_at timestamptz not null default now(),
  unique (order_id, book_id),
  constraint order_items_price_nonnegative check (unit_price_minor >= 0),
  constraint order_items_fee_nonnegative check (platform_fee_minor >= 0)
);

create table public.payments (
  id uuid primary key default gen_random_uuid(),
  order_id uuid not null references public.orders(id),
  provider public.payment_provider not null default 'paystack',
  provider_reference text not null unique,
  provider_transaction_id text,
  amount_minor integer not null,
  currency char(3) not null default 'NGN',
  status public.payment_status not null default 'initiated',
  paid_at timestamptz,
  raw_response jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint payments_amount_nonnegative check (amount_minor >= 0)
);

create table public.library_items (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  book_id uuid not null references public.books(id),
  order_id uuid references public.orders(id),
  acquired_at timestamptz not null default now(),
  last_downloaded_at timestamptz,
  unique (user_id, book_id)
);

create table public.download_events (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id),
  book_id uuid not null references public.books(id),
  order_id uuid references public.orders(id),
  ip_address inet,
  user_agent text,
  created_at timestamptz not null default now()
);

create table public.book_reviews (
  id uuid primary key default gen_random_uuid(),
  book_id uuid not null references public.books(id) on delete cascade,
  reviewer_id uuid not null references public.profiles(id),
  decision public.review_decision not null,
  reason text,
  created_at timestamptz not null default now()
);

create table public.book_reports (
  id uuid primary key default gen_random_uuid(),
  book_id uuid not null references public.books(id) on delete cascade,
  reporter_id uuid not null references public.profiles(id),
  reason text not null,
  details text,
  status public.report_status not null default 'open',
  resolved_by uuid references public.profiles(id),
  resolved_at timestamptz,
  created_at timestamptz not null default now()
);

create table public.email_events (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references public.profiles(id) on delete set null,
  email_type text not null,
  recipient_email text not null,
  provider_message_id text,
  status public.email_status not null default 'queued',
  error_message text,
  sent_at timestamptz,
  created_at timestamptz not null default now()
);

create table public.audit_logs (
  id uuid primary key default gen_random_uuid(),
  actor_id uuid references public.profiles(id) on delete set null,
  action text not null,
  entity_type text not null,
  entity_id uuid,
  metadata jsonb,
  created_at timestamptz not null default now()
);

create index books_status_published_idx
  on public.books (published_at desc)
  where status = 'published';

create index books_owner_id_idx on public.books (owner_id);
create index books_category_id_idx on public.books (category_id);
create index books_like_count_idx on public.books (like_count desc);
create index orders_user_id_idx on public.orders (user_id);
create index order_items_seller_id_idx on public.order_items (seller_id);
create index payments_order_id_idx on public.payments (order_id);
create index library_items_user_id_idx on public.library_items (user_id);
create index download_events_user_id_idx on public.download_events (user_id);
create index book_reports_status_idx on public.book_reports (status);

create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create trigger profiles_set_updated_at
before update on public.profiles
for each row execute function public.set_updated_at();

create trigger categories_set_updated_at
before update on public.categories
for each row execute function public.set_updated_at();

create trigger books_set_updated_at
before update on public.books
for each row execute function public.set_updated_at();

create trigger orders_set_updated_at
before update on public.orders
for each row execute function public.set_updated_at();

create trigger payments_set_updated_at
before update on public.payments
for each row execute function public.set_updated_at();

-- Create a public profile whenever a new Supabase Auth user is registered.
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, full_name, avatar_url, email_verified_at)
  values (
    new.id,
    coalesce(new.raw_user_meta_data ->> 'full_name', new.raw_user_meta_data ->> 'name'),
    new.raw_user_meta_data ->> 'avatar_url',
    case when new.email_confirmed_at is not null then now() else null end
  );
  return new;
end;
$$;

create trigger on_auth_user_created
after insert on auth.users
for each row execute function public.handle_new_user();

