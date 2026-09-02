-- Profile onboarding fields and a safe function for users to complete their account.

alter table public.profiles
  add column if not exists username text;

create unique index if not exists profiles_username_lower_idx
  on public.profiles (lower(username))
  where username is not null;

revoke update on public.profiles from anon, authenticated;
grant update (username, full_name, avatar_url) on public.profiles to authenticated;

create or replace function public.complete_my_profile(
  p_username text,
  p_full_name text default null,
  p_wants_to_sell boolean default false
)
returns public.profiles
language plpgsql
security definer
set search_path = public
as $$
declare
  normalized_username text := lower(trim(p_username));
  profile_row public.profiles;
begin
  if auth.uid() is null then
    raise exception 'You must be signed in to update your profile';
  end if;

  if normalized_username !~ '^[a-z0-9_]{3,24}$' then
    raise exception 'Username must be 3 to 24 characters using lowercase letters, numbers, or underscores';
  end if;

  update public.profiles
  set username = normalized_username,
      full_name = coalesce(nullif(trim(p_full_name), ''), full_name),
      role = case
        when p_wants_to_sell and role = 'customer'::public.user_role
          then 'seller'::public.user_role
        else role
      end
  where id = auth.uid()
  returning * into profile_row;

  if profile_row.id is null then
    raise exception 'Profile could not be found';
  end if;

  return profile_row;
exception
  when unique_violation then
    raise exception 'That username is already taken';
end;
$$;

revoke execute on function public.complete_my_profile(text, text, boolean) from public;
grant execute on function public.complete_my_profile(text, text, boolean) to authenticated;
