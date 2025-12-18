-- Create purchases table (idempotent)
create table if not exists public.purchases (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references public.profiles(id) not null,
  quest_id uuid references public.quests(id) not null,
  event_id uuid references public.events(id),
  price int,
  currency text,
  status text default 'test',
  purchased_at timestamptz default now()
);

-- Indexes for ownership lookup
create index if not exists index_purchases_on_user on public.purchases(user_id);
create index if not exists index_purchases_on_event on public.purchases(event_id);

-- Enable RLS and add policies for row-level ownership
alter table public.purchases enable row level security;

do $$
begin
  if not exists (
    select 1 from pg_policies
    where schemaname = 'public' and tablename = 'purchases' and policyname = 'purchases_select_owner'
  ) then
    create policy purchases_select_owner on public.purchases
      for select using (auth.uid() = user_id);
  end if;

  if not exists (
    select 1 from pg_policies
    where schemaname = 'public' and tablename = 'purchases' and policyname = 'purchases_insert_owner'
  ) then
    create policy purchases_insert_owner on public.purchases
      for insert with check (auth.uid() = user_id);
  end if;

  if not exists (
    select 1 from pg_policies
    where schemaname = 'public' and tablename = 'purchases' and policyname = 'purchases_update_owner'
  ) then
    create policy purchases_update_owner on public.purchases
      for update using (auth.uid() = user_id);
  end if;

  if not exists (
    select 1 from pg_policies
    where schemaname = 'public' and tablename = 'purchases' and policyname = 'purchases_delete_owner'
  ) then
    create policy purchases_delete_owner on public.purchases
      for delete using (auth.uid() = user_id);
  end if;
end$$;

-- user_progress composite index for quick ownership checks
create index if not exists user_progress_user_event_idx on public.user_progress(user_id, event_id);
