-- Core schema for Prem Picks.

create table public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  display_name text not null check (char_length(display_name) between 2 and 30),
  role text not null default 'user' check (role in ('user', 'admin')),
  locale text not null default 'pl' check (locale in ('pl', 'en')),
  created_at timestamptz not null default now()
);

create table public.seasons (
  id bigint generated always as identity primary key,
  name text not null unique,
  api_season int not null unique,
  start_date date not null,
  end_date date not null,
  is_active boolean not null default false
);
create unique index seasons_one_active on public.seasons (is_active) where is_active;

create table public.teams (
  id int primary key, -- API-Football team id
  name text not null,
  logo_url text
);

create table public.gameweeks (
  id bigint generated always as identity primary key,
  season_id bigint not null references public.seasons (id) on delete cascade,
  number smallint not null check (number between 1 and 38),
  api_round text not null,
  is_active boolean not null default false,
  synced_at timestamptz,
  unique (season_id, number)
);
create unique index gameweeks_one_active on public.gameweeks (season_id) where is_active;

create table public.matches (
  id bigint generated always as identity primary key,
  api_fixture_id int not null unique,
  gameweek_id bigint not null references public.gameweeks (id) on delete cascade,
  home_team_id int not null references public.teams (id),
  away_team_id int not null references public.teams (id),
  kickoff_at timestamptz not null,
  status text not null default 'scheduled'
    check (status in ('scheduled', 'live', 'finished', 'postponed', 'cancelled')),
  home_goals smallint check (home_goals >= 0),
  away_goals smallint check (away_goals >= 0),
  home_yellows smallint check (home_yellows >= 0),
  away_yellows smallint check (away_yellows >= 0),
  home_corners smallint check (home_corners >= 0),
  away_corners smallint check (away_corners >= 0),
  total_yellows smallint generated always as (home_yellows + away_yellows) stored,
  total_corners smallint generated always as (home_corners + away_corners) stored,
  is_overridden boolean not null default false,
  results_fetched_at timestamptz,
  scored_at timestamptz
);
create index matches_gameweek_idx on public.matches (gameweek_id, kickoff_at);
create index matches_kickoff_idx on public.matches (kickoff_at);

create table public.match_insights (
  match_id bigint primary key references public.matches (id) on delete cascade,
  home_form text,
  away_form text,
  h2h jsonb not null default '[]'::jsonb,
  fetched_at timestamptz not null default now()
);

create table public.standings (
  season_id bigint not null references public.seasons (id) on delete cascade,
  team_id int not null references public.teams (id),
  rank smallint not null,
  played smallint not null,
  won smallint not null,
  drawn smallint not null,
  lost smallint not null,
  goals_for smallint not null,
  goals_against smallint not null,
  goal_diff smallint not null,
  points smallint not null,
  form text,
  updated_at timestamptz not null default now(),
  primary key (season_id, team_id)
);

create table public.predictions (
  id bigint generated always as identity primary key,
  user_id uuid not null references public.profiles (id) on delete cascade,
  match_id bigint not null references public.matches (id) on delete cascade,
  home_goals smallint not null check (home_goals between 0 and 20),
  away_goals smallint not null check (away_goals between 0 and 20),
  goals_mode text not null check (goals_mode in ('range', 'exact')),
  cards_mode text not null check (cards_mode in ('range', 'exact')),
  cards_range text,
  cards_exact smallint,
  corners_mode text not null check (corners_mode in ('range', 'exact')),
  corners_range text,
  corners_exact smallint,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (user_id, match_id),
  constraint cards_pick_valid check (
    (cards_mode = 'range' and cards_range in ('0-1', '2-3', '4-5', '6+') and cards_exact is null)
    or (cards_mode = 'exact' and cards_exact between 0 and 30 and cards_range is null)
  ),
  constraint corners_pick_valid check (
    (corners_mode = 'range' and corners_range in ('0-4', '5-7', '8-10', '11+') and corners_exact is null)
    or (corners_mode = 'exact' and corners_exact between 0 and 40 and corners_range is null)
  )
);
create index predictions_match_idx on public.predictions (match_id);

create table public.prediction_scores (
  prediction_id bigint primary key references public.predictions (id) on delete cascade,
  user_id uuid not null references public.profiles (id) on delete cascade,
  match_id bigint not null references public.matches (id) on delete cascade,
  gameweek_id bigint not null references public.gameweeks (id) on delete cascade,
  result_pts smallint not null check (result_pts in (0, 3)),
  goals_pts smallint not null check (goals_pts in (0, 1, 3)),
  cards_pts smallint not null check (cards_pts in (0, 1, 3)),
  corners_pts smallint not null check (corners_pts in (0, 1, 3)),
  total_pts smallint generated always as (result_pts + goals_pts + cards_pts + corners_pts) stored,
  scored_at timestamptz not null default now()
);
create index prediction_scores_user_idx on public.prediction_scores (user_id, gameweek_id);
create index prediction_scores_match_idx on public.prediction_scores (match_id);

create table public.leagues (
  id bigint generated always as identity primary key,
  name text not null check (char_length(name) between 2 and 40),
  invite_code text not null unique,
  is_global boolean not null default false,
  created_by uuid references public.profiles (id) on delete set null,
  created_at timestamptz not null default now()
);
create unique index leagues_one_global on public.leagues (is_global) where is_global;

create table public.league_members (
  league_id bigint not null references public.leagues (id) on delete cascade,
  user_id uuid not null references public.profiles (id) on delete cascade,
  joined_at timestamptz not null default now(),
  primary key (league_id, user_id)
);
create index league_members_user_idx on public.league_members (user_id);

-- Every API-Football call is logged here; used for the 100/day budget guard.
create table public.api_requests (
  id bigint generated always as identity primary key,
  endpoint text not null,
  params jsonb not null default '{}'::jsonb,
  status_code int,
  error text,
  remaining int, -- x-ratelimit-requests-remaining header
  source text not null default 'app', -- 'app' | 'edge'
  called_at timestamptz not null default now()
);
create index api_requests_called_at_idx on public.api_requests (called_at);

-- Seed data
insert into public.seasons (name, api_season, start_date, end_date, is_active)
values ('2026/27', 2026, '2026-08-21', '2027-05-30', true);

insert into public.leagues (name, invite_code, is_global)
values ('Global', 'GLOBAL', true);
