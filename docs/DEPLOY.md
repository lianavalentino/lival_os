# Deploying to Vercel (S-1)

Everything in the repo is ready. What is left needs your Vercel account, so it has
to be run by you.

## 0. Unpause Supabase first — nothing works until this is done

**The `LIVAL_OS` project is paused.** Verified 2026-08-03:

```
$ nslookup mfcdzgkhmzppfctdzhwy.supabase.co
** server can't find mfcdzgkhmzppfctdzhwy.supabase.co: NXDOMAIN

$ supabase projects list
... "name":"LIVAL_OS", "status":"INACTIVE" ...
```

Not a network problem — `supabase.com` itself resolves and returns 200. The
project's DNS record is simply gone, which is what Supabase does to a free-tier
project after a stretch of inactivity. The repo went dormant for five weeks.

Until it is restored: the database is unreachable, all four edge functions are
down, auth cannot work, and migration 004 cannot be applied. A Vercel deploy
done first would produce a site that loads and then fails to sign in.

**Fix:** Supabase dashboard → the `LIVAL_OS` project → Restore. Takes a couple of
minutes. It needs your login, so it cannot be scripted.

Then confirm:

```bash
curl -s -o /dev/null -w "%{http_code}\n" https://mfcdzgkhmzppfctdzhwy.supabase.co/rest/v1/
```

Anything other than `000` means it is back.

### Then drain the spool

17 Claude Code sessions' worth of time entries queued up while the project was
down — oldest 2026-08-02 17:33, newest today. **None of it is lost.** The session
hook spools failed posts instead of dropping them, and `ingest-time-entry`
dedupes on `external_ref`, so replaying cannot double-count:

```bash
~/.claude/hooks/lival-replay-spool.sh
```

Do this before judging whether "This Week's Time" looks right — until the spool
drains, the sidebar under-reports.

## 1. Deploy

```bash
cd ~/Developer/personal/lival-os && npx vercel --prod
```

First run asks to link the project. Accept the defaults — `vercel.json` already
sets the framework, build command, output directory, and the SPA rewrite.

**The rewrite matters.** Without `/(.*) → /index.html`, any URL other than `/`
returns a 404 on refresh, because this is a client-routed SPA with no server
routes.

## 2. Environment variables

Set both in the Vercel dashboard (Settings → Environment Variables), for
Production **and** Preview:

| Name | Value |
|---|---|
| `VITE_SUPABASE_URL` | `https://mfcdzgkhmzppfctdzhwy.supabase.co` |
| `VITE_SUPABASE_ANON_KEY` | the legacy anon JWT — Supabase dashboard → Settings → API Keys → Legacy |

Must be the legacy JWT, not the newer `sb_publishable_...` format. See the
gotcha in `CLAUDE.md`.

Redeploy after adding them — Vite inlines `VITE_*` at build time, so variables
added after a build do not reach the running app.

> `VITE_*` variables are compiled into the client bundle and are public by
> design. The anon key is safe there; RLS is what protects the data. **Never add
> the service-role key** to Vercel or anywhere else in this repo.

If either variable is missing the app silently falls back to local demo mode —
localStorage, no auth, seed data. If the deployed site shows demo data, that is
the cause.

## 3. Supabase auth redirects

Supabase dashboard → Authentication → URL Configuration:

- **Site URL** → the production URL
- **Redirect URLs** → add the production URL and `https://*-<your-scope>.vercel.app`
  for previews

Skip this and sign-in redirects land back on localhost.

## 4. Check it on the phone

1. Open the production URL on the phone and sign in.
2. Confirm Command Center renders real data, not the demo seed.
3. Add to Home Screen.

Then S-2 — the capture Shortcut — has somewhere to point.

## Order note

Apply `supabase/migrations/004_reset_areas.sql` **after** this deploy, not
before. The migration resets Areas to the five, and the fix that stops the
browser writing the old ones back (commit `bd3d7aa`) has to be the code that is
actually running when you next sign in.
