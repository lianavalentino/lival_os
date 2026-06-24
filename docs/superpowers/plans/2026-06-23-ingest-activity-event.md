# ingest-activity-event Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add `ingest-activity-event`, a fourth Supabase Edge Function, so external producers can write `activity_events` rows using the existing bearer-secret + service-role pattern.

**Architecture:** Same shape as `ingest-file-change`/`ingest-time-entry`/`ingest-quick-capture`: a pure `handler.ts` (Zod schema, row mapper, DB-interface-injected handler) plus a thin `index.ts` that wires a real service-role client. No idempotency layer — `activity_events` has no unique constraint to dedupe against.

**Tech Stack:** Supabase Edge Functions (Deno), `@supabase/supabase-js@2` (`npm:` specifier), `zod` (`npm:` specifier), `@std/assert` (`jsr:` specifier). Same `supabase/functions/_shared/*` helpers as the other three endpoints.

## Global Constraints

- Target table already exists (migration 001, `activity_events`, lines 177-187). **No new migration.**
- `activity_events.entity_type`, `event_type`, `message` are `not null` text columns with **no CHECK constraint** — validate only "non-empty string" in Zod, do not invent an enum.
- Auth model: shared secret `LIVAL_INGEST_SECRET` sent as `Authorization: Bearer <secret>`; reject before any DB access (reuse `_shared/auth.ts`).
- `user_id` on every inserted row = `LIVAL_USER_ID` (reuse `_shared/env.ts`).
- Deploy with `--no-verify-jwt` (bearer secret is the only gate, matching the other three functions).
- No idempotency key — every valid request inserts a new row.

---

### Task 1: Handler + tests

**Files:**
- Create: `supabase/functions/ingest-activity-event/handler.ts`
- Create: `supabase/functions/ingest-activity-event/index.ts`
- Create: `supabase/functions/ingest-activity-event/handler_test.ts`

**Interfaces:**
- Consumes: `verifyBearer(authHeader, secret)` from `_shared/auth.ts`; `handlePreflight(req)` / `jsonResponse(body, status)` from `_shared/cors.ts`; `readEnv(get)` from `_shared/env.ts`; `createServiceClient(url, key)` from `_shared/supabase.ts`.
- Produces: `activityEventSchema` (Zod), `toActivityEventRow(input, userId): ActivityEventRow`, `createActivityEventHandler(deps: ActivityEventDeps): (req: Request) => Promise<Response>`, where `ActivityEventDeps = { secret: string; userId: string; db: { insertActivityEvent(row: ActivityEventRow): Promise<{ id: string }> } }`.

- [ ] **Step 1: Write the failing tests**

