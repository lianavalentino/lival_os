# n8n Gmail Capture Workflow Implementation Plan

> **HISTORICAL — do not edit.** This is a dated decision record from the date above.
> It describes what was decided and built *then*, not what is true now. It is kept
> unmodified on purpose. For current scope see [`PRD.md`](../../../PRD.md); for current
> build state see [`CLAUDE.md`](../../../CLAUDE.md).

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Let n8n watch Gmail, use Claude Haiku to judge importance and suggest an Area/Workspace/Project, and capture important emails into LIVAL OS's `inbox_items` via the existing `ingest-quick-capture` edge function.

**Architecture:** One code change (`ingest-quick-capture` gains four optional routing fields) plus one n8n workflow (Gmail Trigger → static routing-list Code node → Claude Haiku HTTP Request → IF importance gate → POST to `ingest-quick-capture` + Gmail label/mark-read). No new edge function, no new tables, no service-role key leaves Supabase.

**Tech Stack:** Deno (Supabase Edge Function), Zod, `jsr:@std/assert` for tests, n8n (self-hosted, localhost:5678), Anthropic Messages API (`claude-haiku-4-5`).

## Global Constraints

- Spec of record: `docs/superpowers/specs/2026-06-24-n8n-gmail-capture-design.md` (v3, commit `469d2fd`). Every task below traces to a numbered section there.
- No service-role key ever goes into n8n. n8n only ever gets the bearer secret (`LIVAL_INGEST_SECRET`) and the Anthropic API key.
- `confidence` and the three `suggested_*` fields are **omitted from the request body when null**, never sent as JSON `null` — the Zod schema uses `.optional()` (not `.nullable()`), matching the existing `body`/`source_url` pattern. Get this wrong in the n8n HTTP node and every "no routing match" email will 400.
- Static routing list values below are **real, live Supabase data** (fetched via service-role REST read on 2026-06-24), not placeholders. If areas/projects change before this plan is executed, re-fetch before pasting into the n8n Code node:
  ```bash
  set -a && source supabase/functions/.env.local && set +a
  curl -s "$SUPABASE_URL/rest/v1/areas?select=id,name&order=name" -H "apikey: $SUPABASE_SERVICE_ROLE_KEY" -H "Authorization: Bearer $SUPABASE_SERVICE_ROLE_KEY"
  ```
- Branch policy: this is a single small edge-function change with low blast radius (per [[feedback_branch_policy]]-style sizing already used for `ingest-file-change`/`ingest-activity-event`) — direct to `main`, no PR.
- Never activate the n8n workflow without the user's explicit confirmation after a manual test run (spec section 7, step 4). This is a hard stop, not a suggestion.

---

### Task 1: Add routing fields to `ingest-quick-capture`

**Files:**
- Modify: `supabase/functions/ingest-quick-capture/handler.ts`
- Modify: `supabase/functions/ingest-quick-capture/handler_test.ts`

**Interfaces:**
- Consumes: nothing new — extends the existing `quickCaptureSchema`, `InboxRow`, `toInboxRow`, `createQuickCaptureHandler` already in `handler.ts`.
- Produces: `InboxRow` now carries `suggested_area_id: string | null`, `suggested_workspace_id: string | null`, `suggested_project_id: string | null`, `confidence: number | null`. Task 2's curl verification and Task 3's n8n POST node both rely on these exact field names and on them being **omitted from the request**, not sent as `null`, when the producer has no value.

- [ ] **Step 1: Write the failing/updated tests**

Replace `supabase/functions/ingest-quick-capture/handler_test.ts` in full with:

