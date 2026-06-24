# ingest-file-change Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.
>
> **Note:** written retroactively — every step below was already executed inline on 2026-06-23 (commit `501b1e2`). Checkboxes are marked `[x]` to reflect actual state, not as a template for re-execution.

**Goal:** Add `ingest-file-change`, a third Supabase Edge Function, so external producers can write `file_changes` rows using the existing bearer-secret + service-role pattern.

**Architecture:** Same shape as `ingest-time-entry`/`ingest-quick-capture`: a pure `handler.ts` (Zod schema, row mapper, DB-interface-injected handler) plus a thin `index.ts` that wires a real service-role client. No idempotency layer — `file_changes` has no unique constraint to dedupe against.

**Tech Stack:** Supabase Edge Functions (Deno), `@supabase/supabase-js@2` (`npm:` specifier), `zod` (`npm:` specifier), `@std/assert` (`jsr:` specifier). Same `supabase/functions/_shared/*` helpers as the other two endpoints.

## Global Constraints

- Target table already exists (migration 002, `file_changes`). **No new migration.**
- `file_changes.change_type` CHECK allows only: `created`, `modified`, `deleted`, `renamed`, or `NULL`.
- Auth model: shared secret `LIVAL_INGEST_SECRET` sent as `Authorization: Bearer <secret>`; reject before any DB access (reuse `_shared/auth.ts`).
- `user_id` on every inserted row = `LIVAL_USER_ID` (reuse `_shared/env.ts`).
- Deploy with `--no-verify-jwt` (bearer secret is the only gate, matching the other two functions).
- No idempotency key — every valid request inserts a new row.

---

### Task 1: Handler + tests

**Files:**
- Create: `supabase/functions/ingest-file-change/handler.ts`
- Create: `supabase/functions/ingest-file-change/index.ts`
- Create: `supabase/functions/ingest-file-change/handler_test.ts`

**Interfaces:**
- Consumes: `verifyBearer(authHeader, secret)` from `_shared/auth.ts`; `handlePreflight(req)` / `jsonResponse(body, status)` from `_shared/cors.ts`; `readEnv(get)` from `_shared/env.ts`; `createServiceClient(url, key)` from `_shared/supabase.ts`.
- Produces: `fileChangeSchema` (Zod), `toFileChangeRow(input, userId): FileChangeRow`, `createFileChangeHandler(deps: FileChangeDeps): (req: Request) => Promise<Response>`, where `FileChangeDeps = { secret: string; userId: string; db: { insertFileChange(row: FileChangeRow): Promise<{ id: string }> } }`.

- [x] **Step 1: Write the failing tests**

