# Scope reset — 2026-08-02

Phase D of the consolidation plan. The repo had been dormant since 2026-06-25 and
carried three PRDs that disagreed with each other and with the running code. This
session decided what LIVAL OS is *now*, not what June wanted.

Every answer below is a decision, not a proposal. Phase E (the canonical `PRD.md`)
pulls forward only what survives here.

---

## 1. Tool or portfolio piece?

**A daily tool for managing ADHD. Not a portfolio piece.**

`career-ops/knowledge-base/03 Project Portfolio.md:37` lists LIVAL OS as an
"engineering-depth case study, gated until finished." That framing is retired.
Portfolio value, if it comes, is a byproduct.

Consequence: the finish line is "I open it every morning," not "it's impressive
across all 13 views." Features are judged on whether they reduce friction between
a thought and a recorded action.

## 2. Which views, and what does the UI look like?

**Visual reference is the archived prototype**, `docs/archive/prototype-2026-06/lival-os.html`
— specifically its **sidebar composition**, which the app never adopted.

The palettes already match (prototype `--navy:#0f172a` / `--purple:#7c3aed`; live
`--navy:#111936` / `--purple:#6d5efc`). The difference is structural:

| | Prototype (adopted) | Live app (replaced) |
|---|---|---|
| Nav | grouped with separators | flat list |
| Quick Capture | **in the sidebar** | button in topbar |
| Time | **"This Week's Time" + bar chart, pinned bottom** | topbar only |

The `LIVAL_OS_mockup.png` (BRAIN OS) in `~/Documents/LIVAL_OS/docs/` converged on
the same sidebar shape independently. Treat that mockup as a **north star for
density and layout, not as a build checklist** — it draws every unbuilt gap.

Shipping nav:

```
Now      ⌘ Command Center
         ☀ Daily
         📅 Weekly
Work     ⬡ Board
         ◈ Projects
         ✉ Inbox
         💡 Brain
Review   ◉ Reports
         🗃 Archive
         ⚙ Settings

Quick Capture
  ＋ Add Task
  ＋ Brain Dump
  ＋ Add Resource
  ⏱ Log Time (Code)     ← already live via session hooks

This Week's Time
```

Project Detail and Task Detail are drill-ins, not nav entries.

## 3. Brain Dump + Resources

**Merged into one view called "Brain" (`💡`). Both tables kept.**

Tabs: `All / Ideas / Someday / Saved`. `Saved` reads `resources`; the rest read
`brain_dumps`.

Tables stay separate because the lifecycles are opposite — a brain dump succeeds
when it converts to a task and disappears (`converted_task_id`); a resource
succeeds when it's still findable in six months (`archived_at`). One `status`
column serving both produces a junk drawer.

Both views were already the same `TabbedList` component, so the UI merge is cheap.

## 4. Deploy target

**Vercel.**

A tool that needs `npm run dev` before you can look at it does not get opened —
that is part of why this repo went dormant. A bookmarked URL and a phone home-screen
icon remove the only step between impulse and use.

Mobile work is already paid for: `BottomNav.tsx` exists, `styles.css` has 4 media
queries, mobile screenshots date from June.

Security posture is standard, not a shortcut: RLS on all 11 tables, single-user
policies (`user_id = auth.uid()`), Supabase Auth gates the session, anon key is
designed to be public. Cost $0 on Hobby.

Known caveat: Vercel Hobby terms are non-commercial. Fine for a personal tool. If
LIVAL OS ever tracks VI client work directly, revisit.

## 5. The two scheduled jobs

Both were found still live on disk, pointing at the retired architecture.

**`~/Claude/Scheduled/lival-sync-daily` (8am) — DELETE.**
Runs `~/Developer/.claude/skills/lival-sync/scripts/rollup.py` and scans
`command-center-work-os/TASKS.md`. Both were deleted in Phase B. It syncs files →
Notion: wrong direction, wrong store, missing script. Nothing to salvage.

**`~/Claude/Scheduled/lival-weekly-review-friday` (Fri 5pm) — PORT to Supabase.**
Keeps its schedule and its math; swaps Notion reads/writes for Supabase.

This job *is* the Reports feature. `weekly_snapshots` was built for exactly its
output shape and nothing writes to it — which is why Reports renders a blank
summary. **Reports is not unbuilt, it is unfed.**

| Job already computes | Lands in |
|---|---|
| `round(closed / planned * 100)`, Backlog excluded | `weekly_snapshots.momentum_score` |
| one row per completed task | `activity_events` → Weekly Win Log |
| tasks closed / planned, hours, top area | `weekly_snapshots` — columns exist |
| week-keyed idempotent upsert | `unique (user_id, week_start)` — enforced |

Status mapping is 1:1 and mechanical:

```
momentum = round(done / (this_week + in_progress + blocked + done) * 100)
```

This also closes the dead `momentumScore` field (`src/types.ts:144`, seeded 78) —
the formula exists in `compute_review.py`, deterministic and unit-checked
(3 closed / 6 planned → 50). It was never wired.

The job's hardcoded 5-area list must become a database query — it was already
missing Learning, and after decision 8 it is wrong differently.

## 6. Capture transport

**Apple Shortcut now. Notion kept, poller built later. n8n rejected.**

One shortcut, three entry points: home screen icon, "Hey Siri, capture", and the
**share sheet** (accept URLs + Text + Safari web pages). An If block uses
`Shortcut Input` when present and falls back to `Ask for Input` otherwise.

