-- Visual OS Academy — Supabase schema for cloud sync.
-- Run this once in the Supabase dashboard: SQL Editor → New query → paste → Run.
--
-- Design: one JSONB row per user per store (progress, settings). The client
-- store already versions its shape (ProgressStateV1), so the blob carries a
-- `version` and can be normalized into real tables later without a breaking
-- migration. RLS makes every row visible only to its owner.

create table if not exists public.user_progress (
  user_id      uuid primary key references auth.users (id) on delete cascade,
  data         jsonb       not null,
  data_version integer     not null default 1,
  updated_at   timestamptz not null default now()
);

create table if not exists public.user_settings (
  user_id    uuid primary key references auth.users (id) on delete cascade,
  data       jsonb       not null,
  updated_at timestamptz not null default now()
);

alter table public.user_progress enable row level security;
alter table public.user_settings enable row level security;

-- Each user may read and write ONLY their own rows (auth.uid() is provided
-- by Supabase Auth; the anon key can never bypass these policies).
drop policy if exists "read own progress" on public.user_progress;
create policy "read own progress" on public.user_progress
  for select using (auth.uid() = user_id);

drop policy if exists "insert own progress" on public.user_progress;
create policy "insert own progress" on public.user_progress
  for insert with check (auth.uid() = user_id);

drop policy if exists "update own progress" on public.user_progress;
create policy "update own progress" on public.user_progress
  for update using (auth.uid() = user_id);

drop policy if exists "read own settings" on public.user_settings;
create policy "read own settings" on public.user_settings
  for select using (auth.uid() = user_id);

drop policy if exists "insert own settings" on public.user_settings;
create policy "insert own settings" on public.user_settings
  for insert with check (auth.uid() = user_id);

drop policy if exists "update own settings" on public.user_settings;
create policy "update own settings" on public.user_settings
  for update using (auth.uid() = user_id);

-- Keep updated_at honest on every write.
create or replace function public.touch_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists user_progress_touch on public.user_progress;
create trigger user_progress_touch
  before update on public.user_progress
  for each row execute function public.touch_updated_at();

drop trigger if exists user_settings_touch on public.user_settings;
create trigger user_settings_touch
  before update on public.user_settings
  for each row execute function public.touch_updated_at();