```typescript
// supabase/functions/ingest-file-change/handler_test.ts
import { assertEquals } from "jsr:@std/assert";
import {
  createFileChangeHandler,
  toFileChangeRow,
  fileChangeSchema,
  type FileChangeRow,
} from "./handler.ts";

const SECRET = "test-secret";
const USER = "user-123";
const VALID = { file_path: "src/App.tsx" };

function post(body: unknown, auth = `Bearer ${SECRET}`) {
  return new Request("http://x", {
    method: "POST",
    headers: { authorization: auth, "content-type": "application/json" },
    body: JSON.stringify(body),
  });
}

function fakeDb() {
  const inserted: FileChangeRow[] = [];
  return {
    inserted,
    insertFileChange(row: FileChangeRow) {
      inserted.push(row);
      return Promise.resolve({ id: "fc-new" });
    },
  };
}

Deno.test("toFileChangeRow: defaults source to claude_code, nulls optionals, empty metadata", () => {
  const row = toFileChangeRow(fileChangeSchema.parse(VALID), USER);
  assertEquals(row, {
    user_id: USER,
    file_path: "src/App.tsx",
    change_type: null,
    project_id: null,
    task_id: null,
    repo_path: null,
    github_url: null,
    summary: null,
    source: "claude_code",
    metadata: {},
  });
});

Deno.test("handler: 401 on wrong secret", async () => {
  const res = await createFileChangeHandler({ secret: SECRET, userId: USER, db: fakeDb() })(
    post(VALID, "Bearer nope"),
  );
  assertEquals(res.status, 401);
});

Deno.test("handler: 400 on missing file_path", async () => {
  const res = await createFileChangeHandler({ secret: SECRET, userId: USER, db: fakeDb() })(
    post({}),
  );
  assertEquals(res.status, 400);
});

Deno.test("handler: 400 on invalid change_type", async () => {
  const res = await createFileChangeHandler({ secret: SECRET, userId: USER, db: fakeDb() })(
    post({ ...VALID, change_type: "edited" }),
  );
  assertEquals(res.status, 400);
});

Deno.test("handler: 201 inserts with defaults", async () => {
  const db = fakeDb();
  const res = await createFileChangeHandler({ secret: SECRET, userId: USER, db })(post(VALID));
  assertEquals(res.status, 201);
  assertEquals(await res.json(), { id: "fc-new" });
  assertEquals(db.inserted.length, 1);
});

Deno.test("handler: 201 carries through optional fields", async () => {
  const db = fakeDb();
  const full = {
    ...VALID,
    change_type: "modified",
    project_id: "11111111-1111-1111-1111-111111111111",
    task_id: "22222222-2222-2222-2222-222222222222",
    repo_path: "/Users/liana/Documents/LianaOS",
    github_url: "https://github.com/lianavalentino/lival-os/commit/abc123",
    summary: "Extracted components from App.tsx",
    source: "claude_code_hook",
    metadata: { lines_added: 50, lines_removed: 30 },
  };
  const res = await createFileChangeHandler({ secret: SECRET, userId: USER, db })(post(full));
  assertEquals(res.status, 201);
  assertEquals(db.inserted[0].change_type, "modified");
  assertEquals(db.inserted[0].source, "claude_code_hook");
  assertEquals(db.inserted[0].metadata, { lines_added: 50, lines_removed: 30 });
});
```

- [x] **Step 2: Run tests to verify they fail**

Run: `cd supabase/functions && deno test --allow-env --allow-net ingest-file-change/`
Expected: FAIL — `handler.ts` does not exist yet.

- [x] **Step 3: Write the handler**

```typescript
// supabase/functions/ingest-file-change/handler.ts
import { z } from "npm:zod@3";
import { verifyBearer } from "../_shared/auth.ts";
import { handlePreflight, jsonResponse } from "../_shared/cors.ts";

export const fileChangeSchema = z.object({
  file_path: z.string().min(1),
  change_type: z.enum(["created", "modified", "deleted", "renamed"]).optional(),
  project_id: z.string().uuid().optional(),
  task_id: z.string().uuid().optional(),
  repo_path: z.string().optional(),
  github_url: z.string().optional(),
  summary: z.string().optional(),
  source: z.string().default("claude_code"),
  metadata: z.record(z.unknown()).default({}),
});

export type FileChangeInput = z.infer<typeof fileChangeSchema>;

export interface FileChangeRow {
  user_id: string;
  file_path: string;
  change_type: string | null;
  project_id: string | null;
  task_id: string | null;
  repo_path: string | null;
  github_url: string | null;
  summary: string | null;
  source: string;
  metadata: Record<string, unknown>;
}

export function toFileChangeRow(input: FileChangeInput, userId: string): FileChangeRow {
  return {
    user_id: userId,
    file_path: input.file_path,
    change_type: input.change_type ?? null,
    project_id: input.project_id ?? null,
    task_id: input.task_id ?? null,
    repo_path: input.repo_path ?? null,
    github_url: input.github_url ?? null,
    summary: input.summary ?? null,
    source: input.source,
    metadata: input.metadata,
  };
}

export interface FileChangeDb {
  insertFileChange(row: FileChangeRow): Promise<{ id: string }>;
}

export interface FileChangeDeps {
  secret: string;
  userId: string;
  db: FileChangeDb;
}

export function createFileChangeHandler(deps: FileChangeDeps) {
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
    const parsed = fileChangeSchema.safeParse(json);
    if (!parsed.success) {
      return jsonResponse({ error: "validation", issues: parsed.error.issues }, 400);
    }
    try {
      const result = await deps.db.insertFileChange(toFileChangeRow(parsed.data, deps.userId));
      return jsonResponse({ id: result.id }, 201);
    } catch (e) {
      console.error("ingest-file-change insert failed:", e);
      return jsonResponse({ error: "internal" }, 500);
    }
  };
}
```

