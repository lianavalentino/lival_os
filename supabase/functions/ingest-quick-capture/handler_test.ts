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
    status: "new",
  });
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