```typescript
// supabase/functions/ingest-activity-event/handler_test.ts
import { assertEquals } from "jsr:@std/assert";
import {
  createActivityEventHandler,
  toActivityEventRow,
  activityEventSchema,
  type ActivityEventRow,
} from "./handler.ts";

const SECRET = "test-secret";
const USER = "user-123";
const VALID = { entity_type: "task", event_type: "status_changed", message: "Task moved to Done" };

function post(body: unknown, auth = `Bearer ${SECRET}`) {
  return new Request("http://x", {
    method: "POST",
    headers: { authorization: auth, "content-type": "application/json" },
    body: JSON.stringify(body),
  });
}

function fakeDb() {
  const inserted: ActivityEventRow[] = [];
  return {
    inserted,
    insertActivityEvent(row: ActivityEventRow) {
      inserted.push(row);
      return Promise.resolve({ id: "ae-new" });
    },
  };
}

Deno.test("toActivityEventRow: nulls entity_id, defaults metadata to {}", () => {
  const row = toActivityEventRow(activityEventSchema.parse(VALID), USER);
  assertEquals(row, {
    user_id: USER,
    entity_type: "task",
    entity_id: null,
    event_type: "status_changed",
    message: "Task moved to Done",
    metadata: {},
  });
});

Deno.test("handler: 401 on wrong secret", async () => {
  const res = await createActivityEventHandler({ secret: SECRET, userId: USER, db: fakeDb() })(
    post(VALID, "Bearer nope"),
  );
  assertEquals(res.status, 401);
});

Deno.test("handler: 400 on missing message", () => {
  return createActivityEventHandler({ secret: SECRET, userId: USER, db: fakeDb() })(
    post({ entity_type: "task", event_type: "status_changed" }),
  ).then((res) => {
    assertEquals(res.status, 400);
  });
});

Deno.test("handler: 400 on empty entity_type", async () => {
  const res = await createActivityEventHandler({ secret: SECRET, userId: USER, db: fakeDb() })(
    post({ ...VALID, entity_type: "" }),
  );
  assertEquals(res.status, 400);
});

Deno.test("handler: 201 inserts with defaults", async () => {
  const db = fakeDb();
  const res = await createActivityEventHandler({ secret: SECRET, userId: USER, db })(post(VALID));
  assertEquals(res.status, 201);
  assertEquals(await res.json(), { id: "ae-new" });
  assertEquals(db.inserted.length, 1);
});

Deno.test("handler: 201 carries through entity_id and metadata", async () => {
  const db = fakeDb();
  const full = {
    ...VALID,
    entity_id: "11111111-1111-1111-1111-111111111111",
    metadata: { from_status: "in_progress", to_status: "done" },
  };
  const res = await createActivityEventHandler({ secret: SECRET, userId: USER, db })(post(full));
  assertEquals(res.status, 201);
  assertEquals(db.inserted[0].entity_id, "11111111-1111-1111-1111-111111111111");
  assertEquals(db.inserted[0].metadata, { from_status: "in_progress", to_status: "done" });
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run:
```bash
cd supabase/functions && deno test --allow-env --allow-net ingest-activity-event/handler_test.ts
```
Expected: FAIL — `./handler.ts` does not exist yet (module not found).

- [ ] **Step 3: Write the handler**

```typescript
// supabase/functions/ingest-activity-event/handler.ts
import { z } from "npm:zod@3";
import { verifyBearer } from "../_shared/auth.ts";
import { handlePreflight, jsonResponse } from "../_shared/cors.ts";

export const activityEventSchema = z.object({
  entity_type: z.string().min(1),
  event_type: z.string().min(1),
  message: z.string().min(1),
  entity_id: z.string().uuid().optional(),
  metadata: z.record(z.unknown()).default({}),
});

export type ActivityEventInput = z.infer<typeof activityEventSchema>;

export interface ActivityEventRow {
  user_id: string;
  entity_type: string;
  entity_id: string | null;
  event_type: string;
  message: string;
  metadata: Record<string, unknown>;
}

export function toActivityEventRow(input: ActivityEventInput, userId: string): ActivityEventRow {
  return {
    user_id: userId,
    entity_type: input.entity_type,
    entity_id: input.entity_id ?? null,
    event_type: input.event_type,
    message: input.message,
    metadata: input.metadata,
  };
}

export interface ActivityEventDb {
  insertActivityEvent(row: ActivityEventRow): Promise<{ id: string }>;
}

export interface ActivityEventDeps {
  secret: string;
  userId: string;
  db: ActivityEventDb;
}

export function createActivityEventHandler(deps: ActivityEventDeps) {
  return async (req: Request): Promise<Response> => {
    const pre = handlePreflight(req);
    if (pre) return pre;
    if (req.method !== "POST") return jsonResponse({ error: "method_not_allowed" }, 405);
    if (!verifyBearer(req.headers.get("authorization"), deps.secret)) {
      return jsonResponse({ error: "unauthorized" }, 401);
    }
    let json: unknown;
    try {
      json = await req.json();
    } catch {
      return jsonResponse({ error: "validation", issues: ["invalid JSON body"] }, 400);
    }
    const parsed = activityEventSchema.safeParse(json);
    if (!parsed.success) {
      return jsonResponse({ error: "validation", issues: parsed.error.issues }, 400);
    }
    try {
      const result = await deps.db.insertActivityEvent(toActivityEventRow(parsed.data, deps.userId));
      return jsonResponse({ id: result.id }, 201);
    } catch (e) {
      console.error("ingest-activity-event insert failed:", e);
      return jsonResponse({ error: "internal" }, 500);
    }
  };
}
```

- [ ] **Step 4: Write the live wiring**

```typescript
// supabase/functions/ingest-activity-event/index.ts
import { createActivityEventHandler, type ActivityEventRow } from "./handler.ts";
import { readEnv } from "../_shared/env.ts";
import { createServiceClient } from "../_shared/supabase.ts";

const env = readEnv((k) => Deno.env.get(k));
const client = createServiceClient(env.supabaseUrl, env.serviceRoleKey);

