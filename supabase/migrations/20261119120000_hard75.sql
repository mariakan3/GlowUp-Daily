-- 75 Hard logs. Progress photos are device-only and have no column here.

alter table public.win_events drop constraint if exists win_events_source_check;
alter table public.win_events add constraint win_events_source_check
  check (source in ('task', 'routine', 'focus', 'movement', 'milestone', 'roulette', 'bonus', 'hard75'));

create table public.hard75_settings (
  user_id uuid primary key default auth.uid() references auth.users (id) on delete cascade,
  active boolean not null default false,
  start_date date,
  mode text not null default 'hardcore' check (mode in ('hardcore', 'soft')),
  photos_blurred boolean not null default false,
  updated_at timestamptz not null default now()
);

create table public.hard75_logs (
  user_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  date date not null,
  rule1_diet boolean not null default false,
  rule2_workout1 boolean not null default false,
  rule2_workout2_outdoor boolean not null default false,
  rule3_water boolean not null default false,
  water_oz integer not null default 0 check (water_oz between 0 and 512),
  rule4_read boolean not null default false,
  book_note text not null default '',
  rule5_photo boolean not null default false,
  completed_at timestamptz,
  updated_at timestamptz not null default now(),
  primary key (user_id, date)
);

do $$
declare
  t text;
begin
  foreach t in array array['hard75_settings', 'hard75_logs']
  loop
    execute format('alter table public.%I enable row level security', t);
    execute format('alter table public.%I force row level security', t);
    execute format('revoke all on public.%I from anon', t);
    execute format('grant select, insert, update, delete on public.%I to authenticated', t);
    execute format(
      'create policy "Own rows: select" on public.%I for select to authenticated using ((select auth.uid()) = user_id)', t);
    execute format(
      'create policy "Own rows: insert" on public.%I for insert to authenticated with check ((select auth.uid()) = user_id)', t);
    execute format(
      'create policy "Own rows: update" on public.%I for update to authenticated using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id)', t);
    execute format(
      'create policy "Own rows: delete" on public.%I for delete to authenticated using ((select auth.uid()) = user_id)', t);
    execute format(
      'create trigger touch_updated_at before update on public.%I for each row execute function public.touch_updated_at()', t);
  end loop;
end
$$;