```ts
import { assertEquals } from "jsr:@std/assert";
import { createQuickCaptureHandler, toInboxRow, quickCaptureSchema, type InboxRow } from "./handler.ts";

const SECRET = "test-secret";
const USER = "user-123";

function fakeDb(captured: InboxRow[]) {
  return {
    insertInboxItem(row: InboxRow) {
      captured.push(row);
      return Promise.resolve({ id: "inbox-1", status: row.status });
    },
  };
}

function post(body: unknown, auth = `Bearer ${SECRET}`) {
  return new Request("http://x", {
    method: "POST",
    headers: { authorization: auth, "content-type": "application/json" },
    body: JSON.stringify(body),
  });
}

Deno.test("toInboxRow: applies defaults and status new", () => {
  const row = toInboxRow(quickCaptureSchema.parse({ title: "Hi" }), USER);
  assertEquals(row, {
    user_id: USER,
    title: "Hi",
    body: null,
    type: "note",
    source: "shortcut",
    source_url: null,
    suggested_area_id: null,
    suggested_workspace_id: null,
    suggested_project_id: null,
    confidence: null,
    status: "new",
  });
});

Deno.test("toInboxRow: maps suggested_* fields and confidence when provided", () => {
  const row = toInboxRow(
    quickCaptureSchema.parse({
      title: "Client email",
      suggested_area_id: "c920c2a8-b910-46e6-b9d6-9c10e6e56389",
      suggested_workspace_id: "d47bf23f-c8b0-4861-849d-e4d5dd8d72cb",
      suggested_project_id: "3f23f3b3-2637-4a50-a074-9ed18333fe87",
      confidence: 0.92,
    }),
    USER,
  );
  assertEquals(row.suggested_area_id, "c920c2a8-b910-46e6-b9d6-9c10e6e56389");
  assertEquals(row.suggested_workspace_id, "d47bf23f-c8b0-4861-849d-e4d5dd8d72cb");
  assertEquals(row.suggested_project_id, "3f23f3b3-2637-4a50-a074-9ed18333fe87");
  assertEquals(row.confidence, 0.92);
});

Deno.test("handler: 401 on wrong secret", async () => {
  const handler = createQuickCaptureHandler({ secret: SECRET, userId: USER, db: fakeDb([]) });
  const res = await handler(post({ title: "Hi" }, "Bearer nope"));
  assertEquals(res.status, 401);
});

Deno.test("handler: 200 + CORS on OPTIONS preflight", async () => {
  const handler = createQuickCaptureHandler({ secret: SECRET, userId: USER, db: fakeDb([]) });
  const res = await handler(new Request("http://x", { method: "OPTIONS" }));
  assertEquals(res.status, 200);
});

Deno.test("handler: 400 on missing title", async () => {
  const handler = createQuickCaptureHandler({ secret: SECRET, userId: USER, db: fakeDb([]) });
  const res = await handler(post({ body: "no title" }));
  assertEquals(res.status, 400);
  assertEquals((await res.json()).error, "validation");
});

Deno.test("handler: 400 on invalid suggested_area_id (not a uuid)", async () => {
  const handler = createQuickCaptureHandler({ secret: SECRET, userId: USER, db: fakeDb([]) });
  const res = await handler(post({ title: "Hi", suggested_area_id: "not-a-uuid" }));
  assertEquals(res.status, 400);
  assertEquals((await res.json()).error, "validation");
});

Deno.test("handler: 201 inserts row with user_id and status new", async () => {
  const captured: InboxRow[] = [];
  const handler = createQuickCaptureHandler({ secret: SECRET, userId: USER, db: fakeDb(captured) });
  const res = await handler(post({ title: "Buy milk", type: "task" }));
  assertEquals(res.status, 201);
  assertEquals(await res.json(), { id: "inbox-1", status: "new" });
  assertEquals(captured[0].user_id, USER);
  assertEquals(captured[0].type, "task");
  assertEquals(captured[0].status, "new");
});

Deno.test("handler: 201 inserts row with suggested_* fields and confidence when provided", async () => {
  const captured: InboxRow[] = [];
  const handler = createQuickCaptureHandler({ secret: SECRET, userId: USER, db: fakeDb(captured) });
  const res = await handler(post({
    title: "Client renewal email",
    type: "email",
    suggested_area_id: "c920c2a8-b910-46e6-b9d6-9c10e6e56389",
    confidence: 0.8,
  }));
  assertEquals(res.status, 201);
  assertEquals(captured[0].suggested_area_id, "c920c2a8-b910-46e6-b9d6-9c10e6e56389");
  assertEquals(captured[0].suggested_workspace_id, null);
  assertEquals(captured[0].suggested_project_id, null);
  assertEquals(captured[0].confidence, 0.8);
});
```

