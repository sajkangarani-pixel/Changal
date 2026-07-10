-- Changal stable online Hokm.
-- Server-authoritative implementation for Supabase Edge Function: hokm-action.
-- Run this in the Supabase SQL editor before deploying the Edge Function.

create schema if not exists extensions;
create extension if not exists pgcrypto with schema extensions;

drop function if exists public.mark_expired_hokm_rooms();
drop function if exists public.create_hokm_room(text, text, text, int);
drop function if exists public.join_hokm_room(text, text, text, text);
drop function if exists public.leave_hokm_room(text, text, text);
drop function if exists public.update_hokm_room_settings(text, text, text, int);
drop function if exists public.update_hokm_room_state(text, text, text, int, jsonb, text);
drop function if exists public.expire_hokm_room(text);
drop table if exists public.hokm_room_events cascade;

create table if not exists public.hokm_rooms (
  id uuid primary key default extensions.gen_random_uuid(),
  code text not null,
  status text not null default 'lobby',
  rounds_target int not null default 3,
  host_player_id text not null,
  public_state jsonb not null default '{}'::jsonb,
  state_version int not null default 1,
  expires_at timestamptz not null default now() + interval '3 hours',
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

alter table public.hokm_rooms
  add column if not exists public_state jsonb not null default '{}'::jsonb,
  add column if not exists state_version int not null default 1,
  add column if not exists expires_at timestamptz not null default now() + interval '3 hours',
  add column if not exists created_at timestamptz default now(),
  add column if not exists updated_at timestamptz default now();

alter table public.hokm_rooms
  drop column if exists host_player_secret,
  drop column if exists seats,
  drop column if exists state;

update public.hokm_rooms
set status = 'match_finished'
where status = 'finished';

alter table public.hokm_rooms drop constraint if exists hokm_rooms_status_check;
alter table public.hokm_rooms drop constraint if exists hokm_rooms_rounds_target_check;

alter table public.hokm_rooms
  add constraint hokm_rooms_status_check
  check (
    status in (
      'lobby',
      'dealing_first_five',
      'trump_selection',
      'dealing_remaining',
      'playing',
      'trick_resolution',
      'round_ended',
      'match_finished',
      'expired',
      'cancelled'
    )
  );

alter table public.hokm_rooms
  add constraint hokm_rooms_rounds_target_check
  check (rounds_target in (3, 5, 7));

create table if not exists public.hokm_private_state (
  room_id uuid primary key references public.hokm_rooms(id) on delete cascade,
  deck jsonb not null default '[]'::jsonb,
  hands jsonb not null default '{}'::jsonb,
  internal_state jsonb not null default '{}'::jsonb,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

create table if not exists public.hokm_players (
  id uuid primary key default extensions.gen_random_uuid(),
  room_id uuid references public.hokm_rooms(id) on delete cascade,
  seat int not null check (seat between 1 and 4),
  player_id text not null,
  player_secret_hash text not null,
  name text not null,
  is_host boolean not null default false,
  connected boolean not null default true,
  last_seen_at timestamptz default now(),
  joined_at timestamptz default now(),
  unique(room_id, seat),
  unique(room_id, player_id)
);

create table if not exists public.hokm_events (
  id uuid primary key default extensions.gen_random_uuid(),
  room_id uuid references public.hokm_rooms(id) on delete cascade,
  code text not null,
  player_id text,
  event_type text not null,
  payload jsonb default '{}'::jsonb,
  created_at timestamptz default now()
);

create index if not exists hokm_rooms_code_idx on public.hokm_rooms(code);
create index if not exists hokm_rooms_expires_at_idx on public.hokm_rooms(expires_at);
create index if not exists hokm_rooms_status_expires_idx on public.hokm_rooms(status, expires_at);
create index if not exists hokm_players_room_seat_idx on public.hokm_players(room_id, seat);
create index if not exists hokm_players_player_idx on public.hokm_players(player_id);
create index if not exists hokm_events_code_created_idx on public.hokm_events(code, created_at desc);

drop index if exists public.hokm_rooms_active_code_unique;
create unique index hokm_rooms_active_code_unique
on public.hokm_rooms(code)
where status in (
  'lobby',
  'dealing_first_five',
  'trump_selection',
  'dealing_remaining',
  'playing',
  'trick_resolution',
  'round_ended'
);

create or replace function public.hokm_set_updated_at()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists hokm_rooms_updated_at on public.hokm_rooms;
create trigger hokm_rooms_updated_at
before update on public.hokm_rooms
for each row execute function public.hokm_set_updated_at();

drop trigger if exists hokm_private_state_updated_at on public.hokm_private_state;
create trigger hokm_private_state_updated_at
before update on public.hokm_private_state
for each row execute function public.hokm_set_updated_at();

alter table public.hokm_rooms enable row level security;
alter table public.hokm_private_state enable row level security;
alter table public.hokm_players enable row level security;
alter table public.hokm_events enable row level security;

drop policy if exists "hokm rooms public read" on public.hokm_rooms;
create policy "hokm rooms public read"
on public.hokm_rooms
for select
to anon, authenticated
using (true);

drop policy if exists "hokm events public read" on public.hokm_events;
create policy "hokm events public read"
on public.hokm_events
for select
to anon, authenticated
using (true);

drop policy if exists "hokm private no anon read" on public.hokm_private_state;
drop policy if exists "hokm players no anon read" on public.hokm_players;

revoke all on public.hokm_rooms from anon, authenticated;
revoke all on public.hokm_private_state from anon, authenticated;
revoke all on public.hokm_players from anon, authenticated;
revoke all on public.hokm_events from anon, authenticated;

grant select on public.hokm_rooms to anon, authenticated;
grant select on public.hokm_events to anon, authenticated;

do $$
begin
  alter publication supabase_realtime add table public.hokm_rooms;
exception
  when duplicate_object then null;
  when undefined_object then null;
end $$;

do $$
begin
  alter publication supabase_realtime add table public.hokm_events;
exception
  when duplicate_object then null;
  when undefined_object then null;
end $$;

-- The Edge Function uses SUPABASE_SERVICE_ROLE_KEY from its function environment.
-- Do not put the service role key, database password, deck, hands, or player secrets in frontend code.
