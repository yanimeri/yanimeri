-- Yanimeri database setup. Safe to run in Supabase SQL Editor.
-- Keeps existing user_data intact and adds secure account profiles.

create table if not exists public.user_data (
  user_id uuid primary key references auth.users(id) on delete cascade,
  data jsonb not null default '{}'::jsonb,
  updated_at timestamptz not null default now()
);

alter table public.user_data enable row level security;
drop policy if exists "Users can read their own Yanimeri data" on public.user_data;
create policy "Users can read their own Yanimeri data" on public.user_data for select to authenticated using (auth.uid() = user_id);
drop policy if exists "Users can insert their own Yanimeri data" on public.user_data;
create policy "Users can insert their own Yanimeri data" on public.user_data for insert to authenticated with check (auth.uid() = user_id);
drop policy if exists "Users can update their own Yanimeri data" on public.user_data;
create policy "Users can update their own Yanimeri data" on public.user_data for update to authenticated using (auth.uid() = user_id) with check (auth.uid() = user_id);
grant select, insert, update on public.user_data to authenticated;

-- A profile row is created automatically for every new Auth account.
create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  username text not null,
  display_name text not null,
  username_changed_at timestamptz,
  display_name_changed_at timestamptz,
  updated_at timestamptz not null default now()
);

alter table public.profiles add column if not exists username text;
alter table public.profiles add column if not exists display_name text;
alter table public.profiles add column if not exists username_changed_at timestamptz;
alter table public.profiles add column if not exists display_name_changed_at timestamptz;
alter table public.profiles add column if not exists updated_at timestamptz not null default now();

-- Backfill accounts created before this profile system existed. Generated names are unique.
insert into public.profiles (id, username, display_name)
select u.id,
       'user_' || substr(replace(u.id::text, '-', ''), 1, 12),
       coalesce(nullif(u.raw_user_meta_data ->> 'display_name', ''), split_part(coalesce(u.email, 'little-star@example.invalid'), '@', 1), 'Little star')
from auth.users u
where not exists (select 1 from public.profiles p where p.id = u.id);

-- Repair any older incomplete profile rows without changing existing non-empty names.
update public.profiles p
set username = coalesce(nullif(p.username, ''), 'user_' || substr(replace(p.id::text, '-', ''), 1, 12)),
    display_name = coalesce(nullif(p.display_name, ''), nullif(u.raw_user_meta_data ->> 'display_name', ''), 'Little star')
from auth.users u
where u.id = p.id and (p.username is null or p.username = '' or p.display_name is null or p.display_name = '');

create unique index if not exists profiles_username_unique on public.profiles (lower(username));
do $
begin
  if not exists (select 1 from pg_constraint where conname = 'profiles_username_format_check' and conrelid = 'public.profiles'::regclass) then
    alter table public.profiles add constraint profiles_username_format_check check (username ~ '^[a-z0-9_]{3,20}
alter table public.profiles alter column username set not null;
alter table public.profiles alter column display_name set not null;
alter table public.profiles enable row level security;

drop policy if exists "Users can read their own profile" on public.profiles;
create policy "Users can read their own profile" on public.profiles for select to authenticated using (auth.uid() = id);
drop policy if exists "Users can update their own profile" on public.profiles;
create policy "Users can update their own profile" on public.profiles for update to authenticated using (auth.uid() = id) with check (auth.uid() = id);
grant select, update on public.profiles to authenticated;

-- Enforce cooldowns in the database so they cannot be bypassed in the browser.
create or replace function public.enforce_yanimeri_profile_cooldowns()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if new.username is distinct from old.username then
    if old.username_changed_at is not null and now() < old.username_changed_at + interval '30 days' then
      raise exception 'USERNAME_COOLDOWN' using errcode = '23514';
    end if;
    new.username_changed_at := now();
  end if;

  if new.display_name is distinct from old.display_name then
    if old.display_name_changed_at is not null and now() < old.display_name_changed_at + interval '24 hours' then
      raise exception 'DISPLAY_NAME_COOLDOWN' using errcode = '23514';
    end if;
    new.display_name_changed_at := now();
  end if;

  new.updated_at := now();
  return new;
end;
$$;

drop trigger if exists yanimeri_profile_cooldowns on public.profiles;
create trigger yanimeri_profile_cooldowns
before update on public.profiles
for each row execute function public.enforce_yanimeri_profile_cooldowns();

-- Auth trigger creates the profile during sign-up, even when email confirmation is enabled.
create or replace function public.handle_yanimeri_new_user()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
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
$$;

drop trigger if exists on_yanimeri_auth_user_created on auth.users;
create trigger on_yanimeri_auth_user_created
after insert on auth.users
for each row execute function public.handle_yanimeri_new_user();
);
  end if;
  if not exists (select 1 from pg_constraint where conname = 'profiles_display_name_length_check' and conrelid = 'public.profiles'::regclass) then
    alter table public.profiles add constraint profiles_display_name_length_check check (char_length(trim(display_name)) between 1 and 24);
  end if;
end;
$;
alter table public.profiles alter column username set not null;
alter table public.profiles alter column display_name set not null;
alter table public.profiles enable row level security;

drop policy if exists "Users can read their own profile" on public.profiles;
create policy "Users can read their own profile" on public.profiles for select to authenticated using (auth.uid() = id);
drop policy if exists "Users can update their own profile" on public.profiles;
create policy "Users can update their own profile" on public.profiles for update to authenticated using (auth.uid() = id) with check (auth.uid() = id);
grant select, update on public.profiles to authenticated;

-- Enforce cooldowns in the database so they cannot be bypassed in the browser.
create or replace function public.enforce_yanimeri_profile_cooldowns()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if new.username is distinct from old.username then
    if old.username_changed_at is not null and now() < old.username_changed_at + interval '30 days' then
      raise exception 'USERNAME_COOLDOWN' using errcode = '23514';
    end if;
    new.username_changed_at := now();
  end if;

  if new.display_name is distinct from old.display_name then
    if old.display_name_changed_at is not null and now() < old.display_name_changed_at + interval '24 hours' then
      raise exception 'DISPLAY_NAME_COOLDOWN' using errcode = '23514';
    end if;
    new.display_name_changed_at := now();
  end if;

  new.updated_at := now();
  return new;
end;
$$;

drop trigger if exists yanimeri_profile_cooldowns on public.profiles;
create trigger yanimeri_profile_cooldowns
before update on public.profiles
for each row execute function public.enforce_yanimeri_profile_cooldowns();

-- Auth trigger creates the profile during sign-up, even when email confirmation is enabled.
create or replace function public.handle_yanimeri_new_user()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
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
$$;

drop trigger if exists on_yanimeri_auth_user_created on auth.users;
create trigger on_yanimeri_auth_user_created
after insert on auth.users
for each row execute function public.handle_yanimeri_new_user();
