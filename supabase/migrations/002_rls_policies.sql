-- Row Level Security policies for the digital book marketplace MVP.
-- Apply this migration after 001_initial_schema.sql.

-- Keep RLS enabled even if it was enabled manually from the dashboard.
alter table public.profiles enable row level security;
alter table public.categories enable row level security;
alter table public.tags enable row level security;
alter table public.books enable row level security;
alter table public.book_tags enable row level security;
alter table public.book_likes enable row level security;
alter table public.orders enable row level security;
alter table public.order_items enable row level security;
alter table public.payments enable row level security;
alter table public.library_items enable row level security;
alter table public.download_events enable row level security;
alter table public.book_reviews enable row level security;
alter table public.book_reports enable row level security;
alter table public.email_events enable row level security;
alter table public.audit_logs enable row level security;

-- These helpers read the protected role column without recursively evaluating
-- the profiles policies that use the helpers.
create or replace function public.is_admin()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.profiles
    where id = (select auth.uid())
      and role = 'admin'::public.user_role
      and status = 'active'::public.user_status
  );
$$;

create or replace function public.is_seller_or_admin()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.profiles
    where id = (select auth.uid())
      and role in ('seller'::public.user_role, 'admin'::public.user_role)
      and status = 'active'::public.user_status
  );
$$;

-- Normal users may edit profile information, but role changes must happen
-- through trusted server-side admin operations.
revoke update on public.profiles from anon, authenticated;
grant update (full_name, avatar_url) on public.profiles to authenticated;

revoke execute on function public.is_admin() from public;
revoke execute on function public.is_seller_or_admin() from public;
grant execute on function public.is_admin() to authenticated;
grant execute on function public.is_seller_or_admin() to authenticated;

-- Users can read and update their own profile. Admins can manage profiles.
create policy "Users can read their own profile"
on public.profiles
for select
to authenticated
using ((select auth.uid()) = id);

create policy "Users can update their own profile"
on public.profiles
for update
to authenticated
using ((select auth.uid()) = id)
with check ((select auth.uid()) = id);

create policy "Admins can manage profiles"
on public.profiles
for all
to authenticated
using ((select public.is_admin()))
with check ((select public.is_admin()));

-- Visitors can read active catalogue categories. Only admins manage them.
create policy "Anyone can read active categories"
on public.categories
for select
to anon, authenticated
using (is_active = true);

create policy "Admins can manage categories"
on public.categories
for all
to authenticated
using ((select public.is_admin()))
with check ((select public.is_admin()));

create policy "Anyone can read tags"
on public.tags
for select
to anon, authenticated
using (true);

create policy "Admins can manage tags"
on public.tags
for all
to authenticated
using ((select public.is_admin()))
with check ((select public.is_admin()));

-- Public users see only published books. Sellers see their own books, and
-- admins can manage every book.
create policy "Anyone can read published books"
on public.books
for select
to anon, authenticated
using (status = 'published'::public.book_status);

create policy "Sellers can read their own books"
on public.books
for select
to authenticated
using (
  owner_id = (select auth.uid())
  and (select public.is_seller_or_admin())
);

create policy "Sellers can create their own books"
on public.books
for insert
to authenticated
with check (
  owner_id = (select auth.uid())
  and (select public.is_seller_or_admin())
  and status in (
    'draft'::public.book_status,
    'pending_review'::public.book_status
  )
);

create policy "Sellers can update their own non-archived books"
on public.books
for update
to authenticated
using (
  owner_id = (select auth.uid())
  and (select public.is_seller_or_admin())
  and status <> 'archived'::public.book_status
)
with check (
  owner_id = (select auth.uid())
  and (select public.is_seller_or_admin())
  and status in (
    'draft'::public.book_status,
    'pending_review'::public.book_status,
    'rejected'::public.book_status
  )
);

create policy "Admins can manage books"
on public.books
for all
to authenticated
using ((select public.is_admin()))
with check ((select public.is_admin()));

-- Book-tag relationships follow the visibility and ownership of the book.
create policy "Anyone can read tags for published books"
on public.book_tags
for select
to anon, authenticated
using (
  exists (
    select 1
    from public.books
    where books.id = book_tags.book_id
      and books.status = 'published'::public.book_status
  )
);

create policy "Sellers can manage tags for their books"
on public.book_tags
for all
to authenticated
using (
  exists (
    select 1
    from public.books
    where books.id = book_tags.book_id
      and books.owner_id = (select auth.uid())
      and (select public.is_seller_or_admin())
  )
)
with check (
  exists (
    select 1
    from public.books
    where books.id = book_tags.book_id
      and books.owner_id = (select auth.uid())
      and (select public.is_seller_or_admin())
  )
);

create policy "Admins can manage book tags"
on public.book_tags
for all
to authenticated
using ((select public.is_admin()))
with check ((select public.is_admin()));

-- A user can only create or remove their own like. The primary key prevents
-- duplicate likes for the same user and book.
create policy "Users can read their own likes"
on public.book_likes
for select
to authenticated
using (user_id = (select auth.uid()));

