-- RLS policies decide which rows a user may access, but PostgreSQL table
-- privileges must also allow the operation to reach those policies.
grant usage on schema public to anon, authenticated;
grant select on public.books to anon, authenticated;
grant insert, update on public.books to authenticated;