- [ ] **Step 2: Run tests, verify the expected failures**

Run: `cd supabase/functions && deno test --allow-env --allow-net ingest-quick-capture/`

Expected: FAIL — the "applies defaults" test fails because `row` lacks the four new keys; the "maps suggested_*" and "201 inserts row with suggested_*" tests fail because `row.suggested_area_id` etc. are `undefined`; the "400 on invalid suggested_area_id" test fails because the schema doesn't yet validate that field (so the request 201s instead of 400ing).

- [ ] **Step 3: Implement the schema/type/mapping changes**

Replace `supabase/functions/ingest-quick-capture/handler.ts` in full with:

```ts
import { z } from "npm:zod@3";
import { verifyBearer } from "../_shared/auth.ts";
import { handlePreflight, jsonResponse } from "../_shared/cors.ts";

export const quickCaptureSchema = z.object({
  title: z.string().min(1),
  body: z.string().optional(),
  type: z.enum(["email", "appointment", "idea", "resource", "note", "task", "other"]).default("note"),
  source: z.string().default("shortcut"),
  source_url: z.string().optional(),
  received_at: z.string().datetime().optional(),
  suggested_area_id: z.string().uuid().optional(),
  suggested_workspace_id: z.string().uuid().optional(),
  suggested_project_id: z.string().uuid().optional(),
  confidence: z.number().min(0).max(1).optional(),
});

export type QuickCaptureInput = z.infer<typeof quickCaptureSchema>;

export interface InboxRow {
  user_id: string;
  title: string;
  body: string | null;
  type: string;
  source: string;
  source_url: string | null;
  received_at?: string;
  suggested_area_id: string | null;
  suggested_workspace_id: string | null;
  suggested_project_id: string | null;
  confidence: number | null;
  status: "new";
}

export function toInboxRow(input: QuickCaptureInput, userId: string): InboxRow {
  return {
    user_id: userId,
    title: input.title,
    body: input.body ?? null,
    type: input.type,
    source: input.source,
    source_url: input.source_url ?? null,
    ...(input.received_at ? { received_at: input.received_at } : {}),
    suggested_area_id: input.suggested_area_id ?? null,
    suggested_workspace_id: input.suggested_workspace_id ?? null,
    suggested_project_id: input.suggested_project_id ?? null,
    confidence: input.confidence ?? null,
    status: "new",
  };
}

export interface QuickCaptureDb {
  insertInboxItem(row: InboxRow): Promise<{ id: string; status: string }>;
}

export interface QuickCaptureDeps {
  secret: string;
  userId: string;
  db: QuickCaptureDb;
}

export function createQuickCaptureHandler(deps: QuickCaptureDeps) {
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
    const parsed = quickCaptureSchema.safeParse(json);
    if (!parsed.success) {
      return jsonResponse({ error: "validation", issues: parsed.error.issues }, 400);
    }
    try {
      const result = await deps.db.insertInboxItem(toInboxRow(parsed.data, deps.userId));
      return jsonResponse({ id: result.id, status: result.status }, 201);
    } catch (e) {
      console.error("ingest-quick-capture insert failed:", e);
      return jsonResponse({ error: "internal" }, 500);
    }
  };
}
```

- [ ] **Step 4: Run tests, verify they pass**

Run: `cd supabase/functions && deno test --allow-env --allow-net ingest-quick-capture/`

Expected: PASS — all 8 tests green (5 original behaviors + 3 new/extended).

- [ ] **Step 5: Commit**

```bash
git add supabase/functions/ingest-quick-capture/handler.ts supabase/functions/ingest-quick-capture/handler_test.ts
git commit -m "feat: add routing-suggestion fields to ingest-quick-capture"
```

---

### Task 2: Deploy, live-verify, document the field change, flip kanban 3-11

**Files:**
- Modify: `docs/ingestion/README.md:13-26` (the `ingest-quick-capture → Inbox` section)
- Modify: `docs/superpowers/kanban.html:391-402` (Phase 3 `tasks` array)

