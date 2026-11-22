-- Yanimeri database setup. Safe to run more than once.
-- Keeps existing user_data and user accounts intact.

create table if not exists public.user_data (
  user_id uuid primary key references auth.users(id) on delete cascade,
  data jsonb not null default '{}'::jsonb,
  updated_at timestamptz not null default now()
);

alter table public.user_data enable row level security;
drop policy if exists "Users can read their own Yanimeri data" on public.user_data;
create policy "Users can read their own Yanimeri data"
  on public.user_data for select to authenticated
  using (auth.uid() = user_id);
drop policy if exists "Users can insert their own Yanimeri data" on public.user_data;
create policy "Users can insert their own Yanimeri data"
  on public.user_data for insert to authenticated
  with check (auth.uid() = user_id);
drop policy if exists "Users can update their own Yanimeri data" on public.user_data;
create policy "Users can update their own Yanimeri data"
  on public.user_data for update to authenticated
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);
grant select, insert, update on public.user_data to authenticated;

-- Account profile records.
create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  username text,
  display_name text,
  username_changed_at timestamptz,
  display_name_changed_at timestamptz,
  updated_at timestamptz not null default now()
);

alter table public.profiles add column if not exists username text;
alter table public.profiles add column if not exists display_name text;
alter table public.profiles add column if not exists username_changed_at timestamptz;
alter table public.profiles add column if not exists display_name_changed_at timestamptz;
alter table public.profiles add column if not exists updated_at timestamptz not null default now();

-- Give older accounts a unique starter username and preserve their display name.
insert into public.profiles (id, username, display_name)
select u.id,
       'user_' || substr(replace(u.id::text, '-', ''), 1, 12),
       coalesce(nullif(u.raw_user_meta_data ->> 'display_name', ''), nullif(split_part(coalesce(u.email, ''), '@', 1), ''), 'Little star')
from auth.users as u
where not exists (select 1 from public.profiles as p where p.id = u.id);

update public.profiles as p
set username = coalesce(nullif(p.username, ''), 'user_' || substr(replace(p.id::text, '-', ''), 1, 12)),
    display_name = coalesce(nullif(p.display_name, ''), nullif(u.raw_user_meta_data ->> 'display_name', ''), 'Little star')
from auth.users as u
where u.id = p.id
  and (p.username is null or p.username = '' or p.display_name is null or p.display_name = '');

alter table public.profiles alter column username set not null;
alter table public.profiles alter column display_name set not null;

drop index if exists public.profiles_username_unique;
create unique index profiles_username_unique on public.profiles (lower(username));

alter table public.profiles drop constraint if exists profiles_username_format_check;
alter table public.profiles add constraint profiles_username_format_check
  check (username ~ '^[a-z0-9_]{3,20}$');

alter table public.profiles drop constraint if exists profiles_display_name_length_check;
alter table public.profiles add constraint profiles_display_name_length_check
  check (char_length(trim(display_name)) between 1 and 24);

alter table public.profiles enable row level security;
drop policy if exists "Users can read their own profile" on public.profiles;
create policy "Users can read their own profile"
  on public.profiles for select to authenticated
  using (auth.uid() = id);
drop policy if exists "Users can update their own profile" on public.profiles;
create policy "Users can update their own profile"
  on public.profiles for update to authenticated
  using (auth.uid() = id)
  with check (auth.uid() = id);
grant select, update on public.profiles to authenticated;

-- Enforce the two independent name-change cooldowns in the database.
create or replace function public.enforce_yanimeri_profile_cooldowns()
returns trigger
language plpgsql
set search_path = ''
as $function$
begin
  if new.username is distinct from old.username then
    if old.username_changed_at is not null
       and now() < old.username_changed_at + interval '30 days' then
      raise exception 'USERNAME_COOLDOWN' using errcode = '23514';
    end if;
    new.username_changed_at := now();
  end if;

  if new.display_name is distinct from old.display_name then
    if old.display_name_changed_at is not null
       and now() < old.display_name_changed_at + interval '24 hours' then
      raise exception 'DISPLAY_NAME_COOLDOWN' using errcode = '23514';
    end if;
    new.display_name_changed_at := now();
  end if;

  new.updated_at := now();
  return new;
end;
$function$;

drop trigger if exists yanimeri_profile_cooldowns on public.profiles;
create trigger yanimeri_profile_cooldowns
before update on public.profiles
for each row execute function public.enforce_yanimeri_profile_cooldowns();

-- Create a profile automatically whenever someone signs up.
create or replace function public.handle_yanimeri_new_user()
returns trigger
language plpgsql
security definer
set search_path = ''
as $function$
declare
  requested_username text;
  requested_display_name text;
begin
  requested_username := lower(trim(coalesce(new.raw_user_meta_data ->> 'username', '')));
  requested_display_name := trim(coalesce(new.raw_user_meta_data ->> 'display_name', ''));

  if requested_username !~ '^[a-z0-9_]{3,20}$' then
    raise exception 'A valid Yanimeri username is required.';
  end if;
  if requested_display_name = '' or char_length(requested_display_name) > 24 then
    raise exception 'A valid Yanimeri display name is required.';
  end if;

  insert into public.profiles (id, username, display_name)
  values (new.id, requested_username, requested_display_name);
  return new;
end;
$function$;

drop trigger if exists on_yanimeri_auth_user_created on auth.users;
create trigger on_yanimeri_auth_user_created
after insert on auth.users
for each row execute function public.handle_yanimeri_new_user();

-- Safe username availability check for the sign-up form.
create or replace function public.is_username_available(candidate_username text)
returns boolean
language sql
stable
security definer
set search_path = ''
as $function$
  select candidate_username ~ '^[A-Za-z0-9_]{3,20}$'
     and not exists (
       select 1 from public.profiles
       where lower(username) = lower(candidate_username)
     );
$function$;

grant execute on function public.is_username_available(text) to anon, authenticated;
