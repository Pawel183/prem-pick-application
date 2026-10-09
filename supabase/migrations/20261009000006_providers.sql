-- Multi-provider support (football-data.org + API-Football).
-- Teams and matches get an internal id plus one external-id column per provider, so a
-- mid-season provider switch re-links existing rows instead of duplicating them.

-- Teams: internal identity instead of the API-Football id.
alter table public.matches drop constraint matches_home_team_id_fkey;
alter table public.matches drop constraint matches_away_team_id_fkey;
alter table public.standings drop constraint standings_team_id_fkey;
drop table public.teams;

create table public.teams (
  id bigint generated always as identity primary key,
  name text not null,
  logo_url text,
  ext_football_data int unique,
  ext_api_football int unique
);
alter table public.teams enable row level security;
create policy "teams_select" on public.teams for select to authenticated using (true);
revoke all on public.teams from anon;
revoke insert, update, delete on public.teams from authenticated;

alter table public.matches
  alter column home_team_id type bigint,
  alter column away_team_id type bigint,
  add constraint matches_home_team_id_fkey foreign key (home_team_id) references public.teams (id),
  add constraint matches_away_team_id_fkey foreign key (away_team_id) references public.teams (id);

alter table public.standings
  alter column team_id type bigint,
  add constraint standings_team_id_fkey foreign key (team_id) references public.teams (id);

-- Matches: per-provider fixture ids.
alter table public.matches drop column api_fixture_id;
alter table public.matches add column ext_football_data int unique;
alter table public.matches add column ext_api_football int unique;

-- The active provider lives on the season so the app and the edge function always agree.
alter table public.seasons
  add column provider text not null default 'football-data'
  check (provider in ('football-data', 'api-football'));
comment on column public.seasons.api_season is 'Season start year as used by both providers (2026 = 2026/27).';
