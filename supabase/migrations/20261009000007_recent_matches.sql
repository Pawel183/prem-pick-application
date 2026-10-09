-- Last-five match details (opponent, venue, score) behind the form badges.
alter table public.standings add column recent jsonb not null default '[]'::jsonb;
alter table public.match_insights add column home_recent jsonb not null default '[]'::jsonb;
alter table public.match_insights add column away_recent jsonb not null default '[]'::jsonb;
