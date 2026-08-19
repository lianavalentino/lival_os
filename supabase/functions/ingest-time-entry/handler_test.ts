import { assertEquals } from "jsr:@std/assert";
import {
  createTimeEntryHandler,
  toTimeEntryRow,
  timeEntrySchema,
  type TimeEntryRow,
} from "./handler.ts";

const SECRET = "test-secret";
const USER = "user-123";
const VALID = { started_at: "2026-06-17T10:00:00.000Z", duration_minutes: 30 };

function post(body: unknown, auth = `Bearer ${SECRET}`) {
  return new Request("http://x", {
    method: "POST",
    headers: { authorization: auth, "content-type": "application/json" },
    body: JSON.stringify(body),
  });
}

function fakeDb(opts: { existing?: { id: string; duration_minutes: number } | null } = {}) {
  const inserted: TimeEntryRow[] = [];
  const updated: { id: string; duration_minutes: number }[] = [];
  return {
    inserted,
    updated,
    findByExternalRef(_u: string, _r: string) {
      return Promise.resolve(opts.existing ?? null);
    },
    insertTimeEntry(row: TimeEntryRow) {
      inserted.push(row);
      return Promise.resolve({ id: "te-new" });
    },
    updateDuration(id: string, duration_minutes: number) {
      updated.push({ id, duration_minutes });
      return Promise.resolve({ id });
    },
  };
}

Deno.test("toTimeEntryRow: defaults source to claude_code, nulls optionals", () => {
  const row = toTimeEntryRow(timeEntrySchema.parse(VALID), USER);
  assertEquals(row, {
    user_id: USER,
    started_at: VALID.started_at,
    ended_at: null,
    duration_minutes: 30,
    project_id: null,
    task_id: null,
    description: null,
    source: "claude_code",
    external_ref: null,
  });
});

Deno.test("handler: 401 on wrong secret", async () => {
  const res = await createTimeEntryHandler({ secret: SECRET, userId: USER, db: fakeDb() })(
    post(VALID, "Bearer nope"),
  );
  assertEquals(res.status, 401);
});

Deno.test("handler: 400 on negative duration", async () => {
  const res = await createTimeEntryHandler({ secret: SECRET, userId: USER, db: fakeDb() })(
    post({ ...VALID, duration_minutes: -1 }),
  );
  assertEquals(res.status, 400);
});

Deno.test("handler: 201 inserts when no external_ref", async () => {
  const db = fakeDb();
  const res = await createTimeEntryHandler({ secret: SECRET, userId: USER, db })(post(VALID));
  assertEquals(res.status, 201);
  assertEquals(await res.json(), { id: "te-new" });
  assertEquals(db.inserted.length, 1);
});

Deno.test("handler: 201 inserts when external_ref is new", async () => {
  const db = fakeDb({ existing: null });
  const res = await createTimeEntryHandler({ secret: SECRET, userId: USER, db })(
    post({ ...VALID, external_ref: "session-xyz" }),
  );
  assertEquals(res.status, 201);
  assertEquals(db.inserted[0].external_ref, "session-xyz");
});

Deno.test("handler: 200 updates duration on a later beat for the same session", async () => {
  const db = fakeDb({ existing: { id: "te-old", duration_minutes: 15 } });
  const res = await createTimeEntryHandler({ secret: SECRET, userId: USER, db })(
    post({ ...VALID, duration_minutes: 30, external_ref: "session-abc" }),
  );
  assertEquals(res.status, 200);
  assertEquals(await res.json(), { id: "te-old" });
  assertEquals(db.inserted.length, 0);
  assertEquals(db.updated, [{ id: "te-old", duration_minutes: 30 }]);
});

Deno.test("handler: 200 does not lower duration when the beat reports less than what is stored", async () => {
  const db = fakeDb({ existing: { id: "te-old", duration_minutes: 45 } });
  const res = await createTimeEntryHandler({ secret: SECRET, userId: USER, db })(
    post({ ...VALID, duration_minutes: 30, external_ref: "session-abc" }),
  );
  assertEquals(res.status, 200);
  assertEquals(await res.json(), { id: "te-old" });
  assertEquals(db.inserted.length, 0);
  assertEquals(db.updated.length, 0);
});