- [x] **Step 4: Write the live wiring**

```typescript
// supabase/functions/ingest-file-change/index.ts
import { createFileChangeHandler, type FileChangeRow } from "./handler.ts";
import { readEnv } from "../_shared/env.ts";
import { createServiceClient } from "../_shared/supabase.ts";

const env = readEnv((k) => Deno.env.get(k));
const client = createServiceClient(env.supabaseUrl, env.serviceRoleKey);

const handler = createFileChangeHandler({
  secret: env.secret,
  userId: env.userId,
  db: {
    async insertFileChange(row: FileChangeRow) {
      const { data, error } = await client
        .from("file_changes")
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

- [x] **Step 5: Run tests to verify they pass**

Run: `cd supabase/functions && deno test --allow-env --allow-net`
Expected: `ok | 28 passed | 0 failed` (22 pre-existing + 6 new).

- [x] **Step 6: Commit**

```bash
git add supabase/functions/ingest-file-change/
git commit -m "feat: add ingest-file-change edge function"
```

---

### Task 2: Deploy, verify live, document

**Files:**
- Modify: `docs/ingestion/README.md` (add `ingest-file-change` section)
- Modify: `CLAUDE.md` (state section)
- Modify: `docs/superpowers/kanban.html` (3-3 → done)

**Interfaces:**
- Consumes: deployed function from Task 1.
- Produces: a live, curl-verified endpoint and synced docs.

- [x] **Step 1: Deploy**

Run:
```bash
supabase functions deploy ingest-file-change --no-verify-jwt
```
Expected: `Deployed Functions on project mfcdzgkhmzppfctdzhwy: ingest-file-change`.

- [x] **Step 2: Live-verify with curl**

Run:
```bash
cd supabase/functions && set -a && source .env.local && set +a && curl -s -w "\nHTTP %{http_code}\n" -X POST \
  "$SUPABASE_URL/functions/v1/ingest-file-change" \
  -H "Authorization: Bearer $LIVAL_INGEST_SECRET" \
  -H "Content-Type: application/json" \
  -d '{"file_path":"docs/superpowers/kanban.html","change_type":"modified","source":"claude_code","summary":"live-verify ingest-file-change deploy"}'
```
Expected: `{"id":"<uuid>"}` then `HTTP 201`.

- [x] **Step 3: Delete the verification row**

Run (substitute the `id` from Step 2):
```bash
curl -s -w "\nHTTP %{http_code}\n" -X DELETE \
  "$SUPABASE_URL/rest/v1/file_changes?id=eq.<id>" \
  -H "Authorization: Bearer $SUPABASE_SERVICE_ROLE_KEY" \
  -H "apikey: $SUPABASE_SERVICE_ROLE_KEY"
```
Expected: `HTTP 204`.

- [x] **Step 4: Document the endpoint**

Add an `## ingest-file-change → File changes` section to
`docs/ingestion/README.md` with a curl example and the field list
(`file_path` required; optional `change_type`, `project_id`, `task_id`,
`repo_path`, `github_url`, `summary`, `source`, `metadata`); note there is
no idempotency key.

- [x] **Step 5: Update CLAUDE.md state**

Replace the Phase 3 state paragraph's "Deferred: file-change/activity-event"
line with a dedicated `ingest-file-change` line noting it's deployed,
live-verified, and what's still deferred (`activity-event`, `automation_runs`,
n8n).

- [x] **Step 6: Update kanban**

In `docs/superpowers/kanban.html`, set task `3-3` to
`status: 'done'` with a note recording the deploy + test count.

- [x] **Step 7: Commit**

```bash
git add CLAUDE.md docs/ingestion/README.md docs/superpowers/kanban.html
git commit -m "docs: sync ingest-file-change deploy state"
```

(In actual execution, Task 1 and Task 2's doc/commit steps were combined into
a single commit, `501b1e2` — noted here for accuracy, not prescribed for
future replays of this plan.)
