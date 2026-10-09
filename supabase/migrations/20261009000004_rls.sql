-- Row level security. Admin writes to match data go through the service-role client
-- (server actions / edge function) after an explicit is_admin() check, so no write
-- policies exist for those tables.

alter table public.profiles enable row level security;
alter table public.seasons enable row level security;
alter table public.teams enable row level security;
alter table public.gameweeks enable row level security;
alter table public.matches enable row level security;
alter table public.match_insights enable row level security;
alter table public.standings enable row level security;
alter table public.predictions enable row level security;
alter table public.prediction_scores enable row level security;
alter table public.leagues enable row level security;
alter table public.league_members enable row level security;
alter table public.api_requests enable row level security;

-- Nothing is readable by anonymous visitors.
revoke all on all tables in schema public from anon;

-- profiles: everyone signed in can see names; users may edit only name + locale.
create policy "profiles_select" on public.profiles
  for select to authenticated using (true);
create policy "profiles_update_own" on public.profiles
  for update to authenticated
  using (id = (select auth.uid())) with check (id = (select auth.uid()));
revoke insert, update, delete on public.profiles from authenticated;
grant update (display_name, locale) on public.profiles to authenticated;

-- Read-only reference data.
create policy "seasons_select" on public.seasons for select to authenticated using (true);
create policy "teams_select" on public.teams for select to authenticated using (true);
create policy "gameweeks_select" on public.gameweeks for select to authenticated using (true);
create policy "matches_select" on public.matches for select to authenticated using (true);
create policy "match_insights_select" on public.match_insights for select to authenticated using (true);
create policy "standings_select" on public.standings for select to authenticated using (true);
create policy "prediction_scores_select" on public.prediction_scores for select to authenticated using (true);
revoke insert, update, delete on
  public.seasons, public.teams, public.gameweeks, public.matches,
  public.match_insights, public.standings, public.prediction_scores
from authenticated;

-- predictions: own always; others' only once the match has kicked off.
create policy "predictions_select" on public.predictions
  for select to authenticated
  using (
    user_id = (select auth.uid())
    or exists (select 1 from public.matches m where m.id = match_id and m.kickoff_at <= now())
  );
create policy "predictions_insert_own" on public.predictions
  for insert to authenticated
  with check (
    user_id = (select auth.uid())
    and exists (select 1 from public.matches m where m.id = match_id and m.kickoff_at > now())
  );
create policy "predictions_update_own" on public.predictions
  for update to authenticated
  using (
    user_id = (select auth.uid())
    and exists (select 1 from public.matches m where m.id = match_id and m.kickoff_at > now())
  )
  with check (user_id = (select auth.uid()));
revoke update, delete on public.predictions from authenticated;
grant update (
  home_goals, away_goals, goals_mode,
  cards_mode, cards_range, cards_exact,
  corners_mode, corners_range, corners_exact
) on public.predictions to authenticated;

-- leagues: visible if global or a member. Mutations only via RPCs.
create policy "leagues_select" on public.leagues
  for select to authenticated
  using (is_global or public.is_league_member(id));
create policy "league_members_select" on public.league_members
  for select to authenticated
  using (public.is_league_member(league_id));
revoke insert, update, delete on public.leagues, public.league_members from authenticated;

-- api_requests: admins can read the usage log.
create policy "api_requests_admin_select" on public.api_requests
  for select to authenticated using (public.is_admin());
revoke insert, update, delete on public.api_requests from authenticated;
