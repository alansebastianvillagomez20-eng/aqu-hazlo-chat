-- UNKNOWN OS v16 — Cloud Sync schema
-- Run this in Supabase Dashboard > SQL Editor > New query.

create table if not exists public.unknown_os_data (
  user_id uuid primary key references auth.users(id) on delete cascade,
  payload jsonb not null default '{}'::jsonb,
  updated_at timestamptz not null default now()
);

alter table public.unknown_os_data enable row level security;

grant select, insert, update, delete on public.unknown_os_data to authenticated;

drop policy if exists "Users can read own UNKNOWN OS data" on public.unknown_os_data;
create policy "Users can read own UNKNOWN OS data"
on public.unknown_os_data
for select
to authenticated
using (auth.uid() = user_id);

drop policy if exists "Users can insert own UNKNOWN OS data" on public.unknown_os_data;
create policy "Users can insert own UNKNOWN OS data"
on public.unknown_os_data
for insert
to authenticated
with check (auth.uid() = user_id);

drop policy if exists "Users can update own UNKNOWN OS data" on public.unknown_os_data;
create policy "Users can update own UNKNOWN OS data"
on public.unknown_os_data
for update
to authenticated
using (auth.uid() = user_id)
with check (auth.uid() = user_id);

drop policy if exists "Users can delete own UNKNOWN OS data" on public.unknown_os_data;
create policy "Users can delete own UNKNOWN OS data"
on public.unknown_os_data
for delete
to authenticated
using (auth.uid() = user_id);
