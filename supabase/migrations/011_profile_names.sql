-- Separate identity fields from the optional public display name.

alter table public.profiles
  add column if not exists first_name text,
  add column if not exists last_name text,
  add column if not exists display_name text;

update public.profiles
set first_name = coalesce(first_name, split_part(trim(full_name), ' ', 1)),
    last_name = coalesce(last_name, nullif(trim(substr(trim(full_name), length(split_part(trim(full_name), ' ', 1)) + 1)), '')),
    display_name = coalesce(display_name, full_name)
where full_name is not null;

revoke update on public.profiles from anon, authenticated;
grant update (username, first_name, last_name, display_name, avatar_url, gender, date_of_birth) on public.profiles to authenticated;

drop function if exists public.update_my_profile(text, text, text, text, date, text);

create or replace function public.update_my_profile(
  p_username text,
  p_first_name text,
  p_last_name text,
  p_display_name text default null,
  p_role text default 'customer',
  p_gender text default null,
  p_date_of_birth date default null,
  p_avatar_url text default null
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
  if auth.uid() is null then raise exception 'You must be signed in to update your profile'; end if;
  if normalized_username !~ '^[a-z0-9_]{3,24}$' then raise exception 'Username must be 3 to 24 characters using lowercase letters, numbers, or underscores'; end if;
  if nullif(trim(p_first_name), '') is null or nullif(trim(p_last_name), '') is null then raise exception 'First name and last name are required'; end if;
  if p_role not in ('customer', 'seller') then raise exception 'You can only choose Reader or Seller'; end if;
  if p_gender is not null and p_gender not in ('female', 'male', 'non_binary', 'prefer_not_to_say') then raise exception 'Please choose a valid gender option'; end if;

  update public.profiles
  set username = normalized_username,
      first_name = trim(p_first_name),
      last_name = trim(p_last_name),
      display_name = nullif(trim(p_display_name), ''),
      full_name = trim(p_first_name) || ' ' || trim(p_last_name),
      gender = p_gender,
      date_of_birth = p_date_of_birth,
      avatar_url = coalesce(nullif(trim(p_avatar_url), ''), avatar_url),
      role = case when role = 'admin'::public.user_role then role else p_role::public.user_role end
  where id = auth.uid()
  returning * into profile_row;

  if profile_row.id is null then raise exception 'Profile could not be found'; end if;
  return profile_row;
exception when unique_violation then raise exception 'That username is already taken';
end;
$$;

revoke execute on function public.update_my_profile(text, text, text, text, text, text, date, text) from public;
grant execute on function public.update_my_profile(text, text, text, text, text, text, date, text) to authenticated;
