-- Helper functions, triggers and RPCs.

create or replace function public.is_admin()
returns boolean
language sql stable security definer set search_path = ''
as $$
  select exists (
    select 1 from public.profiles where id = (select auth.uid()) and role = 'admin'
  );
$$;

create or replace function public.is_league_member(p_league_id bigint)
returns boolean
language sql stable security definer set search_path = ''
as $$
  select exists (
    select 1 from public.league_members
    where league_id = p_league_id and user_id = (select auth.uid())
  );
$$;

-- Range label for a count. kind: 'goals' | 'cards' | 'corners'
create or replace function public.bucket(kind text, n int)
returns text
language sql immutable set search_path = ''
as $$
  select case
    when kind = 'corners' then
      case when n <= 4 then '0-4' when n <= 7 then '5-7' when n <= 10 then '8-10' else '11+' end
    else
      case when n <= 1 then '0-1' when n <= 3 then '2-3' when n <= 5 then '4-5' else '6+' end
  end;
$$;

-- 8-char invite code without ambiguous characters (0/O, 1/I/L).
create or replace function public.gen_invite_code()
returns text
language plpgsql volatile set search_path = ''
as $$
declare
  alphabet constant text := 'ABCDEFGHJKMNPQRSTUVWXYZ23456789';
  code text;
  bytes bytea;
begin
  loop
    bytes := extensions.gen_random_bytes(8);
    code := '';
    for i in 0..7 loop
      code := code || substr(alphabet, (get_byte(bytes, i) % length(alphabet)) + 1, 1);
    end loop;
    exit when not exists (select 1 from public.leagues where invite_code = code);
  end loop;
  return code;
end;
$$;

-- New auth user -> profile + global league membership.
create or replace function public.handle_new_user()
returns trigger
language plpgsql security definer set search_path = ''
as $$
declare
  v_name text := nullif(trim(new.raw_user_meta_data ->> 'display_name'), '');
  v_locale text := new.raw_user_meta_data ->> 'locale';
begin
  insert into public.profiles (id, display_name, locale)
  values (
    new.id,
    left(coalesce(v_name, split_part(new.email, '@', 1)), 30),
    case when v_locale in ('pl', 'en') then v_locale else 'pl' end
  );

  insert into public.league_members (league_id, user_id)
  select id, new.id from public.leagues where is_global
  on conflict do nothing;

  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- Predictions: server-time lock at kickoff + updated_at.
create or replace function public.predictions_before_write()
returns trigger
language plpgsql security definer set search_path = ''
as $$
begin
  if not exists (
    select 1 from public.matches
    where id = new.match_id and kickoff_at > now() and status = 'scheduled'
  ) then
    raise exception 'PREDICTION_LOCKED' using errcode = 'P0001';
  end if;
  new.updated_at := now();
  return new;
end;
$$;

create trigger predictions_lock
  before insert or update on public.predictions
  for each row execute function public.predictions_before_write();

-- Scoring: the single source of truth. Idempotent; safe to rerun after overrides.
create or replace function public.score_match(p_match_id bigint)
returns int
language plpgsql security definer set search_path = ''
as $$
declare
  m public.matches%rowtype;
  v_count int;
begin
  select * into m from public.matches where id = p_match_id;
  if not found then
    raise exception 'match % not found', p_match_id;
  end if;

  if m.status <> 'finished' then
    delete from public.prediction_scores where match_id = p_match_id;
    update public.matches set scored_at = null where id = p_match_id;
    return 0;
  end if;

  if m.home_goals is null or m.away_goals is null
     or m.total_yellows is null or m.total_corners is null then
    return 0; -- incomplete data; retry later or admin override
  end if;

  insert into public.prediction_scores
    (prediction_id, user_id, match_id, gameweek_id, result_pts, goals_pts, cards_pts, corners_pts, scored_at)
  select
    p.id, p.user_id, p.match_id, m.gameweek_id,
    case when sign(p.home_goals - p.away_goals) = sign(m.home_goals - m.away_goals) then 3 else 0 end,
    case
      when p.goals_mode = 'exact' then
        case when p.home_goals + p.away_goals = m.home_goals + m.away_goals then 3 else 0 end
      else
        case when public.bucket('goals', p.home_goals + p.away_goals)
                = public.bucket('goals', m.home_goals + m.away_goals) then 1 else 0 end
    end,
    case
      when p.cards_mode = 'exact' then case when p.cards_exact = m.total_yellows then 3 else 0 end
      else case when p.cards_range = public.bucket('cards', m.total_yellows) then 1 else 0 end
    end,
    case
      when p.corners_mode = 'exact' then case when p.corners_exact = m.total_corners then 3 else 0 end
      else case when p.corners_range = public.bucket('corners', m.total_corners) then 1 else 0 end
    end,
    now()
  from public.predictions p
  where p.match_id = p_match_id
  on conflict (prediction_id) do update set
    result_pts = excluded.result_pts,
    goals_pts = excluded.goals_pts,
    cards_pts = excluded.cards_pts,
    corners_pts = excluded.corners_pts,
    gameweek_id = excluded.gameweek_id,
    scored_at = excluded.scored_at;

  get diagnostics v_count = row_count;
  update public.matches set scored_at = now() where id = p_match_id;
  return v_count;
