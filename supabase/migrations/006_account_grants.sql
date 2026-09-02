-- Dashboard reads remain restricted by RLS to the current user's rows.
grant select on public.library_items to authenticated;
