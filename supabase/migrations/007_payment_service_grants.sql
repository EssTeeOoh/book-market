-- The server-only Supabase client uses the service_role database role.
-- These grants allow trusted server operations; client access remains governed
-- by the RLS policies in 002_rls_policies.sql.
grant usage on schema public to service_role;
grant select, insert, update, delete on public.orders to service_role;
grant select, insert, update, delete on public.order_items to service_role;
grant select, insert, update, delete on public.payments to service_role;
grant select, insert, update, delete on public.library_items to service_role;
grant select, insert, update, delete on public.download_events to service_role;
