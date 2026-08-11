import { assertEquals } from "jsr:@std/assert";
import { createQuickCaptureHandler, toInboxRow, quickCaptureSchema, type InboxRow } from "./handler.ts";

const SECRET = "test-secret";
const USER = "user-123";

function fakeDb(captured: InboxRow[], opts: { existing?: { id: string; status: string } | null } = {}) {
  return {
    insertInboxItem(row: InboxRow) {
      captured.push(row);
      return Promise.resolve({ id: "inbox-1", status: row.status });
    },
    findByExternalRef(_userId: string, _ref: string) {
      return Promise.resolve(opts.existing ?? null);
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
    external_ref: null,
    status: "new",
  });
});

Deno.test("toInboxRow: includes external_ref when present", () => {
  const row = toInboxRow(
    quickCaptureSchema.parse({ title: "Hi", external_ref: "call-abc-123" }),
    USER,
  );
  assertEquals(row.external_ref, "call-abc-123");
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
  assertEquals(row.external_ref, null);
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

Deno.test("handler: 200 returns existing row on duplicate external_ref (no insert)", async () => {
  const db = {
    insertInboxItem: () => {
      throw new Error("Should not be called");
    },
    findByExternalRef: (_userId: string, _ref: string) =>
      Promise.resolve({ id: "inbox-old", status: "new" }),
  };
  const handler = createQuickCaptureHandler({ secret: SECRET, userId: USER, db });
  const res = await handler(post({ title: "Call notes", external_ref: "call-xyz-123" }));
  assertEquals(res.status, 200);
  assertEquals(await res.json(), { id: "inbox-old", status: "new" });
});

Deno.test("handler: 201 inserts when external_ref is new", async () => {
  const captured: InboxRow[] = [];
  const db = {
    insertInboxItem(row: InboxRow) {
      captured.push(row);
      return Promise.resolve({ id: "inbox-new", status: row.status });
    },
    findByExternalRef: () => Promise.resolve(null),
  };
  const handler = createQuickCaptureHandler({ secret: SECRET, userId: USER, db });
  const res = await handler(post({ title: "New call", external_ref: "call-abc-456" }));
  assertEquals(res.status, 201);
  assertEquals(await res.json(), { id: "inbox-new", status: "new" });
  assertEquals(captured[0].external_ref, "call-abc-456");
});
