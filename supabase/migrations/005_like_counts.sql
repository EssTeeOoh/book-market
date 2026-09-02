-- Keep the denormalized count on books synchronized with the source table.
create or replace function public.sync_book_like_count()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  update public.books
  set like_count = (
    select count(*)::integer from public.book_likes
    where book_id = coalesce(new.book_id, old.book_id)
  )
  where id = coalesce(new.book_id, old.book_id);
  return coalesce(new, old);
end;
$$;

drop trigger if exists book_likes_sync_count on public.book_likes;
create trigger book_likes_sync_count
after insert or delete on public.book_likes
for each row execute function public.sync_book_like_count();

revoke execute on function public.sync_book_like_count() from public, anon, authenticated;
grant select, insert, delete on public.book_likes to authenticated;
