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