end;
$$;

-- Leagues
create or replace function public.create_league(p_name text)
returns table (id bigint, invite_code text)
language plpgsql security definer set search_path = ''
as $$
declare
  v_uid uuid := (select auth.uid());
  v_league public.leagues%rowtype;
begin
  if v_uid is null then
    raise exception 'NOT_AUTHENTICATED' using errcode = 'P0001';
  end if;

  insert into public.leagues (name, invite_code, created_by)
  values (trim(p_name), public.gen_invite_code(), v_uid)
  returning * into v_league;

  insert into public.league_members (league_id, user_id) values (v_league.id, v_uid);

  return query select v_league.id, v_league.invite_code;
end;
$$;

create or replace function public.join_league(p_code text)
returns table (id bigint, name text, already_member boolean)
language plpgsql security definer set search_path = ''
as $$
declare
  v_uid uuid := (select auth.uid());
  v_league public.leagues%rowtype;
  v_inserted int;
begin
  if v_uid is null then
    raise exception 'NOT_AUTHENTICATED' using errcode = 'P0001';
  end if;

  select * into v_league from public.leagues l where l.invite_code = upper(trim(p_code));
  if not found then
    raise exception 'LEAGUE_NOT_FOUND' using errcode = 'P0001';
  end if;

  insert into public.league_members (league_id, user_id)
  values (v_league.id, v_uid)
  on conflict do nothing;
  get diagnostics v_inserted = row_count;

  return query select v_league.id, v_league.name, v_inserted = 0;
end;
$$;

create or replace function public.leave_league(p_league_id bigint)
returns void
language plpgsql security definer set search_path = ''
as $$
begin
  if exists (select 1 from public.leagues where id = p_league_id and is_global) then
    raise exception 'CANNOT_LEAVE_GLOBAL' using errcode = 'P0001';
  end if;
  delete from public.league_members
  where league_id = p_league_id and user_id = (select auth.uid());
end;
$$;

-- Leaderboard for a league; season scope when p_gameweek_id is null.
create or replace function public.get_leaderboard(p_league_id bigint, p_gameweek_id bigint default null)
returns table (
  rank bigint,
  user_id uuid,
  display_name text,
  points bigint,
  scored bigint,
  exact_hits bigint,
  results_correct bigint
)
language plpgsql stable security definer set search_path = ''
as $$
begin
  if not public.is_league_member(p_league_id) then
    raise exception 'NOT_A_MEMBER' using errcode = 'P0001';
  end if;

  return query
  with season_gws as (
    select g.id from public.gameweeks g
    join public.seasons s on s.id = g.season_id and s.is_active
    where p_gameweek_id is null or g.id = p_gameweek_id
  ),
  totals as (
    select
      lm.user_id,
      coalesce(sum(ps.total_pts), 0)::bigint as points,
      count(ps.prediction_id)::bigint as scored,
      coalesce(sum((ps.goals_pts = 3)::int + (ps.cards_pts = 3)::int + (ps.corners_pts = 3)::int), 0)::bigint as exact_hits,
      coalesce(sum((ps.result_pts = 3)::int), 0)::bigint as results_correct
    from public.league_members lm
    left join public.prediction_scores ps
      on ps.user_id = lm.user_id and ps.gameweek_id in (select id from season_gws)
    where lm.league_id = p_league_id
    group by lm.user_id
  )
  select
    rank() over (order by t.points desc, t.exact_hits desc, t.results_correct desc),
    t.user_id, p.display_name, t.points, t.scored, t.exact_hits, t.results_correct
  from totals t
  join public.profiles p on p.id = t.user_id
  order by 1, p.display_name;
end;
$$;

-- Execute privileges: Supabase grants EXECUTE to anon/authenticated by default.
revoke execute on function public.score_match(bigint) from public, anon, authenticated;
revoke execute on function public.gen_invite_code() from public, anon, authenticated;
revoke execute on function public.handle_new_user() from public, anon, authenticated;
revoke execute on function public.predictions_before_write() from public, anon, authenticated;
revoke execute on function public.create_league(text) from public, anon;
revoke execute on function public.join_league(text) from public, anon;
revoke execute on function public.leave_league(bigint) from public, anon;
revoke execute on function public.get_leaderboard(bigint, bigint) from public, anon;
revoke execute on function public.is_admin() from public, anon;
revoke execute on function public.is_league_member(bigint) from public, anon;
grant execute on function public.score_match(bigint) to service_role;

-- Backfill users that existed before this migration.
insert into public.profiles (id, display_name)
select u.id, left(coalesce(nullif(trim(u.raw_user_meta_data ->> 'display_name'), ''), split_part(u.email, '@', 1)), 30)
from auth.users u
on conflict (id) do nothing;

insert into public.league_members (league_id, user_id)
select l.id, p.id from public.profiles p cross join public.leagues l
where l.is_global
on conflict do nothing;
