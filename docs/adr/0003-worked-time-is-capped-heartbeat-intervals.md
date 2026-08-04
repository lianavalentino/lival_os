# Worked time is accumulated capped intervals, not session start minus session end

Tracked time is measured by accumulating the gaps between turn-completion events, with each
gap capped at fifteen minutes, rather than by subtracting a session's start timestamp from its
end timestamp.

Decided 2026-08-04.

## Why

The subtraction approach produced fiction. Across 41 recorded Claude Code sessions the average
entry was 748 minutes, nineteen exceeded eight hours, four exceeded twenty-four, and the
largest was 5,904 minutes — four days attributed to one sitting. 511 hours stood in the table.
A terminal left open overnight billed the night, and nothing in the app made that visible.

The cap is what makes the number defensible. Reading, thinking and waiting on a build are real
work and count in full; a lunch break costs fifteen minutes; an abandoned session accrues one
interval and stops. Fifteen was chosen over five because five undercounts the parts of the work
that are not typing, and those are not the cheap parts.

## The constraint that forced it, and the coverage it bought

Codex exposes no session-end event — its hook vocabulary is session start, prompt submission,
pre-tool, post-tool, and turn stop. Subtracting endpoints is therefore not merely worse there,
it is impossible, which is why Codex had never been tracked at all despite the schema
permitting it and the documentation claiming it.

Both tools emit a turn-completion event. So the measurement that fixes the inflation is also
the only measurement that covers both tools, and it removes the need for a second, Codex-only
definition of an hour.

## Consequences

- The ingestion endpoint must **update** an existing entry's duration rather than returning it
  untouched. It previously looked the session reference up and left the row alone — correct for
  a fire-once producer, wrong for a heartbeat.
- Durations only ever move upward for a given session. A spooled beat replayed after a later
  beat already landed must not lower a stored duration.
- Session end stops being the moment of truth. A session that crashes, or whose laptop closes,
  still has an accurate record up to its last sign of life — strictly better than before, where
  a missing end event meant no record at all.
- The 511 existing hours are unrecoverable. There is no record of activity inside those
  sessions, so nothing can reconstruct what they were really worth. They are flagged unreliable
  and excluded from reports by default rather than deleted — the work happened, only the
  durations are wrong.
- Fifteen minutes is a guess made without data. It lives as one named constant so that
  revisiting it, once there is a few honest weeks to revisit it against, is one edit.