**Interfaces:**
- Consumes: the deployed Task 1 handler.
- Produces: nothing new consumed by later tasks — Task 3 only needs the deployed endpoint to already accept the four fields, which this task confirms live.

- [ ] **Step 1: Deploy**

Run: `cd /Users/liana/Documents/LianaOS && supabase functions deploy ingest-quick-capture --no-verify-jwt`

Expected: deploy succeeds (mirrors the deploy command already used for `ingest-file-change`/`ingest-activity-event`).

- [ ] **Step 2: Live-verify both the new fields and backward compatibility**

```bash
set -a && source supabase/functions/.env.local && set +a

curl -s -X POST \
  https://mfcdzgkhmzppfctdzhwy.supabase.co/functions/v1/ingest-quick-capture \
  -H "Authorization: Bearer $LIVAL_INGEST_SECRET" \
  -H "Content-Type: application/json" \
  -d '{"title":"DoD verify: routing fields","type":"email","source":"verify-3-11","suggested_area_id":"c920c2a8-b910-46e6-b9d6-9c10e6e56389","confidence":0.9}'

curl -s -X POST \
  https://mfcdzgkhmzppfctdzhwy.supabase.co/functions/v1/ingest-quick-capture \
  -H "Authorization: Bearer $LIVAL_INGEST_SECRET" \
  -H "Content-Type: application/json" \
  -d '{"title":"DoD verify: legacy no routing","type":"note","source":"verify-3-11"}'
```

Expected: both return `201` with a body shaped `{"id":"<uuid>","status":"new"}`.

- [ ] **Step 3: Confirm the inserted rows via service-role read**

```bash
set -a && source supabase/functions/.env.local && set +a
curl -s "$SUPABASE_URL/rest/v1/inbox_items?select=id,title,suggested_area_id,suggested_workspace_id,suggested_project_id,confidence&source=eq.verify-3-11" \
  -H "apikey: $SUPABASE_SERVICE_ROLE_KEY" -H "Authorization: Bearer $SUPABASE_SERVICE_ROLE_KEY" | python3 -m json.tool
```

Expected: two rows. The "routing fields" row has `suggested_area_id: "c920c2a8-b910-46e6-b9d6-9c10e6e56389"`, `confidence: 0.9`, and the other two suggestion fields `null`. The "legacy" row has all four fields `null`.

- [ ] **Step 4: Delete the verification rows (no standing test data)**

```bash
set -a && source supabase/functions/.env.local && set +a
curl -s -X DELETE "$SUPABASE_URL/rest/v1/inbox_items?source=eq.verify-3-11" \
  -H "apikey: $SUPABASE_SERVICE_ROLE_KEY" -H "Authorization: Bearer $SUPABASE_SERVICE_ROLE_KEY"
```

- [ ] **Step 5: Document the new optional fields**

In `docs/ingestion/README.md`, replace the line:

```
Fields: `title` (required); optional `body`, `type`
(`email|appointment|idea|resource|note|task|other`, default `note`),
`source` (default `shortcut`), `source_url`, `received_at` (ISO8601).
Row lands in the Inbox view with status `new`.
```

with:

```
Fields: `title` (required); optional `body`, `type`
(`email|appointment|idea|resource|note|task|other`, default `note`),
`source` (default `shortcut`), `source_url`, `received_at` (ISO8601),
`suggested_area_id`/`suggested_workspace_id`/`suggested_project_id` (uuid),
`confidence` (0–1). Row lands in the Inbox view with status `new`. Omit the
suggestion fields entirely when there's no routing guess — don't send
`null` (the schema treats them as optional, not nullable).
```

- [ ] **Step 6: Flip kanban task 3-11**

In `docs/superpowers/kanban.html`, change line 401 from:

```js
                    { id: '3-10', title: 'Apple Shortcut example', status: 'done', notes: 'Shortcut that POSTs time entries to endpoint.' }
```

to:

```js
                    { id: '3-10', title: 'Apple Shortcut example', status: 'done', notes: 'Shortcut that POSTs time entries to endpoint.' },
                    { id: '3-11', title: 'Modify ingest-quick-capture for routing suggestions', status: 'done', notes: 'Added suggested_area_id/workspace_id/project_id + confidence (optional, omitted-not-null). 8/8 Deno tests pass; live-verified.' }
```

