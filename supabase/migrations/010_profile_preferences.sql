-- Optional profile preferences, avatar storage, and safe reader/seller switching.

alter table public.profiles
  add column if not exists gender text,
  add column if not exists date_of_birth date;

alter table public.profiles
  drop constraint if exists profiles_gender_check;

alter table public.profiles
  add constraint profiles_gender_check
  check (gender is null or gender in ('female', 'male', 'non_binary', 'prefer_not_to_say'));

revoke update on public.profiles from anon, authenticated;
grant update (username, full_name, avatar_url, gender, date_of_birth) on public.profiles to authenticated;

insert into storage.buckets (id, name, public)
values ('avatars', 'avatars', true)
on conflict (id) do update set public = true;

create policy "Users can upload their avatar"
on storage.objects
for insert
to authenticated
with check (
  bucket_id = 'avatars'
  and (storage.foldername(name))[1] = (select auth.uid())::text
);

create policy "Users can update their avatar"
on storage.objects
for update
to authenticated
using (bucket_id = 'avatars' and (storage.foldername(name))[1] = (select auth.uid())::text)
with check (bucket_id = 'avatars' and (storage.foldername(name))[1] = (select auth.uid())::text);

create policy "Anyone can view avatars"
on storage.objects
for select
to anon, authenticated
using (bucket_id = 'avatars');

create or replace function public.update_my_profile(
  p_username text,
  p_full_name text default null,
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
  if auth.uid() is null then
    raise exception 'You must be signed in to update your profile';
  end if;
  if normalized_username !~ '^[a-z0-9_]{3,24}$' then
    raise exception 'Username must be 3 to 24 characters using lowercase letters, numbers, or underscores';
  end if;
  if p_role not in ('customer', 'seller') then
    raise exception 'You can only choose Reader or Seller';
  end if;
  if p_gender is not null and p_gender not in ('female', 'male', 'non_binary', 'prefer_not_to_say') then
    raise exception 'Please choose a valid gender option';
  end if;

  update public.profiles
  set username = normalized_username,
      full_name = nullif(trim(p_full_name), ''),
      gender = p_gender,
      date_of_birth = p_date_of_birth,
      avatar_url = coalesce(nullif(trim(p_avatar_url), ''), avatar_url),
      role = case when role = 'admin'::public.user_role then role else p_role::public.user_role end
  where id = auth.uid()
  returning * into profile_row;

  if profile_row.id is null then raise exception 'Profile could not be found'; end if;
  return profile_row;
exception
  when unique_violation then raise exception 'That username is already taken';
end;
$$;

revoke execute on function public.update_my_profile(text, text, text, text, date, text) from public;
grant execute on function public.update_my_profile(text, text, text, text, date, text) to authenticated;
