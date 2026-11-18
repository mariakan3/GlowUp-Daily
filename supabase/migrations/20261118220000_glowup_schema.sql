-- GlowUp Daily schema: every row belongs to one auth user and is only visible to that user.
-- LLM API keys are never stored here; they stay on the device.

create table public.user_settings (
  user_id uuid primary key default auth.uid() references auth.users (id) on delete cascade,
  display_name text not null default '',
  onboarded boolean not null default false,
  subjects text[] not null default '{}',
  day_modes jsonb not null default '{}'::jsonb,
  timer jsonb,
  ai_provider text not null default 'off' check (ai_provider in ('off', 'openai', 'gemini')),
  ai_model text not null default '',
  ai_schedule_profile jsonb,
  previous_tasks_snapshot jsonb,
  updated_at timestamptz not null default now()
);

create table public.tasks (
  user_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  id text not null,
  title text not null check (char_length(title) between 1 and 200),
  emoji text not null default '✨',
  category text not null check (category in ('morning', 'studies', 'movement', 'selfcare', 'home')),
  time_of_day text not null check (time_of_day in ('morning', 'daytime', 'evening')),
  tier smallint not null default 2 check (tier between 1 and 3),
  days smallint[] not null default '{0,1,2,3,4,5,6}',
  position double precision not null default 0,
  sport text check (sport in ('pilates', 'tennis', 'running', 'gym', 'walk')),
  custom boolean not null default true,
  wins smallint not null default 1 check (wins between 1 and 5),
  minutes integer,
  updated_at timestamptz not null default now(),
  primary key (user_id, id)
);

create table public.routine_steps (
  user_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  id text not null,
  routine text not null check (routine in ('am', 'pm')),
  title text not null check (char_length(title) between 1 and 200),
  emoji text not null default '✨',
  position double precision not null default 0,
  updated_at timestamptz not null default now(),
  primary key (user_id, id)
);

create table public.goals (
  user_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  id text not null,
  title text not null check (char_length(title) between 1 and 200),
  emoji text not null default '🎯',
  category text not null check (category in ('morning', 'studies', 'movement', 'selfcare', 'home')),
  created_at_ms bigint not null,
  updated_at timestamptz not null default now(),
  primary key (user_id, id)
);

create table public.milestones (
  user_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  id text not null,
  goal_id text not null,
  title text not null check (char_length(title) between 1 and 200),
  done_at bigint,
  position integer not null default 0,
  updated_at timestamptz not null default now(),
  primary key (user_id, id),
  foreign key (user_id, goal_id) references public.goals (user_id, id) on delete cascade
);

create table public.win_events (
  user_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  id text not null,
  date date not null,
  ts bigint not null,
  source text not null check (source in ('task', 'routine', 'focus', 'movement', 'milestone', 'roulette', 'bonus')),
  ref_id text not null,
  amount smallint not null check (amount between 1 and 10),
  category text not null check (category in ('morning', 'studies', 'movement', 'selfcare', 'home')),
  label text not null default '',
  primary key (user_id, id)
);

create table public.focus_sessions (
  user_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  id text not null,
  date date not null,
  ts bigint not null,
  subject text not null,
  minutes integer not null check (minutes >= 0),
  preset_id text not null,
  primary key (user_id, id)
);

create table public.movement_sessions (
  user_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  id text not null,
  date date not null,
  ts bigint not null,
  sport text not null check (sport in ('pilates', 'tennis', 'running', 'gym', 'walk')),
  minutes integer not null check (minutes > 0),
  vibe text not null,
  note text not null default '',
  win_event_id text not null,
  primary key (user_id, id)
);

-- Today's remixed or split checklist (AI Concierge), one row per day.
create table public.day_plans (
  user_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  date date not null,
  tasks jsonb not null,
  updated_at timestamptz not null default now(),
  primary key (user_id, date)
);

create index win_events_user_date_idx on public.win_events (user_id, date);
create index focus_sessions_user_date_idx on public.focus_sessions (user_id, date);
create index movement_sessions_user_date_idx on public.movement_sessions (user_id, date);
create index milestones_goal_idx on public.milestones (user_id, goal_id);

do $$
declare
  t text;
begin
  foreach t in array array[
    'user_settings', 'tasks', 'routine_steps', 'goals', 'milestones',
    'win_events', 'focus_sessions', 'movement_sessions', 'day_plans'
  ]
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
  end loop;
end
$$;

create or replace function public.touch_updated_at()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

do $$
declare
  t text;
begin
  foreach t in array array['user_settings', 'tasks', 'routine_steps', 'goals', 'milestones', 'day_plans']
  loop
    execute format(
      'create trigger touch_updated_at before update on public.%I for each row execute function public.touch_updated_at()', t);
  end loop;
end
$$;
