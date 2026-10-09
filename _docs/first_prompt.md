I want to build a Premier League match prediction web application 
for a private friend group.

## Tech Stack
- Next.js 14+ (App Router)
- Supabase (auth + database + edge functions) — MCP is connected
- Tailwind CSS + shadcn/ui
- API-Football v3 (direct, not RapidAPI)
  Docs: https://www.api-football.com/documentation-v3
- Vercel for hosting

## Internationalisation (i18n)
- Two languages: Polish (default) and English
- User can switch language via a toggle in the UI
- Language preference saved per user (in their profile)
- Use next-intl for i18n implementation
- All static UI text must go through the translation system
- Dynamic content (team names, player names) stays in original form

## Season
- Current season: 2026/27

## Architecture Rules
- Users NEVER call the football API directly
- All match data lives in Supabase, synced by admin only
- API key must never be exposed to the client
- All API-Football calls happen in server actions only
- Free tier is 100 requests/day — cache aggressively in Supabase

## Auth
- Email/password only
- Disable email confirmation (private app)
- Admin role set manually in Supabase dashboard via role column

## Roles
Two roles: admin and user.

Admin can:
- Sync fixtures for a gameweek from API-Football into the DB
- Fetch final results and trigger score calculation manually via button
- Results also fetched automatically every day at 23:45 Warsaw time
  (Europe/Warsaw) via Supabase Edge Function cron
- Manually override results if needed

User can:
- View upcoming fixtures for the active gameweek
- Submit predictions before kickoff (auto-locked at kickoff)
- View their scores and points breakdown after results
- See leaderboards

## Prediction System
For each match, users predict:
- Scoreline (home goals / away goals)
- Total goals — choose range (1pt) or exact (3pt)
- Yellow cards — choose range (1pt) or exact (3pt)
- Corners — choose range (1pt) or exact (3pt)

Scoring:
- Correct result (home win / draw / away win): 3pt
- Total goals range correct: 1pt / exact correct: 3pt
- Yellow cards range correct: 1pt / exact correct: 3pt
- Corners range correct: 1pt / exact correct: 3pt
- Max 12pts per match

Ranges:
- Total goals: "0-1", "2-3", "4-5", "6+"
- Yellow cards: "0-1", "2-3", "4-5", "6+"
- Corners: "0-4", "5-7", "8-10", "11+"

## League System
- Every user is auto-joined to a global league on signup
- Users can create private leagues (gets a unique invite code)
- Users can join a private league by entering an invite code
- Shareable invite link: yourapp.com/join/[code]
- Each league has its own leaderboard
- A user can be in multiple private leagues

## Pages & Features
- Rules page describing how predictions and scoring work
- Match prediction card shows last 5 form and H2H record
- PL standings table page
- Leaderboard with tabs: Global | My Leagues | Current GW / Season

## UI & UX
- Mobile-first responsive design
- All times in user's local timezone (Europe/Warsaw)
- Toast notifications for async actions (use sonner)
- Loading states on all buttons that trigger async work

## Environment
.env.local is already created with API_FOOTBALL_KEY.
Let me know if any other variables are needed.

Please start by proposing the database schema and overall 
folder structure, then wait for my confirmation before 
building anything.

IMPORTANT: Ask before making any assumptions. If anything 
is unclear, ask before building.