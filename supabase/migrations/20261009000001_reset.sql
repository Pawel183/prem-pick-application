-- Drop the pre-existing hand-made schema (test data only) so everything below is reproducible.
drop trigger if exists on_auth_user_created on auth.users;

drop table if exists public.scores cascade;
drop table if exists public.predictions cascade;
drop table if exists public.league_members cascade;
drop table if exists public.leagues cascade;
drop table if exists public.matches cascade;
drop table if exists public.gameweeks cascade;
drop table if exists public.seasons cascade;
drop table if exists public.profiles cascade;

drop function if exists public.handle_new_user() cascade;
drop function if exists public.check_prediction_deadline() cascade;