const handler = createActivityEventHandler({
  secret: env.secret,
  userId: env.userId,
  db: {
    async insertActivityEvent(row: ActivityEventRow) {
      const { data, error } = await client
        .from("activity_events")
        .insert(row)
        .select("id")
        .single();
      if (error) throw error;
      return { id: data.id as string };
    },
  },
});

Deno.serve(handler);
```

- [ ] **Step 5: Run tests to verify they pass**

Run:
```bash
cd supabase/functions && deno test --allow-env --allow-net ingest-activity-event/handler_test.ts
```
Expected: PASS — 6 tests green.

- [ ] **Step 6: Commit**

```bash
git add supabase/functions/ingest-activity-event/
git commit -m "feat: add ingest-activity-event edge function"
```

---

### Task 2: Deploy, verify live, document

**Files:**
- Modify: `docs/ingestion/README.md` (add endpoint section)
- Modify: `CLAUDE.md` (state section)
- Modify: `docs/superpowers/kanban.html` (flip item `3-4` to done)

**Interfaces:**
- Consumes: deployed `ingest-activity-event` function from Task 1; `LIVAL_INGEST_SECRET` / `LIVAL_USER_ID` already set as Supabase secrets (used by the other three functions — no new secret needed).

- [ ] **Step 1: Deploy**

```bash
supabase functions deploy ingest-activity-event --no-verify-jwt
```
Expected: deploy succeeds, function listed in Supabase dashboard → Edge Functions.

- [ ] **Step 2: Live-verify with curl**

```bash
curl -s -X POST \
  https://mfcdzgkhmzppfctdzhwy.supabase.co/functions/v1/ingest-activity-event \
  -H "Authorization: Bearer $LIVAL_INGEST_SECRET" \
  -H "Content-Type: application/json" \
  -d '{"entity_type":"task","event_type":"status_changed","message":"verification ping"}'
```
Expected: `201` with body `{"id":"<uuid>"}`.

- [ ] **Step 3: Delete the verification row**

Via Supabase SQL editor or dashboard table view, delete the row whose `id` matches the response from Step 2 (`delete from activity_events where id = '<uuid>';`). No standing test data in a personal-use table.

- [ ] **Step 4: Document the endpoint**

Add to `docs/ingestion/README.md`, after the `ingest-file-change` section (after line 58):

```markdown
## ingest-activity-event → Activity events

```bash
curl -X POST \
  https://mfcdzgkhmzppfctdzhwy.supabase.co/functions/v1/ingest-activity-event \
  -H "Authorization: Bearer $LIVAL_INGEST_SECRET" \
  -H "Content-Type: application/json" \
  -d '{"entity_type":"task","event_type":"status_changed","message":"Task moved to Done"}'
```

Fields: `entity_type`, `event_type`, `message` (all required, free text — no
enum); optional `entity_id` (uuid), `metadata` (arbitrary JSON object,
default `{}`). No idempotency key — `activity_events` has no unique
constraint, so re-posting inserts a new row.
```

(Also bump the "Three Supabase Edge Functions" count in the intro paragraph at line 3 to "Four".)

- [ ] **Step 5: Update CLAUDE.md state**

Append a bullet to the `## State` section recording the new deployed function, mirroring the existing `ingest-file-change` bullet:

```markdown
- `ingest-activity-event` (→`activity_events`) — DEPLOYED 2026-06-23 (`--no-verify-jwt`), live-verified (201 insert). Same bearer/service-role pattern; no idempotency key (`activity_events` has no unique constraint). Fields documented in `docs/ingestion/README.md`. Closes Phase 3 ingestion scope except `automation_runs` logging and n8n wiring.
```

- [ ] **Step 6: Update kanban**

In `docs/superpowers/kanban.html`, change item `3-4` from:
```javascript
{ id: '3-4', title: 'Edge function: activity-event', status: 'todo', notes: 'Deferred. Not started — no folder under supabase/functions/.' },
```
to:
```javascript
{ id: '3-4', title: 'Edge function: activity-event', status: 'done', notes: 'Deployed 2026-06-23, --no-verify-jwt, bearer-gated. 6/6 Deno tests pass; live-verified (201 insert).' },
```

- [ ] **Step 7: Commit**

```bash
git add docs/ingestion/README.md CLAUDE.md docs/superpowers/kanban.html
git commit -m "docs: document ingest-activity-event endpoint, mark kanban 3-4 done"
```
