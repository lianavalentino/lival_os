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
