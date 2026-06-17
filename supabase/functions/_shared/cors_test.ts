import { assertEquals } from "jsr:@std/assert";
import { corsHeaders, handlePreflight, jsonResponse } from "./cors.ts";

Deno.test("handlePreflight: OPTIONS returns 200 with CORS", () => {
  const res = handlePreflight(new Request("http://x", { method: "OPTIONS" }));
  assertEquals(res?.status, 200);
  assertEquals(res?.headers.get("Access-Control-Allow-Origin"), "*");
});

Deno.test("handlePreflight: non-OPTIONS returns null", () => {
  const res = handlePreflight(new Request("http://x", { method: "POST" }));
  assertEquals(res, null);
});

Deno.test("jsonResponse: sets status, body, content-type", async () => {
  const res = jsonResponse({ ok: true }, 201);
  assertEquals(res.status, 201);
  assertEquals(res.headers.get("content-type"), "application/json");
  assertEquals(await res.json(), { ok: true });
  assertEquals(corsHeaders["Access-Control-Allow-Methods"], "POST, OPTIONS");
});
