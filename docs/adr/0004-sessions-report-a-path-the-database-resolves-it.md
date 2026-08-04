# A session reports its directory; the database decides which Project that is

The session hook sends its working directory as an opaque string and stops there. Time entries
store that raw path. Which Project a path belongs to is resolved in the database, by
longest-prefix match against a path declared on each Project.

Decided 2026-08-04.

## Why the split

The obvious alternative is a map of directory to Project id held next to the hook. It was
rejected on three counts, each of which has already bitten this project in some form:

- It puts database identifiers on the filesystem, in a file nothing validates and nothing
  version-controls.
- It silently drops anything unmapped. Time in a new directory would vanish rather than arrive
  unattributed — and the unattributed fifth is exactly the part you would be under-billing.
- It makes taking on a client an edit to a shell script that runs on every session in every
  directory. That component should be as close to trivial as it can be.

Resolving in the database inverts all three. An unmapped session is still recorded and still
shows its path. Declaring a path attributes **past** entries under it as well as future ones,
with no backfill script and no replay. And a new client is one row, not a reinstall.

## Consequences

- Time entries gain a raw-path column, distinct from the description field, which is
  user-facing text. Projects gain a nullable declared-path column — Projects that are not code
  legitimately have none.
- Area and Workspace follow from the resolved Project rather than being matched independently.
  One mapping, one place to be wrong.
- A manually corrected attribution is never re-resolved by the automatic rule. An automated
  guess that overwrites a human correction on the next read is not a correction.
- Path comparison is literal, normalised only for a trailing separator. Symlinks, case
  sensitivity and home-directory expansion are real complications on macOS, and inventing a
  resolution model that disagrees with the shell would be worse than matching what the hook
  reported.
- This makes the workspace's folder convention load-bearing rather than merely tidy.
  Reorganising `clients/`, `personal/` or `business/` now silently changes attribution for
  every session recorded before the move. Worth stating in the workspace instructions.
- Surfacing unattributed paths is part of the design, not a nicety. Attribution that quietly
  covers most of the time is worse than one that covers most of it and says which part it
  missed.