Two actions: `Ask for Input` → `Get Contents of URL` POSTing to
`ingest-quick-capture`. No middleware, no polling, no monthly bill. ~20 min setup;
field reference already at `docs/ingestion/README.md:142`.

Field mapping:

| Shared | `type` | `source_url` |
|---|---|---|
| link | `resource` | the URL |
| selected text | `note` | — |
| typed | `idea` | — |

Everything enters through the one endpoint into `inbox_items`. Triage happens in
Inbox; links promote to Brain → Saved.

**Notion**: one capture DB survives, for when a browsable phone-side queue is
wanted. Transport will be a Supabase `pg_cron` + edge function poller (~4 hrs) —
**not n8n**, which is rejected outright. Not built now.

Accepted risk: the bearer secret lives inside the Shortcut, readable by anyone
with the unlocked phone, and syncs via iCloud. Acceptable for a single-user
personal tool. Do not export or share the Shortcut file.

## 7. The six orphan gaps

| Gap | Call | Notes |
|---|---|---|
| Board drag-and-drop | **BUILD** ~4h | No DnD exists today. Gap Audit said P0, PRD said Deferred — siding with P0. Fewest clicks between doing a thing and recording it. |
| Task Detail time widget | **BUILD** ~2h | Shows `Estimate` only. This is the payoff for every session hook running since June. |
| Weekly Calendar widget | **BUILD** ~5h | Currently hardcoded fake data (`index < 5 ? "N focus block" : "Light"`). Derived from task due dates + `daily_plans`, colored by area. |
| Project Detail tabs | **PARTIAL** ~4h | Build Overview + Tasks + Time. Cut Timeline (needs a hand-maintained milestones table) and Notes (duplicates Brain). Resources + Activity are cheap later adds. |
| Reports + charts | **FEED, defer charts** | Covered by decision 5. Real numbers in text panels answer "how was my week." Recharts is ~6h and answers nothing new. |
| Resources filters | **RESOLVED** | Became Brain's tab bar in decision 3. |

Weekly Calendar source, decided: **derive from own data**, not Google Calendar and
not manual blocks. It answers "what did I plan to work on." A calendar integration
answers "what did I commit to other people" — a different question, revisit later.

## 8. Areas and workspaces

**5 areas. Workspace level kept, separate from Consulting.**

| Area | Holds | Maps to |
|---|---|---|
| Consulting | client delivery work | `clients/` |
| VI | Valentino Intelligence — LLC, SEA, invoices, taxes, expenses | `business/` |
| Personal Projects | LIVAL OS, road-trip, HA bridge | `personal/` |
| Job Search | applications, pipeline | `career-ops/`, `personal/ai-job-search/` |
| Life Admin | appointments, health, house, bills | — |

Removed: **Build Lab** → Personal Projects. **Home Ops** → Life Admin.
**Learning** → dropped.

Hierarchy stays 4 levels: `Area → Workspace → Project → Task`. VI is *running the
company*; Consulting is *doing the client work*. They are siblings, not nested.

Workspace stays a real level but is **optional in the UI** — AI routing fills it
when confident, no required dropdown at capture time. Three filing decisions per
capture is where ADHD capture dies.

Migration required (~1h): existing tasks, time entries, and resources point at
Build Lab / Home Ops / Learning area ids and must be remapped before anything
renders correctly.

## 9. Ship line

Stop building and start using when all four are true:

1. Deployed to Vercel, loads on the phone
2. Capture Shortcut on the home screen and in the share sheet
3. Command Center shows today's real tasks and this week's real hours
4. Friday 5pm review runs and fills Reports

Everything else — Board DnD, Project Detail tabs, Weekly Calendar, charts — ships
*after* daily use has started.

**Estimate: ~3 days focused work to the ship line. ~2 weeks for the full list.**

---

## Also decided: kill the client-side seed bootstrap

`SupabaseRepository.loadData()` calls `bootstrapSeedData()` on **every login**
(`src/lib/repository.ts:540`), inserting missing rows from `src/data/seed.ts` —
which still contains Build Lab, Home Ops, and Learning.

After decision 8 this stops being a security nit and becomes an active bug: migrate
the areas, log in, and the browser writes the old areas straight back.

1. `004_reset_areas.sql` — insert the 5 new areas, remap existing rows
2. Strip `bootstrapSeedData()` and `deleteDuplicateSeedRows()` from the repository
3. Seed lives in Postgres; the browser stops writing structural data

~2h. Closes Gap Audit Risk #3 as a side effect.

---

## Corrections to the plan document

- The plan says "five Notion DBs, delete four." There are **seven** — Tasks,
  Projects, Brain Dump, Inbox, Resources, **Wins, Archive**. The last two were
  created for the weekly review and are not in the plan's count.
- The plan assumed n8n for Notion capture (Phase G). **n8n is rejected.** If the
  Notion poller is ever built it will be `pg_cron` + a Supabase edge function.
- The Gap Audit called Reports "a placeholder." It renders five panels off live
  data; only charts are missing.
- 13 view components exist, not 12.

## Open items, deliberately not decided

- Google Calendar integration — revisit after the derived Weekly Calendar is in use.
- Notion poller — revisit after two weeks of Shortcut-only capture.
- Reports charts — revisit once the weekly review is actually feeding data.
- Plaintext credentials in `~/.claude/settings.json` (GitHub PAT,
  `LIVAL_INGEST_SECRET`) still need rotation to a keychain-backed source. Separate
  from this scope reset; tracked, not fixed here.
