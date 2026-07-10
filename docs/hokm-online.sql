-- Changal online Hokm MVP.
-- This is a guest/anonymous friend-game implementation. It is not anti-cheat secure.
-- Run in Supabase SQL editor before using the frontend.

create extension if not exists pgcrypto;

create table if not exists public.hokm_rooms (
  id uuid primary key default gen_random_uuid(),
  code text not null,
  status text not null default 'lobby'
    check (status in ('lobby', 'trump_selection', 'playing', 'round_ended', 'finished', 'expired')),
  host_player_id text not null,
  host_player_secret text not null,
  rounds_target int not null default 3 check (rounds_target in (3, 5, 7)),
  seats jsonb not null default '[]'::jsonb,
  state jsonb not null default '{}'::jsonb,
  state_version int not null default 1,
  expires_at timestamptz not null default now() + interval '3 hours',
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

create table if not exists public.hokm_room_events (
  id uuid primary key default gen_random_uuid(),
  room_id uuid references public.hokm_rooms(id) on delete cascade,
  code text not null,
  player_id text,
  event_type text not null,
  payload jsonb default '{}'::jsonb,
  created_at timestamptz default now()
);

create index if not exists hokm_rooms_code_idx on public.hokm_rooms(code);
create index if not exists hokm_rooms_expires_at_idx on public.hokm_rooms(expires_at);
create index if not exists hokm_room_events_code_created_idx on public.hokm_room_events(code, created_at desc);

create unique index if not exists hokm_rooms_active_code_unique
on public.hokm_rooms(code)
where status in ('lobby', 'trump_selection', 'playing', 'round_ended');

alter table public.hokm_rooms enable row level security;
alter table public.hokm_room_events enable row level security;

drop policy if exists "hokm rooms public read" on public.hokm_rooms;
create policy "hokm rooms public read"
on public.hokm_rooms
for select
to anon, authenticated
using (true);

drop policy if exists "hokm events public read" on public.hokm_room_events;
create policy "hokm events public read"
on public.hokm_room_events
for select
to anon, authenticated
using (true);

grant select on public.hokm_rooms to anon, authenticated;
grant select on public.hokm_room_events to anon, authenticated;

create or replace function public.mark_expired_hokm_rooms()
returns void
language sql
security definer
set search_path = public
as $$
  update public.hokm_rooms
  set status = 'expired', updated_at = now()
  where expires_at <= now()
    and status in ('lobby', 'trump_selection', 'playing', 'round_ended');
$$;

create or replace function public.create_hokm_room(
  p_player_id text,
  p_player_secret text,
  p_player_name text,
  p_rounds_target int
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_attempt int := 0;
  v_code text;
  v_room public.hokm_rooms%rowtype;
begin
  if p_rounds_target not in (3, 5, 7) then
    return jsonb_build_object('ok', false, 'error', 'invalid_rounds_target');
  end if;

  perform public.mark_expired_hokm_rooms();

  while v_attempt < 20 loop
    v_attempt := v_attempt + 1;
    v_code := 'H' || lpad(floor(random() * 10000)::int::text, 4, '0');

    begin
      insert into public.hokm_rooms (
        code,
        host_player_id,
        host_player_secret,
        rounds_target,
        seats,
        state,
        expires_at
      )
      values (
        v_code,
        p_player_id,
        p_player_secret,
        p_rounds_target,
        jsonb_build_array(jsonb_build_object(
          'seat', 1,
          'playerId', p_player_id,
          'playerSecret', p_player_secret,
          'playerName', coalesce(nullif(trim(p_player_name), ''), 'بازیکن'),
          'connected', true,
          'joinedAt', now()
        )),
        jsonb_build_object('phase', 'lobby', 'roundsTarget', p_rounds_target),
        now() + interval '3 hours'
      )
      returning * into v_room;
      exit;
    exception
      when unique_violation then
        continue;
    end;
  end loop;

  if v_room.id is null then
    return jsonb_build_object('ok', false, 'error', 'code_generation_failed');
  end if;

  insert into public.hokm_room_events(room_id, code, player_id, event_type, payload)
  values (v_room.id, v_room.code, p_player_id, 'room_created', jsonb_build_object('roundsTarget', p_rounds_target));

  return jsonb_build_object('ok', true, 'room', to_jsonb(v_room));
end;
$$;

create or replace function public.join_hokm_room(
  p_code text,
  p_player_id text,
  p_player_secret text,
  p_player_name text
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_code text := upper(trim(p_code));
  v_room public.hokm_rooms%rowtype;
  v_seat int;
begin
  perform public.mark_expired_hokm_rooms();

  select *
  into v_room
  from public.hokm_rooms
  where code = v_code
    and status in ('lobby', 'trump_selection', 'playing', 'round_ended')
  order by created_at desc
  limit 1
  for update;

  if v_room.id is null then
    if exists (
      select 1
      from public.hokm_rooms
      where code = v_code
        and (status = 'expired' or expires_at <= now())
    ) then
      return jsonb_build_object('ok', false, 'error', 'expired');
    end if;
    return jsonb_build_object('ok', false, 'error', 'not_found');
  end if;

  if v_room.status = 'expired' or v_room.expires_at <= now() then
    update public.hokm_rooms set status = 'expired', updated_at = now() where id = v_room.id returning * into v_room;
    return jsonb_build_object('ok', false, 'error', 'expired');
  end if;

  if exists (
    select 1
    from jsonb_array_elements(v_room.seats) seat
    where seat->>'playerId' = p_player_id
  ) then
    update public.hokm_rooms
    set seats = (
      select jsonb_agg(
        case
          when seat->>'playerId' = p_player_id then
            seat || jsonb_build_object('connected', true, 'playerName', coalesce(nullif(trim(p_player_name), ''), 'بازیکن'))
          else seat
        end
      )
      from jsonb_array_elements(v_room.seats) seat
    ),
    updated_at = now()
    where id = v_room.id
    returning * into v_room;

    return jsonb_build_object('ok', true, 'room', to_jsonb(v_room));
  end if;

  if jsonb_array_length(v_room.seats) >= 4 then
    return jsonb_build_object('ok', false, 'error', 'full');
  end if;

  select seat_number
  into v_seat
  from generate_series(1, 4) seat_number
  where not exists (
    select 1
    from jsonb_array_elements(v_room.seats) seat
    where (seat->>'seat')::int = seat_number
  )
  order by seat_number
  limit 1;

  update public.hokm_rooms
  set seats = seats || jsonb_build_array(jsonb_build_object(
    'seat', v_seat,
    'playerId', p_player_id,
    'playerSecret', p_player_secret,
    'playerName', coalesce(nullif(trim(p_player_name), ''), 'بازیکن'),
    'connected', true,
    'joinedAt', now()
  )),
  updated_at = now()
  where id = v_room.id
  returning * into v_room;

  insert into public.hokm_room_events(room_id, code, player_id, event_type, payload)
  values (v_room.id, v_room.code, p_player_id, 'player_joined', jsonb_build_object('seat', v_seat));

  return jsonb_build_object('ok', true, 'room', to_jsonb(v_room));
end;
$$;

create or replace function public.leave_hokm_room(
  p_code text,
  p_player_id text,
  p_player_secret text
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_code text := upper(trim(p_code));
  v_room public.hokm_rooms%rowtype;
begin
  select * into v_room
  from public.hokm_rooms
  where code = v_code
  order by created_at desc
  limit 1
  for update;

  if v_room.id is null then
    return jsonb_build_object('ok', false, 'error', 'not_found');
  end if;

  if not exists (
    select 1
    from jsonb_array_elements(v_room.seats) seat
    where seat->>'playerId' = p_player_id
      and seat->>'playerSecret' = p_player_secret
  ) then
    return jsonb_build_object('ok', false, 'error', 'forbidden');
  end if;

  if v_room.status = 'lobby' then
    update public.hokm_rooms
    set seats = coalesce((
      select jsonb_agg(seat)
      from jsonb_array_elements(v_room.seats) seat
      where seat->>'playerId' <> p_player_id
    ), '[]'::jsonb),
    updated_at = now()
    where id = v_room.id
    returning * into v_room;
  else
    update public.hokm_rooms
    set seats = (
      select jsonb_agg(
        case
          when seat->>'playerId' = p_player_id then seat || jsonb_build_object('connected', false)
          else seat
        end
      )
      from jsonb_array_elements(v_room.seats) seat
    ),
    updated_at = now()
    where id = v_room.id
    returning * into v_room;
  end if;

  insert into public.hokm_room_events(room_id, code, player_id, event_type)
  values (v_room.id, v_room.code, p_player_id, 'player_left');

  return jsonb_build_object('ok', true, 'room', to_jsonb(v_room));
end;
$$;

create or replace function public.update_hokm_room_settings(
  p_code text,
  p_player_id text,
  p_player_secret text,
  p_rounds_target int
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_code text := upper(trim(p_code));
  v_room public.hokm_rooms%rowtype;
begin
  if p_rounds_target not in (3, 5, 7) then
    return jsonb_build_object('ok', false, 'error', 'invalid_rounds_target');
  end if;

  select * into v_room
  from public.hokm_rooms
  where code = v_code
    and status = 'lobby'
  order by created_at desc
  limit 1
  for update;

  if v_room.id is null then
    return jsonb_build_object('ok', false, 'error', 'not_found');
  end if;

  if v_room.host_player_id <> p_player_id or v_room.host_player_secret <> p_player_secret then
    return jsonb_build_object('ok', false, 'error', 'forbidden');
  end if;

  update public.hokm_rooms
  set rounds_target = p_rounds_target,
      state = jsonb_set(coalesce(state, '{}'::jsonb), '{roundsTarget}', to_jsonb(p_rounds_target), true),
      updated_at = now()
  where id = v_room.id
  returning * into v_room;

  return jsonb_build_object('ok', true, 'room', to_jsonb(v_room));
end;
$$;

create or replace function public.update_hokm_room_state(
  p_code text,
  p_player_id text,
  p_player_secret text,
  p_expected_state_version int,
  p_next_state jsonb,
  p_next_status text
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_code text := upper(trim(p_code));
  v_room public.hokm_rooms%rowtype;
  v_event_type text := 'state_updated';
begin
  perform public.mark_expired_hokm_rooms();

  if p_next_status not in ('lobby', 'trump_selection', 'playing', 'round_ended', 'finished', 'expired') then
    return jsonb_build_object('ok', false, 'error', 'invalid_status');
  end if;

  select * into v_room
  from public.hokm_rooms
  where code = v_code
    and status <> 'expired'
    and expires_at > now()
  order by created_at desc
  limit 1
  for update;

  if v_room.id is null then
    return jsonb_build_object('ok', false, 'error', 'not_found');
  end if;

  if not exists (
    select 1
    from jsonb_array_elements(v_room.seats) seat
    where seat->>'playerId' = p_player_id
      and seat->>'playerSecret' = p_player_secret
  ) then
    return jsonb_build_object('ok', false, 'error', 'forbidden');
  end if;

  update public.hokm_rooms
  set state = p_next_state,
      status = p_next_status,
      state_version = state_version + 1,
      updated_at = now()
  where id = v_room.id
    and state_version = p_expected_state_version
  returning * into v_room;

  if not found then
    return jsonb_build_object('ok', false, 'error', 'conflict');
  end if;

  v_event_type := case
    when p_next_status = 'trump_selection' then 'hand_started'
    when p_next_state->>'message' = 'trump_selected' then 'trump_selected'
    when p_next_state->>'message' = 'trick_won' then 'trick_won'
    when p_next_status = 'round_ended' then 'round_won'
    when p_next_status = 'finished' then 'game_finished'
    else 'card_played'
  end;

  insert into public.hokm_room_events(room_id, code, player_id, event_type, payload)
  values (v_room.id, v_room.code, p_player_id, v_event_type, jsonb_build_object('stateVersion', v_room.state_version));

  return jsonb_build_object('ok', true, 'room', to_jsonb(v_room));
end;
$$;

create or replace function public.expire_hokm_room(p_code text)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_code text := upper(trim(p_code));
  v_room public.hokm_rooms%rowtype;
begin
  update public.hokm_rooms
  set status = 'expired', updated_at = now()
  where code = v_code
    and expires_at <= now()
    and status in ('lobby', 'trump_selection', 'playing', 'round_ended')
  returning * into v_room;

  if v_room.id is null then
    select * into v_room
    from public.hokm_rooms
    where code = v_code
    order by created_at desc
    limit 1;
  end if;

  return jsonb_build_object('ok', true, 'room', to_jsonb(v_room));
end;
$$;

grant execute on function public.mark_expired_hokm_rooms() to anon, authenticated;
grant execute on function public.create_hokm_room(text, text, text, int) to anon, authenticated;
grant execute on function public.join_hokm_room(text, text, text, text) to anon, authenticated;
grant execute on function public.leave_hokm_room(text, text, text) to anon, authenticated;
grant execute on function public.update_hokm_room_settings(text, text, text, int) to anon, authenticated;
grant execute on function public.update_hokm_room_state(text, text, text, int, jsonb, text) to anon, authenticated;
grant execute on function public.expire_hokm_room(text) to anon, authenticated;

do $$
begin
  alter publication supabase_realtime add table public.hokm_rooms;
exception
  when duplicate_object then null;
end $$;
