# Cloud sync (Supabase) — one-time setup

The app works fully offline without this. Once configured, progress and
settings sync to your own Supabase project whenever you are signed in, and
survive clearing browser site data (sign in again and everything returns).

## 1. Create a project

1. Sign up / log in at <https://supabase.com> (free tier is enough) and
   create a new project.
2. Wait for the database to provision.

## 2. Run the schema

Open **SQL Editor → New query**, paste the whole of `supabase/schema.sql`,
and run it. This creates two tables (`user_progress`, `user_settings`) with
row-level security so each account can only ever touch its own rows.

## 3. Give the app your project's keys

**Project Settings → API** — copy the **Project URL** and the **anon public**
key (the anon key is safe to ship in browser code; RLS is what protects data).

Create a file named `.env.local` in the project root:

```
NEXT_PUBLIC_SUPABASE_URL=https://YOUR-PROJECT-REF.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=YOUR-ANON-KEY
```

Restart the dev server afterwards — env vars are read at startup.

## 4. (Optional, for local testing) disable email confirmation

By default Supabase emails a confirmation link on sign-up. For quick local
testing you can turn that off: **Authentication → Sign In / Providers →
Email → toggle off "Confirm email"**. Leave it on for anything public.

## How it behaves

- **Not configured / signed out** — exactly the old behaviour: localStorage
  only, nothing leaves the machine.
- **Signed in** — every store change is pushed (debounced ~1.5 s); on sign-in
  the newer of local vs. cloud wins per store (timestamps), then stays
  in sync. The local copy remains as an offline cache.
- **Cleared site data** — sign in again in Settings; your progress and
  settings come back from Postgres.
