-- Yanimeri community suggestions and one-vote-per-member reactions
create table if not exists public.suggestions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  display_name text not null default 'Yanimeri member',
  title text not null check (char_length(title) between 1 and 90),
  details text not null default '' check (char_length(details) <= 700),
  created_at timestamptz not null default now()
);
create table if not exists public.suggestion_votes (
  id uuid primary key default gen_random_uuid(),
  suggestion_id uuid not null references public.suggestions(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  vote smallint not null check (vote in (-1, 1)),
  created_at timestamptz not null default now(),
  unique (suggestion_id, user_id)
);
alter table public.suggestions enable row level security;
alter table public.suggestion_votes enable row level security;
drop policy if exists "Signed-in members can read suggestions" on public.suggestions;
create policy "Signed-in members can read suggestions" on public.suggestions for select to authenticated using (true);
drop policy if exists "Members can publish their own suggestions" on public.suggestions;
create policy "Members can publish their own suggestions" on public.suggestions for insert to authenticated with check (auth.uid() = user_id);
drop policy if exists "Signed-in members can read suggestion votes" on public.suggestion_votes;
create policy "Signed-in members can read suggestion votes" on public.suggestion_votes for select to authenticated using (true);
drop policy if exists "Members can add their own suggestion votes" on public.suggestion_votes;
create policy "Members can add their own suggestion votes" on public.suggestion_votes for insert to authenticated with check (auth.uid() = user_id);
drop policy if exists "Members can change their own suggestion votes" on public.suggestion_votes;
create policy "Members can change their own suggestion votes" on public.suggestion_votes for update to authenticated using (auth.uid() = user_id) with check (auth.uid() = user_id);
drop policy if exists "Members can remove their own suggestion votes" on public.suggestion_votes;
create policy "Members can remove their own suggestion votes" on public.suggestion_votes for delete to authenticated using (auth.uid() = user_id);
