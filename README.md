# Prem Picks

Premier League prediction game for a private friend group. Next.js 16 (App Router) + Supabase + next-intl (PL/EN). Match data from football-data.org or API-Football (switchable in `/admin`).

## Setup

1. `npm install`
2. Copy `.env.example` to `.env.local` and fill it in.
3. Database: migrations live in `supabase/migrations` (already applied to the project).
4. Edge function `supabase/functions/fetch-results` needs the secrets `CRON_SECRET` and the key of the active provider (`FOOTBALL_DATA_API_KEY` and/or `API_FOOTBALL_API_KEY`).
5. Vault secrets used by the nightly cron (SQL editor, run once):
   ```sql
   select vault.create_secret('https://<ref>.supabase.co', 'project_url');
   select vault.create_secret('<same value as CRON_SECRET>', 'cron_secret');
   ```
6. Supabase dashboard → Authentication → Providers → Email: turn off "Confirm email".
7. Make yourself admin: `update profiles set role = 'admin' where id = '<your user id>';`
8. `npm run dev`

## How data flows

- Users never call a football API. Admin syncs a gameweek (`/admin`), which stores fixtures, teams, table, form and H2H in Supabase.
- Results: the `fetch-results` edge function fetches final scores (and cards/corners when the provider has them) and calls `score_match()` (all scoring lives in SQL). It runs nightly at 23:45 Europe/Warsaw via pg_cron and on the admin "Fetch results" button.
- Every API call is logged in `api_requests`; clients throttle to 9 requests/minute and respect daily caps.

## Data providers

Adapters live in `supabase/functions/_shared/football-providers.ts` (shared by the app and the edge function). The active provider is stored on the season (`seasons.provider`) and switched in `/admin`.

| Provider | Covers 2026/27 | Cards + corners | Limits |
|---|---|---|---|
| football-data.org (free) | yes | no — admin enters them via "Enter cards and corners" | 10 req/min |
| API-Football (paid plan) | yes (free plan: 2022–2024 only) | automatic | plan-dependent (free: 100/day) |

Switching mid-season: change the provider in `/admin`, then re-sync the active gameweek. Teams and matches keep one id column per provider and are re-linked by team name, so existing predictions stay attached.