- [ ] **Step 7: Commit**

```bash
git add docs/ingestion/README.md docs/superpowers/kanban.html
git commit -m "docs: document ingest-quick-capture routing fields, flip kanban 3-11"
```

---

### Task 3: Build, test, and activate the n8n Gmail capture workflow

**Files:**
- Create: `docs/ingestion/n8n-gmail-capture-workflow.json` (exported from n8n at the end of this task — not hand-authored)
- Modify: `docs/ingestion/README.md` (new "Producer: n8n Gmail capture" section, appended after the existing "Producer: Apple Shortcut" section)
- Modify: `docs/superpowers/kanban.html:391-403` (Phase 3 `tasks` array)

**Interfaces:**
- Consumes: the live `ingest-quick-capture` endpoint from Task 2 (with routing fields). Live Supabase routing data (re-fetch with the `Global Constraints` curl if you suspect it's stale; values below are current as of 2026-06-24).
- Produces: nothing consumed by later tasks — this is the last task in the plan.

n8n's own automation rules apply throughout (`~/Developer/_services/n8n/CLAUDE.md`): build inactive, test against real data, get explicit user confirmation, only then activate.

#### Step 1: Create n8n credentials

In n8n (`http://localhost:5678` → Credentials → Add Credential):

1. **Gmail** — type "Gmail OAuth2 API". Skip if a Gmail credential for `valentinoliana@gmail.com` already exists; otherwise authorize against that account.
2. **Anthropic API Key** — type "Header Auth". Header name: `x-api-key`. Header value: your Anthropic API key.
3. **LIVAL Ingest Secret** — type "Header Auth". Header name: `Authorization`. Header value: `Bearer <the LIVAL_INGEST_SECRET value from supabase/functions/.env.local>`.

- [ ] Mark done once all three credentials exist in n8n.

#### Step 2: Build the workflow

Create a new workflow named **"LIVAL OS — Gmail Capture"**, inactive. Add and wire these nodes in order:

**Node 1 — Gmail Trigger**
- Node type: Gmail Trigger.
- Credential: the Gmail credential from Step 1.
- Poll: Every Minute (default).
- Filters → "Search" (Gmail query): `is:unread`.
- Leave "Simplify" **off** — downstream expressions read the raw Gmail API message shape (`payload.headers`, `snippet`).

**Node 2 — Code: "Static Routing List"**
- Node type: Code. Mode: "Run Once for All Items".
- Paste this exact JS (real area/workspace/project ids, fetched live 2026-06-24):

```js
const routingList = {
  areas: [
    { id: "f9f526b1-4135-4f8c-a20f-e580436ebe53", name: "Build Lab" },
    { id: "c920c2a8-b910-46e6-b9d6-9c10e6e56389", name: "Consulting" },
    { id: "062d08f1-5258-4110-b31a-dea668930b7e", name: "Home Ops" },
    { id: "063c4c4a-3458-4110-b31a-deab243197ed", name: "Job Search" },
    { id: "524828e0-baef-4e1f-b9f8-85b3dbce7713", name: "Learning" },
    { id: "060e7bc7-1c58-4110-b31a-de9cef39246f", name: "Life Admin" },
  ],
  workspaces: [
    { id: "da9b540f-a153-4cdc-b34d-1d19feb1a99b", name: "Admin", area_id: "060e7bc7-1c58-4110-b31a-de9cef39246f" },
    { id: "a9df6f05-4ce1-4bd9-827a-553a7f7c12c3", name: "Applications", area_id: "063c4c4a-3458-4110-b31a-deab243197ed" },
    { id: "15dcaae9-01aa-430e-a17a-25a574e0d55b", name: "Emergent", area_id: "c920c2a8-b910-46e6-b9d6-9c10e6e56389" },
    { id: "d47bf23f-c8b0-4861-849d-e4d5dd8d72cb", name: "ETD", area_id: "c920c2a8-b910-46e6-b9d6-9c10e6e56389" },
    { id: "fb0769d0-1753-4cdc-b34d-24f55637f912", name: "LIVAL OS", area_id: "f9f526b1-4135-4f8c-a20f-e580436ebe53" },
  ],
  projects: [
    { id: "de7505b1-4729-47c5-b1b0-cc8290d8f6b6", name: "AI Ops Role Pipeline", workspace_id: "a9df6f05-4ce1-4bd9-827a-553a7f7c12c3" },
    { id: "bdcc5e8d-fd37-4a50-8608-bf899a15b954", name: "Content Automation Stack", workspace_id: "15dcaae9-01aa-430e-a17a-25a574e0d55b" },
    { id: "3f23f3b3-2637-4a50-a074-9ed18333fe87", name: "Enertia ROI Calculator", workspace_id: "d47bf23f-c8b0-4861-849d-e4d5dd8d72cb" },
    { id: "06e48672-cda1-4a51-9da8-606b532e7fe3", name: "LIVAL OS MVP", workspace_id: "fb0769d0-1753-4cdc-b34d-24f55637f912" },
  ],
};
return items.map(item => ({ json: { ...item.json, routingList } }));
```

**Node 3 — HTTP Request: "Classify + Route (Claude Haiku)"**
- Method: POST. URL: `https://api.anthropic.com/v1/messages`.
- Authentication: Generic Credential Type → Header Auth → the "Anthropic API Key" credential.
- Add header: `anthropic-version` = `2023-06-01`.
- Body: "JSON", and in the JSON field use this expression (click the field, switch to Expression mode):

```
={{ {
  model: "claude-haiku-4-5",
  max_tokens: 300,
  system: "You triage personal email for LIVAL OS, a personal operating system. Given an email's subject, sender, and snippet, decide if it is IMPORTANT and, if so, suggest which Area/Workspace/Project it belongs to from the provided routing list. Respond with ONLY a single JSON object, no prose, no markdown fences, matching exactly this shape: {\"important\":boolean,\"type\":\"email\"|\"appointment\",\"title\":string,\"summary\":string,\"suggested_area_id\":string|null,\"suggested_workspace_id\":string|null,\"suggested_project_id\":string|null,\"confidence\":number|null}. Mark important=true if the email is EITHER (a) actionable, time-sensitive, has a deadline, or is a calendar/scheduling invite, OR (b) from a real person rather than an automated/no-reply/marketing sender. Mark important=false for newsletters, receipts, marketing, and automated FYI mail that fails both conditions. type is \"appointment\" only for calendar/scheduling invites, otherwise \"email\". Only set suggested_area_id/suggested_workspace_id/suggested_project_id when there is a clear match to one of the provided routing targets by name or obvious context (e.g. a known client or project name in the sender or content); otherwise set all three plus confidence to null. confidence is your match confidence 0-1 when a match is made.",
  messages: [{
    role: "user",
    content: "Routing targets:\n" + JSON.stringify($json.routingList) + "\n\nEmail:\nSubject: " + (($json.payload.headers.find(h => h.name === "Subject") || {}).value || "") + "\nFrom: " + (($json.payload.headers.find(h => h.name === "From") || {}).value || "") + "\nSnippet: " + ($json.snippet || "")
  }]
} }}
```

**Node 4 — Code: "Parse Claude Response"**
- Node type: Code. Mode: "Run Once for Each Item".
- Paste this exact JS:

```js
let parsed;
try {
  const text = $input.item.json.content[0].text;
  parsed = JSON.parse(text);
} catch (e) {
  parsed = { important: false };
}
return { json: { ...$('Static Routing List').item.json, claude: parsed } };
```

**Node 5 — IF: "Important?"**
- Condition: `{{$json.claude.important}}` is `true` (boolean).

**True branch:**

**Node 6 — HTTP Request: "POST ingest-quick-capture"**
- Method: POST. URL: `https://mfcdzgkhmzppfctdzhwy.supabase.co/functions/v1/ingest-quick-capture`.
- Authentication: Generic Credential Type → Header Auth → the "LIVAL Ingest Secret" credential.
- Body: "JSON", expression mode:

```
={{ (() => {
  const c = $json.claude;
  const body = {
    title: c.title,
    body: c.summary,
    type: c.type,
    source: "n8n",
    source_url: "https://mail.google.com/mail/u/0/#inbox/" + $json.id,
  };
  if (c.suggested_area_id) body.suggested_area_id = c.suggested_area_id;
  if (c.suggested_workspace_id) body.suggested_workspace_id = c.suggested_workspace_id;
  if (c.suggested_project_id) body.suggested_project_id = c.suggested_project_id;
  if (c.confidence !== null && c.confidence !== undefined) body.confidence = c.confidence;
  return body;
})() }}
```

  This deliberately omits the `suggested_*`/`confidence` keys when Claude returned `null` — sending JSON `null` would 400 against the Task 1 schema (Global Constraints).

**Node 7 — Gmail: "Add label LIVAL/Processed"**
- Resource: Message. Operation: Add Labels.
- Message ID: `{{$json.id}}`.
- Label: `LIVAL/Processed` (create it if the dropdown doesn't offer it).

**Node 8 — Gmail: "Mark as read" (true branch)**
- Resource: Message. Operation: Mark as Read.
- Message ID: `{{$json.id}}`.

**False branch (wire directly from the IF node's false output):**

**Node 9 — Gmail: "Mark as read" (false branch)**
- Resource: Message. Operation: Mark as Read.
- Message ID: `{{$json.id}}`.

- [ ] Mark done once all 9 nodes exist and are wired: `1→2→3→4→5`, `5(true)→6→7→8`, `5(false)→9`.

#### Step 3: Test against real mail, inactive

- [ ] On the Gmail Trigger node, use n8n's "Fetch Test Event" to pull a real unread message, then run the workflow manually (or pin the fetched event and execute the whole workflow) for at least 4–6 real unread emails covering: an important client email, an unimportant newsletter, a calendar invite, and a plain personal email with no clear area match.
- [ ] For each, inspect the "Parse Claude Response" node output: `claude.important`, `claude.type`, `claude.suggested_area_id`/`confidence` look sane (client mail routes to the `Consulting` area `c920c2a8-b910-46e6-b9d6-9c10e6e56389`, unrelated mail gets `null`s).
- [ ] For each item that took the true branch, confirm the `inbox_items` row landed correctly:
  ```bash
  set -a && source supabase/functions/.env.local && set +a
  curl -s "$SUPABASE_URL/rest/v1/inbox_items?select=title,type,source,suggested_area_id,confidence&source=eq.n8n&order=created_at.desc&limit=10" \
    -H "apikey: $SUPABASE_SERVICE_ROLE_KEY" -H "Authorization: Bearer $SUPABASE_SERVICE_ROLE_KEY" | python3 -m json.tool
  ```
- [ ] Confirm the Gmail message got the `LIVAL/Processed` label (true branch) and was marked read (both branches).

#### Step 4: Get explicit confirmation, then activate

- [ ] **STOP.** Show the user the test results from Step 3 (which emails were captured, with what routing) and ask for explicit confirmation before proceeding. Do not activate without it.
- [ ] Once confirmed, toggle the workflow **Active** in n8n.

#### Step 5: Export the workflow JSON and document

- [ ] In n8n, open the workflow's "…" menu → Download. Save the exported file as `docs/ingestion/n8n-gmail-capture-workflow.json` in this repo. (The export contains node configs and credential *references* by name/id only — never raw secret values — so it's safe to commit.)
- [ ] Append this section to `docs/ingestion/README.md`, after the existing "Producer: Apple Shortcut (Siri quick capture)" section:

```markdown
## Producer: n8n Gmail capture

Self-hosted n8n (`~/Developer/_services/n8n`) polls `valentinoliana@gmail.com`
for unread mail, asks Claude Haiku to judge importance and suggest a routing
target from a static area/workspace/project list embedded in the workflow,
then POSTs important mail to `ingest-quick-capture` with `source: "n8n"`.
Skipped/unimportant mail is just marked read, no capture.

Workflow JSON: `docs/ingestion/n8n-gmail-capture-workflow.json` (import via
n8n → Workflows → Import from File). Requires three n8n credentials: Gmail
OAuth2, an "Anthropic API Key" header-auth credential, and a "LIVAL Ingest
Secret" header-auth credential (`Authorization: Bearer <LIVAL_INGEST_SECRET>`).

The static routing list (areas/workspaces/projects id+name) lives in the
workflow's "Static Routing List" Code node. When areas or projects change,
re-fetch and paste in the updated list — see
`docs/superpowers/specs/2026-06-24-n8n-gmail-capture-design.md` section 2 for
why this is static rather than a live lookup.

Design: `docs/superpowers/specs/2026-06-24-n8n-gmail-capture-design.md`.
```

- [ ] In `docs/superpowers/kanban.html`, change the line (now reading, after Task 2's edit):

```js
                    { id: '3-11', title: 'Modify ingest-quick-capture for routing suggestions', status: 'done', notes: 'Added suggested_area_id/workspace_id/project_id + confidence (optional, omitted-not-null). 8/8 Deno tests pass; live-verified.' }
```

  to:

```js
                    { id: '3-11', title: 'Modify ingest-quick-capture for routing suggestions', status: 'done', notes: 'Added suggested_area_id/workspace_id/project_id + confidence (optional, omitted-not-null). 8/8 Deno tests pass; live-verified.' },
                    { id: '3-12', title: 'n8n: Gmail capture workflow', status: 'done', notes: 'Gmail Trigger -> Claude Haiku classify+route (static routing list) -> IF importance gate -> POST ingest-quick-capture + label/mark-read. Tested against real mail, user-confirmed, activated. JSON: docs/ingestion/n8n-gmail-capture-workflow.json' }
```

- [ ] **Step 6: Commit**

```bash
git add docs/ingestion/n8n-gmail-capture-workflow.json docs/ingestion/README.md docs/superpowers/kanban.html
git commit -m "feat: add n8n Gmail capture workflow, document producer, flip kanban 3-12"
```

---

## Self-Review

**Spec coverage** (against `docs/superpowers/specs/2026-06-24-n8n-gmail-capture-design.md`):
- §3 workflow shape (Gmail Trigger → classify → IF → POST + label/mark-read) → Task 3 Step 2, all 9 nodes.
- §3 static routing list → Task 3 Step 2 Node 2, populated with real ids fetched live.
- §3 importance/routing rule + required JSON output shape → Task 3 Step 2 Node 3 system prompt, verbatim.
- §3 malformed-response handling (`important: false`, no retry) → Task 3 Step 2 Node 4 try/catch.
- §3 POST body mapping + omit-null-not-send-null → Task 3 Step 2 Node 6, called out again in Global Constraints.
- §3 post-processing (label + mark-read both branches) → Task 3 Step 2 Nodes 7–9.
- §4 `ingest-quick-capture` modification → Task 1 in full.
- §6 secrets (no service-role key in n8n) → Task 3 Step 1, Global Constraints.
- §7 rollout safety (deploy+verify first, inactive build, manual test, explicit confirmation before activate) → Task ordering (1→2→3) and Task 3 Steps 3–4.
- §9 DoD items 1–6 → Task 2 (items 1, 5 partial, 6 partial) and Task 3 (items 2, 3, 4, 5 partial, 6 partial).

**Placeholder scan:** no TBD/TODO; routing-list ids are real values fetched from live Supabase, not fabricated; n8n workflow JSON is deliberately *not* hand-authored (exported from n8n itself in Task 3 Step 5) to avoid guessing n8n's internal JSON schema incorrectly.

**Type consistency:** `InboxRow`/`toInboxRow`/`quickCaptureSchema` signatures in Task 1 Step 3 match what Task 2's curl bodies and Task 3 Node 6's POST body send. `routingList` produced in Node 2 is consumed by name in Node 3 and Node 4 (`$('Static Routing List').item.json`) — node name matches exactly.

---

**Plan complete and saved to `docs/superpowers/plans/2026-06-24-n8n-gmail-capture.md`. Two execution options:**

**1. Subagent-Driven (recommended)** — I dispatch a fresh subagent per task, review between tasks, fast iteration.

**2. Inline Execution** — Execute tasks in this session using executing-plans, batch execution with checkpoints.

**Which approach?**
