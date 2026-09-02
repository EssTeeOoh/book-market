-- The trusted download route must read the published book's private storage key.
-- The route still checks the user's library entitlement before doing so.
grant select on public.books to service_role;
