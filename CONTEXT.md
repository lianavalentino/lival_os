# LIVAL OS

A private, single-user operating system holding the working state of one person's life:
client delivery, a consulting business, personal builds, a job search, and life admin. It
exists to shorten the distance between having a thought and having that thought recorded
somewhere that will resurface it.

This file is the only glossary. PRD §20 points here.

## Structure

**Area**:
A top-level life domain. There are exactly five: Consulting, VI, Personal Projects, Job
Search, Life Admin.
_Avoid_: Category, bucket, section, pillar

**VI**:
Valentino Intelligence LLC — the consulting business as an entity, distinct from the client
work it delivers. A sibling of Consulting, never nested inside it.
_Avoid_: The business, the company, the LLC

**Workspace**:
A client, initiative, or sub-domain inside an Area. Real in the schema and in navigation,
never required at capture time.
_Avoid_: Team, folder, group

**Project**:
A bounded body of work with a goal and a target date. Optional — a Task may hang directly
off a Workspace or an Area.
_Avoid_: Epic, initiative, milestone

**Task**:
A discrete action item.
_Avoid_: Ticket, story, issue, card

**Ticket**:
A unit of build work on LIVAL OS itself, tracked as a GitHub issue. Deliberately a different
word from Task — a Task is content *inside* the product, a Ticket is work *on* it.

## Capture

**Capture**:
The act of recording a thought before deciding anything about it. Succeeds or fails on
elapsed seconds; one required field is the ceiling.

**Capture Path**:
One route by which a thought reaches the Inbox. Several exist in parallel; each is a
producer against the same bearer-gated endpoint.

**Inbox Item**:
Anything captured, awaiting triage. The universal landing place — every Capture Path
terminates here.
_Avoid_: Capture (the noun), message, entry

**Triage**:
Deciding what an Inbox Item becomes — a Task, a Project, a Resource, or nothing. Happens in
the Inbox view and nowhere else.

**Quick Capture**:
The sidebar's always-visible add actions. The in-app Capture Path.

**Brain Dump**:
A low-pressure capture — an idea, a thought, a someday item. Succeeds when it converts to a
Task and disappears.
_Avoid_: Note, memo, scratch

**Resource**:
A saved link or reference. Succeeds when it is still findable in six months — the opposite
lifecycle to a Brain Dump, which is why the two stay separate tables.
_Avoid_: Bookmark, link, asset

**Brain**:
The merged view over Brain Dumps and Resources. Tabs, not tables.

## Review

**Weekly Snapshot**:
One archived week of report state, keyed to the week's Monday. Written by the Friday review.
_Avoid_: Report, digest, summary

**Win Log**:
The week's completed work, derived rather than maintained.
_Avoid_: Changelog, accomplishments list

**Momentum Score**:
Tasks closed this week over tasks planned this week, as a percentage, Backlog excluded.
Scoped to the week — a lifetime ratio is a different and meaningless number.

**Open Loop**:
An unresolved commitment, surfaced on the Weekly view.

## Operating concepts

**Ship line**:
The point at which building stops and daily use starts. A set of conditions, not a date.

**Producer**:
Any external system that writes into LIVAL OS through an ingestion endpoint. Producers are
never authoritative and never read application state back.

**System of record**:
Supabase Postgres, exclusively. No markdown file, no spreadsheet, and no Notion database
ever holds authoritative state.

**Silent failure**:
A scheduled job that stops working without saying so. Treated as a defect of the highest
severity — this has already cost six weeks once.