create policy "Users can like published books"
on public.book_likes
for insert
to authenticated
with check (
  user_id = (select auth.uid())
  and exists (
    select 1
    from public.books
    where books.id = book_likes.book_id
      and books.status = 'published'::public.book_status
  )
);

create policy "Users can remove their own likes"
on public.book_likes
for delete
to authenticated
using (user_id = (select auth.uid()));

create policy "Admins can manage likes"
on public.book_likes
for all
to authenticated
using ((select public.is_admin()))
with check ((select public.is_admin()));

-- Customers can view their own orders and items. Order creation and payment
-- updates happen in trusted server code, not directly from the browser.
create policy "Customers can read their own orders"
on public.orders
for select
to authenticated
using (user_id = (select auth.uid()));

create policy "Customers can read their own order items"
on public.order_items
for select
to authenticated
using (
  exists (
    select 1
    from public.orders
    where orders.id = order_items.order_id
      and orders.user_id = (select auth.uid())
  )
);

create policy "Customers can read their own payments"
on public.payments
for select
to authenticated
using (
  exists (
    select 1
    from public.orders
    where orders.id = payments.order_id
      and orders.user_id = (select auth.uid())
  )
);

create policy "Admins can manage orders"
on public.orders
for all
to authenticated
using ((select public.is_admin()))
with check ((select public.is_admin()));

create policy "Admins can manage order items"
on public.order_items
for all
to authenticated
using ((select public.is_admin()))
with check ((select public.is_admin()));

create policy "Admins can manage payments"
on public.payments
for all
to authenticated
using ((select public.is_admin()))
with check ((select public.is_admin()));

-- A library item is an entitlement. It must be created by trusted server code
-- after a verified payment, so customers receive read-only access here.
create policy "Customers can read their own library"
on public.library_items
for select
to authenticated
using (user_id = (select auth.uid()));

create policy "Admins can manage libraries"
on public.library_items
for all
to authenticated
using ((select public.is_admin()))
with check ((select public.is_admin()));

-- Download records are readable by the user who generated them, but inserts
-- are reserved for the protected download server route.
create policy "Users can read their own download events"
on public.download_events
for select
to authenticated
using (user_id = (select auth.uid()));

create policy "Admins can read download events"
on public.download_events
for select
to authenticated
using ((select public.is_admin()));

-- Review history is an admin record. Sellers can see review decisions for
-- their own books so they can understand a rejection.
create policy "Sellers can read reviews for their books"
on public.book_reviews
for select
to authenticated
using (
  exists (
    select 1
    from public.books
    where books.id = book_reviews.book_id
      and books.owner_id = (select auth.uid())
  )
);

create policy "Admins can manage book reviews"
on public.book_reviews
for all
to authenticated
using ((select public.is_admin()))
with check ((select public.is_admin()));

-- Any signed-in user can report a book, but only with their own reporter ID.
create policy "Users can create their own book reports"
on public.book_reports
for insert
to authenticated
with check (reporter_id = (select auth.uid()));

create policy "Users can read their own book reports"
on public.book_reports
for select
to authenticated
using (reporter_id = (select auth.uid()));

create policy "Admins can manage book reports"
on public.book_reports
for all
to authenticated
using ((select public.is_admin()))
with check ((select public.is_admin()));

-- Email events and audit logs are server/admin records. There is no client
-- insert policy because clients must not manufacture operational history.
create policy "Admins can read email events"
on public.email_events
for select
to authenticated
using ((select public.is_admin()));

create policy "Admins can read audit logs"
on public.audit_logs
for select
to authenticated
using ((select public.is_admin()));

-- Storage policies apply to storage.objects, not to application tables.
-- Files should use USER_ID/BOOK_ID/file-name paths.
create policy "Sellers can upload book files"
on storage.objects
for insert
to authenticated
with check (
  bucket_id in ('book-covers', 'book-files')
  and (storage.foldername(name))[1] = (select auth.uid())::text
  and (select public.is_seller_or_admin())
);

create policy "Sellers can view their own book files"
on storage.objects
for select
to authenticated
using (
  bucket_id in ('book-covers', 'book-files')
  and (storage.foldername(name))[1] = (select auth.uid())::text
  and (select public.is_seller_or_admin())
);

create policy "Sellers can update their own book files"
on storage.objects
for update
to authenticated
using (
  bucket_id in ('book-covers', 'book-files')
  and (storage.foldername(name))[1] = (select auth.uid())::text
  and (select public.is_seller_or_admin())
)
with check (
  bucket_id in ('book-covers', 'book-files')
  and (storage.foldername(name))[1] = (select auth.uid())::text
  and (select public.is_seller_or_admin())
);

create policy "Sellers can delete their own book files"
on storage.objects
for delete
to authenticated
using (
  bucket_id in ('book-covers', 'book-files')
  and (storage.foldername(name))[1] = (select auth.uid())::text
  and (select public.is_seller_or_admin())
);

create policy "Admins can manage all book files"
on storage.objects
for all
to authenticated
using (
  bucket_id in ('book-covers', 'book-files')
  and (select public.is_admin())
)
with check (
  bucket_id in ('book-covers', 'book-files')
  and (select public.is_admin())
);
