-- The admin delete action uses the trusted service_role client.
grant select, delete on public.books to service_role;
