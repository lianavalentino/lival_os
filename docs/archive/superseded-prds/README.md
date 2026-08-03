# Superseded PRDs

Archived 2026-08-02. **Do not read these for current scope.** See [`PRD.md`](../../../PRD.md)
at the repo root.

## `LIVAL_OS_Codex_PRD_v1.md`

Dated 2026-06-16. The build spec that produced the app that exists today, so most of its
product content is still recognizable — but three things in it are actively wrong:

1. **§10 Technical Architecture** mandates Next.js, Tailwind, shadcn/ui, Recharts, and
   `NEXT_PUBLIC_*` env vars. The Next.js port was formally rejected on 2026-06-16 (see
   `docs/superpowers/specs/2026-06-16-prd-phase0-1-alignment-design.md`). The app is Vite +
   React + hand-written CSS, and `VITE_*` env vars.
2. **§6 Information Architecture** lists six areas including Build Lab, Home Ops, and
   Learning. There are five now, and Learning is gone. See `PRD.md` §6.2.
3. **§7** specifies twelve views with Brain Dump and Resources separate, and a seven-tab
   Project Detail. Brain Dump and Resources are merged into one "Brain" view, and Project
   Detail is down to four tabs.

Everything worth keeping — the data model, the workflows, the view intents, the glossary —
was pulled forward into `PRD.md`.

## Related archives

- `../prototype-2026-06/` — the retired `TASKS.md` → Notion → HTML pipeline, plus
  `LIVAL_OS_PRD_v1.md` (source of the US1–14 user stories and R1–R4 risks now in `PRD.md`
  §5 and §16) and the June UI prototype that `PRD.md` §7.0 takes its sidebar from.
- `../superseded-nextjs/` — the rejected Next.js/Tailwind/Vercel/Google-Sheets guidance,
  including the former `docs/CLAUDE.md`, which was being auto-loaded as authoritative and
  carried the wrong ingestion secret name.
