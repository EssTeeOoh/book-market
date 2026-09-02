-- Repairs a profile if an Auth user exists but its public profile was deleted.
-- This function can only create the profile for the currently signed-in user.
create or replace function public.ensure_my_profile()
returns public.profiles
language plpgsql
security definer
set search_path = public
as $$
declare
  current_user_id uuid := auth.uid();
  profile_row public.profiles;
begin
  if current_user_id is null then
    raise exception 'Authentication required';
  end if;

  insert into public.profiles (id, full_name, avatar_url)
  select
    current_user_id,
    coalesce(raw_user_meta_data ->> 'full_name', raw_user_meta_data ->> 'name'),
    raw_user_meta_data ->> 'avatar_url'
  from auth.users
  where id = current_user_id
  on conflict (id) do nothing;

  select * into profile_row
  from public.profiles
  where id = current_user_id;

  return profile_row;
end;
$$;

revoke execute on function public.ensure_my_profile() from public, anon;
grant execute on function public.ensure_my_profile() to authenticated;
